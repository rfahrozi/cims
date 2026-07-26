import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUserContext, type CurrentUser } from '../../common/current-user.decorator.js';
import { AuditService } from '../../infrastructure/audit.service.js';
import { HearingsService } from './hearings.service.js';
import { SaveAgendaDto } from './dto.js';

@ApiTags('hearings')
@Controller('hearings')
export class HearingsController {
  constructor(
    private readonly service: HearingsService,
    private readonly audit: AuditService
  ) {}

  @Get()
  async list(@CurrentUserContext() user: CurrentUser) {
    return { items: await this.service.list(user) };
  }

  @Get(':id/gate-status')
  gate(@CurrentUserContext() user: CurrentUser, @Param('id') id: string) {
    return this.service.gate(id, user);
  }

  @Get(':id/audit-events')
  async events(@CurrentUserContext() user: CurrentUser, @Param('id') id: string) {
    await this.service.get(id, user);
    return {
      items: await this.audit.list(user, id),
      integrity: await this.audit.verifyChain(user, 'HEARING', id)
    };
  }

  // ── H-03: Agenda multi-item per sidang ────────────────────────────────────

  @Get(':id/agenda')
  getAgenda(@CurrentUserContext() user: CurrentUser, @Param('id') id: string) {
    return this.service.getAgenda(id, user);
  }

  @Put(':id/agenda')
  saveAgenda(
    @CurrentUserContext() user: CurrentUser,
    @Param('id') id: string,
    @Body() dto: SaveAgendaDto
  ) {
    return this.service.saveAgenda(id, dto.items, user);
  }
}
