import { writeFileSync } from 'node:fs';
import {
  assertVirtualProvisionAllowed,
  evaluateNoticeGate,
  evaluateReadinessGate,
  transitionHearing,
} from '../packages/domain/dist/index.js';

const hearingId = 'hearing-demo-001';
const determinations = [{ id: 'det-1', hearingId, decision: 'APPROVED', officialReference: 'PEN-EL/001/2026', reason: 'Approved', createdAt: new Date().toISOString() }];
const schedules = [{ id: 'sch-1', hearingId, startAt: '2026-08-10T02:00:00.000Z', endAt: '2026-08-10T03:00:00.000Z', version: 1, status: 'ACTIVE', resources: [] }];
const notices = [{ id: 'notice-1', status: 'ACKNOWLEDGED' }];
const recipients = [
  { noticeId: 'notice-1', requiredAck: true, status: 'ACKNOWLEDGED' },
  { noticeId: 'notice-1', requiredAck: true, status: 'ACKNOWLEDGED' },
];
const noticeGate = evaluateNoticeGate({ notices, recipients });
const readinessGate = evaluateReadinessGate({
  requiredOrganizationTypes: ['COURT', 'PROSECUTION', 'CORRECTIONS'],
  submissions: [
    { organizationType: 'COURT', version: 1, status: 'READY' },
    { organizationType: 'PROSECUTION', version: 1, status: 'READY' },
    { organizationType: 'CORRECTIONS', version: 1, status: 'READY' },
  ],
});
assertVirtualProvisionAllowed({ hearingId, determinations, schedules, noticeGate, readinessGate });
let state = 'READY';
const transitions = [];
for (const action of ['START', 'SUSPEND', 'RESUME', 'END']) {
  state = transitionHearing(state, action);
  transitions.push({ action, state });
}
const result = {
  release: '0.15.0',
  hearing_id: hearingId,
  determination: 'APPROVED',
  schedule: 'ACTIVE',
  notice_gate: noticeGate,
  readiness_gate: readinessGate,
  virtual_provision_allowed: true,
  hearing_transitions: transitions,
  final_state: state,
};
writeFileSync(new URL('../WORKFLOW_DEMO_RESULT.json', import.meta.url), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
