import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUserContext, type CurrentUser } from '../../common/current-user.decorator.js';
import { RequestReconciliationDto } from './dto.js';
import { ReconciliationService } from './reconciliation.service.js';

@ApiTags('reconciliation')
@Controller()
export class ReconciliationController {
  constructor(private readonly service: ReconciliationService) {}

  @Post('hearings/:hearingId/reconciliation-runs')
  request(
    @CurrentUserContext() user: CurrentUser,
    @Param('hearingId') hearingId: string,
    @Body() dto: RequestReconciliationDto,
    @Headers('x-correlation-id') correlationId?: string,
    @Headers('traceparent') traceparent?: string,
  ) {
    return this.service.request(user, hearingId, dto, correlationId, traceparent);
  }

  @Get('hearings/:hearingId/reconciliation-runs')
  async list(@CurrentUserContext() user: CurrentUser, @Param('hearingId') hearingId: string) {
    return { items: await this.service.list(user, hearingId) };
  }

  @Get('reconciliation-runs/:id')
  get(@CurrentUserContext() user: CurrentUser, @Param('id') id: string) {
    return this.service.get(user, id);
  }
}
