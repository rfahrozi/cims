import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUserContext, type CurrentUser } from '../../common/current-user.decorator.js';
import { IdentityVerificationDto, RoomInspectionDto, SubmitReadinessDto } from './dto.js';
import { ReadinessService } from './readiness.service.js';

@ApiTags('readiness')
@Controller('hearings/:hearingId')
export class ReadinessController {
  constructor(private readonly service: ReadinessService) {}

  @Post('identity-verifications')
  verify(
    @CurrentUserContext() user: CurrentUser,
    @Param('hearingId') id: string,
    @Body() dto: IdentityVerificationDto,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    return this.service.verifyIdentity(user, id, dto, correlationId);
  }

  @Post('room-inspections')
  inspect(
    @CurrentUserContext() user: CurrentUser,
    @Param('hearingId') id: string,
    @Body() dto: RoomInspectionDto,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    return this.service.inspectRoom(user, id, dto, correlationId);
  }

  @Post('readiness-submissions')
  submit(
    @CurrentUserContext() user: CurrentUser,
    @Param('hearingId') id: string,
    @Body() dto: SubmitReadinessDto,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    return this.service.submit(user, id, dto, correlationId);
  }

  @Get('readiness')
  async list(@CurrentUserContext() user: CurrentUser, @Param('hearingId') id: string) {
    return { gate: await this.service.gate(id, user), items: await this.service.list(id, user) };
  }
}
