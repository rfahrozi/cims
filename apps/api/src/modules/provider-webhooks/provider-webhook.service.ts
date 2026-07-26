import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { DomainError } from '@cims/domain';
import { AuditService } from '../../infrastructure/audit.service.js';
import { PersistenceModeService } from '../../infrastructure/database/persistence-mode.service.js';
import { PgPoolService } from '../../infrastructure/database/pg-pool.service.js';
import { MetricsService } from '../../infrastructure/metrics.service.js';
import { secretValue } from '../../infrastructure/config/secret-value.js';

interface ProviderWebhookPayload {
  event_id?: string;
  event_type?: string;
  occurred_at?: string;
  hearing_id?: string;
  participant_id?: string;
  provider_participant_reference?: string;
  room_code?: string;
  provider_session_reference?: string;
  [key: string]: unknown;
}

@Injectable()
export class ProviderWebhookService {
  private readonly secret: string;
  private readonly toleranceSeconds: number;
  private readonly memoryEvents = new Set<string>();

  constructor(
    config: ConfigService,
    private readonly mode: PersistenceModeService,
    private readonly pg: PgPoolService,
    private readonly audit: AuditService,
    private readonly metrics: MetricsService
  ) {
    this.secret = secretValue(config, 'WEBHOOK_SHARED_SECRET') ?? '';
    this.toleranceSeconds = Number(config.get<string>('WEBHOOK_TOLERANCE_SECONDS') ?? 300);
  }

  async ingest(
    providerCode: string,
    rawBody: Buffer,
    payload: ProviderWebhookPayload,
    headers: { signature?: string; timestamp?: string }
  ) {
    if (!this.secret || this.secret.length < 16)
      throw new DomainError(
        'WEBHOOK_CONFIG_INVALID',
        'Webhook shared secret is not configured.',
        503
      );
    const timestamp = headers.timestamp;
    const signature = headers.signature;
    if (!timestamp || !signature)
      throw new DomainError(
        'WEBHOOK_SIGNATURE_REQUIRED',
        'Webhook signature and timestamp are required.',
        401
      );
    const seconds = Number(timestamp);
    if (
      !Number.isFinite(seconds) ||
      Math.abs(Date.now() / 1000 - seconds) > this.toleranceSeconds
    ) {
      throw new DomainError(
        'WEBHOOK_TIMESTAMP_INVALID',
        'Webhook timestamp is outside the accepted tolerance.',
        401
      );
    }
    const expected = `sha256=${createHmac('sha256', this.secret).update(`${timestamp}.`).update(rawBody).digest('hex')}`;
    const valid =
      signature.length === expected.length &&
      timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    if (!valid)
      throw new DomainError('WEBHOOK_SIGNATURE_INVALID', 'Webhook signature is invalid.', 401);
    const eventId = String(payload.event_id ?? createHash('sha256').update(rawBody).digest('hex'));
    const eventType = String(payload.event_type ?? 'unknown');
    const payloadHash = createHash('sha256').update(rawBody).digest('hex');

    if (!this.mode.postgres) {
      if (this.memoryEvents.has(eventId)) return { status: 'DUPLICATE', event_id: eventId };
      this.memoryEvents.add(eventId);
      this.metrics.increment('provider_webhook_events_total', {
        provider: providerCode,
        event_type: eventType,
        status: 'PROCESSED'
      });
      return { status: 'PROCESSED', event_id: eventId, mode: 'MEMORY' };
    }

    const inserted = await this.pg.transaction(async (client) => {
      await client.query(
        "select set_config('cims.is_system_admin','true',true),set_config('cims.hearing_assignments','',true),set_config('cims.organization_ids','',true)"
      );
      const result = await client.query(
        `insert into provider_webhook_events(
           id,provider_code,event_type,provider_session_reference,signature_valid,payload_hash,payload,occurred_at,processing_status
         ) values($1,$2,$3,$4,true,$5,$6::jsonb,$7,'RECEIVED')
         on conflict(id) do nothing
         returning id`,
        [
          eventId,
          providerCode,
          eventType,
          payload.provider_session_reference ?? null,
          payloadHash,
          JSON.stringify(payload),
          payload.occurred_at ?? null
        ]
      );
      if (result.rowCount === 0) return false;
      try {
        await this.applyEvent(client, payload, eventType, eventId);
        await client.query(
          `update provider_webhook_events set processing_status='PROCESSED',processed_at=now() where id=$1`,
          [eventId]
        );
      } catch (error) {
        await client.query(
          `update provider_webhook_events set processing_status='FAILED',processed_at=now(),last_error=$2 where id=$1`,
          [eventId, (error instanceof Error ? error.message : String(error)).slice(0, 2000)]
        );
        throw error;
      }
      return true;
    });

    if (!inserted) return { status: 'DUPLICATE', event_id: eventId };
    this.metrics.increment('provider_webhook_events_total', {
      provider: providerCode,
      event_type: eventType,
      status: 'PROCESSED'
    });
    if (payload.hearing_id) {
      await this.audit.append({
        eventType: 'VIDEO_PROVIDER_EVENT_RECEIVED',
        objectType: 'HEARING',
        objectId: String(payload.hearing_id),
        payload: {
          provider: providerCode,
          provider_event_id: eventId,
          provider_event_type: eventType
        }
      });
    }
    return { status: 'PROCESSED', event_id: eventId };
  }

  private async applyEvent(
    client: import('pg').PoolClient,
    payload: ProviderWebhookPayload,
    eventType: string,
    eventId: string
  ): Promise<void> {
    const hearingId = payload.hearing_id ? String(payload.hearing_id) : undefined;
    const participantId = payload.participant_id ? String(payload.participant_id) : undefined;
    const occurredAt = payload.occurred_at ? String(payload.occurred_at) : new Date().toISOString();
    const roomCode = payload.room_code ? String(payload.room_code) : undefined;

    if (
      participantId &&
      hearingId &&
      ['participant.waiting', 'participant.admitted', 'participant.left'].includes(eventType)
    ) {
      const eventMap = {
        'participant.waiting': {
          attendance: 'WAITING_JOINED',
          state: 'WAITING',
          session: 'WAITING',
          room: 'WAITING'
        },
        'participant.admitted': {
          attendance: 'ADMITTED',
          state: 'ADMITTED',
          session: 'ADMITTED',
          room: roomCode ?? 'MAIN'
        },
        'participant.left': {
          attendance: 'LEFT',
          state: 'LEFT',
          session: 'LEFT',
          room: roomCode ?? null
        }
      } as const;
      const mapped = eventMap[eventType as keyof typeof eventMap];
      await client.query(
        `insert into attendance_events(hearing_id,participant_id,event_type,room_code,source,provider_event_id,occurred_at,payload_hash)
         values($1,$2,$3,$4,'VIDEO_PROVIDER',$5,$6,$7)
         on conflict(provider_event_id) do nothing`,
        [
          hearingId,
          participantId,
          mapped.attendance,
          mapped.room,
          eventId,
          occurredAt,
          createHash('sha256').update(JSON.stringify(payload)).digest('hex')
        ]
      );
      await client.query(
        `update hearing_participants set state=$2,row_version=row_version+1,updated_at=now() where id=$1`,
        [participantId, mapped.state]
      );
      if (eventType === 'participant.left') {
        await client.query(
          `update participant_sessions set state='LEFT',left_at=$3
            where id=(select id from participant_sessions where participant_id=$1 and hearing_id=$2 and state in ('WAITING','ADMITTED') order by created_at desc limit 1 for update)`,
          [participantId, hearingId, occurredAt]
        );
      } else {
        await client.query(
          `insert into participant_sessions(
             hearing_id,participant_id,provider_participant_ref,virtual_room_code,state,joined_waiting_at,admitted_at,created_at
           ) values($1,$2,$3,$4,$5,$6,$7,now())`,
          [
            hearingId,
            participantId,
            payload.provider_participant_reference ?? null,
            mapped.room,
            mapped.session,
            eventType === 'participant.waiting' ? occurredAt : null,
            eventType === 'participant.admitted' ? occurredAt : null
          ]
        );
      }
      return;
    }

    if (eventType === 'recording.completed' && String(payload.room_code ?? '') === 'CONSULTATION') {
      await client.query(
        `insert into security_events(event_type,severity,object_type,object_id,details)
         values('PROHIBITED_CONSULTATION_RECORDING','CRITICAL','HEARING',$1,$2::jsonb)`,
        [
          hearingId ?? null,
          JSON.stringify({
            provider_event_id: eventId,
            provider_session_reference: payload.provider_session_reference ?? null
          })
        ]
      );
    }
  }
}
