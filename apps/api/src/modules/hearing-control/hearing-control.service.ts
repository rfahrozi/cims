import { Injectable } from '@nestjs/common';
import type { HearingAction } from '@cims/domain';
import { requireRoles } from '../../common/authorization.js';
import type { CurrentUser } from '../../common/current-user.decorator.js';
import { AuditService } from '../../infrastructure/audit.service.js';
import { CoreWorkflowRepository } from '../../infrastructure/repositories/core-workflow.repository.js';
import { HearingControlRepository } from '../../infrastructure/repositories/hearing-control.repository.js';
import type { HearingActionDto, SuspendHearingDto } from './dto.js';

@Injectable()
export class HearingControlService {
  constructor(
    private readonly core: CoreWorkflowRepository,
    private readonly repository: HearingControlRepository,
    private readonly audit: AuditService,
  ) {}

  async status(hearingId: string, user: CurrentUser) {
    await this.core.getHearing(hearingId, user);
    return this.repository.status(hearingId, user);
  }

  start(user: CurrentUser, hearingId: string, dto: HearingActionDto, correlationId?: string) {
    return this.apply(user, hearingId, 'START', dto.reason, dto.expected_row_version, correlationId);
  }

  suspend(user: CurrentUser, hearingId: string, dto: SuspendHearingDto, correlationId?: string) {
    return this.apply(user, hearingId, 'SUSPEND', dto.reason, dto.expected_row_version, correlationId);
  }

  resume(user: CurrentUser, hearingId: string, dto: HearingActionDto, correlationId?: string) {
    return this.apply(user, hearingId, 'RESUME', dto.reason, dto.expected_row_version, correlationId);
  }

  end(user: CurrentUser, hearingId: string, dto: HearingActionDto, correlationId?: string) {
    return this.apply(user, hearingId, 'END', dto.reason, dto.expected_row_version, correlationId);
  }

  private async apply(
    user: CurrentUser,
    hearingId: string,
    action: HearingAction,
    reason: string | undefined,
    expectedRowVersion: number | undefined,
    correlationId?: string,
  ) {
    requireRoles(user, ['JUDGE']);
    await this.core.getHearing(hearingId, user);
    const result = await this.repository.apply(hearingId, action, reason, user, expectedRowVersion);
    await this.audit.append({
      eventType: `HEARING_${action === 'RESUME' ? 'RESUMED' : action === 'SUSPEND' ? 'SUSPENDED' : action === 'START' ? 'STARTED' : 'ENDED'}`,
      objectType: 'HEARING',
      objectId: hearingId,
      actorUserId: user.id,
      actorOrganizationId: user.organizationId,
      correlationId,
      payload: { reason: reason ?? null, runtime_state: result.state, row_version: result.runtime?.rowVersion ?? null },
    }, user);
    return result;
  }
}
