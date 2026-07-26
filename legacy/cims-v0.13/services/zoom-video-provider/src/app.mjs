import http from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { loadZoomAdapterConfig, missingZoomCredentials } from './config.mjs';
import { AdapterDatabase } from './database.mjs';
import { CryptoStore } from './crypto-store.mjs';
import { ZoomTokenProvider } from './oauth.mjs';
import { ZoomClient } from './zoom-client.mjs';
import { AdapterError, assert } from './errors.mjs';
import {
  validationResponse,
  verifyZoomWebhook,
  translateZoomEvent,
  emitCimsWebhook
} from './webhook.mjs';

const now = () => new Date().toISOString();
const durationMinutes = (start, end) =>
  Math.max(1, Math.ceil((Date.parse(end) - Date.parse(start)) / 60000));
const json = (res, status, data, headers = {}) => {
  res.writeHead(status, {
    'content-type': 'application/json',
    'cache-control': 'no-store',
    ...headers
  });
  res.end(JSON.stringify(data));
};
const readRaw = (req) =>
  new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 2_000_000) {
        reject(new AdapterError('PAYLOAD_TOO_LARGE', 'Payload exceeds 2 MB.', 413));
        req.destroy();
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
const parseJson = (raw) => {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    throw new AdapterError('VALIDATION_ERROR', 'Request body must be valid JSON.', 400);
  }
};
const safeMessage = (error) =>
  error instanceof AdapterError ? error.message : 'Unexpected adapter error.';

function capabilities(config) {
  return {
    provider: 'ZOOM',
    session_provisioning: true,
    unique_participant_links: true,
    access_revocation: true,
    waiting_room: true,
    breakout_preassignment: true,
    live_waiting_room_admission: false,
    live_breakout_room_move: false,
    live_private_consultation_move: false,
    cloud_recording_control: true,
    signed_webhooks: true,
    manual_live_controls_allowed: config.allowManualLiveControls
  };
}

function sessionPublic(row) {
  return row
    ? {
        provider_session_reference: row.zoom_meeting_id,
        state: row.state,
        hearing_reference: row.hearing_reference,
        start_at: row.start_at,
        end_at: row.end_at,
        recording_policy: row.recording_policy,
        capabilities: undefined
      }
    : null;
}

export function createZoomAdapter(overrides = {}) {
  const config = loadZoomAdapterConfig(overrides.config || overrides);
  const db = overrides.db || new AdapterDatabase(config.dbPath);
  const cryptoStore = overrides.cryptoStore || new CryptoStore(config);
  const fetchImpl = overrides.fetchImpl || fetch;
  const tokens = overrides.tokens || new ZoomTokenProvider(config, fetchImpl);
  const zoom = overrides.zoom || new ZoomClient(config, tokens, fetchImpl);

  const sessionByRef = (ref) =>
    db.get('select * from zoom_sessions where zoom_meeting_id=?', String(ref));
  const roomByRef = (ref) =>
    db.get('select * from zoom_rooms where provider_room_reference=?', String(ref));
  const accessByRef = (ref) => db.get('select * from zoom_access where id=?', String(ref));

  async function updateBreakoutAssignments(session, correlationId) {
    if (session.state === 'STARTED')
      throw new AdapterError(
        'CAPABILITY_NOT_SUPPORTED',
        'Zoom REST API does not support live breakout-room movement.',
        409,
        {
          manual_action_required: true,
          operation: 'MOVE_PARTICIPANT',
          capability: 'live_breakout_room_move'
        },
        false
      );
    const rooms = db.all(
      "select * from zoom_rooms where session_id=? and room_type in ('DEFENDANT','WITNESS','CONSULTATION') order by room_code",
      session.id
    );
    const definitions = [];
    for (const room of rooms) {
      const emails = db
        .all(
          "select participant_email from zoom_access where session_id=? and current_room_id=? and state='ACTIVE' order by participant_email",
          session.id,
          room.id
        )
        .map((r) => r.participant_email);
      if (emails.length) definitions.push({ name: room.room_code, participants: emails });
    }
    await zoom.updateMeeting(
      session.zoom_meeting_id,
      { settings: { breakout_room: { enable: definitions.length > 0, rooms: definitions } } },
      correlationId
    );
    return definitions;
  }

  async function handle(req, res) {
    const correlationId = String(req.headers['x-correlation-id'] || randomUUID());
    const requestUrl = new URL(req.url, 'http://adapter.local');
    let raw = '';
    try {
      if (!['GET', 'HEAD'].includes(req.method)) raw = await readRaw(req);
      const body = parseJson(raw);

      if (req.method === 'GET' && requestUrl.pathname === '/health') {
        const missing = missingZoomCredentials(config);
        if (missing.length)
          return json(res, 503, {
            status: 'DOWN',
            checked_at: now(),
            details: {
              provider: 'ZOOM',
              configuration: 'INCOMPLETE',
              missing,
              capabilities: capabilities(config)
            }
          });
        try {
          await tokens.getToken();
          return json(res, 200, {
            status: 'HEALTHY',
            checked_at: now(),
            details: {
              provider: 'ZOOM',
              oauth: 'AUTHENTICATED',
              api_base_url: config.apiBaseUrl,
              host_user_id: config.hostUserId,
              capabilities: capabilities(config)
            }
          });
        } catch (error) {
          return json(res, error.status || 503, {
            status: 'DOWN',
            checked_at: now(),
            details: {
              provider: 'ZOOM',
              code: error.code || 'PROVIDER_UNAVAILABLE',
              message: safeMessage(error),
              capabilities: capabilities(config)
            }
          });
        }
      }

      if (req.method === 'POST' && requestUrl.pathname === '/sessions') {
        const idempotencyKey = String(req.headers['idempotency-key'] || '');
        assert(
          idempotencyKey,
          'IDEMPOTENCY_KEY_REQUIRED',
          'Idempotency-Key header is required.',
          400
        );
        const existing = db.get(
          'select * from zoom_sessions where idempotency_key=?',
          idempotencyKey
        );
        if (existing)
          return json(res, 200, { ...sessionPublic(existing), capabilities: capabilities(config) });
        assert(
          body.hearing_reference && body.start_at && body.end_at,
          'VALIDATION_ERROR',
          'hearing_reference, start_at and end_at are required.',
          400
        );
        assert(
          Date.parse(body.end_at) > Date.parse(body.start_at),
          'VALIDATION_ERROR',
          'end_at must be after start_at.',
          400
        );
        assert(
          ['DISABLED', 'COURT_CONTROLLED'].includes(body.recording_policy || 'DISABLED'),
          'VALIDATION_ERROR',
          'recording_policy is invalid.',
          400
        );
        const passcode = randomBytes(6).toString('base64url').replace(/[-_]/g, 'A').slice(0, 10);
        const meeting = await zoom.createMeeting(
          {
            topic: `${config.topicPrefix} - ${body.hearing_reference}`,
            type: 2,
            start_time: body.start_at,
            duration: durationMinutes(body.start_at, body.end_at),
            timezone: config.timezone,
            password: passcode,
            agenda: `CIMS hearing reference ${body.hearing_reference}`,
            settings: {
              host_video: true,
              participant_video: true,
              join_before_host: false,
              mute_upon_entry: true,
              waiting_room: true,
              waiting_room_options: { mode: 'custom', who_goes_to_waiting_room: 'everyone' },
              auto_recording: body.recording_policy === 'COURT_CONTROLLED' ? 'none' : 'none',
              approval_type: 0,
              registration_type: 1,
              email_notification: false,
              allow_multiple_devices: false,
              breakout_room: { enable: false, rooms: [] }
            }
          },
          correlationId
        );
        const id = randomUUID(),
          at = now();
        db.run(
          `insert into zoom_sessions(id,hearing_reference,idempotency_key,zoom_meeting_id,zoom_uuid,state,start_at,end_at,recording_policy,join_url_cipher,start_url_cipher,passcode_cipher,created_at,updated_at) values(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          id,
          String(body.hearing_reference),
          idempotencyKey,
          String(meeting.id),
          meeting.uuid || null,
          'READY',
          body.start_at,
          body.end_at,
          body.recording_policy || 'DISABLED',
          cryptoStore.encrypt(meeting.join_url),
          cryptoStore.encrypt(meeting.start_url),
          cryptoStore.encrypt(meeting.password || passcode),
          at,
          at
        );
        await emitCimsWebhook(
          config,
          {
            event_id: randomUUID(),
            event_type: 'session.ready',
            occurred_at: at,
            provider_session_reference: String(meeting.id)
          },
          fetchImpl
        ).catch(() => undefined);
        return json(res, 201, {
          provider_session_reference: String(meeting.id),
          state: 'READY',
          hearing_reference: String(body.hearing_reference),
          start_at: body.start_at,
          end_at: body.end_at,
          recording_policy: body.recording_policy || 'DISABLED',
          capabilities: capabilities(config)
        });
      }

      const sessionMatch = requestUrl.pathname.match(/^\/sessions\/([^/]+)$/);
      if (sessionMatch && req.method === 'GET') {
        const session = sessionByRef(decodeURIComponent(sessionMatch[1]));
        if (!session)
          throw new AdapterError('SESSION_NOT_FOUND', 'Zoom session was not found.', 404);
        const current = await zoom.getMeeting(session.zoom_meeting_id, correlationId);
        return json(res, 200, {
          ...sessionPublic(session),
          zoom_status: current.status || 'waiting',
          capabilities: capabilities(config)
        });
      }
      if (sessionMatch && req.method === 'PATCH') {
        const session = sessionByRef(decodeURIComponent(sessionMatch[1]));
        if (!session)
          throw new AdapterError('SESSION_NOT_FOUND', 'Zoom session was not found.', 404);
        const patch = {};
        if (body.start_at) {
          patch.start_time = body.start_at;
        }
        if (body.end_at || body.start_at) {
          patch.duration = durationMinutes(
            body.start_at || session.start_at,
            body.end_at || session.end_at
          );
        }
        if (body.topic) patch.topic = body.topic;
        if (Object.keys(patch).length)
          await zoom.updateMeeting(session.zoom_meeting_id, patch, correlationId);
        db.run(
          'update zoom_sessions set start_at=?,end_at=?,updated_at=? where id=?',
          body.start_at || session.start_at,
          body.end_at || session.end_at,
          now(),
          session.id
        );
        return json(res, 200, sessionPublic(sessionByRef(session.zoom_meeting_id)));
      }
      if (sessionMatch && req.method === 'DELETE') {
        const session = sessionByRef(decodeURIComponent(sessionMatch[1]));
        if (!session)
          throw new AdapterError('SESSION_NOT_FOUND', 'Zoom session was not found.', 404);
        await zoom.deleteMeeting(session.zoom_meeting_id, correlationId);
        db.run(
          "update zoom_sessions set state='CANCELLED',updated_at=? where id=?",
          now(),
          session.id
        );
        return json(res, 200, sessionPublic(sessionByRef(session.zoom_meeting_id)));
      }

      const roomsMatch = requestUrl.pathname.match(/^\/sessions\/([^/]+)\/rooms$/);
      if (roomsMatch && req.method === 'POST') {
        const session = sessionByRef(decodeURIComponent(roomsMatch[1]));
        if (!session)
          throw new AdapterError('SESSION_NOT_FOUND', 'Zoom session was not found.', 404);
        assert(
          body.room_code && body.room_type,
          'VALIDATION_ERROR',
          'room_code and room_type are required.',
          400
        );
        assert(
          ['MAIN', 'WAITING', 'DEFENDANT', 'WITNESS', 'CONSULTATION'].includes(body.room_type),
          'VALIDATION_ERROR',
          'room_type is invalid.',
          400
        );
        const existing = db.get(
          'select * from zoom_rooms where session_id=? and room_code=?',
          session.id,
          body.room_code
        );
        if (existing)
          return json(res, 200, {
            provider_room_reference: existing.provider_room_reference,
            provider_session_reference: session.zoom_meeting_id,
            room_code: existing.room_code,
            room_type: existing.room_type,
            recording_allowed: Boolean(existing.recording_allowed)
          });
        const id = randomUUID(),
          ref = `zoom-room:${session.zoom_meeting_id}:${body.room_code}`;
        db.run(
          'insert into zoom_rooms(id,session_id,room_code,room_type,provider_room_reference,recording_allowed) values(?,?,?,?,?,?)',
          id,
          session.id,
          String(body.room_code),
          String(body.room_type),
          ref,
          body.recording_allowed ? 1 : 0
        );
        return json(res, 201, {
          provider_room_reference: ref,
          provider_session_reference: session.zoom_meeting_id,
          room_code: String(body.room_code),
          room_type: String(body.room_type),
          recording_allowed: Boolean(body.recording_allowed)
        });
      }

      const accessCreate = requestUrl.pathname.match(/^\/sessions\/([^/]+)\/access$/);
      if (accessCreate && req.method === 'POST') {
        const session = sessionByRef(decodeURIComponent(accessCreate[1]));
        if (!session)
          throw new AdapterError('SESSION_NOT_FOUND', 'Zoom session was not found.', 404);
        const room = roomByRef(body.room_reference || body.provider_room_reference);
        if (!room || room.session_id !== session.id)
          throw new AdapterError('ROOM_NOT_FOUND', 'Zoom logical room was not found.', 404);
        assert(
          body.participant_reference,
          'VALIDATION_ERROR',
          'participant_reference is required.',
          400
        );
        assert(
          body.participant_email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.participant_email),
          'PARTICIPANT_EMAIL_REQUIRED',
          'A valid participant_email is required for Zoom registrant access.',
          400
        );
        assert(
          body.participant_name,
          'PARTICIPANT_NAME_REQUIRED',
          'participant_name is required.',
          400
        );
        const names = String(body.participant_name).trim().split(/\s+/);
        const first = names.shift() || 'CIMS',
          last = names.join(' ') || String(body.role || 'Participant');
        const registrant = await zoom.addRegistrant(
          session.zoom_meeting_id,
          {
            email: String(body.participant_email).toLowerCase(),
            first_name: first,
            last_name: last
          },
          correlationId
        );
        assert(
          registrant.join_url && registrant.registrant_id,
          'ZOOM_REGISTRANT_RESPONSE_INVALID',
          'Zoom did not return a unique join URL and registrant ID.',
          502
        );
        const id = randomUUID(),
          at = now();
        db.run(
          `insert into zoom_access(id,session_id,room_id,participant_reference,participant_email,participant_name,participant_role,zoom_registrant_id,join_url_cipher,expires_at,state,current_room_id,created_at,updated_at) values(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          id,
          session.id,
          room.id,
          String(body.participant_reference),
          String(body.participant_email).toLowerCase(),
          String(body.participant_name),
          String(body.role || 'OTHER'),
          String(registrant.registrant_id),
          cryptoStore.encrypt(registrant.join_url),
          String(body.expires_at),
          'ACTIVE',
          room.id,
          at,
          at
        );
        if (!['MAIN', 'WAITING'].includes(room.room_type))
          await updateBreakoutAssignments(session, correlationId);
        return json(res, 201, {
          participant_access_reference: id,
          participant_join_url: registrant.join_url,
          expires_at: String(body.expires_at),
          revoked: false,
          participant_reference: String(body.participant_reference),
          role: String(body.role || 'OTHER'),
          room_reference: room.provider_room_reference,
          room_type: room.room_type,
          permissions: body.permissions || []
        });
      }

      const accessGet = requestUrl.pathname.match(/^\/access\/([^/]+)$/);
      if (accessGet && req.method === 'GET') {
        const access = accessByRef(decodeURIComponent(accessGet[1]));
        if (!access)
          throw new AdapterError('ACCESS_NOT_FOUND', 'Zoom participant access was not found.', 404);
        const room = db.get('select * from zoom_rooms where id=?', access.current_room_id);
        return json(res, 200, {
          participant_access_reference: access.id,
          participant_join_url: cryptoStore.decrypt(access.join_url_cipher),
          expires_at: access.expires_at,
          revoked: access.state !== 'ACTIVE',
          participant_reference: access.participant_reference,
          role: access.participant_role,
          room_reference: room.provider_room_reference,
          room_type: room.room_type
        });
      }

      const moveMatch = requestUrl.pathname.match(/^\/access\/([^/]+)\/move$/);
      if (moveMatch && req.method === 'POST') {
        const access = accessByRef(decodeURIComponent(moveMatch[1]));
        if (!access)
          throw new AdapterError('ACCESS_NOT_FOUND', 'Zoom participant access was not found.', 404);
        if (access.state !== 'ACTIVE')
          throw new AdapterError(
            'ACCESS_REVOKED',
            'Zoom participant access has been revoked.',
            410
          );
        const room = roomByRef(body.room_reference);
        if (!room || room.session_id !== access.session_id)
          throw new AdapterError('ROOM_NOT_FOUND', 'Zoom logical room was not found.', 404);
        const session = db.get('select * from zoom_sessions where id=?', access.session_id);
        if (session.state === 'STARTED' || ['MAIN', 'WAITING'].includes(room.room_type)) {
          throw new AdapterError(
            'CAPABILITY_NOT_SUPPORTED',
            'Zoom REST API cannot automatically admit a participant from the Waiting Room or move a live participant between breakout rooms.',
            409,
            {
              manual_action_required: true,
              operation: 'MOVE_PARTICIPANT',
              target_room_code: room.room_code,
              provider: 'ZOOM',
              supported_before_meeting: !['MAIN', 'WAITING'].includes(room.room_type)
            },
            false
          );
        }
        db.run(
          'update zoom_access set current_room_id=?,updated_at=? where id=?',
          room.id,
          now(),
          access.id
        );
        await updateBreakoutAssignments(session, correlationId);
        return json(res, 200, {
          participant_access_reference: access.id,
          room_reference: room.provider_room_reference,
          room_type: room.room_type,
          state: 'PREASSIGNED',
          manual_action_required: false
        });
      }

      const revokeMatch = requestUrl.pathname.match(/^\/access\/([^/]+)\/revoke$/);
      if (revokeMatch && req.method === 'POST') {
        const access = accessByRef(decodeURIComponent(revokeMatch[1]));
        if (!access)
          throw new AdapterError('ACCESS_NOT_FOUND', 'Zoom participant access was not found.', 404);
        if (access.state === 'REVOKED') return json(res, 200, { revoked: true });
        const session = db.get('select * from zoom_sessions where id=?', access.session_id);
        await zoom.updateRegistrantStatus(
          session.zoom_meeting_id,
          {
            action: 'cancel',
            registrants: [{ id: access.zoom_registrant_id, email: access.participant_email }]
          },
          correlationId
        );
        db.run("update zoom_access set state='REVOKED',updated_at=? where id=?", now(), access.id);
        return json(res, 200, { revoked: true });
      }

      const recordingMatch = requestUrl.pathname.match(/^\/sessions\/([^/]+)\/recording$/);
      if (recordingMatch && req.method === 'POST') {
        const session = sessionByRef(decodeURIComponent(recordingMatch[1]));
        if (!session)
          throw new AdapterError('SESSION_NOT_FOUND', 'Zoom session was not found.', 404);
        if (session.recording_policy === 'DISABLED')
          throw new AdapterError('INVALID_STATE', 'Recording is disabled by CIMS policy.', 403);
        assert(
          ['START', 'STOP'].includes(body.action),
          'VALIDATION_ERROR',
          'action must be START or STOP.',
          400
        );
        await zoom.inMeetingControl(
          session.zoom_meeting_id,
          { method: body.action === 'START' ? 'recording.start' : 'recording.stop' },
          correlationId
        );
        return json(res, 200, {
          recording_reference:
            body.action === 'START' ? `zoom-recording:${session.zoom_meeting_id}` : null,
          state: body.action === 'START' ? 'STARTED' : 'STOPPED'
        });
      }

      if (req.method === 'POST' && requestUrl.pathname === '/webhooks/zoom') {
        if (body.event === 'endpoint.url_validation')
          return json(res, 200, validationResponse(config.webhookSecretToken, body));
        verifyZoomWebhook(config, req.headers, raw);
        const eventKey = String(
          req.headers['x-zm-trackingid'] ||
            `${body.event_ts || Date.now()}:${body.event || 'unknown'}:${body?.payload?.object?.id || ''}:${body?.payload?.object?.participant?.id || ''}`
        );
        if (db.get('select 1 from zoom_webhook_events where event_id=?', eventKey))
          return json(res, 200, { accepted: true, replay: true });
        const translated = translateZoomEvent(body);
        translated.event_id = eventKey;
        db.run(
          'insert into zoom_webhook_events(event_id,event_type,zoom_meeting_id,payload_json,occurred_at,received_at) values(?,?,?,?,?,?)',
          eventKey,
          String(body.event || 'unknown'),
          translated.provider_session_reference,
          raw,
          translated.occurred_at,
          now()
        );
        if (translated.provider_session_reference) {
          if (body.event === 'meeting.started')
            db.run(
              "update zoom_sessions set state='STARTED',updated_at=? where zoom_meeting_id=?",
              now(),
              translated.provider_session_reference
            );
          if (body.event === 'meeting.ended')
            db.run(
              "update zoom_sessions set state='ENDED',updated_at=? where zoom_meeting_id=?",
              now(),
              translated.provider_session_reference
            );
          if (body.event === 'meeting.deleted')
            db.run(
              "update zoom_sessions set state='CANCELLED',updated_at=? where zoom_meeting_id=?",
              now(),
              translated.provider_session_reference
            );
        }
        await emitCimsWebhook(config, translated, fetchImpl);
        return json(res, 200, { accepted: true, replay: false, event_id: eventKey });
      }

      return json(res, 404, {
        code: 'NOT_FOUND',
        message: 'Route was not found.',
        correlation_id: correlationId
      });
    } catch (error) {
      const e =
        error instanceof AdapterError
          ? error
          : new AdapterError(
              'INTERNAL_ERROR',
              'Unexpected adapter error.',
              500,
              { cause: error.message },
              false
            );
      return json(res, e.status || 500, {
        code: e.code,
        message: e.message,
        retryable: e.retryable,
        correlation_id: correlationId,
        details: e.details || {}
      });
    }
  }

  const server = http.createServer(handle);
  return {
    config,
    db,
    tokens,
    zoom,
    server,
    listen: (port = config.port, host = '127.0.0.1') =>
      new Promise((resolve) => server.listen(port, host, () => resolve(server.address()))),
    close: () =>
      new Promise((resolve) =>
        server.close(() => {
          db.close();
          resolve();
        })
      )
  };
}
