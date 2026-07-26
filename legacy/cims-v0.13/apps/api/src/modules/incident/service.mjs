import { randomUUID } from 'node:crypto';
import { DomainError, assert } from '../../common/domain-error.mjs';
import { requirePermission } from '../iam/authorization.mjs';

const now = () => new Date().toISOString();
const PERMISSION = {
  TECHNICAL: 'incident.technical.write',
  CYBER: 'incident.cyber.write',
  FORCE_MAJEURE: 'incident.force.write'
};

export class IncidentService {
  constructor(db, audit, hearingControl) {
    this.db = db;
    this.audit = audit;
    this.hearingControl = hearingControl;
  }

  create(context, hearingId, payload, correlationId) {
    assert(
      ['TECHNICAL', 'CYBER', 'FORCE_MAJEURE'].includes(payload.incident_type),
      'VALIDATION_ERROR',
      'incident_type is invalid.',
      400
    );
    requirePermission(context, PERMISSION[payload.incident_type], hearingId);
    assert(
      ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(payload.severity),
      'VALIDATION_ERROR',
      'severity is invalid.',
      400
    );
    assert(
      typeof payload.summary === 'string' && payload.summary.trim().length >= 8,
      'VALIDATION_ERROR',
      'summary must contain at least 8 characters.',
      400
    );
    if (hearingId && !this.db.get('select 1 from hearings where id=?', hearingId))
      throw new DomainError('HEARING_NOT_FOUND', 'Hearing was not found.', 404);
    const reportedAt = now();
    let due = null;
    if (payload.incident_type === 'CYBER')
      due = new Date(Date.parse(reportedAt) + 24 * 60 * 60 * 1000).toISOString();
    if (payload.incident_type === 'FORCE_MAJEURE')
      due = new Date(Date.parse(reportedAt) + 72 * 60 * 60 * 1000).toISOString();
    let autoSuspended = false;
    if (hearingId && ['HIGH', 'CRITICAL'].includes(payload.severity))
      autoSuspended = this.hearingControl.autoSuspend(
        hearingId,
        context.id,
        `${payload.incident_type}: ${payload.summary.trim()}`
      );
    const id = randomUUID();
    this.db.run(
      `insert into incidents(id,hearing_id,incident_type,severity,status,summary,details,reported_by,reported_at,notification_due_at,auto_suspended,correlation_id) values(?,?,?,?,?,?,?,?,?,?,?,?)`,
      id,
      hearingId ?? null,
      payload.incident_type,
      payload.severity,
      'OPEN',
      payload.summary.trim(),
      payload.details ?? null,
      context.id,
      reportedAt,
      due,
      autoSuspended ? 1 : 0,
      correlationId
    );
    this.#action(id, 'CREATED', payload.details ?? null, context.id, reportedAt);
    this.audit.append({
      eventType: `${payload.incident_type}_INCIDENT_CREATED`,
      actorUserId: context.id,
      actorOrganizationId: context.organization_id,
      objectType: 'INCIDENT',
      objectId: id,
      correlationId,
      payload: {
        hearing_id: hearingId ?? null,
        severity: payload.severity,
        notification_due_at: due,
        auto_suspended: autoSuspended
      }
    });
    return this.#get(id);
  }

  addAction(context, incidentId, payload, correlationId) {
    const incident = this.#get(incidentId);
    requirePermission(
      context,
      PERMISSION[incident.incident_type],
      incident.hearing_id ?? undefined
    );
    assert(
      typeof payload.notes === 'string' && payload.notes.trim().length >= 3,
      'VALIDATION_ERROR',
      'notes are required.',
      400
    );
    const at = now();
    this.#action(incidentId, 'MITIGATION', payload.notes.trim(), context.id, at);
    this.db.run(
      "update incidents set status='MITIGATING' where id=? and status='OPEN'",
      incidentId
    );
    this.audit.append({
      eventType: 'INCIDENT_MITIGATION_RECORDED',
      actorUserId: context.id,
      actorOrganizationId: context.organization_id,
      objectType: 'INCIDENT',
      objectId: incidentId,
      correlationId,
      payload: { notes: payload.notes.trim() }
    });
    return this.#get(incidentId);
  }

  notify(context, incidentId, payload, correlationId) {
    const incident = this.#get(incidentId);
    requirePermission(
      context,
      PERMISSION[incident.incident_type],
      incident.hearing_id ?? undefined
    );
    if (!['CYBER', 'FORCE_MAJEURE'].includes(incident.incident_type))
      throw new DomainError(
        'NOTIFICATION_NOT_REQUIRED',
        'Formal incident notification timer applies to CYBER and FORCE_MAJEURE incidents.',
        409
      );
    assert(
      typeof payload.reference === 'string' && payload.reference.trim(),
      'VALIDATION_ERROR',
      'notification reference is required.',
      400
    );
    const at = now();
    this.db.run('update incidents set notified_at=? where id=?', at, incidentId);
    this.#action(incidentId, 'NOTIFIED', payload.reference.trim(), context.id, at);
    this.audit.append({
      eventType: 'INCIDENT_NOTIFICATION_RECORDED',
      actorUserId: context.id,
      actorOrganizationId: context.organization_id,
      objectType: 'INCIDENT',
      objectId: incidentId,
      correlationId,
      payload: {
        reference: payload.reference.trim(),
        within_deadline:
          !incident.notification_due_at ||
          Date.parse(at) <= Date.parse(incident.notification_due_at)
      }
    });
    return this.#get(incidentId);
  }

  resolve(context, incidentId, payload, correlationId) {
    const incident = this.#get(incidentId);
    requirePermission(
      context,
      PERMISSION[incident.incident_type],
      incident.hearing_id ?? undefined
    );
    assert(
      typeof payload.resolution === 'string' && payload.resolution.trim().length >= 8,
      'VALIDATION_ERROR',
      'resolution must contain at least 8 characters.',
      400
    );
    if (incident.status === 'CLOSED')
      throw new DomainError('INCIDENT_CLOSED', 'Incident is already closed.', 409);
    const at = now();
    this.db.run(
      "update incidents set status='RESOLVED',resolved_at=?,resolution=? where id=?",
      at,
      payload.resolution.trim(),
      incidentId
    );
    this.#action(incidentId, 'RESOLVED', payload.resolution.trim(), context.id, at);
    this.audit.append({
      eventType: 'INCIDENT_RESOLVED',
      actorUserId: context.id,
      actorOrganizationId: context.organization_id,
      objectType: 'INCIDENT',
      objectId: incidentId,
      correlationId,
      payload: { resolution: payload.resolution.trim() }
    });
    return this.#get(incidentId);
  }

  close(context, incidentId, payload, correlationId) {
    const incident = this.#get(incidentId);
    requirePermission(
      context,
      PERMISSION[incident.incident_type],
      incident.hearing_id ?? undefined
    );
    if (incident.status !== 'RESOLVED')
      throw new DomainError(
        'INCIDENT_NOT_RESOLVED',
        'Incident must be RESOLVED before closure.',
        409
      );
    const at = now();
    this.db.run("update incidents set status='CLOSED' where id=?", incidentId);
    this.#action(incidentId, 'CLOSED', payload.notes ?? null, context.id, at);
    this.audit.append({
      eventType: 'INCIDENT_CLOSED',
      actorUserId: context.id,
      actorOrganizationId: context.organization_id,
      objectType: 'INCIDENT',
      objectId: incidentId,
      correlationId,
      payload: { notes: payload.notes ?? null }
    });
    return this.#get(incidentId);
  }

  list(context, hearingId) {
    requirePermission(context, 'incident.read', hearingId);
    return this.db
      .all('select * from incidents where hearing_id=? order by reported_at desc', hearingId)
      .map((incident) => ({
        ...incident,
        actions: this.db.all(
          'select * from incident_actions where incident_id=? order by sequence',
          incident.id
        ),
        notification_overdue: Boolean(
          incident.notification_due_at &&
            !incident.notified_at &&
            Date.parse(incident.notification_due_at) < Date.now()
        )
      }));
  }

  #get(id) {
    const incident = this.db.get('select * from incidents where id=?', id);
    if (!incident) throw new DomainError('INCIDENT_NOT_FOUND', 'Incident was not found.', 404);
    return {
      ...incident,
      actions: this.db.all(
        'select * from incident_actions where incident_id=? order by sequence',
        id
      ),
      notification_overdue: Boolean(
        incident.notification_due_at &&
          !incident.notified_at &&
          Date.parse(incident.notification_due_at) < Date.now()
      )
    };
  }
  #action(incidentId, type, notes, userId, at = now()) {
    this.db.run(
      'insert into incident_actions(id,incident_id,action_type,notes,actor_user_id,occurred_at) values(?,?,?,?,?,?)',
      randomUUID(),
      incidentId,
      type,
      notes,
      userId,
      at
    );
  }
}
