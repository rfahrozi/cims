import { createHash, randomUUID } from 'node:crypto';

const GENESIS_HASH = '0'.repeat(64);
const stable = (value) => {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stable(value[key])])
    );
  return value;
};

export function computeAuditHash(event) {
  const canonical = JSON.stringify(
    stable({
      id: event.id,
      event_type: event.event_type,
      actor_user_id: event.actor_user_id ?? null,
      actor_organization_id: event.actor_organization_id ?? null,
      object_type: event.object_type,
      object_id: event.object_id,
      correlation_id: event.correlation_id,
      payload: event.payload ?? {},
      previous_hash: event.previous_hash ?? GENESIS_HASH,
      occurred_at: event.occurred_at
    })
  );
  return createHash('sha256').update(canonical).digest('hex');
}

export class AuditService {
  constructor(db) {
    this.db = db;
  }

  append({
    eventType,
    actorUserId = null,
    actorOrganizationId = null,
    objectType,
    objectId,
    correlationId,
    payload = {}
  }) {
    const previous = this.db.get(
      'select event_hash from audit_events order by sequence desc limit 1'
    );
    const event = {
      id: randomUUID(),
      event_type: eventType,
      actor_user_id: actorUserId,
      actor_organization_id: actorOrganizationId,
      object_type: objectType,
      object_id: objectId,
      correlation_id: correlationId,
      payload,
      previous_hash: previous?.event_hash ?? GENESIS_HASH,
      occurred_at: new Date().toISOString()
    };
    event.event_hash = computeAuditHash(event);
    this.db.run(
      `insert into audit_events(id, event_type, actor_user_id, actor_organization_id, object_type, object_id, correlation_id, payload_json, previous_hash, event_hash, occurred_at)
      values(?,?,?,?,?,?,?,?,?,?,?)`,
      event.id,
      event.event_type,
      event.actor_user_id,
      event.actor_organization_id,
      event.object_type,
      event.object_id,
      event.correlation_id,
      JSON.stringify(event.payload),
      event.previous_hash,
      event.event_hash,
      event.occurred_at
    );
    return event;
  }

  list({ hearingId, limit = 100 } = {}) {
    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
    const rows = hearingId
      ? this.db.all(
          `select * from audit_events where object_id=? or payload_json like ? order by sequence desc limit ?`,
          hearingId,
          `%${hearingId}%`,
          safeLimit
        )
      : this.db.all('select * from audit_events order by sequence desc limit ?', safeLimit);
    return rows.map((row) => ({
      ...row,
      payload: JSON.parse(row.payload_json),
      payload_json: undefined
    }));
  }

  verifyChain() {
    const rows = this.db.all('select * from audit_events order by sequence');
    let previousHash = GENESIS_HASH;
    const failures = [];
    for (const row of rows) {
      const event = { ...row, payload: JSON.parse(row.payload_json), payload_json: undefined };
      const expected = computeAuditHash({ ...event, previous_hash: previousHash });
      if (row.previous_hash !== previousHash || row.event_hash !== expected) {
        failures.push({
          sequence: row.sequence,
          id: row.id,
          expected_previous_hash: previousHash,
          stored_previous_hash: row.previous_hash,
          expected_event_hash: expected,
          stored_event_hash: row.event_hash
        });
      }
      previousHash = row.event_hash;
    }
    return {
      valid: failures.length === 0,
      event_count: rows.length,
      head_hash: previousHash,
      failures
    };
  }
}
