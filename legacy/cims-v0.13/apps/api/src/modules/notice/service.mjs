import { randomUUID } from 'node:crypto';
import { DomainError, assert } from '../../common/domain-error.mjs';
import { requirePermission } from '../iam/authorization.mjs';
const now = () => new Date().toISOString();
export class NoticeService {
  constructor(db, audit, caseService) {
    this.db = db;
    this.audit = audit;
    this.caseService = caseService;
  }
  activeSchedule(hearingId) {
    const s = this.db.get(
      "select * from hearing_schedules where hearing_id=? and status='ACTIVE'",
      hearingId
    );
    if (!s) throw new DomainError('SCHEDULE_REQUIRED', 'An active schedule is required.', 409);
    return s;
  }
  create(context, hearingId, payload, correlationId) {
    requirePermission(context, 'notice.write', hearingId);
    this.caseService.getHearing(hearingId);
    const schedule = this.activeSchedule(hearingId);
    assert(
      typeof payload.notice_type === 'string' && payload.notice_type,
      'VALIDATION_ERROR',
      'notice_type is required.',
      400
    );
    assert(
      typeof payload.subject === 'string' && payload.subject.trim().length >= 3,
      'VALIDATION_ERROR',
      'subject is required.',
      400
    );
    assert(
      typeof payload.message === 'string' && payload.message.trim().length >= 10,
      'VALIDATION_ERROR',
      'message must contain at least 10 characters.',
      400
    );
    assert(
      typeof payload.official_reference === 'string' && payload.official_reference.trim(),
      'VALIDATION_ERROR',
      'official_reference is required.',
      400
    );
    assert(
      Array.isArray(payload.recipients) && payload.recipients.length > 0,
      'VALIDATION_ERROR',
      'At least one recipient is required.',
      400
    );
    const id = randomUUID(),
      createdAt = now();
    this.db.transaction(() => {
      this.db.run(
        `insert into official_notices(id,hearing_id,schedule_id,notice_type,subject,message,official_reference,sender_organization_id,created_by,status,created_at) values(?,?,?,?,?,?,?,?,?,?,?)`,
        id,
        hearingId,
        schedule.id,
        payload.notice_type,
        payload.subject.trim(),
        payload.message.trim(),
        payload.official_reference.trim(),
        context.organization_id,
        context.id,
        'DRAFT',
        createdAt
      );
      for (const recipient of payload.recipients) {
        assert(
          recipient.name && recipient.destination,
          'VALIDATION_ERROR',
          'Recipient name and destination are required.',
          400
        );
        assert(
          ['EMAIL', 'WHATSAPP', 'SMS', 'IN_APP'].includes(recipient.channel),
          'VALIDATION_ERROR',
          'Recipient channel is invalid.',
          400
        );
        if (recipient.user_id && !this.db.get('select 1 from users where id=?', recipient.user_id))
          throw new DomainError('RECIPIENT_NOT_FOUND', 'Recipient user was not found.', 404);
        this.db.run(
          `insert into notice_recipients(id,notice_id,recipient_user_id,recipient_organization_id,recipient_name,destination,preferred_channel,required_ack,ack_deadline,status) values(?,?,?,?,?,?,?,?,?,?)`,
          randomUUID(),
          id,
          recipient.user_id ?? null,
          recipient.organization_id ?? null,
          recipient.name,
          recipient.destination,
          recipient.channel,
          recipient.required_ack === false ? 0 : 1,
          recipient.ack_deadline ? new Date(recipient.ack_deadline).toISOString() : null,
          'PENDING'
        );
      }
    });
    this.audit.append({
      eventType: 'OFFICIAL_NOTICE_CREATED',
      actorUserId: context.id,
      actorOrganizationId: context.organization_id,
      objectType: 'OFFICIAL_NOTICE',
      objectId: id,
      correlationId,
      payload: {
        hearing_id: hearingId,
        notice_type: payload.notice_type,
        official_reference: payload.official_reference,
        recipient_count: payload.recipients.length
      }
    });
    return this.get(context, id);
  }
  send(context, noticeId, correlationId) {
    const notice = this.#notice(noticeId);
    requirePermission(context, 'notice.write', notice.hearing_id);
    if (!['DRAFT', 'PARTIAL', 'FAILED'].includes(notice.status))
      throw new DomainError(
        'NOTICE_STATE_INVALID',
        'Notice cannot be sent from its current state.',
        409
      );
    const recipients = this.db.all('select * from notice_recipients where notice_id=?', noticeId);
    let delivered = 0,
      failed = 0;
    this.db.transaction(() => {
      for (const recipient of recipients) {
        if (recipient.status === 'ACKNOWLEDGED' || recipient.status === 'DELIVERED') {
          delivered++;
          continue;
        }
        const attempt = Number(
          this.db.get(
            'select coalesce(max(attempt_number),0)+1 as n from notice_delivery_attempts where recipient_id=?',
            recipient.id
          ).n
        );
        const shouldFail = String(recipient.destination).toLowerCase().includes('fail');
        const status = shouldFail ? 'FAILED' : 'DELIVERED';
        this.db.run(
          `insert into notice_delivery_attempts(id,recipient_id,attempt_number,channel,status,provider_reference,evidence_json,error_code,attempted_at) values(?,?,?,?,?,?,?,?,?)`,
          randomUUID(),
          recipient.id,
          attempt,
          recipient.preferred_channel,
          status,
          shouldFail ? null : `SIM-${randomUUID()}`,
          JSON.stringify({
            mode: 'simulated',
            destination_masked: this.#mask(recipient.destination)
          }),
          shouldFail ? 'SIMULATED_DELIVERY_FAILURE' : null,
          now()
        );
        this.db.run('update notice_recipients set status=? where id=?', status, recipient.id);
        if (shouldFail) failed++;
        else delivered++;
      }
      const state = failed === recipients.length ? 'FAILED' : failed > 0 ? 'PARTIAL' : 'SENT';
      this.db.run(
        'update official_notices set status=?,sent_at=? where id=?',
        state,
        now(),
        noticeId
      );
    });
    this.#refreshNoticeStatus(noticeId);
    this.audit.append({
      eventType: 'OFFICIAL_NOTICE_SENT',
      actorUserId: context.id,
      actorOrganizationId: context.organization_id,
      objectType: 'OFFICIAL_NOTICE',
      objectId: noticeId,
      correlationId,
      payload: { hearing_id: notice.hearing_id, delivered, failed }
    });
    return this.get(context, noticeId);
  }
  acknowledge(context, noticeId, payload, correlationId) {
    const notice = this.#notice(noticeId);
    requirePermission(context, 'notice.ack', notice.hearing_id);
    const recipient = this.db.get(
      `select * from notice_recipients where notice_id=? and recipient_user_id=?`,
      noticeId,
      context.id
    );
    if (!recipient && !context.isSystemAdmin)
      throw new DomainError(
        'RECIPIENT_SCOPE_FORBIDDEN',
        'User is not a recipient of this notice.',
        403
      );
    const target =
      recipient ??
      this.db.get(
        'select * from notice_recipients where notice_id=? order by id limit 1',
        noticeId
      );
    if (!target)
      throw new DomainError('RECIPIENT_NOT_FOUND', 'Notice recipient was not found.', 404);
    if (!['DELIVERED', 'SENT'].includes(target.status))
      throw new DomainError(
        'NOTICE_NOT_DELIVERED',
        'Notice must be delivered before acknowledgment.',
        409
      );
    assert(
      typeof payload.receipt_reference === 'string' && payload.receipt_reference.trim(),
      'VALIDATION_ERROR',
      'receipt_reference is required.',
      400
    );
    const id = randomUUID(),
      ackedAt = now();
    this.db.transaction(() => {
      this.db.run(
        `insert into notice_acknowledgments(id,recipient_id,acknowledged_by,acknowledgment_method,receipt_reference,acknowledged_at) values(?,?,?,?,?,?)`,
        id,
        target.id,
        context.id,
        payload.method ?? 'IN_APP',
        payload.receipt_reference.trim(),
        ackedAt
      );
      this.db.run("update notice_recipients set status='ACKNOWLEDGED' where id=?", target.id);
    });
    this.#refreshNoticeStatus(noticeId);
    this.audit.append({
      eventType: 'NOTICE_ACKNOWLEDGED',
      actorUserId: context.id,
      actorOrganizationId: context.organization_id,
      objectType: 'OFFICIAL_NOTICE',
      objectId: noticeId,
      correlationId,
      payload: {
        hearing_id: notice.hearing_id,
        recipient_id: target.id,
        receipt_reference: payload.receipt_reference
      }
    });
    return this.get(context, noticeId);
  }
  list(context, hearingId) {
    requirePermission(context, 'notice.read', hearingId);
    return this.db
      .all('select * from official_notices where hearing_id=? order by created_at desc', hearingId)
      .map((n) => this.#hydrate(n));
  }
  get(context, noticeId) {
    const n = this.#notice(noticeId);
    requirePermission(context, 'notice.read', n.hearing_id);
    return this.#hydrate(n);
  }
  gate(hearingId) {
    const notices = this.db.all(
      "select * from official_notices where hearing_id=? and status<>'CANCELLED'",
      hearingId
    );
    const required = notices.flatMap((n) =>
      this.db.all('select * from notice_recipients where notice_id=? and required_ack=1', n.id)
    );
    return {
      notice_count: notices.length,
      required_ack_count: required.length,
      acknowledged_count: required.filter((r) => r.status === 'ACKNOWLEDGED').length,
      ready:
        notices.length > 0 &&
        required.length > 0 &&
        required.every((r) => r.status === 'ACKNOWLEDGED')
    };
  }
  #notice(id) {
    const n = this.db.get('select * from official_notices where id=?', id);
    if (!n) throw new DomainError('NOTICE_NOT_FOUND', 'Official notice was not found.', 404);
    return n;
  }
  #hydrate(n) {
    return {
      ...n,
      recipients: this.db
        .all('select * from notice_recipients where notice_id=? order by recipient_name', n.id)
        .map((r) => ({
          ...r,
          delivery_attempts: this.db.all(
            'select * from notice_delivery_attempts where recipient_id=? order by attempt_number',
            r.id
          ),
          acknowledgment:
            this.db.get('select * from notice_acknowledgments where recipient_id=?', r.id) ?? null
        }))
    };
  }
  #refreshNoticeStatus(id) {
    const rs = this.db.all('select * from notice_recipients where notice_id=?', id);
    let state;
    if (rs.length && rs.filter((r) => r.required_ack).every((r) => r.status === 'ACKNOWLEDGED'))
      state = 'ACKNOWLEDGED';
    else if (
      rs.some((r) => r.status === 'FAILED') &&
      rs.some((r) => ['DELIVERED', 'ACKNOWLEDGED'].includes(r.status))
    )
      state = 'PARTIAL';
    else if (rs.every((r) => r.status === 'FAILED')) state = 'FAILED';
    else state = 'SENT';
    this.db.run('update official_notices set status=? where id=?', state, id);
  }
  #mask(v) {
    const s = String(v);
    return s.length <= 4 ? '****' : `${s.slice(0, 2)}***${s.slice(-2)}`;
  }
}
