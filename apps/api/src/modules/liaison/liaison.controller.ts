import { Body, Controller, Delete, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUserContext, type CurrentUser } from '../../common/current-user.decorator.js';
import { LiaisonService } from './liaison.service.js';
import type {
  CreateDelegationDto,
  CreateEscalationDto,
  CreateLiaisonOfficerDto,
  CreateOrganizationUnitDto,
  DeactivateLiaisonOfficerDto,
  ResolveEscalationDto,
  RevokeDelegationDto
} from './dto.js';

@ApiTags('liaison')
@Controller()
export class LiaisonController {
  constructor(private readonly service: LiaisonService) {}

  // ── Organization units ────────────────────────────────────────────────────

  @Post('organizations/:orgId/units')
  createUnit(
    @Param('orgId') orgId: string,
    @Body() dto: CreateOrganizationUnitDto,
    @CurrentUserContext() user: CurrentUser,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    return this.service.createUnit(user, { ...dto, organization_id: orgId }, correlationId);
  }

  @Get('organizations/:orgId/units')
  listUnits(@Param('orgId') orgId: string) {
    return this.service.listUnits(orgId);
  }

  // ── Liaison officers ──────────────────────────────────────────────────────

  @Post('organizations/:orgId/liaison-officers')
  createLiaison(
    @Param('orgId') orgId: string,
    @Body() dto: CreateLiaisonOfficerDto,
    @CurrentUserContext() user: CurrentUser,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    return this.service.createLiaison(user, { ...dto, organization_id: orgId }, correlationId);
  }

  @Get('organizations/:orgId/liaison-officers')
  listLiaisons(@Param('orgId') orgId: string, @CurrentUserContext() user: CurrentUser) {
    return this.service.listLiaisons(orgId, user);
  }

  @Delete('liaison-officers/:id')
  deactivateLiaison(
    @Param('id') id: string,
    @Body() dto: DeactivateLiaisonOfficerDto,
    @CurrentUserContext() user: CurrentUser,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    return this.service.deactivateLiaison(id, dto.reason, user, correlationId);
  }

  // ── Delegations ───────────────────────────────────────────────────────────

  @Post('organizations/:orgId/delegations')
  createDelegation(
    @Param('orgId') orgId: string,
    @Body() dto: CreateDelegationDto,
    @CurrentUserContext() user: CurrentUser,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    return this.service.createDelegation(user, { ...dto, organization_id: orgId }, correlationId);
  }

  @Get('organizations/:orgId/delegations')
  listDelegations(@Param('orgId') orgId: string, @CurrentUserContext() user: CurrentUser) {
    return this.service.listDelegations(orgId, user);
  }

  @Delete('delegations/:id')
  revokeDelegation(
    @Param('id') id: string,
    @Body() dto: RevokeDelegationDto,
    @CurrentUserContext() user: CurrentUser,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    return this.service.revokeDelegation(id, dto, user, correlationId);
  }

  // ── Escalations ───────────────────────────────────────────────────────────

  @Post('liaison-escalations')
  createEscalation(
    @Body() dto: CreateEscalationDto,
    @CurrentUserContext() user: CurrentUser,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    return this.service.createEscalation(user, dto, correlationId);
  }

  @Get('liaison-escalations')
  listEscalations(
    @Query('hearing_id') hearingId: string | undefined,
    @Query('liaison_officer_id') liaisonOfficerId: string | undefined,
    @CurrentUserContext() user: CurrentUser
  ) {
    return this.service.listEscalations(hearingId, liaisonOfficerId, user);
  }

  @Post('liaison-escalations/:id/resolve')
  resolveEscalation(
    @Param('id') id: string,
    @Body() dto: ResolveEscalationDto,
    @CurrentUserContext() user: CurrentUser,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    return this.service.resolveEscalation(id, dto, user, correlationId);
  }
}
