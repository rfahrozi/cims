import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUserContext, type CurrentUser } from '../../common/current-user.decorator.js';
import { RequirePermissions } from '../../common/permissions.decorator.js';
import { CreateIncidentDto, IncidentActionDto, NotifyIncidentDto } from './dto.js';
import { IncidentsService } from './incidents.service.js';
@ApiTags('incidents')
@Controller()
export class IncidentsController {
  constructor(private readonly service: IncidentsService) {}
  @Get('hearings/:hearingId/incidents') @RequirePermissions('incident.read') list(
    @Param('hearingId') hearingId: string,
    @CurrentUserContext() user: CurrentUser
  ) {
    return this.service.list(hearingId, user);
  }
  @Post('hearings/:hearingId/incidents') @RequirePermissions('incident.write') create(
    @Param('hearingId') hearingId: string,
    @Body() dto: CreateIncidentDto,
    @CurrentUserContext() user: CurrentUser
  ) {
    return this.service.create(hearingId, dto, user);
  }
  @Post('incidents/:incidentId/actions') @RequirePermissions('incident.write') action(
    @Param('incidentId') incidentId: string,
    @Body() dto: IncidentActionDto,
    @CurrentUserContext() user: CurrentUser
  ) {
    return this.service.action(incidentId, dto, user);
  }
  @Post('incidents/:incidentId/notify') @RequirePermissions('incident.write') notify(
    @Param('incidentId') incidentId: string,
    @Body() dto: NotifyIncidentDto,
    @CurrentUserContext() user: CurrentUser
  ) {
    return this.service.notify(incidentId, dto.notificationReference, user);
  }
  @Get('incidents/notifications/overdue') @RequirePermissions('incident.read') overdue(
    @CurrentUserContext() user: CurrentUser
  ) {
    return this.service.overdue(user);
  }
}
