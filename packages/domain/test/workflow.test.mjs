import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertVirtualProvisionAllowed,
  evaluateNoticeGate,
  evaluateReadinessGate,
  transitionHearing,
} from '../dist/index.js';

const determination = [{ id: 'd-1', hearingId: 'h-1', decision: 'APPROVED', officialReference: 'PEN-1', reason: 'Approved', createdAt: new Date().toISOString() }];
const schedule = [{ id: 's-1', hearingId: 'h-1', startAt: '2026-08-01T01:00:00.000Z', endAt: '2026-08-01T02:00:00.000Z', version: 1, status: 'ACTIVE', resources: [] }];

test('notice gate requires every required acknowledgment', () => {
  const gate = evaluateNoticeGate({
    notices: [{ id: 'n-1', status: 'SENT' }],
    recipients: [
      { noticeId: 'n-1', requiredAck: true, status: 'ACKNOWLEDGED' },
      { noticeId: 'n-1', requiredAck: true, status: 'DELIVERED' },
    ],
  });
  assert.equal(gate.ready, false);
  assert.equal(gate.acknowledgedCount, 1);
});

test('readiness gate uses the latest version per organization type', () => {
  const gate = evaluateReadinessGate({
    requiredOrganizationTypes: ['COURT', 'PROSECUTION', 'CORRECTIONS'],
    submissions: [
      { organizationType: 'COURT', version: 1, status: 'NOT_READY' },
      { organizationType: 'COURT', version: 2, status: 'READY' },
      { organizationType: 'PROSECUTION', version: 1, status: 'READY' },
      { organizationType: 'CORRECTIONS', version: 1, status: 'READY' },
    ],
  });
  assert.equal(gate.ready, true);
  assert.equal(gate.organizations.find((item) => item.organizationType === 'COURT')?.version, 2);
});

test('virtual provisioning rejects missing notice acknowledgment', () => {
  assert.throws(() => assertVirtualProvisionAllowed({
    hearingId: 'h-1',
    determinations: determination,
    schedules: schedule,
    noticeGate: { noticeCount: 1, requiredAcknowledgmentCount: 2, acknowledgedCount: 1, ready: false },
    readinessGate: { requiredOrganizationTypes: ['COURT'], organizations: [{ organizationType: 'COURT', status: 'READY', version: 1 }], ready: true },
  }), /acknowledged/i);
});

test('hearing state machine permits suspend and resume', () => {
  assert.equal(transitionHearing('STARTED', 'SUSPEND'), 'SUSPENDED');
  assert.equal(transitionHearing('SUSPENDED', 'RESUME'), 'STARTED');
});

test('hearing state machine rejects start after end', () => {
  assert.throws(() => transitionHearing('ENDED', 'START'), /cannot perform/i);
});
