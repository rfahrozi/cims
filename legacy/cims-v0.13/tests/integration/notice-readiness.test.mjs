import test from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp, login, authHeaders } from '../helpers/test-app.mjs';
import {
  DEMO,
  prepareActiveSchedule,
  prepareNotices,
  prepareReadiness
} from '../helpers/workflow.mjs';
test('notice acknowledgment and readiness gate require all institutions', async () => {
  const t = await startTestApp();
  try {
    const tokens = {
      judge: await login(t.baseUrl, 'judge@cims.local', 'Judge123!'),
      clerk: await login(t.baseUrl, 'clerk@cims.local', 'Clerk123!'),
      prosecutor: await login(t.baseUrl, 'prosecutor@cims.local', 'Prosecutor123!'),
      corrections: await login(t.baseUrl, 'corrections@cims.local', 'Corrections123!')
    };
    await prepareActiveSchedule(t.baseUrl, tokens);
    let r = await fetch(`${t.baseUrl}/api/v1/hearings/${DEMO.hearingId}/gate-status`, {
      headers: authHeaders(tokens.clerk)
    });
    let gate = await r.json();
    assert.equal(gate.notice.ready, false);
    await prepareNotices(t.baseUrl, tokens);
    r = await fetch(`${t.baseUrl}/api/v1/hearings/${DEMO.hearingId}/gate-status`, {
      headers: authHeaders(tokens.clerk)
    });
    gate = await r.json();
    assert.equal(gate.notice.ready, true);
    assert.equal(gate.readiness.ready, false);
    await prepareReadiness(t.baseUrl, tokens);
    r = await fetch(`${t.baseUrl}/api/v1/hearings/${DEMO.hearingId}/gate-status`, {
      headers: authHeaders(tokens.clerk)
    });
    gate = await r.json();
    assert.equal(gate.readiness.ready, true);
    assert.equal(gate.next_gate, 'VIRTUAL_SESSION');
  } finally {
    await t.stop();
  }
});
test('corrections readiness is rejected before identity and room verification', async () => {
  const t = await startTestApp();
  try {
    const tokens = {
      judge: await login(t.baseUrl, 'judge@cims.local', 'Judge123!'),
      clerk: await login(t.baseUrl, 'clerk@cims.local', 'Clerk123!'),
      prosecutor: await login(t.baseUrl, 'prosecutor@cims.local', 'Prosecutor123!'),
      corrections: await login(t.baseUrl, 'corrections@cims.local', 'Corrections123!')
    };
    await prepareActiveSchedule(t.baseUrl, tokens);
    await prepareNotices(t.baseUrl, tokens);
    const response = await fetch(
      `${t.baseUrl}/api/v1/hearings/${DEMO.hearingId}/readiness-submissions`,
      {
        method: 'POST',
        headers: authHeaders(tokens.corrections, `readiness-${crypto.randomUUID()}`),
        body: JSON.stringify({
          location_code: 'RUTAN',
          items: [{ item_code: 'ROOM', required: true, result: 'PASS' }],
          technical_test: {
            camera: 'PASS',
            microphone: 'PASS',
            audio: 'PASS',
            primary_network: 'PASS',
            backup_network: 'PASS',
            provider_access: 'PASS'
          }
        })
      }
    );
    assert.equal(response.status, 409);
    const body = await response.json();
    assert.equal(body.error.code, 'VERIFICATION_REQUIRED');
  } finally {
    await t.stop();
  }
});
