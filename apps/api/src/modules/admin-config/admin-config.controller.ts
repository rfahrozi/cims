import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUserContext, type CurrentUser } from '../../common/current-user.decorator.js';
import { SensitiveRateGuard, SensitiveEndpoint } from '../../common/sensitive-rate.guard.js';
import { AdminConfigService } from './admin-config.service.js';
import { UpdateSlaConfigDto, UpdateTemplateDto } from './dto.js';

@ApiTags('admin-config')
@Controller('admin')
export class AdminConfigController {
  constructor(private readonly service: AdminConfigService) {}

  // ── Notification Templates ─────────────────────────────────────────────────

  /**
   * List semua template notifikasi per notice_type × channel.
   * M-10 DLP: dibatasi 30 request/menit (data konfigurasi sensitif).
   * Role: SYSTEM_ADMIN
   */
  @Get('notification-templates')
  @UseGuards(SensitiveRateGuard)
  @SensitiveEndpoint({ maxPerMinute: 30, label: 'admin/notification-templates' })
  listTemplates(@CurrentUserContext() user: CurrentUser) {
    return this.service.listTemplates(user);
  }

  /**
   * Update subject, message_body, atau is_active untuk satu template.
   * Role: SYSTEM_ADMIN
   */
  @Put('notification-templates/:id')
  updateTemplate(
    @CurrentUserContext() user: CurrentUser,
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto
  ) {
    return this.service.updateTemplate(user, id, dto);
  }

  // ── SLA Configs ───────────────────────────────────────────────────────────

  /**
   * List semua konfigurasi SLA per notice_type.
   * Role: SYSTEM_ADMIN, AUDITOR, COURT_CLERK
   */
  @Get('sla-configs')
  listSlaConfigs(@CurrentUserContext() user: CurrentUser) {
    return this.service.listSlaConfigs(user);
  }

  /**
   * Update ack_deadline_hours dan/atau reminder_hours untuk satu SLA config.
   * Role: SYSTEM_ADMIN
   */
  @Put('sla-configs/:id')
  updateSlaConfig(
    @CurrentUserContext() user: CurrentUser,
    @Param('id') id: string,
    @Body() dto: UpdateSlaConfigDto
  ) {
    return this.service.updateSlaConfig(user, id, dto);
  }
}
