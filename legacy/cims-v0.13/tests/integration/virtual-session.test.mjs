import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { startTestApp, login, authHeaders } from '../helpers/test-app.mjs';
import {
  DEMO,
  prepareActiveSchedule,
  prepareNotices,
  prepareReadiness
} from '../helpers/workflow.mjs';
async function startProvider(port) {
  const child = spawn(process.execPath, ['services/mock-video-provider/src/server.mjs'], {
    cwd: new URL('../..', import.meta.url).pathname,
    env: {
      ...process.env,
      MOCK_PROVIDER_PORT: String(port),
      MOCK_PROVIDER_WEBHOOK_SECRET: 'test-provider-secret'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('provider timeout')), 3000);
    child.stdout.on('data', (d) => {
      if (String(d).includes('listening')) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.once('exit', (c) => reject(new Error(`provider exited ${c}`)));
  });
  return child;
}
test('virtual session provisioning is blocked until gates pass and then creates five rooms', async () => {
  const port = 43117,
    provider = await startProvider(port),
    t = await startTestApp({
      providerBaseUrl: `http://127.0.0.1:${port}`,
      providerWebhookSecret: 'test-provider-secret'
    });
  try {
    const tokens = {
      judge: await login(t.baseUrl, 'judge@cims.local', 'Judge123!'),
      clerk: await login(t.baseUrl, 'clerk@cims.local', 'Clerk123!'),
      prosecutor: await login(t.baseUrl, 'prosecutor@cims.local', 'Prosecutor123!'),
      corrections: await login(t.baseUrl, 'corrections@cims.local', 'Corrections123!')
    };
    await prepareActiveSchedule(t.baseUrl, tokens);
    let r = await fetch(
      `${t.baseUrl}/api/v1/hearings/${DEMO.hearingId}/virtual-session:provision`,
      {
        method: 'POST',
        headers: authHeaders(tokens.clerk, `blocked-${crypto.randomUUID()}`),
        body: JSON.stringify({ recording_policy: 'DISABLED' })
      }
    );
    assert.equal(r.status, 409);
    await prepareNotices(t.baseUrl, tokens);
    await prepareReadiness(t.baseUrl, tokens);
    r = await fetch(`${t.baseUrl}/api/v1/hearings/${DEMO.hearingId}/virtual-session:provision`, {
      method: 'POST',
      headers: authHeaders(tokens.clerk, `provision-${crypto.randomUUID()}`),
      body: JSON.stringify({ recording_policy: 'COURT_CONTROLLED' })
    });
    assert.equal(r.status, 201);
    const session = await r.json();
    assert.equal(session.state, 'READY');
    assert.equal(session.rooms.length, 5);
    assert.equal(session.rooms.find((x) => x.room_type === 'CONSULTATION').recording_allowed, 0);
  } finally {
    await t.stop();
    provider.kill('SIGTERM');
    await once(provider, 'exit').catch(() => {});
  }
});
