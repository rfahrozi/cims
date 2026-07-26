import test from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp, login, authHeaders } from '../helpers/test-app.mjs';

test('IAM login, OTP, profile and admin authorization', async () => {
  const env = await startTestApp();
  try {
    const clerkToken = await login(env.baseUrl, 'clerk@cims.local', 'Clerk123!');
    let response = await fetch(`${env.baseUrl}/api/v1/me`, { headers: authHeaders(clerkToken) });
    assert.equal(response.status, 200);
    const me = await response.json();
    assert.ok(me.roles.includes('COURT_CLERK'));
    assert.ok(me.permissions.includes('schedule.write'));

    response = await fetch(`${env.baseUrl}/api/v1/admin/users`, {
      headers: authHeaders(clerkToken)
    });
    assert.equal(response.status, 403);

    const adminToken = await login(env.baseUrl, 'admin@cims.local', 'Admin123!');
    response = await fetch(`${env.baseUrl}/api/v1/admin/users`, {
      headers: authHeaders(adminToken)
    });
    assert.equal(response.status, 200);
    const users = await response.json();
    assert.equal(users.items.length, 5);
  } finally {
    await env.stop();
  }
});

test('invalid OTP is rejected', async () => {
  const env = await startTestApp();
  try {
    let response = await fetch(`${env.baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'judge@cims.local', password: 'Judge123!' })
    });
    const challenge = await response.json();
    response = await fetch(`${env.baseUrl}/api/v1/auth/verify-otp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ challenge_id: challenge.challenge_id, otp: '000000' })
    });
    assert.equal(response.status, 401);
  } finally {
    await env.stop();
  }
});
