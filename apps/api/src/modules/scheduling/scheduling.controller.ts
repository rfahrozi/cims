import { Body, Controller, Headers, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUserContext, type CurrentUser } from '../../common/current-user.decorator.js';
import { ApproveProposalDto, CheckProposalDto, CreateProposalDto } from './dto.js';
import { SchedulingService } from './scheduling.service.js';

@ApiTags('scheduling')
@Controller()
export class SchedulingController {
  constructor(private readonly service: SchedulingService) {}

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
