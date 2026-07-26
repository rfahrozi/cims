import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { startTestApp, login, authHeaders } from '../helpers/test-app.mjs';
import { DEMO } from '../../apps/api/src/infrastructure/demo-fixtures.mjs';

const proposalPayload = (
  room,
  start = '2026-08-12T02:00:00.000Z',
  end = '2026-08-12T03:00:00.000Z'
) => ({
  start_at: start,
  end_at: end,
  display_timezone: 'Asia/Jakarta',
  resources: [
    { resource_type: 'ROOM', resource_id: room, requirement: 'REQUIRED' },
    { resource_type: 'JUDGE', resource_id: DEMO.users.judge, requirement: 'REQUIRED' }
  ]
});

async function createDetermination(baseUrl, judgeToken) {
  const body = {
    hearing_id: DEMO.hearings.primary,
    decision: 'APPROVED',
    mode: 'ELECTRONIC',
    reason: 'Keadaan tertentu dan seluruh pihak dapat mengikuti secara elektronik.',
    effective_at: '2026-07-24T00:00:00.000Z',
    official_reference: `PEN-EL-${Date.now()}`,
    document_hash: createHash('sha256').update(`synthetic-${Date.now()}`).digest('hex')
  };
  const response = await fetch(`${baseUrl}/api/v1/judicial-determinations`, {
    method: 'POST',
    headers: authHeaders(judgeToken, `det-${Date.now()}-0123456789`),
    body: JSON.stringify(body)
  });
  assert.equal(response.status, 201, JSON.stringify(await response.clone().json()));
  return response.json();
}

test('determination is a hard gate for schedule proposal', async () => {
  const env = await startTestApp();
  try {
    const clerkToken = await login(env.baseUrl, 'clerk@cims.local', 'Clerk123!');
    let response = await fetch(
      `${env.baseUrl}/api/v1/hearings/${DEMO.hearings.primary}/schedule-proposals`,
      {
        method: 'POST',
        headers: authHeaders(clerkToken, 'proposal-before-det-0001'),
        body: JSON.stringify(proposalPayload('ROOM-B'))
      }
    );
    assert.equal(response.status, 409);
    const error = await response.json();
    assert.equal(error.error.code, 'DETERMINATION_REQUIRED');

    const judgeToken = await login(env.baseUrl, 'judge@cims.local', 'Judge123!');
    await createDetermination(env.baseUrl, judgeToken);

    response = await fetch(
      `${env.baseUrl}/api/v1/hearings/${DEMO.hearings.primary}/schedule-proposals`,
      {
        method: 'POST',
        headers: authHeaders(clerkToken, 'proposal-after-det-00001'),
        body: JSON.stringify(
          proposalPayload('ROOM-B', '2026-08-12T04:00:00.000Z', '2026-08-12T05:00:00.000Z')
        )
      }
    );
    assert.equal(response.status, 201);
  } finally {
    await env.stop();
  }
});

test('conflict engine blocks overlapping required resource and clear proposal can be approved', async () => {
  const env = await startTestApp();
  try {
    const clerkToken = await login(env.baseUrl, 'clerk@cims.local', 'Clerk123!');
    const judgeToken = await login(env.baseUrl, 'judge@cims.local', 'Judge123!');
    await createDetermination(env.baseUrl, judgeToken);

    let response = await fetch(
      `${env.baseUrl}/api/v1/hearings/${DEMO.hearings.primary}/schedule-proposals`,
      {
        method: 'POST',
        headers: authHeaders(clerkToken, 'proposal-conflict-00001'),
        body: JSON.stringify(proposalPayload('ROOM-A'))
      }
    );
    assert.equal(response.status, 201);
    const blockedProposal = await response.json();
    response = await fetch(
      `${env.baseUrl}/api/v1/schedule-proposals/${blockedProposal.id}/conflicts:check`,
      { method: 'POST', headers: authHeaders(clerkToken, 'check-conflict-0000001'), body: '{}' }
    );
    assert.equal(response.status, 200);
    const blocked = await response.json();
    assert.equal(blocked.status, 'BLOCKED');
    assert.ok(blocked.conflicts.some((item) => item.rule_code === 'RESOURCE_OVERLAP'));

    response = await fetch(
      `${env.baseUrl}/api/v1/schedule-proposals/${blockedProposal.id}:approve`,
      {
        method: 'POST',
        headers: authHeaders(judgeToken, 'approve-blocked-000001'),
        body: JSON.stringify({ reason: 'Approval test' })
      }
    );
    assert.equal(response.status, 409);

    response = await fetch(
      `${env.baseUrl}/api/v1/hearings/${DEMO.hearings.primary}/schedule-proposals`,
      {
        method: 'POST',
        headers: authHeaders(clerkToken, 'proposal-clear-00000001'),
        body: JSON.stringify(
          proposalPayload('ROOM-B', '2026-08-12T04:00:00.000Z', '2026-08-12T05:00:00.000Z')
        )
      }
    );
    const clearProposal = await response.json();
    response = await fetch(
      `${env.baseUrl}/api/v1/schedule-proposals/${clearProposal.id}/conflicts:check`,
      { method: 'POST', headers: authHeaders(clerkToken, 'check-clear-0000000001'), body: '{}' }
    );
    const clear = await response.json();
    assert.equal(clear.status, 'CLEAR');

    response = await fetch(`${env.baseUrl}/api/v1/schedule-proposals/${clearProposal.id}:approve`, {
      method: 'POST',
      headers: authHeaders(judgeToken, 'approve-clear-000000001'),
      body: JSON.stringify({ reason: 'Semua konflik telah diperiksa.' })
    });
    assert.equal(response.status, 200);
    const schedule = await response.json();
    assert.equal(schedule.status, 'ACTIVE');

    response = await fetch(`${env.baseUrl}/api/v1/hearings/${DEMO.hearings.primary}/gate-status`, {
      headers: authHeaders(clerkToken)
    });
    const gate = await response.json();
    assert.equal(gate.determination_valid, true);
    assert.equal(gate.schedule_active, true);
    assert.equal(gate.next_gate, 'OFFICIAL_NOTICE');
  } finally {
    await env.stop();
  }
});

test('idempotency replays the same response and rejects key reuse with a different payload', async () => {
  const env = await startTestApp();
  try {
    const judgeToken = await login(env.baseUrl, 'judge@cims.local', 'Judge123!');
    const body = {
      hearing_id: DEMO.hearings.primary,
      decision: 'APPROVED',
      mode: 'ELECTRONIC',
      reason: 'Synthetic determination for idempotency.',
      effective_at: '2026-07-24T00:00:00.000Z',
      official_reference: 'PEN-IDEMP-001',
      document_hash: createHash('sha256').update('idem').digest('hex')
    };
    const key = 'idempotency-test-key-0001';
    let response = await fetch(`${env.baseUrl}/api/v1/judicial-determinations`, {
      method: 'POST',
      headers: authHeaders(judgeToken, key),
      body: JSON.stringify(body)
    });
    const first = await response.json();
    assert.equal(response.status, 201);
    response = await fetch(`${env.baseUrl}/api/v1/judicial-determinations`, {
      method: 'POST',
      headers: authHeaders(judgeToken, key),
      body: JSON.stringify(body)
    });
    const second = await response.json();
    assert.equal(response.status, 201);
    assert.equal(response.headers.get('x-idempotent-replay'), 'true');
    assert.equal(second.id, first.id);
    response = await fetch(`${env.baseUrl}/api/v1/judicial-determinations`, {
      method: 'POST',
      headers: authHeaders(judgeToken, key),
      body: JSON.stringify({ ...body, official_reference: 'PEN-IDEMP-002' })
    });
    assert.equal(response.status, 409);
  } finally {
    await env.stop();
  }
});
