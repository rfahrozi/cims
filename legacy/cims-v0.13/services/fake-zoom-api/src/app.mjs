import http from 'node:http';
import { randomUUID } from 'node:crypto';

const json = (res, status, data) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(data === null ? '' : JSON.stringify(data));
};
const readRaw = (req) =>
  new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => resolve(data));
  });
const parse = (raw, headers) =>
  headers['content-type']?.includes('application/x-www-form-urlencoded')
    ? Object.fromEntries(new URLSearchParams(raw))
    : raw
      ? JSON.parse(raw)
      : {};

export function createFakeZoomApi(overrides = {}) {
  const meetings = new Map();
  const registrants = new Map();
  let nextMeeting = 90000000000n;
  const accountId = overrides.accountId || 'fake-account';
  const clientId = overrides.clientId || 'fake-client';
  const clientSecret = overrides.clientSecret || 'fake-secret';
  const hostUserId = overrides.hostUserId || 'host@example.test';
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://fake.zoom');
      const raw = await readRaw(req);
      const body = parse(raw, req.headers);
      if (req.method === 'POST' && url.pathname === '/oauth/token') {
        const expected = 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        if (
          req.headers.authorization !== expected ||
          body.grant_type !== 'account_credentials' ||
          body.account_id !== accountId
        )
          return json(res, 401, { error: 'invalid_client', reason: 'Invalid credentials' });
        return json(res, 200, {
          access_token: 'fake-access-token',
          token_type: 'bearer',
          expires_in: 3600,
          scope: 'meeting:write:admin'
        });
      }
      if (req.headers.authorization !== 'Bearer fake-access-token')
        return json(res, 401, { code: 124, message: 'Invalid access token' });
      const create = url.pathname.match(/^\/v2\/users\/([^/]+)\/meetings$/);
      if (create && req.method === 'POST') {
        if (decodeURIComponent(create[1]) !== hostUserId)
          return json(res, 404, { code: 1001, message: 'User does not exist' });
        const id = String(nextMeeting++);
        const meeting = {
          id: Number(id),
          uuid: randomUUID(),
          topic: body.topic,
          type: 2,
          start_time: body.start_time,
          duration: body.duration,
          timezone: body.timezone || 'UTC',
          password: body.password,
          join_url: `https://zoom.example.test/j/${id}?pwd=fake`,
          start_url: `https://zoom.example.test/s/${id}?zak=fake`,
          status: 'waiting',
          settings: body.settings || {}
        };
        meetings.set(id, meeting);
        registrants.set(id, new Map());
        return json(res, 201, meeting);
      }
      const meeting = url.pathname.match(/^\/v2\/meetings\/([^/]+)$/);
      if (meeting && req.method === 'GET') {
        const m = meetings.get(decodeURIComponent(meeting[1]));
        return m
          ? json(res, 200, m)
          : json(res, 404, { code: 3001, message: 'Meeting does not exist' });
      }
      if (meeting && req.method === 'PATCH') {
        const m = meetings.get(decodeURIComponent(meeting[1]));
        if (!m) return json(res, 404, { code: 3001, message: 'Meeting does not exist' });
        Object.assign(m, body);
        if (body.settings) m.settings = { ...m.settings, ...body.settings };
        return json(res, 204, null);
      }
      if (meeting && req.method === 'DELETE') {
        const id = decodeURIComponent(meeting[1]);
        if (!meetings.has(id))
          return json(res, 404, { code: 3001, message: 'Meeting does not exist' });
        meetings.delete(id);
        return json(res, 204, null);
      }
      const reg = url.pathname.match(/^\/v2\/meetings\/([^/]+)\/registrants$/);
      if (reg && req.method === 'POST') {
        const id = decodeURIComponent(reg[1]);
        if (!meetings.has(id))
          return json(res, 404, { code: 3001, message: 'Meeting does not exist' });
        const registrantId = randomUUID();
        const item = {
          id: Number(id),
          registrant_id: registrantId,
          join_url: `https://zoom.example.test/w/${id}?tk=${registrantId}`,
          start_time: meetings.get(id).start_time,
          topic: meetings.get(id).topic,
          email: body.email
        };
        registrants.get(id).set(registrantId, item);
        return json(res, 201, item);
      }
      const regStatus = url.pathname.match(/^\/v2\/meetings\/([^/]+)\/registrants\/status$/);
      if (regStatus && req.method === 'PUT') {
        const id = decodeURIComponent(regStatus[1]);
        if (!meetings.has(id))
          return json(res, 404, { code: 3001, message: 'Meeting does not exist' });
        for (const reg of body.registrants || []) {
          const found = registrants.get(id).get(reg.id);
          if (found) found.status = body.action;
        }
        return json(res, 204, null);
      }
      const live = url.pathname.match(/^\/v2\/live_meetings\/([^/]+)\/events$/);
      if (live && req.method === 'PATCH') {
        if (!meetings.has(decodeURIComponent(live[1])))
          return json(res, 404, { code: 3001, message: 'Meeting does not exist' });
        return json(res, 204, null);
      }
      return json(res, 404, { code: 404, message: 'Not found' });
    } catch (error) {
      return json(res, 400, { code: 300, message: error.message });
    }
  });
  return {
    server,
    meetings,
    registrants,
    config: { accountId, clientId, clientSecret, hostUserId },
    listen: (port = 0, host = '127.0.0.1') =>
      new Promise((resolve) => server.listen(port, host, () => resolve(server.address()))),
    close: () => new Promise((resolve) => server.close(resolve))
  };
}
