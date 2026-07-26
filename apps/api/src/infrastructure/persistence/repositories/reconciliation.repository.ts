import { randomUUID } from 'node:crypto';
import { compareFlatSnapshots } from '@cims/domain';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { CurrentUser } from '../../../common/current-user.decorator.js';
import { OutboxService } from '../../database/outbox.service.js';
import { PersistenceModeService } from '../../database/persistence-mode.service.js';
import { PgPoolService } from '../../database/pg-pool.service.js';

export interface ReconciliationRunRecord {
  id: string;
  hearingId: string;
  sourceSystem: string;
  status: 'REQUESTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  requestedBy: string;
  requestedAt: string;
  startedAt?: string;
  completedAt?: string;
  matchedCount: number;
  mismatchCount: number;
  missingCount: number;
  lastError?: string;
  items: Array<{
    id: string;
    fieldPath: string;
    cimsValue: unknown;
    sourceValue: unknown;
    result: 'MATCHED' | 'MISMATCH' | 'MISSING_IN_CIMS' | 'MISSING_IN_SOURCE';
  }>;
}

@Injectable()
export class ReconciliationRepository {
  private readonly memory = new Map<string, ReconciliationRunRecord>();

  constructor(
    private readonly mode: PersistenceModeService,
    private readonly pg: PgPoolService,
    private readonly outbox: OutboxService
  ) {}

  async request(
    hearingId: string,
    sourceSystem: string,
    user: CurrentUser,
    metadata: { correlationId?: string; traceparent?: string } = {}
  ): Promise<ReconciliationRunRecord> {
    if (!this.mode.postgres) {
      const id = randomUUID();
      const run: ReconciliationRunRecord = {
        id,
        hearingId,
        sourceSystem,
        status: 'COMPLETED',
        requestedBy: user.id,
        requestedAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        matchedCount: 1,
        mismatchCount: 0,
        missingCount: 0,
        items: [
          {
            id: randomUUID(),
            fieldPath: '$',
            cimsValue: 'MEMORY',
            sourceValue: 'MEMORY',
            result: 'MATCHED'
          }
        ]
      };
      this.memory.set(id, run);
      return run;
    }
    return this.pg.transactionAs(user, async (client) => {
      const result = await client.query(
        `insert into reconciliation_runs(hearing_id,source_system,status,requested_by)
         values($1,$2,'REQUESTED',$3)
         returning id::text`,
        [hearingId, sourceSystem, user.id]
      );
      const id = String(result.rows[0].id);
      await this.outbox.enqueueWithClient(
        client,
        'OFFICIAL_RECONCILIATION_REQUESTED',
        'RECONCILIATION_RUN',
        id,
        { run_id: id, hearing_id: hearingId, source_system: sourceSystem },
        metadata
      );
      return this.getWithClient(id, client);
    });
  }

  async list(hearingId: string, user: CurrentUser): Promise<ReconciliationRunRecord[]> {
    if (!this.mode.postgres)
      return [...this.memory.values()].filter((item) => item.hearingId === hearingId);
    return this.pg.transactionAs(user, async (client) => {
      const result = await client.query(
        `select id::text from reconciliation_runs where hearing_id=$1 order by requested_at desc,id`,
        [hearingId]
      );
      const items: ReconciliationRunRecord[] = [];
      for (const row of result.rows) items.push(await this.getWithClient(String(row.id), client));
      return items;
    });
  }

  async get(id: string, user: CurrentUser): Promise<ReconciliationRunRecord> {
    if (!this.mode.postgres) {
      const item = this.memory.get(id);
      if (!item) throw new NotFoundException('Reconciliation run not found');
      return item;
    }
    return this.pg.transactionAs(user, (client) => this.getWithClient(id, client));
  }

  async claimForProcessing(
    id: string
  ): Promise<{ id: string; hearingId: string; sourceSystem: string } | null> {
    if (!this.mode.postgres) return null;
    return this.pg.transaction(async (client) => {
      const result = await client.query(
        `update reconciliation_runs
            set status='PROCESSING',started_at=coalesce(started_at,now()),last_error=null
          where id=$1 and status in ('REQUESTED','FAILED')
          returning id::text,hearing_id,source_system`,
        [id]
      );
      const row = result.rows[0];
      return row
        ? {
            id: String(row.id),
            hearingId: String(row.hearing_id),
            sourceSystem: String(row.source_system)
          }
        : null;
    });
  }

  async cimsSnapshot(hearingId: string): Promise<Record<string, unknown>> {
    if (!this.mode.postgres) return { hearing_id: hearingId, mode: 'MEMORY' };
    const rows = await this.pg.query<Record<string, unknown>>(
      `select h.id as hearing_id,h.case_number,h.hearing_type,h.state,
              d.decision as determination_decision,d.official_reference as determination_reference,d.version as determination_version,
              s.id as schedule_id,s.start_at::text as schedule_start_at,s.end_at::text as schedule_end_at,s.version as schedule_version,
              (select count(*) from official_notices n where n.hearing_id=h.id and n.status<>'CANCELLED')::int as notice_count,
              (select count(*) from notice_recipients r join official_notices n on n.id=r.notice_id where n.hearing_id=h.id and r.required_ack and r.status='ACKNOWLEDGED')::int as acknowledged_count,
              (select count(*) from readiness_submissions rs where rs.hearing_id=h.id and rs.status='READY')::int as readiness_ready_count,
              (select state from virtual_sessions v where v.hearing_id=h.id order by created_at desc limit 1) as virtual_state,
              (select state from hearing_runtime hr where hr.hearing_id=h.id) as runtime_state
         from hearings h
         left join lateral (select * from judicial_determinations where hearing_id=h.id and is_current order by version desc limit 1) d on true
         left join lateral (select * from hearing_schedules where hearing_id=h.id and status='ACTIVE' order by version desc limit 1) s on true
        where h.id=$1`,
      [hearingId]
    );
    const row = rows[0];
    if (!row) throw new NotFoundException('Hearing not found');
    return row;
  }

  async complete(
    id: string,
    cims: Record<string, unknown>,
    source: Record<string, unknown>
  ): Promise<void> {
    if (!this.mode.postgres) return;
    const items = this.compare(cims, source);
    await this.pg.transaction(async (client) => {
      await client.query('delete from reconciliation_items where run_id=$1', [id]);
      for (const item of items) {
        await client.query(
          `insert into reconciliation_items(run_id,field_path,cims_value,source_value,result)
           values($1,$2,$3::jsonb,$4::jsonb,$5)`,
          [
            id,
            item.fieldPath,
            JSON.stringify(item.cimsValue ?? null),
            JSON.stringify(item.sourceValue ?? null),
            item.result
          ]
        );
      }
      const matched = items.filter((item) => item.result === 'MATCHED').length;
      const mismatches = items.filter((item) => item.result === 'MISMATCH').length;
      const missing = items.filter((item) => item.result.startsWith('MISSING')).length;
      await client.query(
        `update reconciliation_runs
            set status='COMPLETED',completed_at=now(),matched_count=$2,mismatch_count=$3,missing_count=$4,last_error=null
          where id=$1`,
        [id, matched, mismatches, missing]
      );
    });
  }

  async fail(id: string, error: string): Promise<void> {
    if (!this.mode.postgres) return;
    await this.pg.query(
      `update reconciliation_runs set status='FAILED',completed_at=now(),last_error=$2 where id=$1`,
      [id, error.slice(0, 2000)]
    );
  }

  private async getWithClient(
    id: string,
    client: import('pg').PoolClient
  ): Promise<ReconciliationRunRecord> {
    const result = await client.query(
      `select id::text,hearing_id,source_system,status,requested_by,requested_at::text,started_at::text,completed_at::text,
              matched_count,mismatch_count,missing_count,last_error
         from reconciliation_runs where id=$1`,
      [id]
    );
    const row = result.rows[0];
    if (!row) throw new NotFoundException('Reconciliation run not found');
    const itemResult = await client.query(
      `select id::text,field_path,cims_value,source_value,result
         from reconciliation_items where run_id=$1 order by field_path`,
      [id]
    );
    return {
      id: String(row.id),
      hearingId: String(row.hearing_id),
      sourceSystem: String(row.source_system),
      status: String(row.status) as ReconciliationRunRecord['status'],
      requestedBy: String(row.requested_by),
      requestedAt: String(row.requested_at),
      startedAt: row.started_at ? String(row.started_at) : undefined,
      completedAt: row.completed_at ? String(row.completed_at) : undefined,
      matchedCount: Number(row.matched_count),
      mismatchCount: Number(row.mismatch_count),
      missingCount: Number(row.missing_count),
      lastError: row.last_error ? String(row.last_error) : undefined,
      items: itemResult.rows.map((item) => ({
        id: String(item.id),
        fieldPath: String(item.field_path),
        cimsValue: item.cims_value,
        sourceValue: item.source_value,
        result: String(item.result) as ReconciliationRunRecord['items'][number]['result']
      }))
    };
  }

  private compare(
    cims: Record<string, unknown>,
    source: Record<string, unknown>
  ): ReconciliationRunRecord['items'] {
    return compareFlatSnapshots(cims, source).map((item) => ({ id: randomUUID(), ...item }));
  }
}
