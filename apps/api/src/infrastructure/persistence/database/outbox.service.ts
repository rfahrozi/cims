import { Injectable } from '@nestjs/common';
import { computeOutboxBackoffSeconds } from '@cims/domain';
import type { PoolClient } from 'pg';
import { PgPoolService } from './pg-pool.service.js';

export interface OutboxEventRecord {
  id: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  correlationId?: string;
  traceparent?: string;
  attemptCount: number;
}

@Injectable()
export class OutboxService {
  constructor(private readonly pg: PgPoolService) {}

  async enqueue(
    eventType: string,
    aggregateType: string,
    aggregateId: string,
    payload: unknown,
    metadata: { correlationId?: string; traceparent?: string } = {}
  ): Promise<string> {
    return this.pg.transaction(async (client: PoolClient) =>
      this.enqueueWithClient(client, eventType, aggregateType, aggregateId, payload, metadata)
    );
  }

  async enqueueWithClient(
    client: PoolClient,
    eventType: string,
    aggregateType: string,
    aggregateId: string,
    payload: unknown,
    metadata: { correlationId?: string; traceparent?: string } = {}
  ): Promise<string> {
    const result = await client.query(
      `insert into outbox_events(event_type,aggregate_type,aggregate_id,payload,correlation_id,traceparent)
       values ($1,$2,$3,$4::jsonb,$5,$6)
       returning id::text`,
      [
        eventType,
        aggregateType,
        aggregateId,
        JSON.stringify(payload),
        metadata.correlationId ?? null,
        metadata.traceparent ?? null
      ]
    );
    return String(result.rows[0].id);
  }

  async claimBatch(workerId: string, limit = 20): Promise<OutboxEventRecord[]> {
    return this.pg.transaction(async (client: PoolClient) => {
      const result = await client.query(
        `with candidates as (
           select id
             from outbox_events
            where status in ('PENDING','FAILED')
              and next_attempt_at <= now()
              and dead_lettered_at is null
            order by created_at
            for update skip locked
            limit $2
         )
         update outbox_events o
            set status='PROCESSING', locked_at=now(), locked_by=$1, attempt_count=o.attempt_count+1
           from candidates c
          where o.id=c.id
         returning o.id::text,o.event_type,o.aggregate_type,o.aggregate_id,o.payload,o.correlation_id,o.traceparent,o.attempt_count`,
        [workerId, limit]
      );
      return result.rows.map((row: any) => ({
        id: String(row.id),
        eventType: String(row.event_type),
        aggregateType: String(row.aggregate_type),
        aggregateId: String(row.aggregate_id),
        payload: (row.payload ?? {}) as Record<string, unknown>,
        correlationId: row.correlation_id ? String(row.correlation_id) : undefined,
        traceparent: row.traceparent ? String(row.traceparent) : undefined,
        attemptCount: Number(row.attempt_count)
      }));
    });
  }

  async markPublished(id: string): Promise<void> {
    await this.pg.query(
      `update outbox_events
          set status='PUBLISHED', published_at=now(), locked_at=null, locked_by=null, last_error=null
        where id=$1`,
      [id]
    );
  }

  async markFailed(
    id: string,
    error: string,
    attemptCount: number,
    maxAttempts: number
  ): Promise<void> {
    const deadLetter = attemptCount >= maxAttempts;
    const delaySeconds = computeOutboxBackoffSeconds(attemptCount);
    await this.pg.query(
      `update outbox_events
          set status=$2,
              next_attempt_at=case when $2='DEAD_LETTER' then next_attempt_at else now()+($3::text || ' seconds')::interval end,
              dead_lettered_at=case when $2='DEAD_LETTER' then now() else null end,
              locked_at=null,
              locked_by=null,
              last_error=$4
        where id=$1`,
      [id, deadLetter ? 'DEAD_LETTER' : 'FAILED', delaySeconds, error.slice(0, 2000)]
    );
  }

  async status(): Promise<Record<string, number>> {
    const rows = await this.pg.query<{ status: string; count: string }>(
      `select status,count(*)::text as count from outbox_events group by status order by status`
    );
    return Object.fromEntries(rows.map((row: any) => [row.status, Number(row.count)]));
  }
}
