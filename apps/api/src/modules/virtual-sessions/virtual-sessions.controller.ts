import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUserContext, type CurrentUser } from '../../common/current-user.decorator.js';
import { ProvisionVirtualSessionDto } from './dto.js';
import { VirtualSessionsService } from './virtual-sessions.service.js';

@ApiTags('virtual-sessions')
@Controller('hearings/:hearingId/virtual-session')
export class VirtualSessionsController {
  constructor(private readonly service: VirtualSessionsService) {}

  @Post('provision')
  provision(
    @CurrentUserContext() user: CurrentUser,
    @Param('hearingId') id: string,
    @Body() dto: ProvisionVirtualSessionDto,
    @Headers('x-correlation-id') correlationId?: string,
    @Headers('traceparent') traceparent?: string,
  ) {
    return this.service.provision(user, id, dto, correlationId, traceparent);
  }

  @Get()
  get(@CurrentUserContext() user: CurrentUser, @Param('hearingId') id: string) {
    return this.service.get(id, user);
  }
}
