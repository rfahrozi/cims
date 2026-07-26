import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { startTestApp, login, authHeaders } from '../helpers/test-app.mjs';
import {
  DEMO,
  prepareActiveSchedule,
  prepareNotices,
  prepareReadiness,
  prepareVirtual
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
const idem = (prefix) => `${prefix}-${crypto.randomUUID()}`;
async function post(base, path, token, body = {}, idempotent = true) {
  const headers = token
    ? authHeaders(token, idempotent ? idem('test') : undefined)
    : { 'content-type': 'application/json' };
  const response = await fetch(base + path, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  const json = await response.json();
  return { response, json };
}
async function prepareEnvironment(port) {
  const provider = await startProvider(port);
  const app = await startTestApp({
    providerBaseUrl: `http://127.0.0.1:${port}`,
    providerWebhookSecret: 'test-provider-secret'
  });
  const tokens = {
    admin: await login(app.baseUrl, 'admin@cims.local', 'Admin123!'),
    judge: await login(app.baseUrl, 'judge@cims.local', 'Judge123!'),
    clerk: await login(app.baseUrl, 'clerk@cims.local', 'Clerk123!'),
    prosecutor: await login(app.baseUrl, 'prosecutor@cims.local', 'Prosecutor123!'),
    corrections: await login(app.baseUrl, 'corrections@cims.local', 'Corrections123!')
  };
  await prepareActiveSchedule(app.baseUrl, tokens);
  await prepareNotices(app.baseUrl, tokens);
  await prepareReadiness(app.baseUrl, tokens);
  await prepareVirtual(app.baseUrl, tokens);
  return { provider, app, tokens };
}
async function stopEnvironment(env) {
  await env.app.stop();
  env.provider.kill('SIGTERM');
  await once(env.provider, 'exit').catch(() => {});
}

async function registerParticipant(base, token, body) {
  const { response, json } = await post(
    base,
    `/api/v1/hearings/${DEMO.hearingId}/participants`,
    token,
    body
  );
  assert.equal(response.status, 201);
  return json;
}
async function enterWaiting(base, clerkToken, participant) {
  let out = await post(
    base,
    `/api/v1/hearings/${DEMO.hearingId}/participants/${participant.id}/join-token`,
    clerkToken,
    { room_code: 'WAITING', ttl_minutes: 30 },
    false
  );
  assert.equal(out.response.status, 201);
  const raw = out.json.join_token;
  out = await post(base, '/api/v1/public/join-tokens:exchange', null, { join_token: raw }, false);
  assert.equal(out.response.status, 200);
  assert.equal(out.json.state, 'WAITING');
  return { raw, exchange: out.json };
}

test('single-use join token, waiting room admission and attendance evidence', async () => {
  const env = await prepareEnvironment(43118);
  try {
    const defendant = await registerParticipant(env.app.baseUrl, env.tokens.corrections, {
      participant_reference: 'DEFENDANT-001',
      display_name: 'Terdakwa Sintetis',
      participant_role: 'DEFENDANT',
      protected_identity: true,
      public_alias: 'Terdakwa A',
      default_room_code: 'DEFENDANT'
    });
    const { raw } = await enterWaiting(env.app.baseUrl, env.tokens.clerk, defendant);
    let out = await post(
      env.app.baseUrl,
      '/api/v1/public/join-tokens:exchange',
      null,
      { join_token: raw },
      false
    );
    assert.equal(out.response.status, 409);
    assert.equal(out.json.error.code, 'JOIN_TOKEN_ALREADY_USED');
    out = await post(
      env.app.baseUrl,
      `/api/v1/hearings/${DEMO.hearingId}/participants/${defendant.id}:admit`,
      env.tokens.judge,
      { target_room_code: 'DEFENDANT' }
    );
    assert.equal(out.response.status, 200);
    assert.equal(out.json.session.state, 'ADMITTED');
    assert.equal(out.json.session.room_code, 'DEFENDANT');
    const attendanceResponse = await fetch(
      `${env.app.baseUrl}/api/v1/hearings/${DEMO.hearingId}/attendance`,
      { headers: authHeaders(env.tokens.clerk) }
    );
    const attendance = await attendanceResponse.json();
    assert.equal(attendanceResponse.status, 200);
    assert.ok(attendance.events.some((x) => x.event_type === 'TOKEN_ISSUED'));
    assert.ok(attendance.events.some((x) => x.event_type === 'JOINED_WAITING'));
    assert.ok(attendance.events.some((x) => x.event_type === 'ADMITTED'));
  } finally {
    await stopEnvironment(env);
  }
});

test('only judge controls hearing lifecycle and invalid transitions are rejected', async () => {
  const env = await prepareEnvironment(43119);
  try {
    let out = await post(
      env.app.baseUrl,
      `/api/v1/hearings/${DEMO.hearingId}:start`,
      env.tokens.clerk,
      { reason: 'Clerk cannot start' }
    );
    assert.equal(out.response.status, 403);
    out = await post(
      env.app.baseUrl,
      `/api/v1/hearings/${DEMO.hearingId}:start`,
      env.tokens.judge,
      { reason: 'Majelis membuka persidangan' }
    );
    assert.equal(out.response.status, 200);
    assert.equal(out.json.state, 'STARTED');
    out = await post(
      env.app.baseUrl,
      `/api/v1/hearings/${DEMO.hearingId}:suspend`,
      env.tokens.judge,
      { reason: 'Uji gangguan teknis singkat' }
    );
    assert.equal(out.json.state, 'SUSPENDED');
    out = await post(
      env.app.baseUrl,
      `/api/v1/hearings/${DEMO.hearingId}:resume`,
      env.tokens.judge,
      { reason: 'Gangguan telah pulih' }
    );
    assert.equal(out.json.state, 'STARTED');
    out = await post(env.app.baseUrl, `/api/v1/hearings/${DEMO.hearingId}:end`, env.tokens.judge, {
      reason: 'Agenda selesai'
    });
    assert.equal(out.json.state, 'ENDED');
    out = await post(
      env.app.baseUrl,
      `/api/v1/hearings/${DEMO.hearingId}:resume`,
      env.tokens.judge,
      { reason: 'Tidak sah' }
    );
    assert.equal(out.response.status, 409);
    assert.equal(out.json.error.code, 'INVALID_HEARING_TRANSITION');
  } finally {
    await stopEnvironment(env);
  }
});

test('private consultation moves admitted defendant and advocate without recording', async () => {
  const env = await prepareEnvironment(43120);
  try {
    const defendant = await registerParticipant(env.app.baseUrl, env.tokens.corrections, {
      participant_reference: 'DEFENDANT-002',
      display_name: 'Terdakwa Konsultasi',
      participant_role: 'DEFENDANT',
      default_room_code: 'DEFENDANT'
    });
    const advocate = await registerParticipant(env.app.baseUrl, env.tokens.clerk, {
      participant_reference: 'ADVOCATE-001',
      display_name: 'Advokat Sintetis',
      participant_role: 'ADVOCATE',
      default_room_code: 'DEFENDANT'
    });
    await enterWaiting(env.app.baseUrl, env.tokens.clerk, defendant);
    await enterWaiting(env.app.baseUrl, env.tokens.clerk, advocate);
    await post(
      env.app.baseUrl,
      `/api/v1/hearings/${DEMO.hearingId}/participants/${defendant.id}:admit`,
      env.tokens.judge,
      { target_room_code: 'DEFENDANT' }
    );
    await post(
      env.app.baseUrl,
      `/api/v1/hearings/${DEMO.hearingId}/participants/${advocate.id}:admit`,
      env.tokens.judge,
      { target_room_code: 'DEFENDANT' }
    );
    await post(env.app.baseUrl, `/api/v1/hearings/${DEMO.hearingId}:start`, env.tokens.judge, {
      reason: 'Membuka sidang'
    });
    let out = await post(
      env.app.baseUrl,
      `/api/v1/hearings/${DEMO.hearingId}/consultations`,
      env.tokens.judge,
      {
        participant_ids: [defendant.id, advocate.id],
        reason: 'Konsultasi rahasia terdakwa dengan advokat'
      }
    );
    assert.equal(out.response.status, 201);
    assert.equal(out.json.state, 'ACTIVE');
    assert.equal(out.json.participants.length, 2);
    out = await post(
      env.app.baseUrl,
      `/api/v1/hearings/${DEMO.hearingId}/consultations/current:end`,
      env.tokens.judge,
      { reason: 'Konsultasi selesai' }
    );
    assert.equal(out.response.status, 200);
    assert.equal(out.json.state, 'ENDED');
    const status = await fetch(
      `${env.app.baseUrl}/api/v1/hearings/${DEMO.hearingId}/participants/${defendant.id}`,
      { headers: authHeaders(env.tokens.clerk) }
    ).then((r) => r.json());
    assert.equal(status.session.state, 'ADMITTED');
    assert.equal(status.session.room_code, 'DEFENDANT');
  } finally {
    await stopEnvironment(env);
  }
});

test('high incidents auto-suspend hearing and cyber or force majeure deadlines are tracked', async () => {
  const env = await prepareEnvironment(43121);
  try {
    await post(env.app.baseUrl, `/api/v1/hearings/${DEMO.hearingId}:start`, env.tokens.judge, {
      reason: 'Membuka sidang untuk incident test'
    });
    let out = await post(
      env.app.baseUrl,
      `/api/v1/hearings/${DEMO.hearingId}/incidents`,
      env.tokens.clerk,
      {
        incident_type: 'TECHNICAL',
        severity: 'HIGH',
        summary: 'Audio terdakwa terputus total',
        details: 'Koneksi utama gagal dan fallback sedang diaktifkan.'
      }
    );
    assert.equal(out.response.status, 201);
    assert.equal(out.json.auto_suspended, 1);
    const technicalId = out.json.id;
    let runtime = await fetch(`${env.app.baseUrl}/api/v1/hearings/${DEMO.hearingId}/runtime`, {
      headers: authHeaders(env.tokens.judge)
    }).then((r) => r.json());
    assert.equal(runtime.state, 'SUSPENDED');
    await post(env.app.baseUrl, `/api/v1/incidents/${technicalId}:resolve`, env.tokens.clerk, {
      resolution: 'Koneksi cadangan aktif dan audio telah diuji ulang.'
    });
    out = await post(
      env.app.baseUrl,
      `/api/v1/hearings/${DEMO.hearingId}:resume`,
      env.tokens.judge,
      { reason: 'Gangguan teknis telah dipulihkan' }
    );
    assert.equal(out.json.state, 'STARTED');
    out = await post(
      env.app.baseUrl,
      `/api/v1/hearings/${DEMO.hearingId}/incidents`,
      env.tokens.clerk,
      { incident_type: 'CYBER', severity: 'CRITICAL', summary: 'Simulasi kebocoran token peserta' }
    );
    assert.equal(out.response.status, 403);
    out = await post(
      env.app.baseUrl,
      `/api/v1/hearings/${DEMO.hearingId}/incidents`,
      env.tokens.admin,
      {
        incident_type: 'CYBER',
        severity: 'CRITICAL',
        summary: 'Simulasi kebocoran token peserta',
        details: 'Token segera dicabut dan akses diisolasi.'
      }
    );
    assert.equal(out.response.status, 201);
    assert.ok(out.json.notification_due_at);
    assert.ok(
      Date.parse(out.json.notification_due_at) - Date.parse(out.json.reported_at) >=
        23 * 60 * 60 * 1000
    );
    const cyberId = out.json.id;
    out = await post(env.app.baseUrl, `/api/v1/incidents/${cyberId}:notify`, env.tokens.admin, {
      reference: 'CYBER-NOTICE-001'
    });
    assert.equal(out.response.status, 200);
    assert.ok(out.json.notified_at);
    await post(env.app.baseUrl, `/api/v1/incidents/${cyberId}:resolve`, env.tokens.admin, {
      resolution: 'Seluruh token dicabut dan tidak ditemukan akses lanjutan.'
    });
    out = await post(
      env.app.baseUrl,
      `/api/v1/hearings/${DEMO.hearingId}/incidents`,
      env.tokens.corrections,
      {
        incident_type: 'FORCE_MAJEURE',
        severity: 'MEDIUM',
        summary: 'Gangguan listrik wilayah berkepanjangan'
      }
    );
    assert.equal(out.response.status, 201);
    assert.ok(
      Date.parse(out.json.notification_due_at) - Date.parse(out.json.reported_at) >=
        71 * 60 * 60 * 1000
    );
  } finally {
    await stopEnvironment(env);
  }
});
