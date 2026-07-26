import http from 'node:http';
import crypto from 'node:crypto';

const port = Number(process.env.MOCK_PROVIDER_PORT || 4100);
const webhook = process.env.CIMS_WEBHOOK_URL || '';
const secret = process.env.MOCK_PROVIDER_WEBHOOK_SECRET || 'development-only-secret-change-me';
const sessions = new Map(),
  rooms = new Map(),
  access = new Map(),
  idem = new Map();
let health = 'HEALTHY';
const send = (res, status, data) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(data));
};
const body = (req) =>
  new Promise((resolve, reject) => {
    let d = '';
    req.on('data', (c) => (d += c));
    req.on('end', () => {
      try {
        resolve(d ? JSON.parse(d) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
const id = (p) => `${p}_${crypto.randomUUID()}`;
async function emit(type, payload) {
  if (!webhook) return;
  const eventId = crypto.randomUUID(),
    timestamp = new Date().toISOString();
  const data = JSON.stringify({
    event_id: eventId,
    event_type: type,
    occurred_at: timestamp,
    ...payload
  });
  const sig = crypto
    .createHmac('sha256', secret)
    .update(timestamp + '.' + data)
    .digest('hex');
  try {
    await fetch(webhook, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Provider-Signature': sig,
        'X-Provider-Timestamp': timestamp,
        'X-Provider-Event-Id': eventId
      },
      body: data
    });
  } catch (e) {
    console.error('webhook failed', e.message);
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://local');
    const key = req.headers['idempotency-key'];
    if (req.method === 'GET' && url.pathname === '/health')
      return send(res, 200, {
        status: health,
        checked_at: new Date().toISOString(),
        details: { provider: 'CIMS-MOCK' }
      });
    if (health === 'DOWN' && !url.pathname.startsWith('/admin/'))
      return send(res, 503, {
        code: 'PROVIDER_UNAVAILABLE',
        message: 'Mock provider is DOWN',
        retryable: true,
        correlation_id: req.headers['x-correlation-id'] || null
      });
    if (req.method === 'POST' && url.pathname === '/admin/scenario') {
      const b = await body(req);
      health = b.health || health;
      return send(res, 200, { health });
    }
    if (req.method === 'POST' && url.pathname === '/sessions') {
      if (key && idem.has(key)) return send(res, 200, idem.get(key));
      const b = await body(req),
        ref = id('sess');
      const s = {
        provider_session_reference: ref,
        state: 'READY',
        hearing_reference: b.hearing_reference,
        start_at: b.start_at,
        end_at: b.end_at,
        recording_policy: b.recording_policy || 'DISABLED'
      };
      sessions.set(ref, s);
      if (key) idem.set(key, s);
      await emit('session.ready', { provider_session_reference: ref });
      return send(res, 201, s);
    }
    const sm = url.pathname.match(/^\/sessions\/([^/]+)$/);
    if (sm && req.method === 'GET') {
      const s = sessions.get(sm[1]);
      return s ? send(res, 200, s) : send(res, 404, { code: 'SESSION_NOT_FOUND' });
    }
    if (sm && req.method === 'PATCH') {
      const s = sessions.get(sm[1]);
      if (!s) return send(res, 404, { code: 'SESSION_NOT_FOUND' });
      Object.assign(s, await body(req));
      return send(res, 200, s);
    }
    if (sm && req.method === 'DELETE') {
      const s = sessions.get(sm[1]);
      if (!s) return send(res, 404, { code: 'SESSION_NOT_FOUND' });
      s.state = 'CANCELLED';
      return send(res, 200, s);
    }
    const rm = url.pathname.match(/^\/sessions\/([^/]+)\/rooms$/);
    if (rm && req.method === 'POST') {
      if (!sessions.has(rm[1])) return send(res, 404, { code: 'SESSION_NOT_FOUND' });
      const b = await body(req),
        ref = id('room');
      const r = {
        provider_room_reference: ref,
        provider_session_reference: rm[1],
        room_code: b.room_code,
        room_type: b.room_type,
        recording_allowed: !!b.recording_allowed
      };
      rooms.set(ref, r);
      return send(res, 201, r);
    }
    const am = url.pathname.match(/^\/sessions\/([^/]+)\/access$/);
    if (am && req.method === 'POST') {
      if (!sessions.has(am[1])) return send(res, 404, { code: 'SESSION_NOT_FOUND' });
      const b = await body(req);
      const requestedRoom = b.room_reference ?? b.provider_room_reference;
      const room = rooms.get(requestedRoom);
      if (!room || room.provider_session_reference !== am[1])
        return send(res, 404, { code: 'ROOM_NOT_FOUND' });
      if (room.room_type === 'CONSULTATION' && b.permissions?.includes('RECORD'))
        return send(res, 409, {
          code: 'INVALID_STATE',
          message: 'Recording is denied in consultation room'
        });
      const ref = id('access');
      const a = {
        participant_access_reference: ref,
        participant_join_url: `https://mock.invalid/join/${ref}`,
        expires_at: b.expires_at,
        revoked: false,
        participant_reference: b.participant_reference,
        role: b.role,
        room_reference: requestedRoom,
        room_type: room.room_type,
        permissions: b.permissions ?? []
      };
      access.set(ref, a);
      await emit('participant.access-issued', {
        provider_session_reference: am[1],
        participant_access_reference: ref
      });
      return send(res, 201, a);
    }
    const ag = url.pathname.match(/^\/access\/([^/]+)$/);
    if (ag && req.method === 'GET') {
      const a = access.get(ag[1]);
      return a ? send(res, 200, a) : send(res, 404, { code: 'ACCESS_NOT_FOUND' });
    }
    const mv = url.pathname.match(/^\/access\/([^/]+)\/move$/);
    if (mv && req.method === 'POST') {
      const a = access.get(mv[1]);
      if (!a) return send(res, 404, { code: 'ACCESS_NOT_FOUND' });
      if (a.revoked) return send(res, 410, { code: 'ACCESS_REVOKED' });
      const b = await body(req),
        room = rooms.get(b.room_reference);
      if (!room) return send(res, 404, { code: 'ROOM_NOT_FOUND' });
      a.room_reference = room.provider_room_reference;
      a.room_type = room.room_type;
      await emit('participant.moved', {
        participant_access_reference: mv[1],
        provider_session_reference: room.provider_session_reference,
        room_reference: room.provider_room_reference
      });
      return send(res, 200, a);
    }
    const rv = url.pathname.match(/^\/access\/([^/]+)\/revoke$/);
    if (rv && req.method === 'POST') {
      const a = access.get(rv[1]);
      if (!a) return send(res, 404, { code: 'ACCESS_NOT_FOUND' });
      a.revoked = true;
      await emit('participant.revoked', { participant_access_reference: rv[1] });
      return send(res, 200, { revoked: true });
    }
    const rec = url.pathname.match(/^\/sessions\/([^/]+)\/recording$/);
    if (rec && req.method === 'POST') {
      const s = sessions.get(rec[1]);
      if (!s) return send(res, 404, { code: 'SESSION_NOT_FOUND' });
      const b = await body(req);
      if (s.recording_policy === 'DISABLED')
        return send(res, 403, { code: 'INVALID_STATE', message: 'Recording disabled' });
      return send(res, 200, {
        recording_reference: b.action === 'START' ? id('recording') : null,
        state: b.action === 'START' ? 'STARTED' : 'STOPPED'
      });
    }
    return send(res, 404, { code: 'NOT_FOUND' });
  } catch (e) {
    return send(res, 400, { code: 'VALIDATION_ERROR', message: e.message });
  }
});
server.listen(port, () =>
  console.log(`CIMS mock video provider listening on http://localhost:${port}`)
);
