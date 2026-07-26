import { randomUUID } from 'node:crypto';
import { DomainError, assert } from '../../common/domain-error.mjs';
import { requirePermission } from '../iam/authorization.mjs';

const now = () => new Date().toISOString();

export class HearingControlService {
  constructor(db, audit) {
    this.db = db;
    this.audit = audit;
  }

  status(context, hearingId) {
    requirePermission(context, 'hearing.read', hearingId);
    const runtime = this.db.get('select * from hearing_runtime where hearing_id=?', hearingId);
    const events = this.db.all(
      'select * from hearing_control_events where hearing_id=? order by sequence',
      hearingId
    );
    return {
      hearing_id: hearingId,
      state: runtime?.state ?? this.#initialState(hearingId),
      runtime: runtime ?? null,
      events
    };
  }

  start(context, hearingId, payload, correlationId) {
    this.#judgeAuthority(context, hearingId);
    const virtual = this.db.get(
      "select * from virtual_sessions where hearing_id=? and state='READY' order by created_at desc limit 1",
      hearingId
    );
    if (!virtual)
      throw new DomainError(
        'VIRTUAL_SESSION_REQUIRED',
        'A READY virtual session is required before starting the hearing.',
        409
      );
    const blocking = this.db.get(
      `select * from incidents where hearing_id=? and status in ('OPEN','MITIGATING') and severity in ('HIGH','CRITICAL') and incident_type in ('CYBER','FORCE_MAJEURE') limit 1`,
      hearingId
    );
    if (blocking)
      throw new DomainError(
        'BLOCKING_INCIDENT_OPEN',
        'A high-severity incident blocks hearing start.',
        409,
        { incident_id: blocking.id, incident_type: blocking.incident_type }
      );
    const existing = this.db.get('select * from hearing_runtime where hearing_id=?', hearingId);
    if (existing && existing.state !== 'READY')
      throw new DomainError(
        'INVALID_HEARING_TRANSITION',
        'Hearing can only start from READY.',
        409,
        { state: existing.state }
      );
    const at = now();
    if (existing)
      this.db.run(
        `update hearing_runtime set state='STARTED',started_by=?,started_at=?,suspended_by=null,suspended_at=null,suspension_reason=null,updated_at=? where id=?`,
        context.id,
        at,
        at,
        existing.id
      );
    else
      this.db.run(
        `insert into hearing_runtime(id,hearing_id,virtual_session_id,state,started_by,started_at,updated_at) values(?,?,?,?,?,?,?)`,
        randomUUID(),
        hearingId,
        virtual.id,
        'STARTED',
        context.id,
        at,
        at
      );
    this.db.run("update hearings set state='IN_SESSION',updated_at=? where id=?", at, hearingId);
    this.#event(hearingId, 'STARTED', payload.reason ?? null, context.id, at);
    this.audit.append({
      eventType: 'HEARING_STARTED',
      actorUserId: context.id,
      actorOrganizationId: context.organization_id,
      objectType: 'HEARING',
      objectId: hearingId,
      correlationId,
      payload: { reason: payload.reason ?? null }
    });
    return this.status(context, hearingId);
  }

  suspend(context, hearingId, payload, correlationId) {
    this.#judgeAuthority(context, hearingId);
    assert(
      typeof payload.reason === 'string' && payload.reason.trim().length >= 5,
      'VALIDATION_ERROR',
      'Suspension reason is required.',
      400
    );
    const runtime = this.#runtime(hearingId);
    if (runtime.state !== 'STARTED')
      throw new DomainError(
        'INVALID_HEARING_TRANSITION',
        'Hearing can only be suspended from STARTED.',
        409,
        { state: runtime.state }
      );
    const at = now();
    this.db.run(
      "update hearing_runtime set state='SUSPENDED',suspended_by=?,suspended_at=?,suspension_reason=?,updated_at=? where id=?",
      context.id,
      at,
      payload.reason.trim(),
      at,
      runtime.id
    );
    this.db.run("update hearings set state='SUSPENDED',updated_at=? where id=?", at, hearingId);
    this.#event(hearingId, 'SUSPENDED', payload.reason.trim(), context.id, at);
    this.audit.append({
      eventType: 'HEARING_SUSPENDED',
      actorUserId: context.id,
      actorOrganizationId: context.organization_id,
      objectType: 'HEARING',
      objectId: hearingId,
      correlationId,
      payload: { reason: payload.reason.trim() }
    });
    return this.status(context, hearingId);
  }

  resume(context, hearingId, payload, correlationId) {
    this.#judgeAuthority(context, hearingId);
    const runtime = this.#runtime(hearingId);
    if (runtime.state !== 'SUSPENDED')
      throw new DomainError(
        'INVALID_HEARING_TRANSITION',
        'Hearing can only resume from SUSPENDED.',
        409,
        { state: runtime.state }
      );
    const blocking = this.db.get(
      `select * from incidents where hearing_id=? and status in ('OPEN','MITIGATING') and severity in ('HIGH','CRITICAL') limit 1`,
      hearingId
    );
    if (blocking)
      throw new DomainError(
        'BLOCKING_INCIDENT_OPEN',
        'Resolve or downgrade the blocking incident before resuming.',
        409,
        { incident_id: blocking.id }
      );
    const at = now();
    this.db.run(
      "update hearing_runtime set state='STARTED',suspended_by=null,suspended_at=null,suspension_reason=null,updated_at=? where id=?",
      at,
      runtime.id
    );
    this.db.run("update hearings set state='IN_SESSION',updated_at=? where id=?", at, hearingId);
    this.#event(hearingId, 'RESUMED', payload.reason ?? null, context.id, at);
    this.audit.append({
      eventType: 'HEARING_RESUMED',
      actorUserId: context.id,
      actorOrganizationId: context.organization_id,
      objectType: 'HEARING',
      objectId: hearingId,
      correlationId,
      payload: { reason: payload.reason ?? null }
    });
    return this.status(context, hearingId);
  }

  end(context, hearingId, payload, correlationId) {
    this.#judgeAuthority(context, hearingId);
    const runtime = this.#runtime(hearingId);
    if (!['STARTED', 'SUSPENDED'].includes(runtime.state))
      throw new DomainError(
        'INVALID_HEARING_TRANSITION',
        'Hearing can only end from STARTED or SUSPENDED.',
        409,
        { state: runtime.state }
      );
    const activeConsultation = this.db.get(
      "select id from consultation_sessions where hearing_id=? and state='ACTIVE'",
      hearingId
    );
    if (activeConsultation)
      throw new DomainError(
        'CONSULTATION_ACTIVE',
        'End private consultation before ending the hearing.',
        409,
        { consultation_id: activeConsultation.id }
      );
    const at = now();
    this.db.run(
      "update hearing_runtime set state='ENDED',ended_by=?,ended_at=?,updated_at=? where id=?",
      context.id,
      at,
      at,
      runtime.id
    );
    this.db.run("update hearings set state='COMPLETED',updated_at=? where id=?", at, hearingId);
    this.#event(hearingId, 'ENDED', payload.reason ?? null, context.id, at);
    this.audit.append({
      eventType: 'HEARING_ENDED',
      actorUserId: context.id,
      actorOrganizationId: context.organization_id,
      objectType: 'HEARING',
      objectId: hearingId,
      correlationId,
      payload: { reason: payload.reason ?? null }
    });
    return this.status(context, hearingId);
  }

  autoSuspend(hearingId, actorUserId, reason) {
    const runtime = this.db.get('select * from hearing_runtime where hearing_id=?', hearingId);
    if (!runtime || runtime.state !== 'STARTED') return false;
    const at = now();
    this.db.run(
      "update hearing_runtime set state='SUSPENDED',suspended_by=?,suspended_at=?,suspension_reason=?,updated_at=? where id=?",
      actorUserId,
      at,
      reason,
      at,
      runtime.id
    );
    this.db.run("update hearings set state='SUSPENDED',updated_at=? where id=?", at, hearingId);
    this.#event(hearingId, 'SUSPENDED', reason, actorUserId, at);
    return true;
  }

  #judgeAuthority(context, hearingId) {
    requirePermission(context, 'hearing.control', hearingId);
    if (!context.isSystemAdmin && !context.roles.includes('JUDGE'))
      throw new DomainError(
        'JUDGE_AUTHORITY_REQUIRED',
        'Only the assigned judge may control the hearing state.',
        403
      );
  }
  #runtime(hearingId) {
    const runtime = this.db.get('select * from hearing_runtime where hearing_id=?', hearingId);
    if (!runtime)
      throw new DomainError('HEARING_RUNTIME_NOT_FOUND', 'Hearing has not been started.', 409);
    return runtime;
  }
  #initialState(hearingId) {
    return this.db.get(
      "select 1 from virtual_sessions where hearing_id=? and state='READY'",
      hearingId
    )
      ? 'READY'
      : 'NOT_READY';
  }
  #event(hearingId, eventType, reason, actorUserId, at = now()) {
    this.db.run(
      'insert into hearing_control_events(id,hearing_id,event_type,reason,actor_user_id,occurred_at) values(?,?,?,?,?,?)',
      randomUUID(),
      hearingId,
      eventType,
      reason,
      actorUserId,
      at
    );
  }
}
