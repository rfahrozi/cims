import { Injectable } from '@nestjs/common';
import type { HearingAction } from '@cims/domain';
import { requireRoles } from '../../common/authorization.js';
import type { CurrentUser } from '../../common/current-user.decorator.js';
import { AuditService } from '../../infrastructure/observability/audit.service.js';
import { CoreWorkflowRepository } from '../../infrastructure/persistence/repositories/core-workflow.repository.js';
import { HearingControlRepository } from '../../infrastructure/persistence/repositories/hearing-control.repository.js';
import type { FlagDocumentationDto, HearingActionDto, SuspendHearingDto } from './dto.js';

@Injectable()
export class HearingControlService {
  constructor(
    private readonly core: CoreWorkflowRepository,
    private readonly repository: HearingControlRepository,
    private readonly audit: AuditService
  ) {}

  async status(hearingId: string, user: CurrentUser) {
    await this.core.getHearing(hearingId, user);
    return this.repository.status(hearingId, user);
  }

  start(user: CurrentUser, hearingId: string, dto: HearingActionDto, correlationId?: string) {
    return this.apply(
      user,
      hearingId,
      'START',
      dto.reason,
      dto.expected_row_version,
      correlationId
    );
  }

  suspend(user: CurrentUser, hearingId: string, dto: SuspendHearingDto, correlationId?: string) {
    return this.apply(
      user,
      hearingId,
      'SUSPEND',
      dto.reason,
      dto.expected_row_version,
      correlationId
    );
  }

  resume(user: CurrentUser, hearingId: string, dto: HearingActionDto, correlationId?: string) {
    return this.apply(
      user,
      hearingId,
      'RESUME',
      dto.reason,
      dto.expected_row_version,
      correlationId
    );
  }

  end(user: CurrentUser, hearingId: string, dto: HearingActionDto, correlationId?: string) {
    return this.apply(user, hearingId, 'END', dto.reason, dto.expected_row_version, correlationId);
  }

  /**
   * Tandai sidang yang sudah ENDED sebagai memiliki dokumentasi tertunda (SOP PRD EPIC-08 US-8.3).
   * Transisi: ENDED → DOCUMENTATION_PENDING
   * Role: COURT_CLERK, SUBSTITUTE_CLERK, JUDGE
   */
  flagDocumentation(
    user: CurrentUser,
    hearingId: string,
    dto: FlagDocumentationDto,
    correlationId?: string
  ) {
    requireRoles(user, ['COURT_CLERK', 'SUBSTITUTE_CLERK', 'JUDGE']);
    return this.applyDocumentation(
      user,
      hearingId,
      'FLAG_DOCUMENTATION',
      dto.note,
      dto.expected_row_version,
      correlationId
    );
  }

  /**
   * Nyatakan dokumentasi sidang sudah lengkap.
   * Transisi: DOCUMENTATION_PENDING → ENDED
   * Role: COURT_CLERK, SUBSTITUTE_CLERK, JUDGE
   */
  completeDocumentation(
    user: CurrentUser,
    hearingId: string,
    dto: HearingActionDto,
    correlationId?: string
  ) {
    requireRoles(user, ['COURT_CLERK', 'SUBSTITUTE_CLERK', 'JUDGE']);
    return this.applyDocumentation(
      user,
      hearingId,
      'COMPLETE_DOCUMENTATION',
      dto.reason,
      dto.expected_row_version,
      correlationId
    );
  }

  private async apply(
    user: CurrentUser,
    hearingId: string,
    action: HearingAction,
    reason: string | undefined,
    expectedRowVersion: number | undefined,
    correlationId?: string
  ) {
    requireRoles(user, ['JUDGE']);
    await this.core.getHearing(hearingId, user);
    const result = await this.repository.apply(hearingId, action, reason, user, expectedRowVersion);
    const eventLabel: Record<string, string> = {
      START: 'HEARING_STARTED',
      SUSPEND: 'HEARING_SUSPENDED',
      RESUME: 'HEARING_RESUMED',
      END: 'HEARING_ENDED',
      POSTPONE: 'HEARING_POSTPONED'
    };
    await this.audit.append(
      {
        eventType: eventLabel[action] ?? `HEARING_${action}`,
        objectType: 'HEARING',
        objectId: hearingId,
        actorUserId: user.id,
        actorOrganizationId: user.organizationId,
        correlationId,
        payload: {
          reason: reason ?? null,
          runtime_state: result.state,
          row_version: result.runtime?.rowVersion ?? null
        }
      },
      user
    );
    return result;
  }

  private async applyDocumentation(
    user: CurrentUser,
    hearingId: string,
    action: any,
    note: string | undefined,
    expectedRowVersion: number | undefined,
    correlationId?: string
  ) {
    await this.core.getHearing(hearingId, user);
    const result = await this.repository.apply(hearingId, action, note, user, expectedRowVersion);
    await this.audit.append(
      {
        eventType:
          action === 'FLAG_DOCUMENTATION'
            ? 'HEARING_DOCUMENTATION_FLAGGED'
            : 'HEARING_DOCUMENTATION_COMPLETED',
        objectType: 'HEARING',
        objectId: hearingId,
        actorUserId: user.id,
        actorOrganizationId: user.organizationId,
        correlationId,
        payload: {
          note: note ?? null,
          runtime_state: result.state,
          row_version: result.runtime?.rowVersion ?? null
        }
      },
      user
    );
    return result;
  }
}
