import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  Param,
  Post,
  Query,
  UseGuards
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUserContext, type CurrentUser } from '../../common/current-user.decorator.js';
import { SensitiveRateGuard, SensitiveEndpoint } from '../../common/sensitive-rate.guard.js';
import { AcknowledgeNoticeDto, CreateNoticeDto } from './dto.js';
import { NoticesService } from './notices.service.js';

@ApiTags('official-notices')
@Controller()
export class NoticesController {
  constructor(private readonly service: NoticesService) {}

  @Post('hearings/:hearingId/notices')
  create(
    @CurrentUserContext() user: CurrentUser,
    @Param('hearingId') id: string,
    @Body() dto: CreateNoticeDto,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    return this.service.create(user, id, dto, correlationId);
  }

  @Post('notices/:noticeId/send')
  send(
    @CurrentUserContext() user: CurrentUser,
    @Param('noticeId') id: string,
    @Headers('x-correlation-id') correlationId?: string,
    @Headers('traceparent') traceparent?: string
  ) {
    return this.service.send(user, id, correlationId, traceparent);
  }

  @Post('notices/:noticeId/acknowledge')
  acknowledge(
    @CurrentUserContext() user: CurrentUser,
    @Param('noticeId') id: string,
    @Body() dto: AcknowledgeNoticeDto,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    return this.service.acknowledge(user, id, dto, correlationId);
  }

  @Get('hearings/:hearingId/notices')
  async list(@CurrentUserContext() user: CurrentUser, @Param('hearingId') id: string) {
    return { gate: await this.service.gate(id, user), items: await this.service.list(id, user) };
  }

  /**
   * H-10: SLA Report — daftar acknowledgment yang melewati deadline.
   * M-10 DLP: Dibatasi 20 request/menit per IP (endpoint menghasilkan data bulk agregat).
   * GET /api/v1/notices/sla-report?hearing_id=xxx (hearing_id opsional)
   */
  @Get('notices/sla-report')
  @UseGuards(SensitiveRateGuard)
  @SensitiveEndpoint({ maxPerMinute: 20, label: 'notices/sla-report' })
  slaReport(@CurrentUserContext() user: CurrentUser, @Query('hearing_id') hearingId?: string) {
    return this.service.slaReport(user, hearingId);
  }

  /**
   * GAP-04: Export Laporan Periodik
   * Mengekspor data SLA Report ke format CSV untuk kebutuhan audit/rekonsiliasi.
   * Dibatasi 5 request/menit untuk mencegah mass eksport.
   */
  @Get('notices/sla-report/export')
  @UseGuards(SensitiveRateGuard)
  @SensitiveEndpoint({ maxPerMinute: 5, label: 'notices/sla-report/export' })
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="sla-overdue-report.csv"')
  async exportSlaReport(
    @CurrentUserContext() user: CurrentUser,
    @Query('hearing_id') hearingId?: string
  ) {
    const data = await this.service.slaReport(user, hearingId);

    // Header CSV
    let csv =
      'Hearing ID,Notice ID,Tipe Pemberitahuan,Penerima,Channel,Batas Waktu ACK,Keterlambatan (Menit)\n';

    // Baris CSV
    for (const item of data) {
      const row = [
        item.hearingId,
        item.noticeId,
        item.noticeType,
        `"${item.recipientName.replace(/"/g, '""')}"`, // escape quotes
        item.channel,
        item.ackDeadline,
        item.overdueMinutes
      ];
      csv += row.join(',') + '\n';
    }

    return csv;
  }
}
