import { Injectable } from '@nestjs/common';
import { requirePermission } from '../../common/authorization.js';
import type { CurrentUser } from '../../common/current-user.decorator.js';
import { AuditService } from '../../infrastructure/observability/audit.service.js';
import { CoreWorkflowRepository } from '../../infrastructure/persistence/repositories/core-workflow.repository.js';
import { ReconciliationRepository } from '../../infrastructure/persistence/repositories/reconciliation.repository.js';
import type { RequestReconciliationDto } from './dto.js';

@Injectable()
export class ReconciliationService {
  constructor(
    private readonly core: CoreWorkflowRepository,
    private readonly repository: ReconciliationRepository,
    private readonly audit: AuditService
  ) {}

  async request(
    user: CurrentUser,
    hearingId: string,
    dto: RequestReconciliationDto,
    correlationId?: string,
    traceparent?: string
  ) {
    requirePermission(user, 'audit.read', hearingId);
    await this.core.getHearing(hearingId, user);
    const run = await this.repository.request(
      hearingId,
      dto.source_system ?? 'OFFICIAL_CASE_SYSTEM',
      user,
      { correlationId, traceparent }
    );
    await this.audit.append(
      {
        eventType: 'RECONCILIATION_REQUESTED',
        objectType: 'HEARING',
        objectId: hearingId,
        actorUserId: user.id,
        actorOrganizationId: user.organizationId,
        correlationId,
        payload: { reconciliation_run_id: run.id, source_system: run.sourceSystem }
      },
      user
    );
    return run;
  }

  async list(user: CurrentUser, hearingId: string) {
    requirePermission(user, 'audit.read', hearingId);
    await this.core.getHearing(hearingId, user);
    return this.repository.list(hearingId, user);
  }

  get(user: CurrentUser, id: string) {
    requirePermission(user, 'audit.read');
    return this.repository.get(id, user);
  }

  async resolve(user: CurrentUser, id: string, correlationId?: string) {
    requirePermission(user, 'audit.write'); // Hanya role yg boleh modif (misal: court-clerk)
    const run = await this.repository.get(id, user);
    await this.core.getHearing(run.hearingId, user);

    // Terapkan resolusi
    await this.repository.resolve(id, user);

    // Audit Log
    await this.audit.append(
      {
        eventType: 'RECONCILIATION_RESOLVED',
        objectType: 'HEARING',
        objectId: run.hearingId,
        actorUserId: user.id,
        actorOrganizationId: user.organizationId,
        correlationId,
        payload: { reconciliation_run_id: run.id, source_system: run.sourceSystem }
      },
      user
    );

    return { id, status: 'RESOLVED' };
  }
}
