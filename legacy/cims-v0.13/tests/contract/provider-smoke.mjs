import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const port = 4199;
const child = spawn(process.execPath, ['services/mock-video-provider/src/server.mjs'], {
  env: { ...process.env, MOCK_PROVIDER_PORT: String(port) },
  stdio: ['ignore', 'pipe', 'inherit']
});
const base = `http://localhost:${port}`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  await wait(300);
  let r = await fetch(base + '/health');
  assert.equal(r.status, 200);
  let h = await r.json();
  assert.equal(h.status, 'HEALTHY');
  r = await fetch(base + '/sessions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'idempotency-key': 'smoke-1' },
    body: JSON.stringify({
      hearing_reference: 'HEARING-DEMO',
      start_at: '2026-08-12T02:00:00Z',
      end_at: '2026-08-12T04:00:00Z',
      recording_policy: 'COURT_CONTROLLED'
    })
  });
  assert.equal(r.status, 201);
  const s = await r.json();
  assert.ok(s.provider_session_reference);
  r = await fetch(`${base}/sessions/${s.provider_session_reference}/rooms`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ room_code: 'WAITING', room_type: 'WAITING', recording_allowed: false })
  });
  assert.equal(r.status, 201);
  const waiting = await r.json();
  r = await fetch(`${base}/sessions/${s.provider_session_reference}/rooms`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ room_code: 'MAIN', room_type: 'MAIN', recording_allowed: true })
  });
  assert.equal(r.status, 201);
  const main = await r.json();
  r = await fetch(`${base}/sessions/${s.provider_session_reference}/access`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      room_reference: waiting.provider_room_reference,
      participant_reference: 'P-001',
      role: 'WITNESS',
      expires_at: '2026-08-12T04:00:00Z',
      permissions: ['AUDIO', 'VIDEO']
    })
  });
  assert.equal(r.status, 201);
  const a = await r.json();
  assert.ok(a.participant_join_url);
  assert.equal('host_secret' in a, false);
  assert.equal(a.room_type, 'WAITING');
  r = await fetch(`${base}/access/${a.participant_access_reference}`);
  assert.equal(r.status, 200);
  let current = await r.json();
  assert.equal(current.room_reference, waiting.provider_room_reference);
  r = await fetch(`${base}/access/${a.participant_access_reference}/move`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ room_reference: main.provider_room_reference })
  });
  assert.equal(r.status, 200);
  current = await r.json();
  assert.equal(current.room_type, 'MAIN');
  r = await fetch(`${base}/access/${a.participant_access_reference}/revoke`, { method: 'POST' });
  assert.equal(r.status, 200);
  const rv = await r.json();
  assert.equal(rv.revoked, true);
  console.log('PASS provider contract smoke test');
} finally {
  child.kill('SIGTERM');
}
