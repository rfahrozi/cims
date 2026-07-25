import { Injectable } from '@nestjs/common';
import { DomainError } from '@cims/domain';
import type { CurrentUser } from '../../common/current-user.decorator.js';
import {
  InMemoryStore,
  type VirtualRoomRecord,
  type VirtualSessionRecord,
} from '../in-memory.store.js';
import { OutboxService } from '../database/outbox.service.js';
import { PersistenceModeService } from '../database/persistence-mode.service.js';
import { PgPoolService } from '../database/pg-pool.service.js';

export interface HydratedVirtualSession extends VirtualSessionRecord {
  rowVersion: number;
  rooms: VirtualRoomRecord[];
}

@Injectable()
export class VirtualSessionsRepository {
  constructor(
    private readonly mode: PersistenceModeService,
    private readonly memory: InMemoryStore,
    private readonly pg: PgPoolService,
    private readonly outbox: OutboxService,
  ) {}

  async requestProvision(
    input: {
      hearingId: string;
      scheduleId: string;
      providerCode: string;
      recordingPolicy: 'DISABLED' | 'COURT_CONTROLLED';
      createdBy: string;
    },
    user: CurrentUser,
    metadata: { correlationId?: string; traceparent?: string } = {},
  ): Promise<HydratedVirtualSession> {
    if (!this.mode.postgres) {
      const existing = [...this.memory.virtualSessions].reverse().find((item) => item.hearingId === input.hearingId && ['REQUESTED', 'READY'].includes(item.state));
      if (existing) return this.get(input.hearingId, user) as Promise<HydratedVirtualSession>;
      const now = new Date().toISOString();
      const record: VirtualSessionRecord = {
        id: this.memory.id(),
        hearingId: input.hearingId,
        scheduleId: input.scheduleId,
        providerCode: input.providerCode,
        state: 'REQUESTED',
        recordingPolicy: input.recordingPolicy,
        createdBy: input.createdBy,
        createdAt: now,
        updatedAt: now,
      };
      this.memory.virtualSessions.push(record);
      return { ...record, rowVersion: 1, rooms: [] };
    }

    return this.pg.transactionAs(user, async (client) => {
      await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))', [`virtual:${input.hearingId}`]);
      const existing = await client.query(
        `select id::text from virtual_sessions
          where hearing_id=$1 and state in ('REQUESTED','READY')
          order by created_at desc limit 1`,
        [input.hearingId],
      );
      if (existing.rows[0]) return this.hydrateWithClient(String(existing.rows[0].id), client);
      const result = await client.query(
        `insert into virtual_sessions(
           hearing_id,schedule_id,provider_code,state,recording_policy,created_by,created_at,updated_at
         ) values($1,$2,$3,'REQUESTED',$4,$5,now(),now())
         returning id::text`,
        [input.hearingId, input.scheduleId, input.providerCode, input.recordingPolicy, input.createdBy],
      );
      const id = String(result.rows[0].id);
      await this.outbox.enqueueWithClient(
        client,
        'VIRTUAL_SESSION_PROVISION_REQUESTED',
        'VIRTUAL_SESSION',
        id,
        { virtual_session_id: id, hearing_id: input.hearingId },
        metadata,
      );
      return this.hydrateWithClient(id, client);
    });
  }

  async get(hearingId: string, user: CurrentUser): Promise<HydratedVirtualSession | null> {
    if (!this.mode.postgres) {
      const session = [...this.memory.virtualSessions].reverse().find((item) => item.hearingId === hearingId);
      return session
        ? {
            ...session,
            rowVersion: 1,
            rooms: this.memory.virtualRooms.filter((item) => item.virtualSessionId === session.id),
          }
        : null;
    }
    return this.pg.transactionAs(user, async (client) => {
      const result = await client.query(
        `select id::text from virtual_sessions where hearing_id=$1 order by created_at desc,id desc limit 1`,
        [hearingId],
      );
      return result.rows[0] ? this.hydrateWithClient(String(result.rows[0].id), client) : null;
    });
  }

  async getById(id: string): Promise<HydratedVirtualSession | null> {
    if (!this.mode.postgres) {
      const session = this.memory.virtualSessions.find((item) => item.id === id);
      return session
        ? { ...session, rowVersion: 1, rooms: this.memory.virtualRooms.filter((item) => item.virtualSessionId === id) }
        : null;
    }
    return this.pg.transaction((client) => this.hydrateWithClient(id, client).catch((error) => {
      if (error instanceof DomainError && error.code === 'VIRTUAL_SESSION_NOT_FOUND') return null;
      throw error;
    }));
  }

  async markReady(
    id: string,
    providerSessionReference: string,
    rooms: Array<{
      roomCode: VirtualRoomRecord['roomCode'];
      roomType: string;
      providerRoomReference: string;
      recordingAllowed: boolean;
    }>,
  ): Promise<void> {
    if (!this.mode.postgres) {
      const session = this.memory.virtualSessions.find((item) => item.id === id);
      if (!session) throw new DomainError('VIRTUAL_SESSION_NOT_FOUND', 'Virtual session was not found.', 404);
      session.providerSessionReference = providerSessionReference;
      session.state = 'READY';
      session.updatedAt = new Date().toISOString();
      for (const room of rooms) this.memory.virtualRooms.push({ id: this.memory.id(), virtualSessionId: id, ...room });
      return;
    }
    await this.pg.transaction(async (client) => {
      const updated = await client.query(
        `update virtual_sessions
            set state='READY',provider_session_reference=$2,row_version=row_version+1,updated_at=now(),failure_code=null
          where id=$1 and state='REQUESTED'
          returning hearing_id`,
        [id, providerSessionReference],
      );
      if (updated.rowCount !== 1) {
        throw new DomainError('VIRTUAL_SESSION_STATE_INVALID', 'Virtual session is not in REQUESTED state.', 409, { id });
      }
      for (const room of rooms) {
        await client.query(
          `insert into virtual_rooms(virtual_session_id,room_code,room_type,provider_room_reference,recording_allowed)
           values($1,$2,$3,$4,$5)
           on conflict(virtual_session_id,room_code) do update
             set provider_room_reference=excluded.provider_room_reference,
                 room_type=excluded.room_type,
                 recording_allowed=excluded.recording_allowed`,
          [id, room.roomCode, room.roomType, room.providerRoomReference, room.recordingAllowed],
        );
      }
      await client.query(
        `update hearings set state='VIRTUAL_READY',row_version=row_version+1,updated_at=now() where id=$1`,
        [updated.rows[0].hearing_id],
      );
    });
  }

  async markFailed(id: string, failureCode: string): Promise<void> {
    if (!this.mode.postgres) {
      const session = this.memory.virtualSessions.find((item) => item.id === id);
      if (session) {
        session.state = 'FAILED';
        session.failureCode = failureCode;
        session.updatedAt = new Date().toISOString();
      }
      return;
    }
    await this.pg.query(
      `update virtual_sessions
          set state='FAILED',failure_code=$2,row_version=row_version+1,updated_at=now()
        where id=$1`,
      [id, failureCode],
    );
  }

  async isReady(hearingId: string, user: CurrentUser): Promise<boolean> {
    if (!this.mode.postgres) return this.memory.virtualSessions.some((item) => item.hearingId === hearingId && item.state === 'READY');
    const rows = await this.pg.transactionAs(user, async (client) =>
      (await client.query(
        `select exists(select 1 from virtual_sessions where hearing_id=$1 and state='READY') as ready`,
        [hearingId],
      )).rows,
    );
    return Boolean(rows[0]?.ready);
  }

  private async hydrateWithClient(id: string, client: import('pg').PoolClient): Promise<HydratedVirtualSession> {
    const result = await client.query(
      `select id::text,hearing_id,schedule_id,provider_code,provider_session_reference,state,recording_policy,
              created_by,created_at::text,updated_at::text,failure_code,row_version
         from virtual_sessions where id=$1`,
      [id],
    );
    const row = result.rows[0];
    if (!row) throw new DomainError('VIRTUAL_SESSION_NOT_FOUND', 'Virtual session was not found.', 404);
    const roomResult = await client.query(
      `select id::text,virtual_session_id::text,room_code,room_type,provider_room_reference,recording_allowed
         from virtual_rooms where virtual_session_id=$1 order by room_code`,
      [id],
    );
    return {
      id: String(row.id),
      hearingId: String(row.hearing_id),
      scheduleId: String(row.schedule_id),
      providerCode: String(row.provider_code),
      providerSessionReference: row.provider_session_reference ? String(row.provider_session_reference) : undefined,
      state: String(row.state) as VirtualSessionRecord['state'],
      recordingPolicy: String(row.recording_policy) as VirtualSessionRecord['recordingPolicy'],
      createdBy: String(row.created_by),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      failureCode: row.failure_code ? String(row.failure_code) : undefined,
      rowVersion: Number(row.row_version),
      rooms: roomResult.rows.map((room) => ({
        id: String(room.id),
        virtualSessionId: String(room.virtual_session_id),
        roomCode: String(room.room_code) as VirtualRoomRecord['roomCode'],
        roomType: String(room.room_type),
        providerRoomReference: String(room.provider_room_reference),
        recordingAllowed: Boolean(room.recording_allowed),
      })),
    };
  }
}
