import { createHash } from 'node:crypto';
import { DomainError } from './domain-error.mjs';

export class IdempotencyService {
  constructor(db) {
    this.db = db;
  }

  requestHash({ method, pathname, body }) {
    return createHash('sha256').update(JSON.stringify({ method, pathname, body })).digest('hex');
  }

  replay(actorUserId, key, requestHash) {
    const record = this.db.get(
      'select * from idempotency_records where actor_user_id=? and idempotency_key=?',
      actorUserId,
      key
    );
    if (!record) return undefined;
    if (record.request_hash !== requestHash)
      throw new DomainError(
        'IDEMPOTENCY_CONFLICT',
        'Idempotency-Key has already been used for a different request.',
        409
      );
    return { status: record.status_code, body: JSON.parse(record.response_json) };
  }

  store(actorUserId, key, requestHash, status, body) {
    this.db.run(
      'insert into idempotency_records(actor_user_id, idempotency_key, request_hash, status_code, response_json, created_at) values(?,?,?,?,?,?)',
      actorUserId,
      key,
      requestHash,
      status,
      JSON.stringify(body),
      new Date().toISOString()
    );
  }
}
