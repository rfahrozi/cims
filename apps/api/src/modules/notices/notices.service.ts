import { Injectable } from '@nestjs/common';
import { DomainError } from '@cims/domain';
import { requireRoles } from '../../common/authorization.js';
import type { CurrentUser } from '../../common/current-user.decorator.js';
import { AuditService } from '../../infrastructure/observability/audit.service.js';
import { CoreWorkflowRepository } from '../../infrastructure/persistence/repositories/core-workflow.repository.js';
import { NoticesRepository } from '../../infrastructure/persistence/repositories/notices.repository.js';
import type { AcknowledgeNoticeDto, CreateNoticeDto } from './dto.js';

@Injectable()
export class NoticesService {
  constructor(
    private readonly core: CoreWorkflowRepository,
    private readonly repository: NoticesRepository,
    private readonly audit: AuditService
  ) {}

  async create(user: CurrentUser, hearingId: string, dto: CreateNoticeDto, correlationId?: string) {
    requireRoles(user, ['COURT_CLERK', 'PROSECUTOR']);
    await this.core.getHearing(hearingId, user);
    const schedule = await this.core.activeSchedule(hearingId, user);
    if (!schedule)
      throw new DomainError('SCHEDULE_REQUIRED', 'An active schedule is required.', 409);
    const notice = await this.repository.create(
      {
        hearingId,
        scheduleId: schedule.id,
        noticeType: dto.notice_type,
        subject: dto.subject.trim(),
        message: dto.message.trim(),
        officialReference: dto.official_reference.trim(),
        senderOrganizationId: user.organizationId,
        createdBy: user.id,
        recipients: dto.recipients.map((recipient) => ({
          recipientUserId: recipient.recipient_user_id,
          recipientOrganizationId: recipient.recipient_organization_id,
          recipientName: recipient.name,
          destination: recipient.destination,
          preferredChannel: recipient.channel,
          requiredAck: recipient.required_ack !== false,
          ackDeadline: recipient.ack_deadline
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
          schedule_id: schedule.id
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
}
