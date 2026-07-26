import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createCimsApplication } from '../../apps/api/src/app.mjs';
import { loadConfig } from '../../apps/api/src/config.mjs';

export async function startTestApp(overrides = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cims-test-'));
  const dbPath = path.join(directory, 'test.sqlite');
  const config = loadConfig({
    dbPath,
    port: 0,
    tokenSecret: 'test-secret-that-is-long-enough-for-hmac',
    fixedOtp: '123456',
    exposeDevelopmentOtp: true,
    allowedOrigins: [],
    ...overrides
  });
  const app = createCimsApplication(config);
  const server = app.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  return {
    app,
    server,
    baseUrl,
    directory,
    async stop() {
      await new Promise((resolve) => server.close(resolve));
      app.close();
      fs.rmSync(directory, { recursive: true, force: true });
    }
  };
}

export async function login(baseUrl, email, password, otp = '123456') {
  let response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const challenge = await response.json();
  if (response.status !== 200) throw new Error(JSON.stringify(challenge));
  response = await fetch(`${baseUrl}/api/v1/auth/verify-otp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ challenge_id: challenge.challenge_id, otp })
  });
  const token = await response.json();
  if (response.status !== 200) throw new Error(JSON.stringify(token));
  return token.access_token;
}

export function authHeaders(token, idempotencyKey) {
  return {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
    ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {})
  };
}
