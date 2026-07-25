import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createCimsApplication } from '../apps/api/src/app.mjs';
import { loadConfig } from '../apps/api/src/config.mjs';
import { DEMO } from '../apps/api/src/infrastructure/demo-fixtures.mjs';

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cims-demo-'));
const config = loadConfig({
  dbPath: path.join(directory, 'demo.sqlite'),
  port: 0,
  tokenSecret: 'demo-secret-that-is-long-enough-for-hmac',
  fixedOtp: '123456',
  exposeDevelopmentOtp: true,
  allowedOrigins: [],
});
const app = createCimsApplication(config);
const server = app.createServer();
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/api/v1`;

async function call(pathname, options = {}) {
  const response = await fetch(base + pathname, options);
  const body = await response.json();
  if (!response.ok) throw new Error(`${response.status} ${JSON.stringify(body)}`);
  return body;
}
async function login(email, password) {
  const challenge = await call('/auth/login', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({email, password})});
  const result = await call('/auth/verify-otp', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({challenge_id: challenge.challenge_id, otp: '123456'})});
  return result.access_token;
}
const headers = (token, key) => ({authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(key ? {'idempotency-key': key} : {})});

try {
  const judge = await login('judge@cims.local', 'Judge123!');
  const clerk = await login('clerk@cims.local', 'Clerk123!');
  const determination = await call('/judicial-determinations', {
    method: 'POST', headers: headers(judge, 'demo-determination-0001'), body: JSON.stringify({
      hearing_id: DEMO.hearings.primary, decision: 'APPROVED', mode: 'ELECTRONIC',
      reason: 'Synthetic demo determination.', effective_at: new Date().toISOString(),
      official_reference: 'PEN-DEMO-001', document_hash: createHash('sha256').update('demo-document').digest('hex'),
    }),
  });
  const proposal = await call(`/hearings/${DEMO.hearings.primary}/schedule-proposals`, {
    method: 'POST', headers: headers(clerk, 'demo-proposal-00000001'), body: JSON.stringify({
      start_at: '2026-08-12T04:00:00.000Z', end_at: '2026-08-12T05:00:00.000Z', display_timezone: 'Asia/Jakarta',
      resources: [
        {resource_type: 'ROOM', resource_id: 'ROOM-B', requirement: 'REQUIRED'},
        {resource_type: 'JUDGE', resource_id: DEMO.users.judge, requirement: 'REQUIRED'},
      ],
    }),
  });
  const conflicts = await call(`/schedule-proposals/${proposal.id}/conflicts:check`, {method: 'POST', headers: headers(clerk, 'demo-conflict-check-0001'), body: '{}'});
  const schedule = await call(`/schedule-proposals/${proposal.id}:approve`, {method: 'POST', headers: headers(judge, 'demo-approve-000000001'), body: JSON.stringify({reason: 'Demo conflict check is clear.'})});
  const gate = await call(`/hearings/${DEMO.hearings.primary}/gate-status`, {headers: headers(clerk)});
  console.log(JSON.stringify({determination, proposal, conflicts, schedule, gate}, null, 2));
} finally {
  await new Promise((resolve) => server.close(resolve));
  app.close();
  fs.rmSync(directory, {recursive: true, force: true});
}
