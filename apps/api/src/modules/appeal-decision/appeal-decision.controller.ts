import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Query,
  RawBody,
  Req,
  Res
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { CurrentUserContext, type CurrentUser } from '../../common/current-user.decorator.js';
import { AppealDecisionService } from './appeal-decision.service.js';
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

@ApiTags('appeal-decision')
@Controller('appeal-decisions')
export class AppealDecisionController {
  constructor(private readonly service: AppealDecisionService) {}

  // ── Readings ──────────────────────────────────────────────────────────────

  /** POST /api/v1/appeal-decisions — Buat jadwal pembacaan putusan banding */
  @Post()
  create(
    @Body() dto: CreateAppealReadingDto,
    @CurrentUserContext() user: CurrentUser,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    return this.service.create(user, dto, correlationId);
  }

  /** GET /api/v1/appeal-decisions/hearings/:hearingId — Daftar pembacaan per perkara */
  @Get('hearings/:hearingId')
  list(@Param('hearingId') hearingId: string, @CurrentUserContext() user: CurrentUser) {
    return this.service.list(user, hearingId);
  }

  /** GET /api/v1/appeal-decisions/:id — Detail pembacaan */
  @Get(':id')
  getById(@Param('id') id: string, @CurrentUserContext() user: CurrentUser) {
    return this.service.getById(user, id);
  }

  /** PUT /api/v1/appeal-decisions/:id/reschedule — Perubahan tanggal (penetapan baru) */
  @Put(':id/reschedule')
  reschedule(
    @Param('id') id: string,
    @Body() dto: RescheduleAppealReadingDto,
    @CurrentUserContext() user: CurrentUser,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    return this.service.reschedule(user, id, dto, correlationId);
  }

  /** POST /api/v1/appeal-decisions/:id/read — Catat pembacaan selesai */
  @Post(':id/read')
  markRead(
    @Param('id') id: string,
    @Body() dto: MarkReadDto,
    @CurrentUserContext() user: CurrentUser,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    return this.service.markRead(user, id, dto, correlationId);
  }

  // ── Notice steps (rantai pemberitahuan) ──────────────────────────────────

  /** POST /api/v1/appeal-decisions/:id/notice-steps — Tambah langkah rantai pemberitahuan */
  @Post(':id/notice-steps')
  createNoticeStep(
    @Param('id') readingId: string,
    @Body() dto: CreateNoticeStepDto,
    @CurrentUserContext() user: CurrentUser,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    return this.service.createNoticeStep(user, readingId, dto, correlationId);
  }

  /** GET /api/v1/appeal-decisions/:id/notice-steps — Daftar rantai pemberitahuan */
  @Get(':id/notice-steps')
  listNoticeSteps(@Param('id') readingId: string, @CurrentUserContext() user: CurrentUser) {
    return this.service.listNoticeSteps(user, readingId);
  }

  /** PUT /api/v1/appeal-decisions/notice-steps/:stepId/acknowledge — Update status langkah */
  @Put('notice-steps/:stepId/acknowledge')
  acknowledgeNoticeStep(
    @Param('stepId') stepId: string,
    @Body() dto: AcknowledgeNoticeStepDto,
    @CurrentUserContext() user: CurrentUser,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    return this.service.acknowledgeNoticeStep(user, stepId, dto, correlationId);
  }

  // ── Presence (kehadiran) ─────────────────────────────────────────────────

  /** POST /api/v1/appeal-decisions/:id/presence — Catat kehadiran pihak */
  @Post(':id/presence')
  recordPresence(
    @Param('id') readingId: string,
    @Body() dto: RecordPresenceDto,
    @CurrentUserContext() user: CurrentUser,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    return this.service.recordPresence(user, readingId, dto, correlationId);
  }

  /** GET /api/v1/appeal-decisions/:id/presence — Daftar kehadiran */
  @Get(':id/presence')
  listPresence(@Param('id') readingId: string, @CurrentUserContext() user: CurrentUser) {
    return this.service.listPresence(user, readingId);
  }

  // ── Publication (petikan hari yang sama) ─────────────────────────────────

  /** POST /api/v1/appeal-decisions/:id/publish-excerpt — Unggah petikan putusan */
  @Post(':id/publish-excerpt')
  publishExcerpt(
    @Param('id') readingId: string,
    @Body() dto: PublishExcerptDto,
    @CurrentUserContext() user: CurrentUser,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    return this.service.publishExcerpt(user, readingId, dto, correlationId);
  }

  // ── Transmission (salinan 7 hari ke PT1) ─────────────────────────────────

  /** POST /api/v1/appeal-decisions/:id/transmit — Kirim berkas ke pengadilan tingkat pertama */
  @Post(':id/transmit')
  transmit(
    @Param('id') readingId: string,
    @Body() dto: TransmitDto,
    @CurrentUserContext() user: CurrentUser,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    return this.service.transmit(user, readingId, dto, correlationId);
  }

  // ── Upload & Download Dokumen Penetapan Bertanda Tangan ─────────────────

  /**
   * PUT /api/v1/appeal-decisions/notice-steps/:stepId/document
   *
   * Upload PDF Surat Penetapan yang telah ditandatangani dan dicap.
   * File dikirim sebagai raw binary (bukan multipart) — tidak perlu @fastify/multipart.
   *
   * Headers wajib:
   *   Content-Type: application/pdf  (atau image/jpeg / image/png untuk scan)
   *   X-File-Name: penetapan-pemberitahuan.pdf
   *
   * Batas ukuran: 10 MB.
   * Role: COURT_CLERK, SUBSTITUTE_CLERK.
   */
  @Put('notice-steps/:stepId/document')
  async uploadDocument(
    @Param('stepId') stepId: string,
    @RawBody() body: Buffer,
    @Headers('content-type') contentType: string,
    @Headers('x-file-name') filename: string,
    @CurrentUserContext() user: CurrentUser,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    return this.service.uploadNoticeStepDocument(
      user,
      stepId,
      body,
      filename ?? 'penetapan.pdf',
      contentType ?? 'application/pdf',
      correlationId
    );
  }

  /**
   * GET /api/v1/appeal-decisions/notice-steps/:stepId/document
   *
   * Download PDF Surat Penetapan bertanda tangan dari evidence storage.
   * Response: PDF/gambar dibuka langsung di browser (Content-Disposition: inline).
   *
   * Role: COURT_CLERK, SUBSTITUTE_CLERK, PROSECUTOR, JUDGE, CORRECTIONS, LIAISON_OFFICER.
   */
  @Get('notice-steps/:stepId/document')
  async downloadDocument(
    @Param('stepId') stepId: string,
    @CurrentUserContext() user: CurrentUser,
    @Res() res: FastifyReply,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    const { bytes, filename, contentType, sizeBytes } =
      await this.service.downloadNoticeStepDocument(user, stepId, correlationId);

    const safeFilename = encodeURIComponent(filename).replace(/%20/g, '+');
    return res
      .header('Content-Type', contentType)
      .header('Content-Length', String(sizeBytes))
      .header('Content-Disposition', `inline; filename="${safeFilename}"`)
      .header('Cache-Control', 'private, no-store')
      .send(bytes);
  }

  // ── Generate Surat Penetapan HTML (SEMA No. 2/2026) ──────────────────────

  /**
   * GET /api/v1/appeal-decisions/:id/penetapan-document?document_type=PEMBERITAHUAN
   *
   * Menghasilkan dokumen HTML Surat Penetapan sesuai Format Baku Lampiran SEMA No. 2/2026.
   * Response adalah text/html yang siap dicetak langsung dari browser (Print → Save as PDF).
   *
   * Jenis dokumen (query param document_type):
   *   - PEMBERITAHUAN          → Template I  — Pasal 298 ayat (1) KUHAP
   *   - PERUBAHAN_TANGGAL      → Template II — Pasal 298 ayat (3) KUHAP
   *   - PARAGRAF_PENUTUP_SAMA  → Template III.1 (musyawarah = ucapan)
   *   - PARAGRAF_PENUTUP_BERBEDA → Template III.2 (musyawarah ≠ ucapan)
   *
   * Link Zoom diambil otomatis dari virtual_sessions jika ada, atau dari field
   * zoom_join_url yang diisi manual saat create/reschedule.
   */
  @Get(':id/penetapan-document')
  async generatePenetapan(
    @Param('id') readingId: string,
    @Query('document_type') documentType: string,
    @CurrentUserContext() user: CurrentUser,
    @Res() res: FastifyReply,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    const { html } = await this.service.generatePenetapan(
      user,
      readingId,
      { document_type: documentType } as GeneratePenetapanDto,
      correlationId
    );
    return res
      .header('Content-Type', 'text/html; charset=utf-8')
      .header('Cache-Control', 'no-store')
      .send(html);
  }
}
