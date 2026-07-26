import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUserContext, type CurrentUser } from '../../common/current-user.decorator.js';
import { RequirePermissions } from '../../common/permissions.decorator.js';
import { GovernanceService } from './governance.service.js';
import {
  CreateAccessReviewDto,
  CreateEvidenceExportDto,
  CreateLegalHoldDto,
  DecideAccessReviewDto,
  ReleaseLegalHoldDto,
  RetentionPreviewDto
} from './dto.js';

@ApiTags('production-governance')
@Controller()
export class GovernanceController {
  constructor(private readonly service: GovernanceService) {}

  @Get('production-readiness')
  @RequirePermissions('production.readiness.read')
  readiness(
    @CurrentUserContext() user: CurrentUser,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    return this.service.readinessAssessment(user, correlationId);
  }

  @Get('hearings/:hearingId/legal-holds')
  @RequirePermissions('governance.read')
  async legalHolds(@CurrentUserContext() user: CurrentUser, @Param('hearingId') hearingId: string) {
    return { items: await this.service.listLegalHolds(user, hearingId) };
  }

  @Post('hearings/:hearingId/legal-holds')
  @RequirePermissions('legal-hold.manage')
  createLegalHold(
    @CurrentUserContext() user: CurrentUser,
    @Param('hearingId') hearingId: string,
    @Body() dto: CreateLegalHoldDto,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    return this.service.createLegalHold(user, hearingId, dto, correlationId);
  }

  @Post('legal-holds/:id/release')
  @RequirePermissions('legal-hold.manage')
  releaseLegalHold(
    @CurrentUserContext() user: CurrentUser,
    @Param('id') id: string,
    @Body() dto: ReleaseLegalHoldDto,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    return this.service.releaseLegalHold(user, id, dto, correlationId);
  }

  @Get('retention/policies')
  @RequirePermissions('retention.read')
  async policies(@CurrentUserContext() user: CurrentUser) {
    return { items: await this.service.retentionPolicies(user) };
  }

  @Post('hearings/:hearingId/retention-preview')
  @RequirePermissions('retention.preview')
  retentionPreview(
    @CurrentUserContext() user: CurrentUser,
    @Param('hearingId') hearingId: string,
    @Body() dto: RetentionPreviewDto,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    return this.service.retentionPreview(user, hearingId, dto, correlationId);
  }

  @Get('hearings/:hearingId/evidence-exports')
  @RequirePermissions('evidence.export')
  async exports(@CurrentUserContext() user: CurrentUser, @Param('hearingId') hearingId: string) {
    return { items: await this.service.listEvidenceExports(user, hearingId) };
  }

  @Post('hearings/:hearingId/evidence-exports')
  @RequirePermissions('evidence.export')
  createExport(
    @CurrentUserContext() user: CurrentUser,
    @Param('hearingId') hearingId: string,
    @Body() dto: CreateEvidenceExportDto,
    @Headers('x-correlation-id') correlationId?: string,
    @Headers('traceparent') traceparent?: string
  ) {
    return this.service.createEvidenceExport(user, hearingId, dto, correlationId, traceparent);
  }

  @Get('evidence-exports/:id')
  @RequirePermissions('evidence.export')
  getExport(@CurrentUserContext() user: CurrentUser, @Param('id') id: string) {
    return this.service.getEvidenceExport(user, id);
  }

  @Post('access-reviews')
  @RequirePermissions('access-review.manage')
  createAccessReview(
    @CurrentUserContext() user: CurrentUser,
    @Body() dto: CreateAccessReviewDto,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    return this.service.createAccessReview(user, dto, correlationId);
  }

  @Get('access-reviews/:id')
  @RequirePermissions('access-review.manage')
  getAccessReview(@CurrentUserContext() user: CurrentUser, @Param('id') id: string) {
    return this.service.getAccessReview(user, id);
  }

  @Post('access-reviews/:campaignId/items/:itemId/decision')
  @RequirePermissions('access-review.manage')
  decideAccessReview(
    @CurrentUserContext() user: CurrentUser,
    @Param('campaignId') campaignId: string,
    @Param('itemId') itemId: string,
    @Body() dto: DecideAccessReviewDto,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    return this.service.decideAccessReview(user, campaignId, itemId, dto, correlationId);
  }
}
