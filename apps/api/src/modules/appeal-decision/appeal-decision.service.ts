import { Injectable } from '@nestjs/common';
import {
  DomainError,
  cassationDeadline,
  isAppealSameDayCompliant,
  isAppealSevenDayCompliant
} from '@cims/domain';
import { createHash } from 'node:crypto';
import { requireRoles } from '../../common/authorization.js';
import type { CurrentUser } from '../../common/current-user.decorator.js';
import { AuditService } from '../../infrastructure/observability/audit.service.js';
import { CoreWorkflowRepository } from '../../infrastructure/persistence/repositories/core-workflow.repository.js';
import { EvidenceStorageGateway } from '../../infrastructure/integration/evidence-storage.gateway.js';
import { AppealDecisionRepository } from './appeal-decision.repository.js';
import {
  PenetapanDocumentService,
  VALID_DOCUMENT_TYPES,
  type PenetapanDocumentType
} from './penetapan-document.service.js';
import type {
  AcknowledgeNoticeStepDto,
  CreateAppealReadingDto,
  CreateNoticeStepDto,
  GeneratePenetapanDto,
  MarkReadDto,
  PublishExcerptDto,
  RecordPresenceDto,
  RescheduleAppealReadingDto,
  TransmitDto
} from './dto.js';

/** MIME types yang diizinkan untuk upload dokumen Penetapan */
const ALLOWED_CONTENT_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);

/** Batas ukuran file upload: 10 MB */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

@Injectable()
export class AppealDecisionService {
  constructor(
    private readonly repository: AppealDecisionRepository,
    private readonly core: CoreWorkflowRepository,
    private readonly audit: AuditService,
    private readonly penetapanDocument: PenetapanDocumentService,
    private readonly evidenceStorage: EvidenceStorageGateway
  ) {}

  // ── Readings ──────────────────────────────────────────────────────────────

  async create(user: CurrentUser, dto: CreateAppealReadingDto, correlationId?: string) {
    requireRoles(user, ['COURT_CLERK', 'JUDGE']);
    await this.core.assertActiveIntake(dto.hearing_id, user);

    const reading = await this.repository.create(
      {
        hearingId: dto.hearing_id,
        scheduledAt: dto.scheduled_at,
        displayTimezone: dto.display_timezone ?? 'Asia/Jakarta',
        deliveryMode: dto.delivery_mode,
        determinationReference: dto.determination_reference,
        virtualSessionReference: dto.virtual_session_reference,
        openToPublic: dto.open_to_public !== false,
        createdBy: user.id,
        // Kolom SEMA No. 2/2026
        courtName: dto.court_name,
        penetapanCity: dto.penetapan_city,
        penetapanNumber: dto.penetapan_number,
        zoomJoinUrl: dto.zoom_join_url,
        zoomPassword: dto.zoom_password,
        hakimKetua: dto.hakim_ketua,
        hakimAnggota: dto.hakim_anggota,
        paniterapengganti: dto.panitera_pengganti,
        penuntutUmum: dto.penuntut_umum,
        deliberationDate: dto.deliberation_date
      },
      user
    );

    await this.audit.append(
      {
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
          determination_reference: reading.determinationReference
        }
      },
      user
    );

    return reading;
  }

  async reschedule(
    user: CurrentUser,
    id: string,
    dto: RescheduleAppealReadingDto,
    correlationId?: string
  ) {
    requireRoles(user, ['COURT_CLERK', 'JUDGE']);
    const existing = await this.repository.getById(id, user);

    const reading = await this.repository.reschedule(
      id,
      {
        scheduledAt: dto.scheduled_at,
        deliveryMode: dto.delivery_mode,
        rescheduleReason: dto.reschedule_reason,
        determinationReference: dto.determination_reference,
        virtualSessionReference: dto.virtual_session_reference,
        updatedBy: user.id,
        // Kolom SEMA No. 2/2026 — diperbarui jika diisi
        courtName: dto.court_name,
        penetapanCity: dto.penetapan_city,
        penetapanNumber: dto.penetapan_number,
        zoomJoinUrl: dto.zoom_join_url,
        zoomPassword: dto.zoom_password,
        hakimKetua: dto.hakim_ketua,
        hakimAnggota: dto.hakim_anggota,
        paniterapengganti: dto.panitera_pengganti,
        penuntutUmum: dto.penuntut_umum,
        deliberationDate: dto.deliberation_date
      },
      user
    );

    await this.audit.append(
      {
        eventType: 'APPEAL_READING_RESCHEDULED',
        objectType: 'HEARING',
        objectId: existing.hearingId,
        actorUserId: user.id,
        actorOrganizationId: user.organizationId,
        correlationId,
        payload: {
          appeal_reading_id: id,
          new_scheduled_at: dto.scheduled_at,
          reason: dto.reschedule_reason
        }
      },
      user
    );

    return reading;
  }

  async markRead(user: CurrentUser, id: string, dto: MarkReadDto, correlationId?: string) {
    requireRoles(user, ['COURT_CLERK', 'JUDGE']);
    const existing = await this.repository.getById(id, user);

    // Hitung tenggat kasasi 14 hari sebagai referensi (SOP 10.15 poin 10)
    const computedDeadline = cassationDeadline(dto.read_at);
    const deadlineAt = dto.cassation_deadline_at ?? computedDeadline;

    const reading = await this.repository.markRead(id, dto.read_at, deadlineAt, user);

    await this.audit.append(
      {
        eventType: 'APPEAL_READING_COMPLETED',
        objectType: 'HEARING',
        objectId: existing.hearingId,
        actorUserId: user.id,
        actorOrganizationId: user.organizationId,
        correlationId,
        payload: {
          appeal_reading_id: id,
          read_at: dto.read_at,
          cassation_deadline_at: deadlineAt
        }
      },
      user
    );

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

  async createNoticeStep(
    user: CurrentUser,
    readingId: string,
    dto: CreateNoticeStepDto,
    correlationId?: string
  ) {
    requireRoles(user, ['COURT_CLERK', 'PROSECUTOR']);
    const reading = await this.repository.getById(readingId, user);
    await this.core.getHearing(reading.hearingId, user);

    const step = await this.repository.createNoticeStep(
      {
        readingId,
        stepCode: dto.step_code,
        senderOrganizationId: dto.sender_organization_id,
        recipientReference: dto.recipient_reference,
        recipientName: dto.recipient_name,
        channel: dto.channel,
        officialReference: dto.official_reference,
        createdBy: user.id
      },
      user
    );

    await this.audit.append(
      {
        eventType: 'APPEAL_NOTICE_STEP_CREATED',
        objectType: 'HEARING',
        objectId: reading.hearingId,
        actorUserId: user.id,
        actorOrganizationId: user.organizationId,
        correlationId,
        payload: { appeal_reading_id: readingId, step_id: step.id, step_code: step.stepCode }
      },
      user
    );

    return step;
  }

  async acknowledgeNoticeStep(
    user: CurrentUser,
    stepId: string,
    dto: AcknowledgeNoticeStepDto,
    correlationId?: string
  ) {
    // Semua peran yang terlibat dalam rantai pemberitahuan bisa mengupdate status
    requireRoles(user, ['COURT_CLERK', 'PROSECUTOR', 'CORRECTIONS', 'SUBSTITUTE_CLERK']);

    // Ambil step terlebih dahulu untuk mendapatkan readingId yang benar
    const existingStep = await this.repository.getNoticeStepById(stepId, user);

    const step = await this.repository.updateNoticeStep(
      stepId,
      dto.status,
      dto.receipt_reference,
      user
    );

    await this.audit.append(
      {
        eventType: 'APPEAL_NOTICE_STEP_ACKNOWLEDGED',
        objectType: 'APPEAL_NOTICE_STEP',
        objectId: existingStep.readingId,
        actorUserId: user.id,
        actorOrganizationId: user.organizationId,
        correlationId,
        payload: {
          step_id: stepId,
          status: dto.status,
          receipt_reference: dto.receipt_reference
        }
      },
      user
    );

    return step;
  }

  async listNoticeSteps(user: CurrentUser, readingId: string) {
    const reading = await this.repository.getById(readingId, user);
    await this.core.getHearing(reading.hearingId, user);
    return this.repository.listNoticeSteps(readingId, user);
  }

  // ── Presence ──────────────────────────────────────────────────────────────

  async recordPresence(
    user: CurrentUser,
    readingId: string,
    dto: RecordPresenceDto,
    correlationId?: string
  ) {
    requireRoles(user, ['COURT_CLERK', 'CORRECTIONS', 'SUBSTITUTE_CLERK']);
    const reading = await this.repository.getById(readingId, user);

    const presence = await this.repository.recordPresence(
      {
        readingId,
        partyRole: dto.party_role,
        partyReference: dto.party_reference,
        partyName: dto.party_name,
        attendanceStatus: dto.attendance_status,
        attendanceMode: dto.attendance_mode,
        notes: dto.notes,
        verifiedBy: user.id
      },
      user
    );

    await this.audit.append(
      {
        eventType: 'APPEAL_PRESENCE_RECORDED',
        objectType: 'HEARING',
        objectId: reading.hearingId,
        actorUserId: user.id,
        actorOrganizationId: user.organizationId,
        correlationId,
        payload: {
          appeal_reading_id: readingId,
          party_role: dto.party_role,
          attendance_status: dto.attendance_status
        }
      },
      user
    );

    return presence;
  }

  async listPresence(user: CurrentUser, readingId: string) {
    const reading = await this.repository.getById(readingId, user);
    await this.core.getHearing(reading.hearingId, user);
    return this.repository.listPresence(readingId, user);
  }

  // ── Publication ───────────────────────────────────────────────────────────

  async publishExcerpt(
    user: CurrentUser,
    readingId: string,
    dto: PublishExcerptDto,
    correlationId?: string
  ) {
    requireRoles(user, ['COURT_CLERK', 'SUBSTITUTE_CLERK']);
    const reading = await this.repository.getById(readingId, user);

    // Petikan bisa dipublikasikan setelah sidang atau sebelum (jika sudah ada dokumen)
    // Cek same-day compliance jika reading sudah READ
    const sameDayCompliant = reading.readAt
      ? isAppealSameDayCompliant(reading.readAt, dto.published_at, reading.displayTimezone)
      : false; // Belum dibaca = tidak bisa compliant

    const publication = await this.repository.publishExcerpt(
      {
        readingId,
        excerptReference: dto.excerpt_reference,
        sourceSystemCode: dto.source_system_code ?? 'OFFICIAL_CASE_SYSTEM',
        documentHash: dto.document_hash,
        publishedAt: dto.published_at,
        sameDayCompliant,
        publishedBy: user.id,
        notes: dto.notes
      },
      user
    );

    await this.audit.append(
      {
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
          published_at: dto.published_at
        }
      },
      user
    );

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
        409
      );
    }

    // Hitung 7-day compliance (SOP 10.15 poin 9)
    const sevenDayCompliant = isAppealSevenDayCompliant(reading.readAt, dto.transmitted_at);

    const transmission = await this.repository.transmit(
      {
        readingId,
        destinationCourtId: dto.destination_court_id,
        destinationCourtName: dto.destination_court_name,
        transmissionReference: dto.transmission_reference,
        transmittedAt: dto.transmitted_at,
        sevenDayCompliant,
        documentHash: dto.document_hash,
        transmittedBy: user.id,
        notes: dto.notes
      },
      user
    );

    await this.audit.append(
      {
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
          transmitted_at: dto.transmitted_at
        }
      },
      user
    );

    return transmission;
  }

  // ── Upload & Download Dokumen Penetapan Bertanda Tangan ───────────────────

  /**
   * Upload PDF Surat Penetapan yang telah ditandatangani dan dicap oleh Panitera.
   * File disimpan ke EvidenceStorageGateway (LOCAL/S3/HTTP sesuai konfigurasi).
   * Metadata (hash, filename, size) disimpan ke kolom document_* di appeal_notice_steps.
   *
   * Setelah upload, Kejaksaan dan pihak terkait dapat mengakses dokumen via
   * downloadNoticeStepDocument() tanpa perlu pengiriman manual.
   */
  async uploadNoticeStepDocument(
    user: CurrentUser,
    stepId: string,
    fileBuffer: Buffer,
    filename: string,
    contentType: string,
    correlationId?: string
  ) {
    requireRoles(user, ['COURT_CLERK', 'SUBSTITUTE_CLERK']);

    // Validasi ukuran file
    if (fileBuffer.length === 0)
      throw new DomainError('DOCUMENT_EMPTY', 'File tidak boleh kosong.', 400);
    if (fileBuffer.length > MAX_FILE_SIZE_BYTES)
      throw new DomainError(
        'DOCUMENT_TOO_LARGE',
        `Ukuran file maksimal adalah ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB.`,
        400,
        { sizeBytes: fileBuffer.length, maxBytes: MAX_FILE_SIZE_BYTES }
      );

    // Validasi content type
    const normalizedContentType = contentType.split(';')[0].trim().toLowerCase();
    if (!ALLOWED_CONTENT_TYPES.has(normalizedContentType))
      throw new DomainError(
        'DOCUMENT_TYPE_NOT_ALLOWED',
        'Hanya file PDF, JPEG, atau PNG yang diizinkan.',
        400,
        { contentType, allowed: [...ALLOWED_CONTENT_TYPES] }
      );

    // Validasi filename
    const safeFilename = filename.trim() || `penetapan-${stepId}.pdf`;

    // Cek notice step ada dan user berhak akses
    const step = await this.repository.getNoticeStepById(stepId, user);

    // Hitung SHA-256 hash untuk integritas
    const hash = createHash('sha256').update(fileBuffer).digest('hex');

    // Object key: termasuk stepId agar tidak collision + timestamp untuk versi baru
    const ext = safeFilename.includes('.') ? safeFilename.split('.').pop() : 'bin';
    const objectKey = `appeal-notice-steps/${stepId}/penetapan-${Date.now()}.${ext}`;

    // Upload ke evidence storage
    await this.evidenceStorage.putBuffer(
      objectKey,
      fileBuffer,
      hash,
      normalizedContentType,
      correlationId
    );

    // Simpan metadata ke DB
    const updated = await this.repository.attachDocument(
      stepId,
      {
        storageKey: objectKey,
        hash,
        filename: safeFilename,
        sizeBytes: fileBuffer.length,
        contentType: normalizedContentType,
        uploadedBy: user.id
      },
      user
    );

    await this.audit.append(
      {
        eventType: 'APPEAL_PENETAPAN_UPLOADED',
        objectType: 'HEARING',
        objectId: step.readingId,
        actorUserId: user.id,
        actorOrganizationId: user.organizationId,
        correlationId,
        payload: {
          step_id: stepId,
          step_code: step.stepCode,
          filename: safeFilename,
          size_bytes: fileBuffer.length,
          content_type: normalizedContentType,
          object_hash: hash,
          object_key: objectKey
        }
      },
      user
    );

    return updated;
  }

  /**
   * Download PDF Surat Penetapan bertanda tangan dari evidence storage.
   * Dapat diakses oleh Kejaksaan, Panitera, Hakim, dan Pemasyarakatan
   * yang terdaftar di rantai pemberitahuan sidang yang sama.
   */
  async downloadNoticeStepDocument(
    user: CurrentUser,
    stepId: string,
    correlationId?: string
  ): Promise<{ bytes: Buffer; filename: string; contentType: string; sizeBytes: number }> {
    requireRoles(user, [
      'COURT_CLERK',
      'SUBSTITUTE_CLERK',
      'PROSECUTOR',
      'JUDGE',
      'CORRECTIONS',
      'LIAISON_OFFICER'
    ]);

    // Cek step ada dan user berhak akses (RLS via transactionAs)
    const step = await this.repository.getNoticeStepById(stepId, user);

    if (!step.documentStorageKey)
      throw new DomainError(
        'DOCUMENT_NOT_UPLOADED',
        'Dokumen Penetapan belum diupload untuk langkah pemberitahuan ini.',
        404
      );

    // Ambil file dari evidence storage
    const { bytes, contentType, sizeBytes } = await this.evidenceStorage.getBuffer(
      step.documentStorageKey,
      correlationId
    );

    await this.audit.append(
      {
        eventType: 'APPEAL_PENETAPAN_DOWNLOADED',
        objectType: 'HEARING',
        objectId: step.readingId,
        actorUserId: user.id,
        actorOrganizationId: user.organizationId,
        correlationId,
        payload: {
          step_id: stepId,
          step_code: step.stepCode,
          filename: step.documentFilename,
          size_bytes: sizeBytes
        }
      },
      user
    );

    return {
      bytes,
      filename: step.documentFilename ?? 'penetapan.pdf',
      contentType: step.documentContentType ?? contentType,
      sizeBytes
    };
  }

  // ── Generate Surat Penetapan HTML (SEMA No. 2/2026) ──────────────────────

  /**
   * Generate dokumen HTML Surat Penetapan sesuai Format Baku Lampiran SEMA No. 2/2026.
   * Mengembalikan HTML string siap dikirim ke browser sebagai text/html.
   *
   * Sumber Link Zoom (fallback bertingkat):
   *   1. virtual_sessions.provider_session_reference → https://zoom.us/j/{id}
   *   2. appeal_readings.zoom_join_url (input manual)
   *   3. Placeholder "[Tautan akan disampaikan terpisah]"
   */
  async generatePenetapan(
    user: CurrentUser,
    readingId: string,
    dto: GeneratePenetapanDto,
    correlationId?: string
  ): Promise<{ html: string; documentType: string; readingId: string }> {
    requireRoles(user, ['COURT_CLERK', 'JUDGE', 'SUBSTITUTE_CLERK']);

    if (!VALID_DOCUMENT_TYPES.includes(dto.document_type as PenetapanDocumentType)) {
      throw new DomainError(
        'INVALID_DOCUMENT_TYPE',
        `document_type harus salah satu dari: ${VALID_DOCUMENT_TYPES.join(', ')}`,
        400
      );
    }

    const readingWithSession = await this.repository.getWithSession(readingId, user);

    const html = this.penetapanDocument.render(
      readingWithSession,
      dto.document_type as PenetapanDocumentType,
      readingWithSession.providerSessionReference
    );

    await this.audit.append(
      {
        eventType: 'APPEAL_PENETAPAN_GENERATED',
        objectType: 'HEARING',
        objectId: readingWithSession.hearingId,
        actorUserId: user.id,
        actorOrganizationId: user.organizationId,
        correlationId,
        payload: {
          appeal_reading_id: readingId,
          document_type: dto.document_type,
          delivery_mode: readingWithSession.deliveryMode,
          has_zoom_session: Boolean(readingWithSession.providerSessionReference),
          has_manual_zoom_url: Boolean(readingWithSession.zoomJoinUrl)
        }
      },
      user
    );

    return { html, documentType: dto.document_type, readingId };
  }
}
