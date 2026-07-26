import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  assertConflictsResolved,
  DomainError,
  detectConflicts,
  validateProposal
} from '@cims/domain';
import { requireRoles } from '../../common/authorization.js';
import type { CurrentUser } from '../../common/current-user.decorator.js';
import { AuditService } from '../../infrastructure/observability/audit.service.js';
import { OutboxService } from '../../infrastructure/persistence/database/outbox.service.js';
import { PersistenceModeService } from '../../infrastructure/persistence/database/persistence-mode.service.js';
import { CoreWorkflowRepository } from '../../infrastructure/persistence/repositories/core-workflow.repository.js';
import type { ApproveProposalDto, CheckProposalDto, CreateProposalDto } from './dto.js';

@Injectable()
export class SchedulingService {
  constructor(
    private readonly core: CoreWorkflowRepository,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    private readonly persistence: PersistenceModeService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async listHistory(user: CurrentUser, hearingId: string) {
    // Hak akses `participant.read` (atau sejenisnya) divalidasi lewat assignment check di layer service/repository.
    await this.core.getHearing(hearingId, user);
    const history = await this.core.scheduleHistory(hearingId, user);

    return {
      items: history.map((h) => ({
        id: h.id,
        hearing_id: h.hearingId,
        start_at: h.startAt,
        end_at: h.endAt,
        display_timezone: h.displayTimezone,
        version: h.version,
        status: h.status,
        approval_reason: h.approvalReason,
        approved_by: h.approvedBy,
        approved_at: h.approvedAt,
        resources: h.resources.map((r) => ({
          resource_type: r.resourceType,
          resource_id: r.resourceId,
          requirement: r.requirement
        }))
      }))
    };
  }

  async create(
    user: CurrentUser,
    hearingId: string,
    dto: CreateProposalDto,
    correlationId?: string
  ) {
    requireRoles(user, ['COURT_CLERK']);
    await this.core.getHearing(hearingId, user);
    if (!(await this.core.hasApprovedDetermination(hearingId, user))) {
      throw new DomainError(
        'DETERMINATION_REQUIRED',
        'A valid judicial determination is required before scheduling.',
        409
      );
    }
    const input = {
      hearingId,
      startAt: dto.start_at,
      endAt: dto.end_at,
      displayTimezone: dto.display_timezone,
      resources: dto.resources.map((resource) => ({
        resourceType: resource.resource_type,
        resourceId: resource.resource_id,
        requirement: resource.requirement
      }))
    };
    validateProposal({ id: 'validation', ...input, status: 'DRAFT' });
    const proposal = await this.core.createProposal(input, user);
    await this.audit.append(
      {
        eventType: 'SCHEDULE_PROPOSAL_CREATED',
        objectType: 'HEARING',
        objectId: hearingId,
        actorUserId: user.id,
        actorOrganizationId: user.organizationId,
        correlationId,
        payload: { proposal_id: proposal.id, start_at: proposal.startAt, end_at: proposal.endAt }
      },
      user
    );
    return this.publicProposal(proposal);
  }

  async check(
    user: CurrentUser,
    proposalId: string,
    dto: CheckProposalDto,
    correlationId?: string
  ) {
    requireRoles(user, ['COURT_CLERK']);
    const proposal = await this.core.getProposal(proposalId, user);
    if (!(await this.core.hasApprovedDetermination(proposal.hearingId, user))) {
      throw new DomainError(
        'DETERMINATION_REQUIRED',
        'A valid judicial determination is required before conflict checking.',
        409
      );
    }
    const schedules = await this.core.activeSchedulesForConflict(proposal, user);
    const conflicts = detectConflicts(proposal, schedules);
    const updated = await this.core.saveConflictCheck(
      proposalId,
      conflicts,
      user,
      dto.expected_row_version
    );
    await this.audit.append(
      {
        eventType: 'SCHEDULE_CONFLICT_CHECKED',
        objectType: 'HEARING',
        objectId: proposal.hearingId,
        actorUserId: user.id,
        actorOrganizationId: user.organizationId,
        correlationId,
        payload: {
          proposal_id: proposalId,
          result: conflicts.some((item) => item.severity === 'REQUIRED')
            ? 'BLOCKED'
            : conflicts.length
              ? 'WARNING'
              : 'CLEAR',
          conflict_count: conflicts.length
        }
      },
      user
    );
    return {
      proposal_id: proposalId,
      status: conflicts.some((item) => item.severity === 'REQUIRED')
        ? 'BLOCKED'
        : conflicts.length
          ? 'WARNING'
          : 'CLEAR',
      row_version: updated.rowVersion,
      conflicts
    };
  }

  async approve(
    user: CurrentUser,
    proposalId: string,
    dto: ApproveProposalDto,
    correlationId?: string
  ) {
    requireRoles(user, ['JUDGE', 'COURT_CLERK']);
    const proposal = await this.core.getProposal(proposalId, user);
    if (!(await this.core.hasApprovedDetermination(proposal.hearingId, user))) {
      throw new DomainError(
        'DETERMINATION_REQUIRED',
        'A valid judicial determination is required before approval.',
        409
      );
    }
    assertConflictsResolved(await this.core.conflicts(proposalId, user));

    // ── H-02: Cek apakah ada jadwal aktif yang akan di-supersede ─────────────
    // Jika ada, ini adalah perubahan jadwal — change_reason wajib & outbox event dikirim.
    const existingActive = await this.core.activeSchedule(proposal.hearingId, user);
    const isReschedule = Boolean(existingActive);
    if (isReschedule && !dto.change_reason?.trim()) {
      throw new DomainError(
        'CHANGE_REASON_REQUIRED',
        'Alasan perubahan jadwal wajib diisi karena sudah ada jadwal aktif yang akan digantikan (SOP 10.3).',
        409,
        { existing_schedule_id: existingActive!.id, existing_start_at: existingActive!.startAt }
      );
    }

    const schedule = await this.core.approveProposal(
      proposalId,
      dto.reason.trim(),
      user,
      dto.expected_row_version
    );

    await this.audit.append(
      {
        eventType: isReschedule ? 'HEARING_SCHEDULE_CHANGED' : 'HEARING_SCHEDULE_ACTIVATED',
        objectType: 'HEARING',
        objectId: schedule.hearingId,
        actorUserId: user.id,
        actorOrganizationId: user.organizationId,
        correlationId,
        payload: {
          schedule_id: schedule.id,
          version: schedule.version,
          start_at: schedule.startAt,
          end_at: schedule.endAt,
          approval_reason: schedule.approvalReason,
          change_reason: dto.change_reason ?? null,
          superseded_schedule_id: existingActive?.id ?? null,
          is_reschedule: isReschedule
        }
      },
      user
    );

    // ── H-02: Enqueue SCHEDULE_CHANGED outbox event untuk re-notification ─────
    // Outbox worker akan mengirim PERUBAHAN_JADWAL notice ke semua pihak.
    if (isReschedule && this.persistence.postgres) {
      await this.outbox.enqueue(
        'SCHEDULE_CHANGED',
        'HEARING',
        schedule.hearingId,
        {
          hearing_id: schedule.hearingId,
          schedule_id: schedule.id,
          new_start_at: schedule.startAt,
          new_end_at: schedule.endAt,
          change_reason: dto.change_reason,
          superseded_schedule_id: existingActive?.id
        },
        { correlationId }
      );
    }

    // M-08/CU-04: Broadcast UI event untuk SSE (update real-time ke klien lain)
    this.eventEmitter.emit('ui.event', {
      type: 'SCHEDULE_CHANGED',
      hearingId: schedule.hearingId,
      scheduleId: schedule.id,
      actorOrganizationId: user.organizationId,
      timestamp: new Date().toISOString()
    });

    return {
      id: schedule.id,
      hearing_id: schedule.hearingId,
      start_at: schedule.startAt,
      end_at: schedule.endAt,
      display_timezone: schedule.displayTimezone,
      version: schedule.version,
      status: schedule.status,
      approval_reason: schedule.approvalReason,
      change_reason: dto.change_reason ?? null,
      is_reschedule: isReschedule,
      resources: schedule.resources,
      row_version: schedule.rowVersion
    };
  }

  async listCalendar(user: CurrentUser, from: string, to: string, organizationId?: string) {
    // Audit dan read permissions diperiksa melalui transactionAs di repository (RBAC via assignment)
    const schedules = await this.core.listCalendar(user, from, to, organizationId);
    return schedules.map((s) => ({
      id: s.id,
      hearing_id: s.hearingId,
      case_number: s.caseNumber,
      case_title: s.caseTitle,
      hearing_type: s.hearingType,
      start_at: s.startAt,
      end_at: s.endAt,
      display_timezone: s.displayTimezone,
      status: s.status,
      resources: s.resources
    }));
  }

  private publicProposal(proposal: Awaited<ReturnType<CoreWorkflowRepository['createProposal']>>) {
    return {
      id: proposal.id,
      hearing_id: proposal.hearingId,
      start_at: proposal.startAt,
      end_at: proposal.endAt,
      display_timezone: proposal.displayTimezone,
      status: proposal.status,
      resources: proposal.resources,
      row_version: proposal.rowVersion
    };
  }
}
