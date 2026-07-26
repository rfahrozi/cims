import { Injectable } from '@nestjs/common';
import { requireRoles } from '../../common/authorization.js';
import type { CurrentUser } from '../../common/current-user.decorator.js';
import { AuditService } from '../../infrastructure/observability/audit.service.js';
import { CoreWorkflowRepository } from '../../infrastructure/persistence/repositories/core-workflow.repository.js';
import type { CreateDeterminationDto, CreateRequestDto } from './dto.js';

@Injectable()
export class DeterminationsService {
  constructor(
    private readonly core: CoreWorkflowRepository,
    private readonly audit: AuditService
  ) {}

  async createRequest(user: CurrentUser, dto: CreateRequestDto, correlationId?: string) {
    requireRoles(user, ['COURT_CLERK', 'PROSECUTOR']);
    await this.core.assertActiveIntake(dto.hearing_id, user);
    const item = await this.core.createRequest(
      {
        hearingId: dto.hearing_id,
        requestedMode: dto.requested_mode,
        reason: dto.reason.trim()
      },
      user
    );
    await this.audit.append(
      {
        eventType: 'ELECTRONIC_HEARING_REQUEST_SUBMITTED',
        objectType: 'HEARING',
        objectId: dto.hearing_id,
        actorUserId: user.id,
        actorOrganizationId: user.organizationId,
        correlationId,
        payload: { request_id: item.id, requested_mode: item.requestedMode }
      },
      user
    );
    return this.publicRequest(item);
  }

  async createDetermination(
    user: CurrentUser,
    dto: CreateDeterminationDto,
    correlationId?: string
  ) {
    requireRoles(user, ['JUDGE']);
    await this.core.assertActiveIntake(dto.hearing_id, user);
    const item = await this.core.createDetermination(
      {
        hearingId: dto.hearing_id,
        decision: dto.decision,
        hearingMode: dto.hearing_mode,
        officialReference: dto.official_reference.trim(),
        reason: dto.reason.trim()
      },
      user
    );
    await this.audit.append(
      {
        eventType: 'JUDICIAL_DETERMINATION_RECORDED',
        objectType: 'HEARING',
        objectId: dto.hearing_id,
        actorUserId: user.id,
        actorOrganizationId: user.organizationId,
        correlationId,
        payload: {
          determination_id: item.id,
          version: item.version,
          decision: item.decision,
          official_reference: item.officialReference
        }
      },
      user
    );
    return this.publicDetermination(item);
  }

  private publicRequest(item: Awaited<ReturnType<CoreWorkflowRepository['createRequest']>>) {
    return {
      id: item.id,
      hearing_id: item.hearingId,
      requested_mode: item.requestedMode,
      reason: item.reason,
      status: item.status,
      created_by: item.createdBy,
      created_at: item.createdAt,
      row_version: item.rowVersion
    };
  }

  private publicDetermination(
    item: Awaited<ReturnType<CoreWorkflowRepository['createDetermination']>>
  ) {
    return {
      id: item.id,
      hearing_id: item.hearingId,
      version: item.version,
      decision: item.decision,
      hearing_mode: item.hearingMode ?? null,
      official_reference: item.officialReference,
      reason: item.reason,
      is_current: item.isCurrent,
      created_by: item.createdBy,
      created_at: item.createdAt,
      row_version: item.rowVersion
    };
  }
}
