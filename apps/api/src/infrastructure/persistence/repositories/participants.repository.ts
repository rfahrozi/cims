import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CurrentUser } from '../../../common/current-user.decorator.js';
import {
  InMemoryStore,
  type ParticipantRecord,
  type ParticipantSessionRecord,
  type ParticipantTokenRecord,
  type ConsultationRecord
} from '../../workflow-support/in-memory.store.js';
import { PgPoolService } from '../database/pg-pool.service.js';
import { FieldCryptoService } from '../../security/field-crypto.service.js';

export interface ParticipantCreateInput {
  hearingId: string;
  organizationId?: string;
  role: string;
  displayName: string;
  alias?: string;
  protectedIdentity: boolean;
  contactEmail?: string;
  agendaItemId?: string;
  createdBy: string;
}
@Injectable()
export class ParticipantsRepository {
  private readonly postgres: boolean;
  constructor(
    config: ConfigService,
    private readonly memory: InMemoryStore,
    private readonly pg: PgPoolService,
    private readonly crypto: FieldCryptoService
  ) {
    this.postgres =
      (
        (config && config.get ? config.get<string>('PERSISTENCE_MODE') : undefined) ?? 'MEMORY'
      ).toUpperCase() === 'POSTGRES';
  }
  async list(hearingId: string, user: CurrentUser): Promise<ParticipantRecord[]> {
    if (!this.postgres) return this.memory.participants.filter((x) => x.hearingId === hearingId);
    return this.pg.transactionAs(user, async (client) =>
      (
        await client.query(
          `select id::text,hearing_id,organization_id,role,display_name_encrypted,alias,protected_identity,agenda_item_id,state,contact_email_encrypted,created_by,created_at::text from hearing_participants where hearing_id=$1 and deleted_at is null order by created_at,id`,
          [hearingId]
        )
      ).rows.map((r: any) => ({
        id: r.id,
        hearingId: r.hearing_id,
        organizationId: r.organization_id ?? undefined,
        role: r.role,
        displayName: this.crypto.decrypt(r.display_name_encrypted) ?? '',
        alias: r.alias ?? undefined,
        protectedIdentity: r.protected_identity,
        agendaItemId: r.agenda_item_id ?? undefined,
        state: r.state,
        contactEmailEncrypted: r.contact_email_encrypted ? '[ENCRYPTED]' : undefined,
        createdBy: r.created_by,
        createdAt: r.created_at
      }))
    );
  }
  async create(input: ParticipantCreateInput, user: CurrentUser): Promise<ParticipantRecord> {
    if (!this.postgres) {
      const record = {
        id: this.memory.id(),
        ...input,
        state: 'REGISTERED',
        contactEmailEncrypted: input.contactEmail
          ? Buffer.from(input.contactEmail).toString('base64url')
          : undefined,
        createdAt: new Date().toISOString()
      };
      this.memory.participants.push(record);
      return record;
    }
    return this.pg.transactionAs(user, async (client) => {
      const rows = (
        await client.query(
          `insert into hearing_participants(hearing_id,organization_id,role,display_name_encrypted,display_name_search_hash,alias,protected_identity,agenda_item_id,contact_email_encrypted,state,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,'REGISTERED',$10) returning id::text,created_at::text`,
          [
            input.hearingId,
            input.organizationId ?? null,
            input.role,
            this.crypto.encrypt(input.displayName),
            this.crypto.searchHash(input.displayName),
            input.alias ?? null,
            input.protectedIdentity,
            input.agendaItemId ?? null,
            this.crypto.encrypt(input.contactEmail),
            input.createdBy
          ]
        )
      ).rows as any[];
      return {
        id: rows[0].id,
        ...input,
        state: 'REGISTERED',
        contactEmailEncrypted: input.contactEmail ? '[ENCRYPTED]' : undefined,
        createdAt: rows[0].created_at
      };
    });
  }
  async find(
    hearingId: string,
    participantId: string,
    user: CurrentUser
  ): Promise<ParticipantRecord | undefined> {
    return (await this.list(hearingId, user)).find((x) => x.id === participantId);
  }
  async setState(participantId: string, state: string, user: CurrentUser): Promise<void> {
    if (!this.postgres) {
      const p = this.memory.participants.find((x) => x.id === participantId);
      if (p) p.state = state;
      return;
    }
    await this.pg.transactionAs(user, async (c) => {
      await c.query(
        'update hearing_participants set state=$2,row_version=row_version+1,updated_at=now() where id=$1',
        [participantId, state]
      );
    });
  }
  async revokeActiveTokens(participantId: string, at: string, user: CurrentUser): Promise<void> {
    if (!this.postgres) {
      for (const t of this.memory.participantTokens.filter(
        (x) => x.participantId === participantId && !x.consumedAt && !x.revokedAt
      ))
        t.revokedAt = at;
      return;
    }
    await this.pg.transactionAs(user, async (c) => {
      await c.query(
        'update participant_access_tokens set revoked_at=$2 where participant_id=$1 and consumed_at is null and revoked_at is null',
        [participantId, at]
      );
    });
  }
  async createToken(record: ParticipantTokenRecord, user: CurrentUser): Promise<void> {
    if (!this.postgres) {
      this.memory.participantTokens.push(record);
      return;
    }
    await this.pg.transactionAs(user, async (c) => {
      await c.query(
        'insert into participant_access_tokens(id,participant_id,hearing_id,token_hash,fingerprint,expires_at,created_by,created_at) values($1,$2,$3,$4,$5,$6,$7,$8)',
        [
          record.id,
          record.participantId,
          record.hearingId,
          record.tokenHash,
          record.fingerprint,
          record.expiresAt,
          record.createdBy,
          record.createdAt
        ]
      );
    });
  }
  async findTokenByHash(hash: string): Promise<ParticipantTokenRecord | undefined> {
    if (!this.postgres) return this.memory.participantTokens.find((x) => x.tokenHash === hash);
    const rows = await this.pg.transaction(async (c) => {
      await c.query("select set_config('cims.token_exchange','true',true)");
      return (
        await c.query(
          'select id::text,participant_id::text,hearing_id,token_hash,fingerprint,expires_at::text,consumed_at::text,revoked_at::text,created_by,created_at::text from participant_access_tokens where token_hash=$1',
          [hash]
        )
      ).rows;
    });
    const r = rows[0] as any;
    return r
      ? {
          id: r.id,
          participantId: r.participant_id,
          hearingId: r.hearing_id,
          tokenHash: r.token_hash,
          fingerprint: r.fingerprint,
          expiresAt: r.expires_at,
          consumedAt: r.consumed_at ?? undefined,
          revokedAt: r.revoked_at ?? undefined,
          createdBy: r.created_by,
          createdAt: r.created_at
        }
      : undefined;
  }
  async consumeIntoWaiting(
    token: ParticipantTokenRecord,
    at: string
  ): Promise<ParticipantSessionRecord> {
    if (!this.postgres) {
      token.consumedAt = at;
      const p = this.memory.participants.find((x) => x.id === token.participantId);
      if (p) p.state = 'WAITING';
      const s = {
        id: this.memory.id(),
        participantId: token.participantId,
        hearingId: token.hearingId,
        virtualRoomCode: 'WAITING',
        state: 'WAITING',
        joinedWaitingAt: at
      };
      this.memory.participantSessions.push(s);
      this.memory.attendanceEvents.push({
        id: this.memory.id(),
        hearingId: token.hearingId,
        participantId: token.participantId,
        eventType: 'WAITING_JOINED',
        roomCode: 'WAITING',
        occurredAt: at,
        source: 'TOKEN_EXCHANGE'
      });
      return s;
    }
    return this.pg.transaction(async (c) => {
      await c.query(
        "select set_config('cims.token_exchange','true',true),set_config('cims.hearing_assignments',$1,true),set_config('cims.organization_ids','',true),set_config('cims.is_system_admin','false',true)",
        [token.hearingId]
      );
      const locked = (
        await c.query(
          'select consumed_at,revoked_at,expires_at from participant_access_tokens where id=$1 for update',
          [token.id]
        )
      ).rows[0];
      if (
        !locked ||
        locked.consumed_at ||
        locked.revoked_at ||
        new Date(locked.expires_at).getTime() <= Date.now()
      )
        throw new Error('Token state changed during exchange.');
      await c.query('update participant_access_tokens set consumed_at=$2 where id=$1', [
        token.id,
        at
      ]);
      await c.query(
        "update hearing_participants set state='WAITING',row_version=row_version+1,updated_at=$2 where id=$1",
        [token.participantId, at]
      );
      const row = (
        await c.query(
          `insert into participant_sessions(hearing_id,participant_id,virtual_room_code,state,joined_waiting_at) values($1,$2,'WAITING','WAITING',$3) returning id::text`,
          [token.hearingId, token.participantId, at]
        )
      ).rows[0];
      await c.query(
        `insert into attendance_events(hearing_id,participant_id,event_type,room_code,source,occurred_at) values($1,$2,'WAITING_JOINED','WAITING','TOKEN_EXCHANGE',$3)`,
        [token.hearingId, token.participantId, at]
      );
      return {
        id: row.id,
        participantId: token.participantId,
        hearingId: token.hearingId,
        virtualRoomCode: 'WAITING',
        state: 'WAITING',
        joinedWaitingAt: at
      };
    });
  }
  async admit(
    hearingId: string,
    participantId: string,
    roomCode: string,
    at: string,
    user: CurrentUser
  ): Promise<ParticipantSessionRecord | undefined> {
    if (!this.postgres) {
      const s = [...this.memory.participantSessions]
        .reverse()
        .find((x) => x.participantId === participantId && x.state === 'WAITING');
      if (!s) return undefined;
      s.state = 'ADMITTED';
      s.virtualRoomCode = roomCode;
      s.admittedAt = at;
      s.admittedBy = user.id;
      const p = this.memory.participants.find((x) => x.id === participantId);
      if (p) p.state = 'ADMITTED';
      this.memory.attendanceEvents.push({
        id: this.memory.id(),
        hearingId,
        participantId,
        eventType: 'ADMITTED',
        roomCode,
        occurredAt: at,
        source: 'CIMS_OPERATOR'
      });
      return s;
    }
    return this.pg.transactionAs(user, async (c) => {
      const row = (
        await c.query(
          `update participant_sessions set state='ADMITTED',virtual_room_code=$3,admitted_at=$4,admitted_by=$5 where id=(select id from participant_sessions where hearing_id=$1 and participant_id=$2 and state='WAITING' order by created_at desc limit 1 for update) returning id::text,joined_waiting_at::text`,
          [hearingId, participantId, roomCode, at, user.id]
        )
      ).rows[0];
      if (!row) return undefined;
      await c.query(
        "update hearing_participants set state='ADMITTED',row_version=row_version+1,updated_at=$2 where id=$1",
        [participantId, at]
      );
      await c.query(
        `insert into attendance_events(hearing_id,participant_id,event_type,room_code,source,occurred_at) values($1,$2,'ADMITTED',$3,'CIMS_OPERATOR',$4)`,
        [hearingId, participantId, roomCode, at]
      );
      return {
        id: row.id,
        participantId,
        hearingId,
        virtualRoomCode: roomCode,
        state: 'ADMITTED',
        joinedWaitingAt: row.joined_waiting_at,
        admittedAt: at,
        admittedBy: user.id
      };
    });
  }
  async leave(
    hearingId: string,
    participantId: string,
    at: string,
    user: CurrentUser
  ): Promise<void> {
    if (!this.postgres) {
      const s = [...this.memory.participantSessions]
        .reverse()
        .find((x) => x.participantId === participantId && x.state === 'ADMITTED');
      if (s) {
        s.state = 'LEFT';
        s.leftAt = at;
      }
      const p = this.memory.participants.find((x) => x.id === participantId);
      if (p) p.state = 'LEFT';
      this.memory.attendanceEvents.push({
        id: this.memory.id(),
        hearingId,
        participantId,
        eventType: 'LEFT',
        roomCode: s?.virtualRoomCode,
        occurredAt: at,
        source: 'CIMS_OPERATOR'
      });
      return;
    }
    await this.pg.transactionAs(user, async (c) => {
      const row = (
        await c.query(
          `update participant_sessions set state='LEFT',left_at=$3 where id=(select id from participant_sessions where hearing_id=$1 and participant_id=$2 and state='ADMITTED' order by created_at desc limit 1 for update) returning virtual_room_code`,
          [hearingId, participantId, at]
        )
      ).rows[0];
      await c.query(
        "update hearing_participants set state='LEFT',row_version=row_version+1,updated_at=$2 where id=$1",
        [participantId, at]
      );
      await c.query(
        `insert into attendance_events(hearing_id,participant_id,event_type,room_code,source,occurred_at) values($1,$2,'LEFT',$3,'CIMS_OPERATOR',$4)`,
        [hearingId, participantId, row?.virtual_room_code ?? null, at]
      );
    });
  }
  async attendance(hearingId: string, user: CurrentUser): Promise<any[]> {
    if (!this.postgres)
      return this.memory.attendanceEvents
        .filter((x) => x.hearingId === hearingId)
        .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
    return this.pg.transactionAs(user, async (c) =>
      (
        await c.query(
          'select id::text,hearing_id,participant_id::text,event_type,room_code,occurred_at::text,source from attendance_events where hearing_id=$1 order by occurred_at,id',
          [hearingId]
        )
      ).rows.map((r: any) => ({
        id: r.id,
        hearingId: r.hearing_id,
        participantId: r.participant_id,
        eventType: r.event_type,
        roomCode: r.room_code ?? undefined,
        occurredAt: r.occurred_at,
        source: r.source
      }))
    );
  }
  async activeConsultation(
    hearingId: string,
    user: CurrentUser
  ): Promise<ConsultationRecord | undefined> {
    if (!this.postgres)
      return this.memory.consultations.find(
        (x) => x.hearingId === hearingId && x.state === 'ACTIVE'
      );
    const rows = await this.pg.transactionAs(
      user,
      async (c) =>
        (
          await c.query(
            "select id::text,hearing_id,defendant_participant_id::text,advocate_participant_id::text,state,started_by,started_at::text from consultation_sessions where hearing_id=$1 and state='ACTIVE'",
            [hearingId]
          )
        ).rows
    );
    const r = rows[0] as any;
    return r
      ? {
          id: r.id,
          hearingId: r.hearing_id,
          defendantParticipantId: r.defendant_participant_id,
          advocateParticipantId: r.advocate_participant_id,
          state: r.state,
          startedBy: r.started_by,
          startedAt: r.started_at
        }
      : undefined;
  }
  async createConsultation(
    input: {
      hearingId: string;
      defendantParticipantId: string;
      advocateParticipantId: string;
      startedBy: string;
      startedAt: string;
    },
    user: CurrentUser
  ): Promise<ConsultationRecord> {
    if (!this.postgres) {
      const r = { id: this.memory.id(), ...input, state: 'ACTIVE' as const };
      this.memory.consultations.push(r);
      return r;
    }
    return this.pg.transactionAs(user, async (c) => {
      const row = (
        await c.query(
          `insert into consultation_sessions(hearing_id,defendant_participant_id,advocate_participant_id,state,recording_allowed,started_by,started_at) values($1,$2,$3,'ACTIVE',false,$4,$5) returning id::text`,
          [
            input.hearingId,
            input.defendantParticipantId,
            input.advocateParticipantId,
            input.startedBy,
            input.startedAt
          ]
        )
      ).rows[0];
      return { id: row.id, ...input, state: 'ACTIVE' };
    });
  }
  async endConsultation(
    hearingId: string,
    endedBy: string,
    endedAt: string,
    user: CurrentUser
  ): Promise<ConsultationRecord | undefined> {
    if (!this.postgres) {
      const r = [...this.memory.consultations]
        .reverse()
        .find((x) => x.hearingId === hearingId && x.state === 'ACTIVE');
      if (r) {
        r.state = 'ENDED';
        r.endedBy = endedBy;
        r.endedAt = endedAt;
      }
      return r;
    }
    return this.pg.transactionAs(user, async (c) => {
      const r = (
        await c.query(
          `update consultation_sessions set state='ENDED',ended_by=$2,ended_at=$3 where id=(select id from consultation_sessions where hearing_id=$1 and state='ACTIVE' for update) returning id::text,defendant_participant_id::text,advocate_participant_id::text,started_by,started_at::text`,
          [hearingId, endedBy, endedAt]
        )
      ).rows[0];
      return r
        ? {
            id: r.id,
            hearingId,
            defendantParticipantId: r.defendant_participant_id,
            advocateParticipantId: r.advocate_participant_id,
            state: 'ENDED',
            startedBy: r.started_by,
            startedAt: r.started_at,
            endedBy,
            endedAt
          }
        : undefined;
    });
  }

  async recordLocation(
    hearingId: string,
    participantId: string,
    role: string,
    dto: { location_type: string; location_name: string; determination_reference?: string },
    user: CurrentUser
  ) {
    if (!this.postgres) {
      return { id: this.memory.id(), hearingId, participantReference: participantId, role, ...dto };
    }
    return this.pg.transactionAs(user, async (client) => {
      const row = (
        await client.query(
          `insert into participant_locations(hearing_id, participant_reference, participant_role, location_type, location_name, determination_reference, recorded_by)
         values($1, $2, $3, $4, $5, $6, $7)
         on conflict(hearing_id, participant_reference) do update
         set location_type=$4, location_name=$5, determination_reference=$6, recorded_by=$7, recorded_at=now()
         returning id::text`,
          [
            hearingId,
            participantId,
            role,
            dto.location_type,
            dto.location_name,
            dto.determination_reference ?? null,
            user.id
          ]
        )
      ).rows[0];
      return { id: row.id, hearingId, participantReference: participantId, role, ...dto };
    });
  }
}
