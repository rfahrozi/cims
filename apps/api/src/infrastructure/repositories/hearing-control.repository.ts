import { Injectable } from '@nestjs/common';
import {
  DomainError,
  transitionHearing,
  type HearingAction,
  type HearingRuntimeState
} from '@cims/domain';
import type { CurrentUser } from '../../common/current-user.decorator.js';
import {
  InMemoryStore,
  type HearingControlEventRecord,
  type HearingRuntimeRecord
} from '../in-memory.store.js';
import { PersistenceModeService } from '../database/persistence-mode.service.js';
import { PgPoolService } from '../database/pg-pool.service.js';

export interface HearingRuntimeStatus {
  hearing_id: string;
  state: HearingRuntimeState;
  runtime: (HearingRuntimeRecord & { rowVersion: number }) | null;
  events: HearingControlEventRecord[];
}

@Injectable()
export class HearingControlRepository {
  constructor(
    private readonly mode: PersistenceModeService,
    private readonly memory: InMemoryStore,
    private readonly pg: PgPoolService
  ) {}

  async status(hearingId: string, user: CurrentUser): Promise<HearingRuntimeStatus> {
    if (!this.mode.postgres) {
      const runtime = this.memory.hearingRuntimes.find((item) => item.hearingId === hearingId);
      const virtualReady = this.memory.virtualSessions.some(
        (item) => item.hearingId === hearingId && item.state === 'READY'
      );
      return {
        hearing_id: hearingId,
        state: runtime?.state ?? (virtualReady ? 'READY' : 'NOT_READY'),
        runtime: runtime ? { ...runtime, rowVersion: 1 } : null,
        events: this.memory.hearingControlEvents.filter((item) => item.hearingId === hearingId)
      };
    }
    return this.pg.transactionAs(user, async (client) => {
      const runtimeResult = await client.query(
        `select id::text,hearing_id,virtual_session_id::text,state,started_by,started_at::text,
                suspended_by,suspended_at::text,suspension_reason,ended_by,ended_at::text,updated_at::text,row_version
           from hearing_runtime where hearing_id=$1`,
        [hearingId]
      );
      const eventResult = await client.query(
        `select id::text,hearing_id,sequence,event_type,reason,actor_user_id,occurred_at::text
           from hearing_control_events where hearing_id=$1 order by sequence`,
        [hearingId]
      );
      const runtimeRow = runtimeResult.rows[0];
      let state: HearingRuntimeState;
      let runtime: HearingRuntimeStatus['runtime'] = null;
      if (runtimeRow) {
        state = String(runtimeRow.state) as HearingRuntimeState;
        runtime = {
          id: String(runtimeRow.id),
          hearingId: String(runtimeRow.hearing_id),
          virtualSessionId: String(runtimeRow.virtual_session_id),
          state,
          startedBy: runtimeRow.started_by ? String(runtimeRow.started_by) : undefined,
          startedAt: runtimeRow.started_at ? String(runtimeRow.started_at) : undefined,
          suspendedBy: runtimeRow.suspended_by ? String(runtimeRow.suspended_by) : undefined,
          suspendedAt: runtimeRow.suspended_at ? String(runtimeRow.suspended_at) : undefined,
          suspensionReason: runtimeRow.suspension_reason
            ? String(runtimeRow.suspension_reason)
            : undefined,
          endedBy: runtimeRow.ended_by ? String(runtimeRow.ended_by) : undefined,
          endedAt: runtimeRow.ended_at ? String(runtimeRow.ended_at) : undefined,
          updatedAt: String(runtimeRow.updated_at),
          rowVersion: Number(runtimeRow.row_version)
        };
      } else {
        const ready = await client.query(
          `select exists(select 1 from virtual_sessions where hearing_id=$1 and state='READY') as ready`,
          [hearingId]
        );
        state = Boolean(ready.rows[0]?.ready) ? 'READY' : 'NOT_READY';
      }
      return {
        hearing_id: hearingId,
        state,
        runtime,
        events: eventResult.rows.map((row) => ({
          id: String(row.id),
          hearingId: String(row.hearing_id),
          sequence: Number(row.sequence),
          eventType: String(row.event_type),
          reason: row.reason ? String(row.reason) : undefined,
          actorUserId: String(row.actor_user_id),
          occurredAt: String(row.occurred_at)
        }))
      };
    });
  }

  async apply(
    hearingId: string,
    action: HearingAction,
    reason: string | undefined,
    user: CurrentUser,
    expectedRowVersion?: number
  ): Promise<HearingRuntimeStatus> {
    if (!this.mode.postgres) {
      const virtual = [...this.memory.virtualSessions]
        .reverse()
        .find((item) => item.hearingId === hearingId && item.state === 'READY');
      if (!virtual)
        throw new DomainError(
          'VIRTUAL_SESSION_REQUIRED',
          'A READY virtual session is required before hearing control.',
          409
        );
      let runtime = this.memory.hearingRuntimes.find((item) => item.hearingId === hearingId);
      const current = runtime?.state ?? 'READY';
      const next = transitionHearing(current, action);
      const at = new Date().toISOString();
      if (!runtime) {
        runtime = {
          id: this.memory.id(),
          hearingId,
          virtualSessionId: virtual.id,
          state: next,
          updatedAt: at
        };
        this.memory.hearingRuntimes.push(runtime);
      } else {
        runtime.state = next;
        runtime.updatedAt = at;
      }
      this.applyRuntimeFields(runtime, action, user.id, reason, at);
      const hearing = this.memory.hearings.find((item) => item.id === hearingId);
      if (hearing) hearing.state = this.hearingState(action);
      this.memory.hearingControlEvents.push({
        id: this.memory.id(),
        hearingId,
        sequence:
          this.memory.hearingControlEvents.filter((item) => item.hearingId === hearingId).length +
          1,
        eventType: this.eventType(action),
        reason,
        actorUserId: user.id,
        occurredAt: at
      });
      return this.status(hearingId, user);
    }

    await this.pg.transactionAs(user, async (client) => {
      await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))', [
        `hearing-runtime:${hearingId}`
      ]);
      const virtualResult = await client.query(
        `select id::text from virtual_sessions
          where hearing_id=$1 and state='READY'
          order by created_at desc limit 1`,
        [hearingId]
      );
      const virtual = virtualResult.rows[0];
      if (!virtual)
        throw new DomainError(
          'VIRTUAL_SESSION_REQUIRED',
          'A READY virtual session is required before hearing control.',
          409
        );
      const runtimeResult = await client.query(
        `select id::text,state,row_version from hearing_runtime where hearing_id=$1 for update`,
        [hearingId]
      );
      const runtimeRow = runtimeResult.rows[0];
      const current = runtimeRow ? (String(runtimeRow.state) as HearingRuntimeState) : 'READY';
      const next = transitionHearing(current, action);
      const at = new Date().toISOString();
      if (!runtimeRow) {
        await client.query(
          `insert into hearing_runtime(
             hearing_id,virtual_session_id,state,started_by,started_at,suspended_by,suspended_at,
             suspension_reason,ended_by,ended_at,updated_at,row_version
           ) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,1)`,
          [
            hearingId,
            virtual.id,
            next,
            action === 'START' ? user.id : null,
            action === 'START' ? at : null,
            action === 'SUSPEND' ? user.id : null,
            action === 'SUSPEND' ? at : null,
            action === 'SUSPEND' ? (reason ?? null) : null,
            action === 'END' ? user.id : null,
            action === 'END' ? at : null,
            at
          ]
        );
      } else {
        const expected = expectedRowVersion ?? Number(runtimeRow.row_version);
        const updated = await client.query(
          `update hearing_runtime
              set state=$3,
                  started_by=case when $4='START' then $5 else started_by end,
                  started_at=case when $4='START' then $6::timestamptz else started_at end,
                  suspended_by=case when $4='SUSPEND' then $5 when $4='RESUME' then null else suspended_by end,
                  suspended_at=case when $4='SUSPEND' then $6::timestamptz when $4='RESUME' then null else suspended_at end,
                  suspension_reason=case when $4='SUSPEND' then $7 when $4='RESUME' then null else suspension_reason end,
                  ended_by=case when $4='END' then $5 else ended_by end,
                  ended_at=case when $4='END' then $6::timestamptz else ended_at end,
                  updated_at=$6,
                  row_version=row_version+1
            where hearing_id=$1 and row_version=$2
            returning id`,
          [hearingId, expected, next, action, user.id, at, reason ?? null]
        );
        if (updated.rowCount !== 1) {
          throw new DomainError(
            'OPTIMISTIC_CONCURRENCY_CONFLICT',
            'Hearing runtime was changed by another transaction.',
            409,
            {
              hearingId,
              expectedRowVersion: expected
            }
          );
        }
      }
      const sequenceResult = await client.query(
        'select coalesce(max(sequence),0)+1 as sequence from hearing_control_events where hearing_id=$1',
        [hearingId]
      );
      await client.query(
        `insert into hearing_control_events(hearing_id,sequence,event_type,reason,actor_user_id,occurred_at)
         values($1,$2,$3,$4,$5,$6)`,
        [
          hearingId,
          Number(sequenceResult.rows[0]?.sequence ?? 1),
          this.eventType(action),
          reason ?? null,
          user.id,
          at
        ]
      );
      await client.query(
        `update hearings set state=$2,row_version=row_version+1,updated_at=$3 where id=$1`,
        [hearingId, this.hearingState(action), at]
      );
    });
    return this.status(hearingId, user);
  }

  async ended(hearingId: string, user: CurrentUser): Promise<boolean> {
    if (!this.mode.postgres)
      return this.memory.hearingRuntimes.some(
        (item) => item.hearingId === hearingId && item.state === 'ENDED'
      );
    const rows = await this.pg.transactionAs(
      user,
      async (client) =>
        (
          await client.query(
            `select exists(select 1 from hearing_runtime where hearing_id=$1 and state='ENDED') as ended`,
            [hearingId]
          )
        ).rows
    );
    return Boolean(rows[0]?.ended);
  }

  private applyRuntimeFields(
    runtime: HearingRuntimeRecord,
    action: HearingAction,
    userId: string,
    reason: string | undefined,
    at: string
  ): void {
    if (action === 'START') {
      runtime.startedBy = userId;
      runtime.startedAt = at;
    }
    if (action === 'SUSPEND') {
      runtime.suspendedBy = userId;
      runtime.suspendedAt = at;
      runtime.suspensionReason = reason;
    }
    if (action === 'RESUME') {
      runtime.suspendedBy = undefined;
      runtime.suspendedAt = undefined;
      runtime.suspensionReason = undefined;
    }
    if (action === 'END') {
      runtime.endedBy = userId;
      runtime.endedAt = at;
    }
  }

  private eventType(action: HearingAction): string {
    if (action === 'RESUME') return 'RESUMED';
    if (action === 'SUSPEND') return 'SUSPENDED';
    if (action === 'START') return 'STARTED';
    if (action === 'END') return 'ENDED';
    return 'POSTPONED';
  }

  private hearingState(action: HearingAction): string {
    if (action === 'START' || action === 'RESUME') return 'IN_SESSION';
    if (action === 'SUSPEND') return 'SUSPENDED';
    if (action === 'END') return 'COMPLETED';
    return 'POSTPONED';
  }
}
