import { Injectable } from '@nestjs/common';
import { DomainError } from '@cims/domain';
import { requireRoles } from '../../common/authorization.js';
import type { CurrentUser } from '../../common/current-user.decorator.js';
import { AuditService } from '../../infrastructure/observability/audit.service.js';
import { CoreWorkflowRepository } from '../../infrastructure/persistence/repositories/core-workflow.repository.js';
import { NoticesRepository } from '../../infrastructure/persistence/repositories/notices.repository.js';
import { AdminConfigRepository } from '../../infrastructure/persistence/repositories/admin-config.repository.js';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { AcknowledgeNoticeDto, CreateNoticeDto } from './dto.js';

@Injectable()
export class NoticesService {
  constructor(
    private readonly core: CoreWorkflowRepository,
    private readonly repository: NoticesRepository,
    private readonly adminConfig: AdminConfigRepository,
    private readonly audit: AuditService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async create(user: CurrentUser, hearingId: string, dto: CreateNoticeDto, correlationId?: string) {
    requireRoles(user, ['COURT_CLERK', 'PROSECUTOR']);
    await this.core.getHearing(hearingId, user);
    const schedule = await this.core.activeSchedule(hearingId, user);
    if (!schedule)
      throw new DomainError('SCHEDULE_REQUIRED', 'An active schedule is required.', 409);

    // ── Template lookup: jika subject/message tidak diisi, gunakan template dari DB ──
    const primaryChannel = dto.recipients[0]?.channel ?? 'EMAIL';
    let subject = dto.subject?.trim();
    let message = dto.message?.trim();

    if (!subject || !message) {
      const template = await this.adminConfig.findTemplate(dto.notice_type, primaryChannel);
      if (template) {
        // Susun context untuk render placeholder {key}
        const ctx: Record<string, string> = {
          hearing_id: hearingId,
          case_number: hearingId, // akan diganti dengan nomor perkara nyata jika tersedia
          scheduled_at: schedule.startAt
            ? new Date(schedule.startAt).toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: 'Asia/Jakarta'
              })
            : '',
          start_time: schedule.startAt
            ? new Date(schedule.startAt).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Asia/Jakarta'
              })
            : '',
          hearing_mode: '',
          change_reason: '',
          official_reference: dto.official_reference?.trim() ?? '',
          recipient_name: dto.recipients[0]?.name ?? 'Yth. Pihak Terkait'
        };
        if (!subject) subject = this.renderTemplate(template.subject, ctx);
        if (!message) message = this.renderTemplate(template.messageBody, ctx);
      }
    }

    // Fallback jika template tidak ditemukan dan field masih kosong
    subject = subject || `[CIMS] Pemberitahuan ${dto.notice_type}`;
    message =
      message ||
      `Pemberitahuan resmi untuk perkara ${hearingId}. Ref: ${dto.official_reference ?? ''}`;

    // ── SLA default: jika recipient tidak punya ack_deadline, ambil dari sla_configs ──
    let defaultAckDeadline: string | undefined;
    const slaConfig = await this.adminConfig.findSlaConfig(dto.notice_type);
    if (slaConfig) {
      const deadlineMs = Date.now() + slaConfig.ackDeadlineHours * 60 * 60 * 1000;
      defaultAckDeadline = new Date(deadlineMs).toISOString();
    }

    const notice = await this.repository.create(
      {
        hearingId,
        scheduleId: schedule.id,
        noticeType: dto.notice_type,
        subject,
        message,
        officialReference: dto.official_reference?.trim() ?? '',
        senderOrganizationId: user.organizationId,
        createdBy: user.id,
        recipients: dto.recipients.map((recipient) => ({
          recipientUserId: recipient.recipient_user_id,
          recipientOrganizationId: recipient.recipient_organization_id,
          recipientName: recipient.name,
          destination: recipient.destination,
          preferredChannel: recipient.channel,
          requiredAck: recipient.required_ack !== false,
          // Pakai ack_deadline dari DTO jika ada, jika tidak pakai default dari SLA config
          ackDeadline: recipient.ack_deadline ?? defaultAckDeadline
        }))
      },
      user
    );
    await this.audit.append(
      {
        eventType: 'OFFICIAL_NOTICE_CREATED',
        objectType: 'HEARING',
        objectId: hearingId,
        actorUserId: user.id,
        actorOrganizationId: user.organizationId,
        correlationId,
        payload: {
          notice_id: notice.id,
          official_reference: notice.officialReference,
          recipient_count: notice.recipients.length,
          schedule_id: schedule.id,
          template_used: !dto.subject || !dto.message,
          sla_from_config: !dto.recipients.every((r) => r.ack_deadline)
        }
      },
      user
    );
    return notice;
  }

  async send(user: CurrentUser, noticeId: string, correlationId?: string, traceparent?: string) {
    requireRoles(user, ['COURT_CLERK', 'PROSECUTOR']);
    const notice = await this.repository.queueDelivery(noticeId, user, {
      correlationId,
      traceparent
    });
    await this.audit.append(
      {
        eventType: 'OFFICIAL_NOTICE_DELIVERY_QUEUED',
        objectType: 'HEARING',
        objectId: notice.hearingId,
        actorUserId: user.id,
        actorOrganizationId: user.organizationId,
        correlationId,
        payload: { notice_id: notice.id, recipient_count: notice.recipients.length }
      },
      user
    );
    return notice;
  }

  async acknowledge(
    user: CurrentUser,
    noticeId: string,
    dto: AcknowledgeNoticeDto,
    correlationId?: string
  ) {
    const notice = await this.repository.acknowledge(
      noticeId,
      {
        recipientId: dto.recipient_id,
        method: dto.method ?? 'IN_APP',
        receiptReference: dto.receipt_reference.trim()
      },
      user
    );
    await this.audit.append(
      {
        eventType: 'NOTICE_ACKNOWLEDGED',
        objectType: 'HEARING',
        objectId: notice.hearingId,
        actorUserId: user.id,
        actorOrganizationId: user.organizationId,
        correlationId,
        payload: { notice_id: noticeId, receipt_reference: dto.receipt_reference.trim() }
      },
      user
    );

    // M-08/CU-04: Broadcast UI event untuk SSE (update real-time ke klien lain)
    this.eventEmitter.emit('ui.event', {
      type: 'NOTICE_ACKNOWLEDGED',
      hearingId: notice.hearingId,
      noticeId,
      actorOrganizationId: user.organizationId,
      timestamp: new Date().toISOString()
    });

    return notice;
  }

  async list(hearingId: string, user: CurrentUser) {
    await this.core.getHearing(hearingId, user);
    return this.repository.list(hearingId, user);
  }

  gate(hearingId: string, user: CurrentUser) {
    return this.repository.gate(hearingId, user);
  }

  slaReport(user: CurrentUser, hearingId?: string) {
    // Membutuhkan peran pengawasan
    requireRoles(user, ['AUDITOR', 'COURT_CLERK', 'PROSECUTOR', 'LIAISON_OFFICER']);
    return this.repository.slaOverdue(user, hearingId);
  }

  // ── Template rendering ─────────────────────────────────────────────────────

  private renderTemplate(template: string, ctx: Record<string, string>): string {
    return template.replace(/{(w+)}/g, (_, key: string) => ctx[key] ?? `{${key}}`);
  }
}
