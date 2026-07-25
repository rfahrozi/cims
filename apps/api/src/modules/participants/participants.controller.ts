
import { Body, Controller, Get, Param, Post, Headers } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUserContext, type CurrentUser } from '../../common/current-user.decorator.js';
import { Public } from '../../common/public.decorator.js';
import { RequirePermissions } from '../../common/permissions.decorator.js';
import { AdmitParticipantDto, ExchangeJoinTokenDto, IssueJoinTokenDto, ParticipantLeaveDto, RegisterParticipantDto, StartConsultationDto, RecordLocationDto } from './dto.js';
import { ParticipantsService } from './participants.service.js';
@ApiTags('participants') @Controller()
export class ParticipantsController {
  constructor(private readonly service: ParticipantsService) {}
  @Get('hearings/:hearingId/participants') @RequirePermissions('participant.read') list(@Param('hearingId') hearingId: string, @CurrentUserContext() user: CurrentUser) { return this.service.list(hearingId, user); }
  @Post('hearings/:hearingId/participants') @RequirePermissions('participant.write') register(@Param('hearingId') hearingId: string, @Body() dto: RegisterParticipantDto, @CurrentUserContext() user: CurrentUser) { return this.service.register(hearingId, dto, user); }
  @Post('hearings/:hearingId/participants/:participantId/join-token') @RequirePermissions('participant.write') issue(@Param('hearingId') hearingId: string, @Param('participantId') participantId: string, @Body() dto: IssueJoinTokenDto, @CurrentUserContext() user: CurrentUser) { return this.service.issueToken(hearingId, participantId, dto.ttlSeconds, user); }
  @Public() @Post('public/join-tokens/exchange') exchange(@Body() dto: ExchangeJoinTokenDto) { return this.service.exchange(dto.token); }
  @Post('hearings/:hearingId/participants/:participantId/admit') @RequirePermissions('participant.admit') admit(@Param('hearingId') hearingId: string, @Param('participantId') participantId: string, @Body() dto: AdmitParticipantDto, @CurrentUserContext() user: CurrentUser) { return this.service.admit(hearingId, participantId, dto, user); }
  @Post('hearings/:hearingId/participants/:participantId/leave') @RequirePermissions('participant.admit') leave(@Param('hearingId') hearingId: string, @Param('participantId') participantId: string, @Body() dto: ParticipantLeaveDto, @CurrentUserContext() user: CurrentUser) { return this.service.leave(hearingId, participantId, dto.reason, user); }
  @Get('hearings/:hearingId/attendance') @RequirePermissions('attendance.read') attendance(@Param('hearingId') hearingId: string, @CurrentUserContext() user: CurrentUser) { return this.service.attendance(hearingId, user); }
  @Post('hearings/:hearingId/consultations') @RequirePermissions('consultation.manage') startConsultation(@Param('hearingId') hearingId: string, @Body() dto: StartConsultationDto, @CurrentUserContext() user: CurrentUser) { return this.service.startConsultation(hearingId, dto, user); }
  @Post('hearings/:hearingId/consultations/current/end') @RequirePermissions('consultation.manage') endConsultation(@Param('hearingId') hearingId: string, @CurrentUserContext() user: CurrentUser) { return this.service.endConsultation(hearingId, user); }

  @Post('hearings/:hearingId/participants/:id/location')
  recordLocation(
    @Param('hearingId') hearingId: string,
    @Param('id') participantId: string,
    @Body() dto: RecordLocationDto,
    @CurrentUserContext() user: CurrentUser,
    @Headers('x-correlation-id') correlationId?: string,
  ) {
    return this.service.recordLocation(hearingId, participantId, dto, user, correlationId);
  }
}
