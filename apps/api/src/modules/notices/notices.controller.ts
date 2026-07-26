import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUserContext, type CurrentUser } from '../../common/current-user.decorator.js';
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
   * GET /api/v1/notices/sla-report?hearing_id=xxx (hearing_id opsional — jika kosong, semua hearing)
   * SOP 11: persentase acknowledgment tepat waktu harus termonitor.
   */
  @Get('notices/sla-report')
  slaReport(@CurrentUserContext() user: CurrentUser, @Query('hearing_id') hearingId?: string) {
    return this.service.slaReport(user, hearingId);
  }
}
