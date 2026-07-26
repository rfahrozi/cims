const base = String(process.env.ZOOM_ADAPTER_BASE_URL || 'http://127.0.0.1:4200').replace(
  /\/$/,
  ''
);
const confirm = process.env.ZOOM_LIVE_SMOKE_CONFIRM;
const participantEmail = process.env.ZOOM_LIVE_SMOKE_PARTICIPANT_EMAIL;
if (confirm !== 'YES') {
  console.error(
    'Refusing to create a live Zoom meeting. Set ZOOM_LIVE_SMOKE_CONFIRM=YES after reviewing the script.'
  );
  process.exit(2);
}
if (!participantEmail || !participantEmail.includes('@')) {
  console.error('Set ZOOM_LIVE_SMOKE_PARTICIPANT_EMAIL to an approved nonproduction email.');
  process.exit(2);
}
const call = async (path, { method = 'GET', body, headers = {} } = {}) => {
  const response = await fetch(base + path, {
    method,
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(`${data.code || response.status}: ${data.message || 'Request failed'}`);
    error.data = data;
    throw error;
  }
  return data;
};
const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
start.setUTCMinutes(Math.ceil(start.getUTCMinutes() / 15) * 15, 0, 0);
const end = new Date(start.getTime() + 30 * 60 * 1000);
let sessionRef = null,
  accessRef = null;
const report = { started_at: new Date().toISOString(), adapter_base_url: base, steps: [] };
try {
  const health = await call('/health');
  report.steps.push({
    step: 'health',
    status: 'PASS',
    details: {
      status: health.status,
      provider: health.details?.provider,
      capabilities: health.details?.capabilities
    }
  });
  const session = await call('/sessions', {
    method: 'POST',
    headers: { 'idempotency-key': `live-smoke-${Date.now()}` },
    body: {
      hearing_reference: `CIMS-ZOOM-SMOKE-${Date.now()}`,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      recording_policy: 'DISABLED'
    }
  });
  sessionRef = session.provider_session_reference;
  report.steps.push({
    step: 'create_meeting',
    status: 'PASS',
    provider_session_reference: sessionRef
  });
  const rooms = {};
  for (const type of ['MAIN', 'WAITING', 'DEFENDANT']) {
    const r = await call(`/sessions/${encodeURIComponent(sessionRef)}/rooms`, {
      method: 'POST',
      body: { room_code: type, room_type: type, recording_allowed: false }
    });
    rooms[type] = r.provider_room_reference;
  }
  report.steps.push({
    step: 'create_logical_rooms',
    status: 'PASS',
    room_count: Object.keys(rooms).length
  });
  const access = await call(`/sessions/${encodeURIComponent(sessionRef)}/access`, {
    method: 'POST',
    body: {
      participant_reference: 'ZOOM-LIVE-SMOKE-PARTICIPANT',
      participant_email: participantEmail,
      participant_name: 'CIMS Zoom Smoke Test',
      role: 'OTHER',
      room_reference: rooms.WAITING,
      expires_at: end.toISOString(),
      permissions: ['AUDIO', 'VIDEO']
    }
  });
  accessRef = access.participant_access_reference;
  report.steps.push({
    step: 'unique_registrant_link',
    status: 'PASS',
    access_reference: accessRef,
    join_url_returned: Boolean(access.participant_join_url)
  });
  await call(`/access/${encodeURIComponent(accessRef)}/revoke`, {
    method: 'POST',
    body: { reason: 'CIMS live smoke cleanup' }
  });
  report.steps.push({ step: 'revoke_registrant', status: 'PASS' });
  await call(`/sessions/${encodeURIComponent(sessionRef)}`, { method: 'DELETE' });
  report.steps.push({ step: 'delete_meeting', status: 'PASS' });
  report.status = 'PASS';
} catch (error) {
  report.status = 'FAIL';
  report.error = { message: error.message, details: error.data || null };
  if (accessRef)
    try {
      await call(`/access/${encodeURIComponent(accessRef)}/revoke`, {
        method: 'POST',
        body: { reason: 'CIMS failed smoke cleanup' }
      });
    } catch {}
  if (sessionRef)
    try {
      await call(`/sessions/${encodeURIComponent(sessionRef)}`, { method: 'DELETE' });
    } catch {}
  process.exitCode = 1;
} finally {
  report.completed_at = new Date().toISOString();
  console.log(JSON.stringify(report, null, 2));
}
