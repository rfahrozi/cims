import { Injectable, NotFoundException } from '@nestjs/common';
import { DomainError, evaluateNoticeGate, type NoticeGateResult } from '@cims/domain';
import type { PoolClient } from 'pg';
import type { CurrentUser } from '../../common/current-user.decorator.js';
import {
  InMemoryStore,
  type AcknowledgmentRecord,
  type DeliveryAttemptRecord,
  type NoticeRecipientRecord,
  type OfficialNoticeRecord,
} from '../in-memory.store.js';
import { OutboxService } from '../database/outbox.service.js';
import { PersistenceModeService } from '../database/persistence-mode.service.js';
import { PgPoolService } from '../database/pg-pool.service.js';

export interface HydratedNotice extends OfficialNoticeRecord {
  rowVersion: number;
  recipients: Array<NoticeRecipientRecord & {
    rowVersion: number;
    delivery_attempts: DeliveryAttemptRecord[];
    acknowledgment: AcknowledgmentRecord | null;
  }>;
}

@Injectable()
export class NoticesRepository {
  constructor(
    private readonly mode: PersistenceModeService,
    private readonly memory: InMemoryStore,
    private readonly pg: PgPoolService,
    private readonly outbox: OutboxService,
  ) {}

  async create(
    input: {
      hearingId: string;
      scheduleId: string;
      noticeType: string;
      subject: string;
      message: string;
      officialReference: string;
      senderOrganizationId: string;
      createdBy: string;
      recipients: Array<{
        recipientUserId?: string;
        recipientOrganizationId?: string;
        recipientName: string;
        destination: string;
        preferredChannel: NoticeRecipientRecord['preferredChannel'];
        requiredAck: boolean;
        ackDeadline?: string;
      }>;
    },
    user: CurrentUser,
  ): Promise<HydratedNotice> {
    if (!this.mode.postgres) {
      const notice: OfficialNoticeRecord = {
        id: this.memory.id(),
        hearingId: input.hearingId,
        scheduleId: input.scheduleId,
        noticeType: input.noticeType,
        subject: input.subject,
        message: input.message,
        officialReference: input.officialReference,
        senderOrganizationId: input.senderOrganizationId,
        createdBy: input.createdBy,
        status: 'DRAFT',
        createdAt: new Date().toISOString(),
      };
      this.memory.notices.push(notice);
      for (const recipient of input.recipients) {
        this.memory.noticeRecipients.push({
          id: this.memory.id(),
          noticeId: notice.id,
          recipientUserId: recipient.recipientUserId,
          recipientOrganizationId: recipient.recipientOrganizationId,
          recipientName: recipient.recipientName,
          destination: recipient.destination,
          preferredChannel: recipient.preferredChannel,
          requiredAck: recipient.requiredAck,
          ackDeadline: recipient.ackDeadline,
          status: 'PENDING',
        });
      }
      return this.hydrate(notice.id, user);
    }

    return this.pg.transactionAs(user, async (client) => {
      const noticeResult = await client.query(
        `insert into official_notices(
           hearing_id,schedule_id,notice_type,subject,message,official_reference,
           sender_organization_id,created_by,status,created_at
         ) values($1,$2,$3,$4,$5,$6,$7,$8,'DRAFT',now())
         returning id::text`,
        [
          input.hearingId,
          input.scheduleId,
          input.noticeType,
          input.subject,
          input.message,
          input.officialReference,
          input.senderOrganizationId,
          input.createdBy,
        ],
      );
      const noticeId = String(noticeResult.rows[0].id);
      for (const recipient of input.recipients) {
        await client.query(
          `insert into notice_recipients(
             notice_id,recipient_user_id,recipient_organization_id,recipient_name,destination,
             preferred_channel,required_ack,ack_deadline,status
           ) values($1,$2,$3,$4,$5,$6,$7,$8,'PENDING')`,
          [
            noticeId,
            recipient.recipientUserId ?? null,
            recipient.recipientOrganizationId ?? null,
            recipient.recipientName,
            recipient.destination,
            recipient.preferredChannel,
            recipient.requiredAck,
            recipient.ackDeadline ?? null,
          ],
        );
      }
      return this.hydrateWithClient(noticeId, client);
    });
  }

  async queueDelivery(
    noticeId: string,
    user: CurrentUser,
    metadata: { correlationId?: string; traceparent?: string } = {},
    expectedRowVersion?: number,
  ): Promise<HydratedNotice> {
    if (!this.mode.postgres) {
      const notice = this.noticeMemory(noticeId);
      if (!['DRAFT', 'PARTIAL', 'FAILED'].includes(notice.status)) {
        throw new DomainError('NOTICE_STATE_INVALID', 'Notice cannot be sent from the current state.', 409);
      }
      const recipients = this.memory.noticeRecipients.filter((item) => item.noticeId === noticeId);
      for (const recipient of recipients) {
        if (recipient.status === 'ACKNOWLEDGED' || recipient.status === 'DELIVERED') continue;
        const shouldFail = recipient.destination.toLowerCase().includes('fail');
        const attemptNumber = this.memory.deliveryAttempts.filter((item) => item.recipientId === recipient.id).length + 1;
        this.memory.deliveryAttempts.push({
          id: this.memory.id(),
          recipientId: recipient.id,
          attemptNumber,
          channel: recipient.preferredChannel,
          status: shouldFail ? 'FAILED' : 'DELIVERED',
          providerReference: shouldFail ? undefined : `MOCK-${this.memory.id()}`,
          evidence: { mode: 'MOCK', destination_masked: this.mask(recipient.destination) },
          errorCode: shouldFail ? 'MOCK_DELIVERY_FAILURE' : undefined,
          attemptedAt: new Date().toISOString(),
        });
        recipient.status = shouldFail ? 'FAILED' : 'DELIVERED';
      }
      notice.sentAt = new Date().toISOString();
      this.refreshMemoryStatus(noticeId);
      return this.hydrate(noticeId, user);
    }

    return this.pg.transactionAs(user, async (client) => {
      const notice = await this.noticeWithClient(noticeId, client, true);
      if (!['DRAFT', 'PARTIAL', 'FAILED'].includes(notice.status)) {
        throw new DomainError('NOTICE_STATE_INVALID', 'Notice cannot be sent from the current state.', 409, { status: notice.status });
      }
      const expected = expectedRowVersion ?? notice.rowVersion;
      const updated = await client.query(
        `update official_notices
            set status='SENT', sent_at=coalesce(sent_at,now()), row_version=row_version+1
          where id=$1 and row_version=$2
          returning id`,
        [noticeId, expected],
      );
      if (updated.rowCount !== 1) {
        throw new DomainError('OPTIMISTIC_CONCURRENCY_CONFLICT', 'Official notice was changed by another transaction.', 409, {
          noticeId,
          expectedRowVersion: expected,
        });
      }
      const recipients = await client.query(
        `select id::text
           from notice_recipients
          where notice_id=$1 and status in ('PENDING','FAILED')
          order by id`,
        [noticeId],
      );
      for (const recipient of recipients.rows) {
        await this.outbox.enqueueWithClient(
          client,
          'OFFICIAL_NOTICE_DELIVERY_REQUESTED',
          'NOTICE_RECIPIENT',
          String(recipient.id),
          { notice_id: noticeId, recipient_id: String(recipient.id) },
          metadata,
        );
      }
      return this.hydrateWithClient(noticeId, client);
    });
  }

  async deliveryPayload(recipientId: string): Promise<{
    noticeId: string;
    hearingId: string;
    recipientId: string;
    channel: NoticeRecipientRecord['preferredChannel'];
    destination: string;
    subject: string;
    message: string;
    officialReference: string;
  }> {
    if (!this.mode.postgres) {
      const recipient = this.memory.noticeRecipients.find((item) => item.id === recipientId);
      if (!recipient) throw new NotFoundException('Notice recipient not found');
      const notice = this.noticeMemory(recipient.noticeId);
      return {
        noticeId: notice.id,
        hearingId: notice.hearingId,
        recipientId,
        channel: recipient.preferredChannel,
        destination: recipient.destination,
        subject: notice.subject,
        message: notice.message,
        officialReference: notice.officialReference,
      };
    }
    const rows = await this.pg.query<Record<string, unknown>>(
      `select n.id::text as notice_id,n.hearing_id,r.id::text as recipient_id,r.preferred_channel,r.destination,
              n.subject,n.message,n.official_reference
         from notice_recipients r
         join official_notices n on n.id=r.notice_id
        where r.id=$1`,
      [recipientId],
    );
    const row = rows[0];
    if (!row) throw new NotFoundException('Notice recipient not found');
    return {
      noticeId: String(row.notice_id),
      hearingId: String(row.hearing_id),
      recipientId: String(row.recipient_id),
      channel: String(row.preferred_channel) as NoticeRecipientRecord['preferredChannel'],
      destination: String(row.destination),
      subject: String(row.subject),
      message: String(row.message),
      officialReference: String(row.official_reference),
    };
  }

  async recordDeliveryResult(
    recipientId: string,
    result: {
      status: 'DELIVERED' | 'FAILED';
      providerReference?: string;
      evidence: Record<string, unknown>;
      errorCode?: string;
    },
  ): Promise<void> {
    if (!this.mode.postgres) return;
    await this.pg.transaction(async (client) => {
      const recipient = await client.query(
        `select id::text,notice_id::text,status,row_version
           from notice_recipients
          where id=$1
          for update`,
        [recipientId],
      );
      const row = recipient.rows[0];
      if (!row) throw new NotFoundException('Notice recipient not found');
      if (String(row.status) === 'ACKNOWLEDGED') return;
      const attempt = await client.query(
        'select coalesce(max(attempt_number),0)+1 as attempt from notice_delivery_attempts where recipient_id=$1',
        [recipientId],
      );
      await client.query(
        `insert into notice_delivery_attempts(
           recipient_id,attempt_number,channel,status,provider_reference,evidence_json,error_code,attempted_at
         )
         select id,$2,preferred_channel,$3,$4,$5::jsonb,$6,now()
           from notice_recipients where id=$1`,
        [
          recipientId,
          Number(attempt.rows[0]?.attempt ?? 1),
          result.status,
          result.providerReference ?? null,
          JSON.stringify(result.evidence),
          result.errorCode ?? null,
        ],
      );
      await client.query(
        `update notice_recipients
            set status=$2, row_version=row_version+1
          where id=$1`,
        [recipientId, result.status],
      );
      await this.refreshStatusWithClient(String(row.notice_id), client);
    });
  }

  async acknowledge(
    noticeId: string,
    input: { recipientId?: string; method: string; receiptReference: string },
    user: CurrentUser,
  ): Promise<HydratedNotice> {
    if (!this.mode.postgres) {
      const candidates = this.memory.noticeRecipients.filter((item) => item.noticeId === noticeId && item.status === 'DELIVERED');
      const target = input.recipientId
        ? candidates.find((item) => item.id === input.recipientId)
        : candidates.find((item) => item.recipientUserId === user.id);
      if (!target && !user.roles.includes('SYSTEM_ADMIN')) throw new NotFoundException('No delivered notice recipient is available for the current user.');
      const selected = target ?? candidates[0];
      if (!selected) throw new NotFoundException('Notice recipient not found');
      selected.status = 'ACKNOWLEDGED';
      this.memory.acknowledgments.push({
        id: this.memory.id(),
        recipientId: selected.id,
        acknowledgedBy: user.id,
        method: input.method,
        receiptReference: input.receiptReference,
        acknowledgedAt: new Date().toISOString(),
      });
      this.refreshMemoryStatus(noticeId);
      return this.hydrate(noticeId, user);
    }

    return this.pg.transactionAs(user, async (client) => {
      const candidateResult = await client.query(
        `select id::text,recipient_user_id,status
           from notice_recipients
          where notice_id=$1 and status='DELIVERED'
            and ($2::text is null or id::text=$2)
          order by id
          for update`,
        [noticeId, input.recipientId ?? null],
      );
      let selected = candidateResult.rows.find((row) => String(row.recipient_user_id ?? '') === user.id);
      if (input.recipientId) selected = candidateResult.rows[0];
      if (!selected && user.roles.includes('SYSTEM_ADMIN')) selected = candidateResult.rows[0];
      if (!selected) throw new NotFoundException('No delivered notice recipient is available for the current user.');
      await client.query(
        `insert into notice_acknowledgments(recipient_id,acknowledged_by,acknowledgment_method,receipt_reference,acknowledged_at)
         values($1,$2,$3,$4,now())
         on conflict (recipient_id) do nothing`,
        [selected.id, user.id, input.method, input.receiptReference],
      );
      await client.query(
        `update notice_recipients set status='ACKNOWLEDGED',row_version=row_version+1 where id=$1`,
        [selected.id],
      );
      await this.refreshStatusWithClient(noticeId, client);
      return this.hydrateWithClient(noticeId, client);
    });
  }

  async list(hearingId: string, user: CurrentUser): Promise<HydratedNotice[]> {
    if (!this.mode.postgres) {
      return Promise.all(this.memory.notices.filter((item) => item.hearingId === hearingId).map((item) => this.hydrate(item.id, user)));
    }
    return this.pg.transactionAs(user, async (client) => {
      const result = await client.query(
        `select id::text from official_notices where hearing_id=$1 order by created_at desc,id`,
        [hearingId],
      );
      const items: HydratedNotice[] = [];
      for (const row of result.rows) items.push(await this.hydrateWithClient(String(row.id), client));
      return items;
    });
  }

  async gate(hearingId: string, user: CurrentUser): Promise<NoticeGateResult> {
    const notices = await this.list(hearingId, user);
    return evaluateNoticeGate({
      notices,
      recipients: notices.flatMap((notice) => notice.recipients),
    });
  }

  /**
   * H-10: Kembalikan daftar penerima notice yang melewati SLA acknowledgment.
   * SOP 11: persentase acknowledgment tepat waktu harus termonitor.
   */
  async slaOverdue(user: CurrentUser, hearingId?: string): Promise<Array<{
    noticeId: string;
    hearingId: string;
    noticeType: string;
    recipientId: string;
    recipientName: string;
    channel: string;
    ackDeadline: string;
    overdueMinutes: number;
    status: string;
  }>> {
    const now = new Date().toISOString();

    if (!this.mode.postgres) {
      const results = [];
      const notices = hearingId
        ? this.memory.notices.filter(n => n.hearingId === hearingId)
        : this.memory.notices;

      for (const notice of notices) {
        const recipients = this.memory.noticeRecipients.filter(r =>
          r.noticeId === notice.id &&
          r.requiredAck &&
          r.ackDeadline &&
          r.ackDeadline < now &&
          r.status !== 'ACKNOWLEDGED',
        );
        for (const r of recipients) {
          const overdue = (Date.parse(now) - Date.parse(r.ackDeadline!)) / 60_000;
          results.push({
            noticeId: notice.id,
            hearingId: notice.hearingId,
            noticeType: notice.noticeType,
            recipientId: r.id,
            recipientName: r.recipientName,
            channel: r.preferredChannel,
            ackDeadline: r.ackDeadline!,
            overdueMinutes: Math.round(overdue),
            status: r.status,
          });
        }
      }
      return results.sort((a, b) => b.overdueMinutes - a.overdueMinutes);
    }

    return this.pg.transactionAs(user, async (client) => {
      const rows = (await client.query(
        `select n.id::text as notice_id, n.hearing_id, n.notice_type,
                r.id::text as recipient_id, r.recipient_name, r.preferred_channel,
                r.ack_deadline::text, r.status,
                extract(epoch from (now() - r.ack_deadline)) / 60 as overdue_minutes
           from notice_recipients r
           join official_notices n on n.id = r.notice_id
          where r.required_ack = true
            and r.ack_deadline is not null
            and r.ack_deadline < now()
            and r.status != 'ACKNOWLEDGED'
            and ($1::text is null or n.hearing_id = $1)
          order by overdue_minutes desc
          limit 100`,
        [hearingId ?? null],
      )).rows;

      return rows.map(row => ({
        noticeId: String(row.notice_id),
        hearingId: String(row.hearing_id),
        noticeType: String(row.notice_type),
        recipientId: String(row.recipient_id),
        recipientName: String(row.recipient_name),
        channel: String(row.preferred_channel),
        ackDeadline: String(row.ack_deadline),
        overdueMinutes: Math.round(Number(row.overdue_minutes)),
        status: String(row.status),
      }));
    });
  }

  async hydrate(noticeId: string, user: CurrentUser): Promise<HydratedNotice> {
    if (!this.mode.postgres) {
      const notice = this.noticeMemory(noticeId);
      return {
        ...notice,
        rowVersion: 1,
        recipients: this.memory.noticeRecipients.filter((item) => item.noticeId === noticeId).map((recipient) => ({
          ...recipient,
          rowVersion: 1,
          delivery_attempts: this.memory.deliveryAttempts.filter((item) => item.recipientId === recipient.id),
          acknowledgment: this.memory.acknowledgments.find((item) => item.recipientId === recipient.id) ?? null,
        })),
      };
    }
    return this.pg.transactionAs(user, (client) => this.hydrateWithClient(noticeId, client));
  }

  private async noticeWithClient(noticeId: string, client: PoolClient, lock = false): Promise<HydratedNotice> {
    const result = await client.query(
      `select id::text,hearing_id,schedule_id,notice_type,subject,message,official_reference,
              sender_organization_id,created_by,status,created_at::text,sent_at::text,row_version
         from official_notices
        where id=$1${lock ? ' for update' : ''}`,
      [noticeId],
    );
    const row = result.rows[0];
    if (!row) throw new NotFoundException('Official notice not found');
    return {
      id: String(row.id),
      hearingId: String(row.hearing_id),
      scheduleId: String(row.schedule_id),
      noticeType: String(row.notice_type),
      subject: String(row.subject),
      message: String(row.message),
      officialReference: String(row.official_reference),
      senderOrganizationId: String(row.sender_organization_id),
      createdBy: String(row.created_by),
      status: String(row.status) as OfficialNoticeRecord['status'],
      createdAt: String(row.created_at),
      sentAt: row.sent_at ? String(row.sent_at) : undefined,
      rowVersion: Number(row.row_version),
      recipients: [],
    };
  }

  private async hydrateWithClient(noticeId: string, client: PoolClient): Promise<HydratedNotice> {
    const notice = await this.noticeWithClient(noticeId, client);
    const recipientResult = await client.query(
      `select id::text,notice_id::text,recipient_user_id,recipient_organization_id,recipient_name,destination,
              preferred_channel,required_ack,ack_deadline::text,status,row_version
         from notice_recipients
        where notice_id=$1
        order by id`,
      [noticeId],
    );
    const recipients: HydratedNotice['recipients'] = [];
    for (const row of recipientResult.rows) {
      const attempts = await client.query(
        `select id::text,recipient_id::text,attempt_number,channel,status,provider_reference,evidence_json,error_code,attempted_at::text
           from notice_delivery_attempts where recipient_id=$1 order by attempt_number`,
        [row.id],
      );
      const acknowledgments = await client.query(
        `select id::text,recipient_id::text,acknowledged_by,acknowledgment_method,receipt_reference,acknowledged_at::text
           from notice_acknowledgments where recipient_id=$1`,
        [row.id],
      );
      const acknowledgmentRow = acknowledgments.rows[0];
      recipients.push({
        id: String(row.id),
        noticeId: String(row.notice_id),
        recipientUserId: row.recipient_user_id ? String(row.recipient_user_id) : undefined,
        recipientOrganizationId: row.recipient_organization_id ? String(row.recipient_organization_id) : undefined,
        recipientName: String(row.recipient_name),
        destination: String(row.destination),
        preferredChannel: String(row.preferred_channel) as NoticeRecipientRecord['preferredChannel'],
        requiredAck: Boolean(row.required_ack),
        ackDeadline: row.ack_deadline ? String(row.ack_deadline) : undefined,
        status: String(row.status) as NoticeRecipientRecord['status'],
        rowVersion: Number(row.row_version),
        delivery_attempts: attempts.rows.map((attempt) => ({
          id: String(attempt.id),
          recipientId: String(attempt.recipient_id),
          attemptNumber: Number(attempt.attempt_number),
          channel: String(attempt.channel) as DeliveryAttemptRecord['channel'],
          status: String(attempt.status) as DeliveryAttemptRecord['status'],
          providerReference: attempt.provider_reference ? String(attempt.provider_reference) : undefined,
          evidence: attempt.evidence_json,
          errorCode: attempt.error_code ? String(attempt.error_code) : undefined,
          attemptedAt: String(attempt.attempted_at),
        })),
        acknowledgment: acknowledgmentRow
          ? {
              id: String(acknowledgmentRow.id),
              recipientId: String(acknowledgmentRow.recipient_id),
              acknowledgedBy: String(acknowledgmentRow.acknowledged_by),
              method: String(acknowledgmentRow.acknowledgment_method),
              receiptReference: String(acknowledgmentRow.receipt_reference),
              acknowledgedAt: String(acknowledgmentRow.acknowledged_at),
            }
          : null,
      });
    }
    return { ...notice, recipients };
  }

  private async refreshStatusWithClient(noticeId: string, client: PoolClient): Promise<void> {
    const result = await client.query(
      `select count(*) filter(where required_ack) as required_count,
              count(*) filter(where required_ack and status='ACKNOWLEDGED') as acknowledged_count,
              count(*) filter(where status='FAILED') as failed_count,
              count(*) filter(where status in ('DELIVERED','ACKNOWLEDGED')) as delivered_count,
              count(*) as total_count
         from notice_recipients where notice_id=$1`,
      [noticeId],
    );
    const row = result.rows[0];
    const required = Number(row.required_count);
    const acknowledged = Number(row.acknowledged_count);
    const failed = Number(row.failed_count);
    const delivered = Number(row.delivered_count);
    const total = Number(row.total_count);
    const status = required > 0 && required === acknowledged
      ? 'ACKNOWLEDGED'
      : total > 0 && failed === total
        ? 'FAILED'
        : failed > 0 && delivered > 0
          ? 'PARTIAL'
          : 'SENT';
    await client.query(
      `update official_notices set status=$2,row_version=row_version+1 where id=$1`,
      [noticeId, status],
    );
  }

  private noticeMemory(id: string): OfficialNoticeRecord {
    const notice = this.memory.notices.find((item) => item.id === id);
    if (!notice) throw new NotFoundException('Official notice not found');
    return notice;
  }

  private refreshMemoryStatus(id: string): void {
    const notice = this.noticeMemory(id);
    const recipients = this.memory.noticeRecipients.filter((item) => item.noticeId === id);
    const required = recipients.filter((item) => item.requiredAck);
    if (required.length > 0 && required.every((item) => item.status === 'ACKNOWLEDGED')) notice.status = 'ACKNOWLEDGED';
    else if (recipients.every((item) => item.status === 'FAILED')) notice.status = 'FAILED';
    else if (recipients.some((item) => item.status === 'FAILED') && recipients.some((item) => ['DELIVERED', 'ACKNOWLEDGED'].includes(item.status))) notice.status = 'PARTIAL';
    else if (notice.status !== 'DRAFT') notice.status = 'SENT';
  }

  private mask(value: string): string {
    return value.length <= 4 ? '****' : `${value.slice(0, 2)}***${value.slice(-2)}`;
  }
}
