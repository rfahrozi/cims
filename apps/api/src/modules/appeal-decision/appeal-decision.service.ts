import { Injectable } from '@nestjs/common';
import { DomainError, cassationDeadline, isAppealSameDayCompliant, isAppealSevenDayCompliant } from '@cims/domain';
import { requireRoles } from '../../common/authorization.js';
import type { CurrentUser } from '../../common/current-user.decorator.js';
import { AuditService } from '../../infrastructure/audit.service.js';
import { CoreWorkflowRepository } from '../../infrastructure/repositories/core-workflow.repository.js';
import { AppealDecisionRepository } from './appeal-decision.repository.js';
import type {
  AcknowledgeNoticeStepDto,
  CreateAppealReadingDto,
  CreateNoticeStepDto,
  MarkReadDto,
  PublishExcerptDto,
  RecordPresenceDto,
  RescheduleAppealReadingDto,
  TransmitDto,
} from './dto.js';

@Injectable()
export class AppealDecisionService {
  constructor(
    private readonly repository: AppealDecisionRepository,
    private readonly core: CoreWorkflowRepository,
    private readonly audit: AuditService,
  ) {}

  // ── Readings ──────────────────────────────────────────────────────────────

  async create(user: CurrentUser, dto: CreateAppealReadingDto, correlationId?: string) {
    requireRoles(user, ['COURT_CLERK', 'JUDGE']);
    await this.core.assertActiveIntake(dto.hearing_id, user);

    const reading = await this.repository.create({
      hearingId: dto.hearing_id,
      scheduledAt: dto.scheduled_at,
      displayTimezone: dto.display_timezone ?? 'Asia/Jakarta',
      deliveryMode: dto.delivery_mode,
      determinationReference: dto.determination_reference,
      virtualSessionReference: dto.virtual_session_reference,
      openToPublic: dto.open_to_public !== false,
      createdBy: user.id,
    }, user);

    await this.audit.append({
      eventType: 'APPEAL_READING_CREATED',
      objectType: 'HEARING',
      objectId: dto.hearing_id,
      actorUserId: user.id,
      actorOrganizationId: user.organizationId,
      correlationId,
      payload: {
        appeal_reading_id: reading.id,
        version: reading.version,
        scheduled_at: reading.scheduledAt,
        delivery_mode: reading.deliveryMode,
        determination_reference: reading.determinationReference,
      },
    }, user);

    return reading;
  }

  async reschedule(user: CurrentUser, id: string, dto: RescheduleAppealReadingDto, correlationId?: string) {
    requireRoles(user, ['COURT_CLERK', 'JUDGE']);
    const existing = await this.repository.getById(id, user);

    const reading = await this.repository.reschedule(id, {
      scheduledAt: dto.scheduled_at,
      deliveryMode: dto.delivery_mode,
      rescheduleReason: dto.reschedule_reason,
      determinationReference: dto.determination_reference,
      virtualSessionReference: dto.virtual_session_reference,
      updatedBy: user.id,
    }, user);

    await this.audit.append({
      eventType: 'APPEAL_READING_RESCHEDULED',
      objectType: 'HEARING',
      objectId: existing.hearingId,
      actorUserId: user.id,
      actorOrganizationId: user.organizationId,
      correlationId,
      payload: {
        appeal_reading_id: id,
        new_scheduled_at: dto.scheduled_at,
        reason: dto.reschedule_reason,
      },
    }, user);

    return reading;
  }

  async markRead(user: CurrentUser, id: string, dto: MarkReadDto, correlationId?: string) {
    requireRoles(user, ['COURT_CLERK', 'JUDGE']);
    const existing = await this.repository.getById(id, user);

    // Hitung tenggat kasasi 14 hari sebagai referensi (SOP 10.15 poin 10)
    const computedDeadline = cassationDeadline(dto.read_at);
    const deadlineAt = dto.cassation_deadline_at ?? computedDeadline;

    const reading = await this.repository.markRead(id, dto.read_at, deadlineAt, user);

    await this.audit.append({
      eventType: 'APPEAL_READING_COMPLETED',
      objectType: 'HEARING',
      objectId: existing.hearingId,
      actorUserId: user.id,
      actorOrganizationId: user.organizationId,
      correlationId,
      payload: {
        appeal_reading_id: id,
        read_at: dto.read_at,
        cassation_deadline_at: deadlineAt,
      },
    }, user);

    return reading;
  }

  async list(user: CurrentUser, hearingId: string) {
    await this.core.getHearing(hearingId, user);
    return this.repository.list(hearingId, user);
  }

  async getById(user: CurrentUser, id: string) {
    const reading = await this.repository.getById(id, user);
    await this.core.getHearing(reading.hearingId, user);
    return reading;
  }

  // ── Notice steps ──────────────────────────────────────────────────────────

  async createNoticeStep(user: CurrentUser, readingId: string, dto: CreateNoticeStepDto, correlationId?: string) {
    requireRoles(user, ['COURT_CLERK', 'PROSECUTOR']);
    const reading = await this.repository.getById(readingId, user);
    await this.core.getHearing(reading.hearingId, user);

    const step = await this.repository.createNoticeStep({
      readingId,
      stepCode: dto.step_code,
      senderOrganizationId: dto.sender_organization_id,
      recipientReference: dto.recipient_reference,
      recipientName: dto.recipient_name,
      channel: dto.channel,
      officialReference: dto.official_reference,
      createdBy: user.id,
    }, user);

    await this.audit.append({
      eventType: 'APPEAL_NOTICE_STEP_CREATED',
      objectType: 'HEARING',
      objectId: reading.hearingId,
      actorUserId: user.id,
      actorOrganizationId: user.organizationId,
      correlationId,
      payload: { appeal_reading_id: readingId, step_id: step.id, step_code: step.stepCode },
    }, user);

    return step;
  }

  async acknowledgeNoticeStep(user: CurrentUser, stepId: string, dto: AcknowledgeNoticeStepDto, correlationId?: string) {
    // Semua peran yang terlibat dalam rantai pemberitahuan bisa mengupdate status
    requireRoles(user, ['COURT_CLERK', 'PROSECUTOR', 'CORRECTIONS', 'SUBSTITUTE_CLERK']);
    const steps = await this.repository.listNoticeSteps(
      // Cari reading_id dari step — buat query sederhana via getById nanti di postgres
      stepId, user,
    );
    // Dalam memory mode, stepId digunakan sebagai readingId — pakai updateNoticeStep langsung
    const step = await this.repository.updateNoticeStep(stepId, dto.status, dto.receipt_reference, user);

    await this.audit.record('APPEAL_NOTICE_STEP_UPDATED', 'APPEAL_NOTICE_STEP', stepId, user, {
      status: dto.status, receipt_reference: dto.receipt_reference,
    }, correlationId);

    return step;
  }

  async listNoticeSteps(user: CurrentUser, readingId: string) {
    const reading = await this.repository.getById(readingId, user);
    await this.core.getHearing(reading.hearingId, user);
    return this.repository.listNoticeSteps(readingId, user);
  }

  // ── Presence ──────────────────────────────────────────────────────────────

  async recordPresence(user: CurrentUser, readingId: string, dto: RecordPresenceDto, correlationId?: string) {
    requireRoles(user, ['COURT_CLERK', 'CORRECTIONS', 'SUBSTITUTE_CLERK']);
    const reading = await this.repository.getById(readingId, user);

    const presence = await this.repository.recordPresence({
      readingId,
      partyRole: dto.party_role,
      partyReference: dto.party_reference,
      partyName: dto.party_name,
      attendanceStatus: dto.attendance_status,
      attendanceMode: dto.attendance_mode,
      notes: dto.notes,
      verifiedBy: user.id,
    }, user);

    await this.audit.append({
      eventType: 'APPEAL_PRESENCE_RECORDED',
      objectType: 'HEARING',
      objectId: reading.hearingId,
      actorUserId: user.id,
      actorOrganizationId: user.organizationId,
      correlationId,
      payload: {
        appeal_reading_id: readingId,
        party_role: dto.party_role,
        attendance_status: dto.attendance_status,
      },
    }, user);

    return presence;
  }

  async listPresence(user: CurrentUser, readingId: string) {
    const reading = await this.repository.getById(readingId, user);
    await this.core.getHearing(reading.hearingId, user);
    return this.repository.listPresence(readingId, user);
  }

  // ── Publication ───────────────────────────────────────────────────────────

  async publishExcerpt(user: CurrentUser, readingId: string, dto: PublishExcerptDto, correlationId?: string) {
    requireRoles(user, ['COURT_CLERK', 'SUBSTITUTE_CLERK']);
    const reading = await this.repository.getById(readingId, user);

    // Petikan bisa dipublikasikan setelah sidang atau sebelum (jika sudah ada dokumen)
    // Cek same-day compliance jika reading sudah READ
    const sameDayCompliant = reading.readAt
      ? isAppealSameDayCompliant(reading.readAt, dto.published_at, reading.displayTimezone)
      : false; // Belum dibaca = tidak bisa compliant

    const publication = await this.repository.publishExcerpt({
      readingId,
      excerptReference: dto.excerpt_reference,
      sourceSystemCode: dto.source_system_code ?? 'OFFICIAL_CASE_SYSTEM',
      documentHash: dto.document_hash,
      publishedAt: dto.published_at,
      sameDayCompliant,
      publishedBy: user.id,
      notes: dto.notes,
    }, user);

    await this.audit.append({
      eventType: 'APPEAL_EXCERPT_PUBLISHED',
      objectType: 'HEARING',
      objectId: reading.hearingId,
      actorUserId: user.id,
      actorOrganizationId: user.organizationId,
      correlationId,
      payload: {
        appeal_reading_id: readingId,
        excerpt_reference: dto.excerpt_reference,
        same_day_compliant: sameDayCompliant,
        published_at: dto.published_at,
      },
    }, user);

    return publication;
  }

  // ── Transmission ──────────────────────────────────────────────────────────

  async transmit(user: CurrentUser, readingId: string, dto: TransmitDto, correlationId?: string) {
    requireRoles(user, ['COURT_CLERK', 'SUBSTITUTE_CLERK']);
    const reading = await this.repository.getById(readingId, user);

    if (!reading.readAt) {
      throw new DomainError(
        'APPEAL_NOT_READ_YET',
        'Berkas hanya dapat dikirim setelah pembacaan putusan selesai (status READ).',
        409,
      );
    }

    // Hitung 7-day compliance (SOP 10.15 poin 9)
    const sevenDayCompliant = isAppealSevenDayCompliant(reading.readAt, dto.transmitted_at);

    const transmission = await this.repository.transmit({
      readingId,
      destinationCourtId: dto.destination_court_id,
      destinationCourtName: dto.destination_court_name,
      transmissionReference: dto.transmission_reference,
      transmittedAt: dto.transmitted_at,
      sevenDayCompliant,
      documentHash: dto.document_hash,
      transmittedBy: user.id,
      notes: dto.notes,
    }, user);

    await this.audit.append({
      eventType: 'APPEAL_TRANSMITTED_TO_PT1',
      objectType: 'HEARING',
      objectId: reading.hearingId,
      actorUserId: user.id,
      actorOrganizationId: user.organizationId,
      correlationId,
      payload: {
        appeal_reading_id: readingId,
        transmission_reference: dto.transmission_reference,
        destination: dto.destination_court_name,
        seven_day_compliant: sevenDayCompliant,
        transmitted_at: dto.transmitted_at,
      },
    }, user);

    return transmission;
  }
}
