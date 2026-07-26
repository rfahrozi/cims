import { Body, Controller, Get, Headers, Param, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUserContext, type CurrentUser } from '../../common/current-user.decorator.js';
import { AppealDecisionService } from './appeal-decision.service.js';
import type {
  AcknowledgeNoticeStepDto,
  CreateAppealReadingDto,
  CreateNoticeStepDto,
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
}
