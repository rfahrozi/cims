import fs from 'fs';

let content = fs.readFileSync('packages/domain/src/gates.ts', 'utf8');

const assertValidOld = `
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
`;

const assertValidNew = `
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
    throw new DomainError(
      'DETERMINATION_REQUIRED',
      'A valid judicial determination is required.'
    );
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
`;

content = content.replace(assertValidOld, assertValidNew);

fs.writeFileSync('packages/domain/src/gates.ts', content);
