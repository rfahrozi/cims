import { DomainError } from './errors.js';
import type { ActiveSchedule, ScheduleConflict, ScheduleProposal } from './types.js';

export function validateProposal(proposal: ScheduleProposal): void {
  const start = Date.parse(proposal.startAt);
  const end = Date.parse(proposal.endAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    throw new DomainError('VALIDATION_ERROR', 'Schedule end must be after start.', 400);
  }
  if (!proposal.displayTimezone.includes('/')) {
    throw new DomainError('VALIDATION_ERROR', 'An IANA timezone is required.', 400);
  }
  if (proposal.resources.length === 0) {
    throw new DomainError('VALIDATION_ERROR', 'At least one resource is required.', 400);
  }
}

export function detectConflicts(
  proposal: ScheduleProposal,
  activeSchedules: readonly ActiveSchedule[]
): ScheduleConflict[] {
  validateProposal(proposal);
  const proposalStart = Date.parse(proposal.startAt);
  const proposalEnd = Date.parse(proposal.endAt);
  const conflicts: ScheduleConflict[] = [];

  for (const active of activeSchedules) {
    if (active.hearingId === proposal.hearingId || active.status !== 'ACTIVE') continue;
    const overlap =
      proposalStart < Date.parse(active.endAt) && proposalEnd > Date.parse(active.startAt);
    if (!overlap) continue;
    for (const resource of proposal.resources) {
      const match = active.resources.find(
        (candidate) =>
          candidate.resourceType === resource.resourceType &&
          candidate.resourceId === resource.resourceId
      );
      if (match) {
        conflicts.push({
          code: 'RESOURCE_OVERLAP',
          severity: resource.requirement === 'REQUIRED' ? 'REQUIRED' : 'WARNING',
          message: `${resource.resourceType} ${resource.resourceId} already has an overlapping hearing.`,
          resourceType: resource.resourceType,
          resourceId: resource.resourceId
        });
      }
    }
  }
  return conflicts;
}

export function assertConflictsResolved(conflicts: readonly ScheduleConflict[]): void {
  const blocking = conflicts.filter((item) => item.severity === 'REQUIRED');
  if (blocking.length > 0) {
    throw new DomainError(
      'CONFLICT_UNRESOLVED',
      'Required scheduling conflicts remain.',
      409,
      blocking
    );
  }
}
