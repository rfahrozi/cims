import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUserContext, type CurrentUser } from '../../common/current-user.decorator.js';
import { ApproveProposalDto, CalendarQueryDto, CheckProposalDto, CreateProposalDto } from './dto.js';
import { SchedulingService } from './scheduling.service.js';

@ApiTags('scheduling')
@Controller()
export class SchedulingController {
  constructor(private readonly service: SchedulingService) {}

  @Get('calendar')
  calendar(
    @CurrentUserContext() user: CurrentUser,
    @Query() query: CalendarQueryDto,
  ) {
    return this.service.listCalendar(user, query.from, query.to, query.organization_id);
  }

  @Post('hearings/:hearingId/schedule-proposals')
  create(
    @CurrentUserContext() user: CurrentUser,
    @Param('hearingId') id: string,
    @Body() dto: CreateProposalDto,
    @Headers('x-correlation-id') correlationId?: string,
  ) {
    return this.service.create(user, id, dto, correlationId);
  }

  @Post('schedule-proposals/:proposalId/conflicts:check')
  check(
    @CurrentUserContext() user: CurrentUser,
    @Param('proposalId') id: string,
    @Body() dto: CheckProposalDto,
    @Headers('x-correlation-id') correlationId?: string,
  ) {
    return this.service.check(user, id, dto, correlationId);
  }

  @Post('schedule-proposals/:proposalId:approve')
  approve(
    @CurrentUserContext() user: CurrentUser,
    @Param('proposalId') id: string,
    @Body() dto: ApproveProposalDto,
    @Headers('x-correlation-id') correlationId?: string,
  ) {
    return this.service.approve(user, id, dto, correlationId);
  }
}
