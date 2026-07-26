import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { DomainError } from '@cims/domain';
import { PgPoolService } from './pg-pool.service.js';

@Injectable()
export class IdempotencyService {
  constructor(private readonly pg: PgPoolService) {}
  requestHash(body: unknown): string {
    return createHash('sha256')
      .update(JSON.stringify(body ?? null))
      .digest('hex');
  }
  async reserve(scope: string, key: string, body: unknown, ttlSeconds = 86_400): Promise<void> {
    const hash = this.requestHash(body);
    const rows = await this.pg.query<{ request_hash: string }>(
      `insert into api_idempotency_keys(scope, idempotency_key, request_hash, expires_at)
       values ($1,$2,$3,now()+($4::text || ' seconds')::interval)
       on conflict (scope,idempotency_key) do update set idempotency_key=excluded.idempotency_key
       returning request_hash`,
      [scope, key, hash, ttlSeconds]
    );
    if (rows[0]?.request_hash !== hash)
      throw new DomainError(
        'IDEMPOTENCY_KEY_REUSED',
        'Idempotency key was reused with a different request.',
        409
      );
  }
}
