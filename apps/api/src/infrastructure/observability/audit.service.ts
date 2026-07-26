import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { canonicalJson } from '@cims/domain';
import type { CurrentUser } from '../../common/current-user.decorator.js';
import { InMemoryStore } from '../in-memory.store.js';
import { PersistenceModeService } from '../database/persistence-mode.service.js';
import { PgPoolService } from '../database/pg-pool.service.js';
import { secretValue } from '../config/secret-value.js';

export interface AuditAppendInput {
  eventType: string;
  objectType: string;
  objectId: string;
  actorUserId?: string;
  actorOrganizationId?: string;
  correlationId?: string;
  payload?: unknown;
}

@Injectable()
export class AuditService {
  private readonly hashKey: string;

  constructor(
    config: ConfigService,
    private readonly mode: PersistenceModeService,
    private readonly memory: InMemoryStore,
    private readonly pg: PgPoolService
  ) {
    this.hashKey =
      secretValue(config, 'AUDIT_HASH_KEY') ?? 'development-audit-key-not-for-production';
  }

  async append(input: AuditAppendInput, user?: CurrentUser): Promise<Record<string, unknown>> {
    if (!this.mode.postgres) {
      const event = {
        id: this.memory.id(),
        sequence:
          this.memory.auditEvents.filter(
            (item) => item.objectType === input.objectType && item.objectId === input.objectId
          ).length + 1,
        occurredAt: new Date().toISOString(),
        payload: input.payload ?? {},
        ...input
      };
      this.memory.auditEvents.push(event);
      return event;
    }

    const actor = user ?? this.systemContext(input);
    return this.pg.transactionAs(actor, async (client) => {
      await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))', [
        `audit:${input.objectType}:${input.objectId}`
      ]);
      const previous = await client.query(
        `select sequence,event_hash
           from audit_events
          where object_type=$1 and object_id=$2
          order by sequence desc limit 1`,
        [input.objectType, input.objectId]
      );
      const sequence = Number(previous.rows[0]?.sequence ?? 0) + 1;
      const previousHash = previous.rows[0]?.event_hash
        ? String(previous.rows[0].event_hash)
        : undefined;
      const occurredAt = new Date().toISOString();
      const payload = input.payload ?? {};
      const eventHash = this.hash({
        objectType: input.objectType,
        objectId: input.objectId,
        sequence,
        eventType: input.eventType,
        actorUserId: input.actorUserId ?? null,
        actorOrganizationId: input.actorOrganizationId ?? null,
        correlationId: input.correlationId ?? null,
        payload,
        previousHash: previousHash ?? null,
        occurredAt
      });
      const result = await client.query(
        `insert into audit_events(
           object_type,object_id,sequence,event_type,actor_user_id,actor_organization_id,
           correlation_id,payload,previous_hash,event_hash,occurred_at
         ) values($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11)
         returning id,object_type,object_id,sequence,event_type,actor_user_id,actor_organization_id,
                   correlation_id,payload,previous_hash,event_hash,occurred_at::text`,
        [
          input.objectType,
          input.objectId,
          sequence,
          input.eventType,
          input.actorUserId ?? null,
          input.actorOrganizationId ?? null,
          input.correlationId ?? null,
          JSON.stringify(payload),
          previousHash ?? null,
          eventHash,
          occurredAt
        ]
      );
      return result.rows[0] as Record<string, unknown>;
    });
  }

  async record(
    eventType: string,
    objectType: string,
    objectId: string,
    user: CurrentUser,
    payload: unknown = {},
    correlationId?: string
  ): Promise<Record<string, unknown>> {
    return this.append(
      {
        eventType,
        objectType,
        objectId,
        actorUserId: user.id,
        actorOrganizationId: user.organizationId,
        correlationId,
        payload
      },
      user
    );
  }

  async list(
    user: CurrentUser,
    objectId?: string,
    objectType = 'HEARING'
  ): Promise<Record<string, unknown>[]> {
    if (!this.mode.postgres) {
      return this.memory.auditEvents
        .filter((item) => !objectId || item.objectId === objectId)
        .map((item) => ({ ...item }) as Record<string, unknown>);
    }
    return this.pg.transactionAs(user, async (client) => {
      const result = await client.query(
        `select id,object_type,object_id,sequence,event_type,actor_user_id,actor_organization_id,
                correlation_id,payload,previous_hash,event_hash,occurred_at::text
           from audit_events
          where ($1::text is null or object_id=$1)
            and ($2::text is null or object_type=$2)
          order by object_type,object_id,sequence`,
        [objectId ?? null, objectType ?? null]
      );
      return result.rows as Record<string, unknown>[];
    });
  }

  async verifyChain(
    user: CurrentUser,
    objectType: string,
    objectId: string
  ): Promise<{ valid: boolean; checked: number; failureAt?: number }> {
    const events = await this.list(user, objectId, objectType);
    let previousHash: string | undefined;
    for (const [index, row] of events.entries()) {
      const sequence = Number(row.sequence);
      const expected = this.hash({
        objectType: String(row.object_type),
        objectId: String(row.object_id),
        sequence,
        eventType: String(row.event_type),
        actorUserId: row.actor_user_id ?? null,
        actorOrganizationId: row.actor_organization_id ?? null,
        correlationId: row.correlation_id ?? null,
        payload: row.payload ?? {},
        previousHash: previousHash ?? null,
        occurredAt: String(row.occurred_at)
      });
      const stored = String(row.event_hash ?? '');
      const samePrevious = String(row.previous_hash ?? '') === String(previousHash ?? '');
      const sameHash =
        stored.length === expected.length &&
        timingSafeEqual(Buffer.from(stored), Buffer.from(expected));
      if (!samePrevious || !sameHash) return { valid: false, checked: index, failureAt: sequence };
      previousHash = stored;
    }
    return { valid: true, checked: events.length };
  }

  private hash(value: Record<string, unknown>): string {
    return createHmac('sha256', this.hashKey).update(canonicalJson(value)).digest('hex');
  }

  private systemContext(input: AuditAppendInput): CurrentUser {
    return {
      id: input.actorUserId ?? 'cims-system',
      name: 'CIMS System',
      role: 'SYSTEM_ADMIN',
      roles: ['SYSTEM_ADMIN'],
      organizationId: input.actorOrganizationId ?? 'system',
      organizationIds: input.actorOrganizationId ? [input.actorOrganizationId] : [],
      permissions: ['*'],
      hearingAssignments: input.objectType === 'HEARING' ? [input.objectId] : [],
      authSource: 'DEV'
    };
  }
}
