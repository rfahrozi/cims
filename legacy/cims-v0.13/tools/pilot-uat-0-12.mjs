import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { startTestApp, login, authHeaders } from '../tests/helpers/test-app.mjs';
import {
  DEMO,
  prepareActiveSchedule,
  prepareNotices,
  prepareReadiness,
  prepareVirtual
} from '../tests/helpers/workflow.mjs';

const port = 43312;
const provider = spawn(process.execPath, ['services/mock-video-provider/src/server.mjs'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    MOCK_PROVIDER_PORT: String(port),
    MOCK_PROVIDER_WEBHOOK_SECRET: 'uat-provider-secret'
  },
  stdio: ['ignore', 'pipe', 'inherit']
});
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('provider timeout')), 3000);
  provider.stdout.on('data', (d) => {
    if (String(d).includes('listening')) {
      clearTimeout(t);
      resolve();
    }
  });
});
const app = await startTestApp({
  providerBaseUrl: `http://127.0.0.1:${port}`,
  providerWebhookSecret: 'uat-provider-secret',
  loginRateLimitPerMinute: 100
});
const scenarios = [];
const idem = (p) => `${p}-${randomUUID()}`;
async function post(path, token, body = {}) {
  const r = await fetch(app.baseUrl + path, {
    method: 'POST',
    headers: authHeaders(token, idem('uat')),
    body: JSON.stringify(body)
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`${path}: ${JSON.stringify(j)}`);
  return j;
}
async function scenario(id, name, fn) {
  const at = Date.now();
  try {
    const evidence = await fn();
    scenarios.push({ id, name, status: 'PASSED', duration_ms: Date.now() - at, evidence });
  } catch (error) {
    scenarios.push({
      id,
      name,
      status: 'FAILED',
      duration_ms: Date.now() - at,
      error: String(error.message)
    });
  }
}
try {
  const tokens = {
    admin: await login(app.baseUrl, 'admin@cims.local', 'Admin123!'),
    judge: await login(app.baseUrl, 'judge@cims.local', 'Judge123!'),
    clerk: await login(app.baseUrl, 'clerk@cims.local', 'Clerk123!'),
    prosecutor: await login(app.baseUrl, 'prosecutor@cims.local', 'Prosecutor123!'),
    corrections: await login(app.baseUrl, 'corrections@cims.local', 'Corrections123!')
  };
  await scenario('UAT-01', 'Schedule and determination hard gate', async () => {
    const schedule = await prepareActiveSchedule(app.baseUrl, tokens);
    return { schedule_id: schedule.id, status: schedule.status };
  });
  await scenario('UAT-02', 'Official notice chain', async () => ({
    notice_ids: (await prepareNotices(app.baseUrl, tokens)).map((x) => x.id)
  }));
  await scenario('UAT-03', 'Readiness and protected defendant verification', async () => {
    await prepareReadiness(app.baseUrl, tokens);
    return { status: 'READY' };
  });
  await scenario('UAT-04', 'Provider-neutral virtual session', async () => {
    const v = await prepareVirtual(app.baseUrl, tokens);
    return { virtual_session_id: v.id, state: v.state, rooms: v.rooms.length };
  });
  await scenario('UAT-05', 'Appeal decision reading and statutory evidence', async () => {
    const reading = await post('/api/v1/appeal-decision-readings', tokens.clerk, {
      case_reference_id: DEMO.caseId,
      scheduled_at: '2026-08-24T02:00:00.000Z',
      delivery_mode: 'ELECTRONIC',
      determination_reference: 'PT-UAT-001'
    });
    for (const [token, step, recipient] of [
      [tokens.clerk, 'COURT_TO_PROSECUTION', 'PROSECUTOR'],
      [tokens.prosecutor, 'PROSECUTION_TO_DEFENDANT', 'DEFENDANT'],
      [tokens.corrections, 'CORRECTIONS_TO_DEFENDANT', 'DEFENDANT']
    ])
      await post(`/api/v1/appeal-decision-readings/${reading.id}/notices`, token, {
        step_code: step,
        recipient_reference: recipient,
        channel: 'IN_APP',
        official_reference: `${step}-REF`,
        status: 'ACKNOWLEDGED',
        receipt_reference: `${step}-ACK`
      });
    await post(`/api/v1/appeal-decision-readings/${reading.id}/presence`, tokens.clerk, {
      party_role: 'DEFENDANT',
      party_reference: 'DEFENDANT',
      attendance_status: 'PRESENT',
      attendance_mode: 'ELECTRONIC'
    });
    await post(`/api/v1/appeal-decision-readings/${reading.id}/presence`, tokens.clerk, {
      party_role: 'PROSECUTOR',
      party_reference: 'PROSECUTOR',
      attendance_status: 'PRESENT',
      attendance_mode: 'ELECTRONIC'
    });
    await post(`/api/v1/appeal-decision-readings/${reading.id}:complete`, tokens.judge, {
      read_at: '2026-08-24T02:15:00.000Z',
      open_to_public: true
    });
    await post(`/api/v1/appeal-decision-readings/${reading.id}/excerpt`, tokens.clerk, {
      excerpt_reference: 'UAT-EXCERPT',
      source_system_code: 'SIP-DEMO',
      published_at: '2026-08-24T06:00:00.000Z'
    });
    const final = await post(
      `/api/v1/appeal-decision-readings/${reading.id}/transmission`,
      tokens.clerk,
      {
        destination_court_reference: 'PN-DEMO',
        transmission_reference: 'UAT-TRANSMISSION',
        transmitted_at: '2026-08-28T02:00:00.000Z'
      }
    );
    return { reading_id: reading.id, compliance: final.compliance };
  });
  await scenario('UAT-06', 'Reconciliation with official source', async () => {
    const run = await post('/api/v1/reconciliation-runs', tokens.admin, {
      source_system_code: 'SIP-DEMO',
      records: [
        {
          external_case_id: 'EXT-CASE-001',
          case_number: '123/Pid.Sus/2026/PN Demo',
          case_type: 'PIDANA_KHUSUS'
        },
        {
          external_case_id: 'EXT-CASE-002',
          case_number: '124/Pid.Sus/2026/PN Demo',
          case_type: 'PIDANA_KHUSUS'
        }
      ]
    });
    return { run_id: run.id, matched: run.matched_records, mismatch: run.mismatch_records };
  });
  await scenario('UAT-07', 'Tamper-evident audit chain', async () => {
    const r = await fetch(`${app.baseUrl}/api/v1/audit-events/verify-chain`, {
      headers: authHeaders(tokens.admin)
    });
    const j = await r.json();
    if (!j.valid) throw new Error('audit chain invalid');
    return { event_count: j.event_count, head_hash: j.head_hash };
  });
  await scenario('UAT-08', 'Compliance dashboard', async () => {
    const r = await fetch(`${app.baseUrl}/api/v1/compliance-dashboard`, {
      headers: authHeaders(tokens.admin)
    });
    const j = await r.json();
    if (!r.ok) throw new Error(JSON.stringify(j));
    return { appeal: j.appeal, reconciliation: j.reconciliation, audit_head: j.audit_head };
  });
  const passed = scenarios.every((x) => x.status === 'PASSED');
  console.log(
    JSON.stringify(
      {
        version: '0.12.0',
        pilot: 'SYNTHETIC_CROSS_INSTITUTION_UAT',
        data_classification: 'SYNTHETIC_ONLY',
        scenarios,
        summary: {
          total: scenarios.length,
          passed: scenarios.filter((x) => x.status === 'PASSED').length,
          failed: scenarios.filter((x) => x.status === 'FAILED').length
        },
        passed,
        executed_at: new Date().toISOString()
      },
      null,
      2
    )
  );
  if (!passed) process.exitCode = 1;
} finally {
  await app.stop();
  provider.kill('SIGTERM');
  await once(provider, 'exit').catch(() => {});
}
