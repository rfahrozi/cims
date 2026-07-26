import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { DomainError, assert } from '../../common/domain-error.mjs';
import { requirePermission } from '../iam/authorization.mjs';
import { ProviderClient } from './provider-client.mjs';
const now = () => new Date().toISOString();
export class VirtualService {
  constructor(db, audit, config, determination, notice, readiness) {
    this.db = db;
    this.audit = audit;
    this.config = config;
    this.determination = determination;
    this.notice = notice;
    this.readiness = readiness;
    this.provider = new ProviderClient(config);
  }
  async provision(context, hearingId, payload, correlationId) {
    requirePermission(context, 'virtual.provision', hearingId);
    this.determination.assertValid(hearingId);
    const schedule = this.db.get(
      "select * from hearing_schedules where hearing_id=? and status='ACTIVE'",
      hearingId
    );
    if (!schedule)
      throw new DomainError('SCHEDULE_REQUIRED', 'An active schedule is required.', 409);
    const noticeGate = this.notice.gate(hearingId),
      readinessGate = this.readiness.gate(hearingId);
    if (!noticeGate.ready)
      throw new DomainError(
        'NOTICE_ACK_REQUIRED',
        'Required notices are not fully acknowledged.',
        409,
        noticeGate
      );
    if (!readinessGate.ready)
      throw new DomainError(
        'READINESS_REQUIRED',
        'All required organizations must be READY.',
        409,
        readinessGate
      );
    const existing = this.db.get(
      "select * from virtual_sessions where hearing_id=? and state in ('REQUESTED','READY')",
      hearingId
    );
    if (existing) return this.get(context, hearingId);
    assert(
      ['DISABLED', 'COURT_CONTROLLED'].includes(payload.recording_policy ?? 'DISABLED'),
      'VALIDATION_ERROR',
      'recording_policy is invalid.',
      400
    );
    const health = await this.provider.health(correlationId);
    if (health.status !== 'HEALTHY')
      throw new DomainError('PROVIDER_UNAVAILABLE', 'Video provider is not healthy.', 503, {
        health
      });
    const id = randomUUID(),
      at = now();
    this.db.run(
      `insert into virtual_sessions(id,hearing_id,schedule_id,provider_code,state,recording_policy,created_by,created_at,updated_at) values(?,?,?,?,?,?,?,?,?)`,
      id,
      hearingId,
      schedule.id,
      this.config.providerCode,
      'REQUESTED',
      payload.recording_policy ?? 'DISABLED',
      context.id,
      at,
      at
    );
    try {
      const session = await this.provider.createSession(
        {
          hearing_reference: hearingId,
          start_at: schedule.start_at,
          end_at: schedule.end_at,
          recording_policy: payload.recording_policy ?? 'DISABLED'
        },
        `virtual-${hearingId}-${schedule.version}`,
        correlationId
      );
      const roomDefs = [
        ['MAIN', 'MAIN', payload.recording_policy === 'COURT_CONTROLLED'],
        ['WAITING', 'WAITING', false],
        ['DEFENDANT', 'DEFENDANT', false],
        ['WITNESS', 'WITNESS', false],
        ['CONSULTATION', 'CONSULTATION', false]
      ];
      const rooms = [];
      for (const [code, type, recording] of roomDefs) {
        const room = await this.provider.createRoom(
          session.provider_session_reference,
          { room_code: code, room_type: type, recording_allowed: recording },
          correlationId
        );
        rooms.push(room);
        this.db.run(
          'insert into virtual_rooms(id,virtual_session_id,room_code,room_type,provider_room_reference,recording_allowed) values(?,?,?,?,?,?)',
          randomUUID(),
          id,
          code,
          type,
          room.provider_room_reference,
          recording ? 1 : 0
        );
      }
      this.db.run(
        "update virtual_sessions set provider_session_reference=?,state='READY',updated_at=? where id=?",
        session.provider_session_reference,
        now(),
        id
      );
      this.db.run(
        "update hearings set state='VIRTUAL_READY',updated_at=? where id=?",
        now(),
        hearingId
      );
      this.audit.append({
        eventType: 'VIRTUAL_SESSION_READY',
        actorUserId: context.id,
        actorOrganizationId: context.organization_id,
        objectType: 'HEARING',
        objectId: hearingId,
        correlationId,
        payload: {
          virtual_session_id: id,
          provider_session_reference: session.provider_session_reference,
          room_count: rooms.length
        }
      });
      return this.get(context, hearingId);
    } catch (error) {
      this.db.run(
        "update virtual_sessions set state='FAILED',failure_code=?,updated_at=? where id=?",
        error.code ?? 'PROVIDER_ERROR',
        now(),
        id
      );
      this.audit.append({
        eventType: 'VIRTUAL_SESSION_FAILED',
        actorUserId: context.id,
        actorOrganizationId: context.organization_id,
        objectType: 'HEARING',
        objectId: hearingId,
        correlationId,
        payload: { virtual_session_id: id, error_code: error.code ?? 'PROVIDER_ERROR' }
      });
      throw error;
    }
  }
  get(context, hearingId) {
    requirePermission(context, 'virtual.read', hearingId);
    const s = this.db.get(
      'select * from virtual_sessions where hearing_id=? order by created_at desc limit 1',
      hearingId
    );
    return s
      ? {
          ...s,
          rooms: this.db.all(
            'select * from virtual_rooms where virtual_session_id=? order by room_code',
            s.id
          )
        }
      : null;
  }
  webhook(requestHeaders, body, correlationId) {
    const timestamp = String(requestHeaders['x-provider-timestamp'] ?? ''),
      signature = String(requestHeaders['x-provider-signature'] ?? ''),
      eventId = String(requestHeaders['x-provider-event-id'] ?? body.event_id ?? '');
    assert(
      timestamp && signature && eventId,
      'WEBHOOK_SIGNATURE_REQUIRED',
      'Provider webhook signature headers are required.',
      401
    );
    if (Math.abs(Date.now() - Date.parse(timestamp)) > 300000)
      throw new DomainError(
        'WEBHOOK_EXPIRED',
        'Provider webhook timestamp is outside the accepted window.',
        401
      );
    const raw = JSON.stringify(body),
      expected = createHmac('sha256', this.config.providerWebhookSecret)
        .update(timestamp + '.' + raw)
        .digest('hex');
    if (
      signature.length !== expected.length ||
      !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    )
      throw new DomainError(
        'WEBHOOK_SIGNATURE_INVALID',
        'Provider webhook signature is invalid.',
        401
      );
    if (this.db.get('select 1 from provider_webhook_events where event_id=?', eventId))
      return { event_id: eventId, replay: true };
    this.db.run(
      'insert into provider_webhook_events(event_id,provider_code,event_type,provider_session_reference,payload_json,occurred_at,received_at) values(?,?,?,?,?,?,?)',
      eventId,
      this.config.providerCode,
      body.event_type ?? 'unknown',
      body.provider_session_reference ?? null,
      raw,
      body.occurred_at ?? timestamp,
      now()
    );
    if (body.provider_session_reference && body.event_type === 'session.ready')
      this.db.run(
        "update virtual_sessions set state='READY',updated_at=? where provider_session_reference=?",
        now(),
        body.provider_session_reference
      );
    this.audit.append({
      eventType: 'PROVIDER_WEBHOOK_ACCEPTED',
      objectType: 'PROVIDER_EVENT',
      objectId: eventId,
      correlationId,
      payload: {
        event_type: body.event_type,
        provider_session_reference: body.provider_session_reference ?? null
      }
    });
    return { event_id: eventId, replay: false };
  }
  gate(hearingId) {
    const s = this.db.get(
      "select * from virtual_sessions where hearing_id=? and state='READY' order by created_at desc limit 1",
      hearingId
    );
    return { ready: Boolean(s), session: s ?? null };
  }
}
