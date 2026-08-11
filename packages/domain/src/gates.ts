import { DomainError } from './errors.js';
import type { Determination, GateCode } from './types.js';

import type { ActiveSchedule } from './types.js';

export function assertValidDetermination(
  hearingId: string,
  determinations: readonly Determination[],
  schedule?: ActiveSchedule
): Determination {
  if (!schedule || schedule.status !== 'ACTIVE') {
    throw new DomainError(
      'SCHEDULE_REQUIRED_FOR_DETERMINATION',
      'An active schedule is required before a judicial determination can be made.'
    );
  }

  const valid = [...determinations]
    .filter((item) => item.hearingId === hearingId && item.decision === 'APPROVED')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  if (!valid) {
    throw new DomainError('DETERMINATION_REQUIRED', 'A valid judicial determination is required.');
  }

  // H-7 Validation
  const scheduleStart = new Date(schedule.startAt).getTime();
  const determinationTime = new Date(valid.createdAt).getTime();
  const daysDifference = (scheduleStart - determinationTime) / (1000 * 60 * 60 * 24);

  if (daysDifference < 7) {
    throw new DomainError(
      'DETERMINATION_TOO_LATE',
      'Penetapan Pemberitahuan Sidang Pembacaan Putusan harus dibuat minimal H-7 sebelum jadwal sidang.'
    );
  }

  return valid;
}

export function nextGate(input: {
  hearingData: boolean;
  determination: boolean;
  schedule: boolean;
  notice: boolean;
  readiness: boolean;
  virtualSession: boolean;
  hearingEnded: boolean;
}): GateCode {
  if (!input.hearingData) return 'HEARING_DATA';
  if (!input.schedule) return 'SCHEDULING';
  if (!input.virtualSession) return 'VIRTUAL_SESSION';
  if (!input.determination) return 'JUDICIAL_DETERMINATION';
  if (!input.notice) return 'OFFICIAL_NOTICE';
  if (!input.readiness) return 'READINESS';
  if (!input.hearingEnded) return 'HEARING_CONTROL';
  return 'AUDIT_AND_CLOSURE';
}
