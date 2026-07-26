import test from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp } from '../helpers/test-app.mjs';

test('security headers and login rate limiting are enforced', async () => {
  const app = await startTestApp({ loginRateLimitPerMinute: 2 });
  try {
    let response = await fetch(`${app.baseUrl}/health`);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
    for (let i = 0; i < 2; i++) {
      response = await fetch(`${app.baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'unknown@cims.local', password: 'WrongPassword!' })
      });
      assert.equal(response.status, 401);
    }
    response = await fetch(`${app.baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'unknown@cims.local', password: 'WrongPassword!' })
    });
    const body = await response.json();
    assert.equal(response.status, 429);
    assert.equal(body.error.code, 'RATE_LIMITED');
  } finally {
    await app.stop();
  }
});

test('account is temporarily locked after repeated credential failures', async () => {
  const app = await startTestApp({
    loginRateLimitPerMinute: 20,
    accountLockoutThreshold: 3,
    accountLockoutMinutes: 1
  });
  try {
    for (let i = 0; i < 3; i++) {
      const r = await fetch(`${app.baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'judge@cims.local', password: 'WrongPassword!' })
      });
      assert.equal(r.status, 401);
    }
    const response = await fetch(`${app.baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'judge@cims.local', password: 'Judge123!' })
    });
    const body = await response.json();
    assert.equal(response.status, 423);
    assert.equal(body.error.code, 'ACCOUNT_LOCKED');
  } finally {
    await app.stop();
  }
});
