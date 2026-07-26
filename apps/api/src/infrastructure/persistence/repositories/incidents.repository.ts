import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CurrentUser } from '../../../common/current-user.decorator.js';
import { InMemoryStore, type IncidentRecord } from '../../in-memory.store.js';
import { PgPoolService } from '../../database/pg-pool.service.js';
import { FieldCryptoService } from '../../field-crypto.service.js';
@Injectable()
export class IncidentsRepository {
  private readonly postgres: boolean;
  constructor(
    config: ConfigService,
    private readonly memory: InMemoryStore,
    private readonly pg: PgPoolService,
    private readonly crypto: FieldCryptoService
  ) {
    this.postgres =
      ((config && config.get ? config.get<string>('PERSISTENCE_MODE') : undefined) ?? 'MEMORY').toUpperCase() === 'POSTGRES';
  }
  async list(hearingId: string, user: CurrentUser): Promise<any[]> {
    if (!this.postgres)
      return this.memory.incidents
        .filter((x) => x.hearingId === hearingId)
        .map((x) => ({
          ...x,
          actions: this.memory.incidentActions.filter((a) => a.incidentId === x.id)
        }));
    return this.pg.transactionAs(user, async (c) => {
      const rows = (
        await c.query(
          'select id::text,hearing_id,incident_type,severity,status,title,description_encrypted,occurred_at::text,notification_deadline::text,notified_at::text,notification_reference,resolution_encrypted,reported_by,created_at::text,updated_at::text from incidents where hearing_id=$1 order by occurred_at desc,id',
          [hearingId]
        )
      ).rows;
      for (const r of rows as any[]) {
        r.type = r.incident_type;
        r.description = this.crypto.decrypt(r.description_encrypted);
        r.resolution = this.crypto.decrypt(r.resolution_encrypted);
        r.notificationDeadline = r.notification_deadline;
        r.notifiedAt = r.notified_at;
        r.notificationReference = r.notification_reference;
        r.reportedBy = r.reported_by;
        r.createdAt = r.created_at;
        r.updatedAt = r.updated_at;
        r.occurredAt = r.occurred_at;
        r.hearingId = r.hearing_id;
        r.actions = (
          await c.query(
            'select id::text,action_type,actor_user_id,occurred_at::text from incident_actions where incident_id=$1 order by occurred_at,id',
            [r.id]
          )
        ).rows;
      }
      return rows;
    });
  }
  async create(input: Omit<IncidentRecord, 'id'>, user: CurrentUser): Promise<IncidentRecord> {
    if (!this.postgres) {
      const r: IncidentRecord = { id: this.memory.id(), ...input };
      this.memory.incidents.push(r);
      this.memory.incidentActions.push({
        id: this.memory.id(),
        incidentId: r.id,
        actionType: 'CREATED',
        notes: r.description,
        actorUserId: user.id,
        occurredAt: r.createdAt
      });
      return r;
    }
    return this.pg.transactionAs(user, async (c) => {
      const r = (
        await c.query(
          `insert into incidents(hearing_id,incident_type,severity,status,title,description_encrypted,occurred_at,notification_deadline,reported_by,created_at,updated_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning id::text`,
          [
            input.hearingId,
            input.type,
            input.severity,
            input.status,
            input.title,
            this.crypto.encrypt(input.description),
            input.occurredAt,
            input.notificationDeadline ?? null,
            input.reportedBy,
            input.createdAt,
            input.updatedAt
          ]
        )
      ).rows[0];
      await c.query(
        "insert into incident_actions(incident_id,action_type,notes_encrypted,actor_user_id,occurred_at) values($1,'CREATED',$2,$3,$4)",
        [r.id, this.crypto.encrypt(input.description), user.id, input.createdAt]
      );
      return { id: r.id, ...input };
    });
  }
  async find(id: string, user: CurrentUser): Promise<IncidentRecord | undefined> {
    if (!this.postgres) return this.memory.incidents.find((x) => x.id === id);
    const rows = await this.pg.transactionAs(
      user,
      async (c) =>
        (
          await c.query(
            'select id::text,hearing_id,incident_type,severity,status,title,description_encrypted,occurred_at::text,notification_deadline::text,notified_at::text,notification_reference,resolution_encrypted,reported_by,created_at::text,updated_at::text from incidents where id=$1',
            [id]
          )
        ).rows
    );
    const r = rows[0] as any;
    return r
      ? {
          id: r.id,
          hearingId: r.hearing_id,
          type: r.incident_type,
          severity: r.severity,
          status: r.status,
          title: r.title,
          description: this.crypto.decrypt(r.description_encrypted) ?? '',
          occurredAt: r.occurred_at,
          notificationDeadline: r.notification_deadline ?? undefined,
          notifiedAt: r.notified_at ?? undefined,
          notificationReference: r.notification_reference ?? undefined,
          resolution: this.crypto.decrypt(r.resolution_encrypted),
          reportedBy: r.reported_by,
          createdAt: r.created_at,
          updatedAt: r.updated_at
        }
      : undefined;
  }
  async transition(
    id: string,
    status: string,
    action: string,
    notes: string | undefined,
    at: string,
    user: CurrentUser
  ): Promise<void> {
    if (!this.postgres) {
      const i = this.memory.incidents.find((x) => x.id === id);
      if (i) {
        i.status = status;
        i.updatedAt = at;
        if (action === 'RESOLVE') i.resolution = notes;
      }
      this.memory.incidentActions.push({
        id: this.memory.id(),
        incidentId: id,
        actionType: action,
        notes,
        actorUserId: user.id,
        occurredAt: at
      });
      return;
    }
    await this.pg.transactionAs(user, async (c) => {
      await c.query(
        `update incidents set status=$2,resolution_encrypted=case when $3='RESOLVE' then $4 else resolution_encrypted end,row_version=row_version+1,updated_at=$5 where id=$1`,
        [id, status, action, this.crypto.encrypt(notes), at]
      );
      await c.query(
        'insert into incident_actions(incident_id,action_type,notes_encrypted,actor_user_id,occurred_at) values($1,$2,$3,$4,$5)',
        [id, action, this.crypto.encrypt(notes), user.id, at]
      );
    });
  }
  async notify(id: string, reference: string, at: string, user: CurrentUser): Promise<void> {
    if (!this.postgres) {
      const i = this.memory.incidents.find((x) => x.id === id);
      if (i) {
        i.notifiedAt = at;
        i.notificationReference = reference;
        i.updatedAt = at;
      }
      return;
    }
    await this.pg.transactionAs(user, async (c) => {
      await c.query(
        'update incidents set notified_at=$2,notification_reference=$3,row_version=row_version+1,updated_at=$2 where id=$1',
        [id, at, reference]
      );
      await c.query(
        "insert into incident_actions(incident_id,action_type,actor_user_id,occurred_at) values($1,'NOTIFIED',$2,$3)",
        [id, user.id, at]
      );
    });
  }
  async overdue(user: CurrentUser): Promise<IncidentRecord[]> {
    if (!this.postgres)
      return this.memory.incidents.filter(
        (x) =>
          x.notificationDeadline && !x.notifiedAt && Date.parse(x.notificationDeadline) < Date.now()
      );
    const rows = await this.pg.transactionAs(
      user,
      async (c) =>
        (
          await c.query(
            "select id::text,hearing_id,incident_type,severity,status,title,description_encrypted,occurred_at::text,notification_deadline::text,reported_by,created_at::text,updated_at::text from incidents where notification_deadline<now() and notified_at is null and status in ('OPEN','MITIGATING') order by notification_deadline"
          )
        ).rows
    );
    return (rows as any[]).map((r) => ({
      id: r.id,
      hearingId: r.hearing_id,
      type: r.incident_type,
      severity: r.severity,
      status: r.status,
      title: r.title,
      description: this.crypto.decrypt(r.description_encrypted) ?? '',
      occurredAt: r.occurred_at,
      notificationDeadline: r.notification_deadline,
      reportedBy: r.reported_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  }
}
