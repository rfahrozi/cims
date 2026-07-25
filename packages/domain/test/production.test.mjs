
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertAccess,
  assertConsultationParticipants,
  assertJoinTokenUsable,
  incidentBlocksHearing,
  incidentNotificationDeadline,
  publicParticipantName,
  transitionIncident,
  transitionParticipant,
} from '../dist/index.js';

test('single-use join token accepts a matching unexpired token', () => {
  assert.doesNotThrow(() => assertJoinTokenUsable({
    id: 'token-1', participantId: 'p-1', hearingId: 'h-1', tokenHash: 'hash-1', expiresAt: '2026-08-01T03:00:00.000Z',
  }, 'hash-1', new Date('2026-08-01T02:00:00.000Z')));
});

test('single-use join token rejects a consumed token', () => {
  assert.throws(() => assertJoinTokenUsable({
    id: 'token-1', participantId: 'p-1', hearingId: 'h-1', tokenHash: 'hash-1', expiresAt: '2026-08-01T03:00:00.000Z', consumedAt: '2026-08-01T02:01:00.000Z',
  }, 'hash-1', new Date('2026-08-01T02:02:00.000Z')), /consumed/i);
});

test('participant state requires waiting room before admission', () => {
  assert.equal(transitionParticipant('TOKEN_ISSUED', 'ENTER_WAITING'), 'WAITING');
  assert.throws(() => transitionParticipant('TOKEN_ISSUED', 'ADMIT'), /cannot perform/i);
});

test('consultation requires defendant and advocate', () => {
  assert.doesNotThrow(() => assertConsultationParticipants(['DEFENDANT', 'ADVOCATE']));
  assert.throws(() => assertConsultationParticipants(['DEFENDANT']), /requires/i);
});

test('protected identity is masked for unauthorized viewer', () => {
  assert.equal(publicParticipantName({ displayName: 'Nama Asli', protectedIdentity: true, alias: 'Saksi A', viewerCanSeeProtectedIdentity: false }), 'Saksi A');
});

test('cyber incident deadline is twenty four hours', () => {
  assert.equal(incidentNotificationDeadline('CYBER', '2026-08-01T00:00:00.000Z'), '2026-08-02T00:00:00.000Z');
});

test('high cyber incident blocks hearing', () => {
  assert.equal(incidentBlocksHearing('CYBER', 'HIGH'), true);
  assert.equal(transitionIncident('OPEN', 'START_MITIGATION'), 'MITIGATING');
});

test('ABAC rejects a user not assigned to the hearing', () => {
  assert.throws(() => assertAccess({
    userId: 'u-1', roles: ['COURT_CLERK'], organizationIds: ['court-1'], hearingAssignments: ['h-1'], permissions: ['hearing.read'],
  }, 'hearing.read', { hearingId: 'h-2', organizationId: 'court-1' }), /denied/i);
});
