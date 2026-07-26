import { DomainError } from './errors.js';
import type { Determination, GateCode } from './types.js';

export function assertValidDetermination(
  hearingId: string,
  determinations: readonly Determination[]
): Determination {
  const valid = [...determinations]
    .filter((item) => item.hearingId === hearingId && item.decision === 'APPROVED')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  if (!valid) {
    throw new DomainError(
      'DETERMINATION_REQUIRED',
      'A valid judicial determination is required before scheduling.'
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
  if (!input.determination) return 'JUDICIAL_DETERMINATION';
  if (!input.schedule) return 'SCHEDULING';
  if (!input.notice) return 'OFFICIAL_NOTICE';
  if (!input.readiness) return 'READINESS';
  if (!input.virtualSession) return 'VIRTUAL_SESSION';
  if (!input.hearingEnded) return 'HEARING_CONTROL';
  return 'AUDIT_AND_CLOSURE';
}
