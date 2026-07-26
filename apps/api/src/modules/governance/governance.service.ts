import { Injectable } from '@nestjs/common';
import { DomainError } from '@cims/domain';
import { requireRoles } from '../../common/authorization.js';
import type { CurrentUser } from '../../common/current-user.decorator.js';
import { AuditService } from '../../infrastructure/observability/audit.service.js';
import { ProductionReadinessService } from '../../infrastructure/security/production-readiness.service.js';
import { GovernanceRepository } from '../../infrastructure/persistence/repositories/governance.repository.js';
import type {
  CreateAccessReviewDto,
  CreateEvidenceExportDto,
  CreateLegalHoldDto,
  DecideAccessReviewDto,
  ReleaseLegalHoldDto,
  RetentionPreviewDto
} from './dto.js';

@Injectable()
export class GovernanceService {
  constructor(
    private readonly repository: GovernanceRepository,
    private readonly readiness: ProductionReadinessService,
    private readonly audit: AuditService
  ) {}

  readinessAssessment(user: CurrentUser, correlationId?: string) {
    requireRoles(user, ['AUDITOR', 'SECURITY_OFFICER', 'SYSTEM_ADMIN']);
    return this.readiness.assess(user, correlationId);
  }

  listLegalHolds(user: CurrentUser, hearingId: string) {
    requireRoles(user, ['COURT_CLERK', 'AUDITOR', 'SECURITY_OFFICER']);
    return this.repository.listLegalHolds(hearingId, user);
  }

  async createLegalHold(
    user: CurrentUser,
    hearingId: string,
    dto: CreateLegalHoldDto,
    correlationId?: string
  ) {
    requireRoles(user, ['COURT_CLERK', 'AUDITOR']);
    const item = await this.repository.createLegalHold(
      hearingId,
      { holdType: dto.hold_type, reason: dto.reason, officialReference: dto.official_reference },
      user
    );
    await this.audit.append(
      {
        eventType: 'LEGAL_HOLD_CREATED',
        objectType: 'HEARING',
        objectId: hearingId,
        actorUserId: user.id,
        actorOrganizationId: user.organizationId,
        correlationId,
        payload: {
          legal_hold_id: item.id,
          hold_type: item.holdType,
          official_reference: item.officialReference
        }
      },
      user
    );
    return item;
  }

  async releaseLegalHold(
    user: CurrentUser,
    id: string,
    dto: ReleaseLegalHoldDto,
    correlationId?: string
  ) {
    requireRoles(user, ['COURT_CLERK', 'AUDITOR']);
    const item = await this.repository.releaseLegalHold(id, dto.reason, user);
    await this.audit.append(
      {
        eventType: 'LEGAL_HOLD_RELEASED',
        objectType: 'HEARING',
        objectId: item.hearingId,
        actorUserId: user.id,
        actorOrganizationId: user.organizationId,
        correlationId,
        payload: { legal_hold_id: item.id, release_reason: dto.reason }
      },
      user
    );
    return item;
  }

  retentionPolicies(user: CurrentUser) {
    requireRoles(user, ['AUDITOR', 'SECURITY_OFFICER']);
    return this.repository.retentionPolicies();
  }

  async retentionPreview(
    user: CurrentUser,
    hearingId: string,
    dto: RetentionPreviewDto,
    correlationId?: string
  ) {
    requireRoles(user, ['AUDITOR', 'COURT_CLERK']);
    const preview = await this.repository.retentionPreview(hearingId, dto.policy_code, user);
    await this.audit.append(
      {
        eventType: 'RETENTION_PREVIEW_CREATED',
        objectType: 'HEARING',
        objectId: hearingId,
        actorUserId: user.id,
        actorOrganizationId: user.organizationId,
        correlationId,
        payload: {
          retention_preview_id: preview.id,
          eligibility_status: preview.eligibilityStatus,
          active_legal_hold_count: preview.activeLegalHoldCount
        }
      },
      user
    );
    return preview;
  }

  listEvidenceExports(user: CurrentUser, hearingId: string) {
    requireRoles(user, ['COURT_CLERK', 'AUDITOR']);
    return this.repository.listEvidenceExports(hearingId, user);
  }

  async createEvidenceExport(
    user: CurrentUser,
    hearingId: string,
    dto: CreateEvidenceExportDto,
    correlationId?: string,
    traceparent?: string
  ) {
    requireRoles(user, ['COURT_CLERK', 'AUDITOR']);
    const item = await this.repository.createEvidenceExport(hearingId, dto.export_format, user, {
      correlationId,
      traceparent
    });
    await this.audit.append(
      {
        eventType: 'EVIDENCE_EXPORT_REQUESTED',
        objectType: 'HEARING',
        objectId: hearingId,
        actorUserId: user.id,
        actorOrganizationId: user.organizationId,
        correlationId,
        payload: { evidence_export_id: item.id, export_format: item.exportFormat }
      },
      user
    );
    return item;
  }

  getEvidenceExport(user: CurrentUser, id: string) {
    requireRoles(user, ['COURT_CLERK', 'AUDITOR']);
    return this.repository.getEvidenceExport(id, user);
  }

  async createAccessReview(user: CurrentUser, dto: CreateAccessReviewDto, correlationId?: string) {
    requireRoles(user, ['SECURITY_OFFICER', 'AUDITOR']);
    if (!dto.hearing_id && !dto.scope_organization_id)
      throw new DomainError(
        'ACCESS_REVIEW_SCOPE_REQUIRED',
        'A hearing or organization scope is required.',
        400
      );
    const item = await this.repository.createAccessReview(
      {
        campaignName: dto.campaign_name,
        hearingId: dto.hearing_id,
        scopeOrganizationId: dto.scope_organization_id,
        dueAt: dto.due_at
      },
      user
    );
    await this.audit.append(
      {
        eventType: 'ACCESS_REVIEW_CAMPAIGN_CREATED',
        objectType: dto.hearing_id ? 'HEARING' : 'ORGANIZATION',
        objectId: dto.hearing_id ?? dto.scope_organization_id ?? 'unknown',
        actorUserId: user.id,
        actorOrganizationId: user.organizationId,
        correlationId,
        payload: { campaign_id: item.id, item_count: item.items.length }
      },
      user
    );
    return item;
  }

  getAccessReview(user: CurrentUser, id: string) {
    requireRoles(user, ['SECURITY_OFFICER', 'AUDITOR']);
    return this.repository.getAccessReview(id, user);
  }

  async decideAccessReview(
    user: CurrentUser,
    campaignId: string,
    itemId: string,
    dto: DecideAccessReviewDto,
    correlationId?: string
  ) {
    requireRoles(user, ['SECURITY_OFFICER', 'AUDITOR']);
    const campaign = await this.repository.decideAccessReviewItem(
      campaignId,
      itemId,
      dto.decision,
      dto.reason,
      user
    );
    const item = campaign.items.find((record) => record.id === itemId);
    await this.audit.append(
      {
        eventType: 'ACCESS_REVIEW_ITEM_DECIDED',
        objectType: 'HEARING',
        objectId: item?.hearingId ?? campaign.hearingId ?? 'unknown',
        actorUserId: user.id,
        actorOrganizationId: user.organizationId,
        correlationId,
        payload: {
          campaign_id: campaignId,
          item_id: itemId,
          decision: dto.decision,
          subject_user_id: item?.subjectUserId
        }
      },
      user
    );
    return campaign;
  }
}
