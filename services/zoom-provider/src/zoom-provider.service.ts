import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  OnApplicationShutdown,
  ServiceUnavailableException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import { secretValue } from './secret-value.js';
import type {
  CreateRoomInput,
  CreateSessionInput,
  SessionResponse
} from './zoom-provider.types.js';

interface ZoomTokenResponse {
  access_token: string;
  expires_in: number;
}

interface ZoomMeetingResponse {
  id: number | string;
  uuid?: string;
  join_url?: string;
  start_url?: string;
}

interface StoredOperation {
  request_hash: string;
  status: 'PROCESSING' | 'SUCCEEDED' | 'FAILED';
  response_payload: SessionResponse | null;
}

@Injectable()
export class ZoomProviderService implements OnApplicationShutdown {
  private token?: { value: string; expiresAt: number };
  private readonly accountId?: string;
  private readonly clientId?: string;
  private readonly clientSecret?: string;
  private readonly hostUserId?: string;
  private readonly timeoutMs: number;
  private readonly pool?: Pool;
  private readonly memoryOperations = new Map<
    string,
    { requestHash: string; response: SessionResponse }
  >();

  constructor(private readonly config: ConfigService) {
    this.accountId = secretValue(config, 'ZOOM_ACCOUNT_ID');
    this.clientId = secretValue(config, 'ZOOM_CLIENT_ID');
    this.clientSecret = secretValue(config, 'ZOOM_CLIENT_SECRET');
    this.hostUserId = secretValue(config, 'ZOOM_HOST_USER_ID');
    this.timeoutMs = Number(config.get<string>('ZOOM_API_TIMEOUT_MS') ?? 15_000);
    const databaseUrl = secretValue(config, 'DATABASE_URL');
    if (databaseUrl) {
      this.pool = new Pool({
        connectionString: databaseUrl,
        max: Number(config.get<string>('ZOOM_DB_POOL_MAX') ?? 3),
        connectionTimeoutMillis: Number(config.get<string>('ZOOM_DB_CONNECT_TIMEOUT_MS') ?? 5_000),
        statement_timeout: Number(config.get<string>('ZOOM_DB_STATEMENT_TIMEOUT_MS') ?? 20_000),
        application_name: 'cims-zoom-provider'
      });
    }
    if (config.get<string>('NODE_ENV') === 'production') this.assertProductionConfiguration();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool?.end();
  }

  async status() {
    if (!this.configured()) {
      throw new ServiceUnavailableException({
        status: 'DOWN',
        provider: 'ZOOM',
        code: 'ZOOM_CONFIG_INCOMPLETE',
        capabilities: this.capabilities()
      });
    }
    try {
      await this.accessToken();
      return {
        status: 'HEALTHY',
        provider: 'ZOOM',
        checked_at: new Date().toISOString(),
        durable_idempotency: Boolean(this.pool),
        capabilities: this.capabilities()
      };
    } catch (error) {
      throw new ServiceUnavailableException({
        status: 'DOWN',
        provider: 'ZOOM',
        code: 'ZOOM_OAUTH_UNAVAILABLE',
        message: error instanceof Error ? error.message : String(error),
        capabilities: this.capabilities()
      });
    }
  }

  capabilities() {
    return {
      scheduled_meeting: true,
      waiting_room: true,
      logical_rooms: true,
      breakout_preassignment: false,
      live_waiting_room_admission: false,
      live_room_move: false,
      participant_registration: false,
      recording_control: false,
      manual_action_required_for: ['LIVE_WAITING_ROOM_ADMISSION', 'LIVE_ROOM_MOVE']
    };
  }

  async createSession(input: CreateSessionInput, idempotencyKey: string): Promise<SessionResponse> {
    this.validateSession(input, idempotencyKey);
    const requestHash = this.requestHash(input);
    if (this.pool) return this.createSessionDurable(input, idempotencyKey, requestHash);

    const prior = this.memoryOperations.get(idempotencyKey);
    if (prior) {
      if (prior.requestHash !== requestHash)
        throw new ConflictException('Idempotency key was already used with another request.');
      return prior.response;
    }
    const response = await this.createZoomMeeting(input, idempotencyKey);
    this.memoryOperations.set(idempotencyKey, { requestHash, response });
    return response;
  }

  createRoom(sessionRef: string, input: CreateRoomInput) {
    if (!sessionRef.trim()) throw new BadRequestException('provider session reference is required');
    if (!input.room_code?.trim()) throw new BadRequestException('room_code is required');
    if (input.room_type === 'CONSULTATION' && input.recording_allowed) {
      throw new ConflictException('Recording is prohibited in a consultation room.');
    }
    return {
      provider_room_reference: `ZOOM:${sessionRef}:LOGICAL_ROOM:${input.room_code}`,
      room_code: input.room_code,
      room_type: input.room_type,
      recording_allowed: input.recording_allowed,
      provider_operation:
        input.room_type === 'MAIN' || input.room_type === 'WAITING'
          ? 'NATIVE'
          : 'LOGICAL_MANUAL_CONTROL'
    };
  }

  private async createSessionDurable(
    input: CreateSessionInput,
    idempotencyKey: string,
    requestHash: string
  ): Promise<SessionResponse> {
    const client = await this.pool!.connect();
    try {
      await client.query('begin');
      const inserted = await client.query(
        `insert into video_provider_operations(
           idempotency_key,provider_code,operation_type,request_hash,status,created_at,updated_at
         ) values($1,'ZOOM','CREATE_SESSION',$2,'PROCESSING',now(),now())
         on conflict(idempotency_key) do nothing
         returning idempotency_key`,
        [idempotencyKey, requestHash]
      );
      const row = await client.query<StoredOperation>(
        `select request_hash,status,response_payload
           from video_provider_operations
          where idempotency_key=$1
          for update`,
        [idempotencyKey]
      );
      const operation = row.rows[0];
      if (!operation)
        throw new ServiceUnavailableException('Provider operation ledger is unavailable.');
      if (operation.request_hash !== requestHash) {
        throw new ConflictException('Idempotency key was already used with another request.');
      }
      if (
        inserted.rowCount === 0 &&
        operation.status === 'SUCCEEDED' &&
        operation.response_payload
      ) {
        await client.query('commit');
        return operation.response_payload;
      }
      const response = await this.createZoomMeeting(input, idempotencyKey);
      await client.query(
        `update video_provider_operations
            set status='SUCCEEDED',provider_reference=$2,response_payload=$3::jsonb,last_error=null,updated_at=now()
          where idempotency_key=$1`,
        [idempotencyKey, response.provider_session_reference, JSON.stringify(response)]
      );
      await client.query('commit');
      return response;
    } catch (error) {
      if (error instanceof ConflictException) {
        await client.query('rollback').catch(() => undefined);
        throw error;
      }
      await this.recordFailure(client, idempotencyKey, requestHash, error);
      throw error;
    } finally {
      client.release();
    }
  }

  private async recordFailure(
    client: PoolClient,
    idempotencyKey: string,
    requestHash: string,
    error: unknown
  ): Promise<void> {
    try {
      await client.query('rollback');
      await client.query(
        `insert into video_provider_operations(
           idempotency_key,provider_code,operation_type,request_hash,status,last_error,created_at,updated_at
         ) values($1,'ZOOM','CREATE_SESSION',$2,'FAILED',$3,now(),now())
         on conflict(idempotency_key) do update
           set status='FAILED',last_error=excluded.last_error,updated_at=now()`,
        [
          idempotencyKey,
          requestHash,
          (error instanceof Error ? error.message : String(error)).slice(0, 2_000)
        ]
      );
    } catch {
      // The original provider failure remains the primary error.
    }
  }

  private async createZoomMeeting(
    input: CreateSessionInput,
    idempotencyKey: string
  ): Promise<SessionResponse> {
    const token = await this.accessToken();
    const start = new Date(input.start_at);
    const end = new Date(input.end_at);
    const duration = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 60_000));
    const response = await this.fetchWithTimeout(
      `https://api.zoom.us/v2/users/${encodeURIComponent(this.hostUserId!)}/meetings`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
          'x-cims-idempotency-key': idempotencyKey
        },
        body: JSON.stringify({
          topic: `CIMS ${input.hearing_reference}`,
          agenda: `CIMS hearing reference: ${input.hearing_reference}`,
          type: 2,
          start_time: input.start_at,
          duration,
          timezone: 'UTC',
          settings: {
            waiting_room: true,
            join_before_host: false,
            mute_upon_entry: true,
            auto_recording: 'none'
          }
        })
      }
    );
    if (!response.ok) {
      const text = (await response.text()).slice(0, 1_000);
      throw new BadGatewayException({
        code: 'ZOOM_CREATE_MEETING_FAILED',
        status: response.status,
        retryable: response.status >= 500 || response.status === 429,
        details: text
      });
    }
    const data = (await response.json()) as ZoomMeetingResponse;
    if (!data.id)
      throw new BadGatewayException('Zoom response did not contain a meeting identifier.');
    return { provider_session_reference: String(data.id), state: 'READY' };
  }

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) return this.token.value;
    if (!this.configured())
      throw new ServiceUnavailableException('Zoom credentials are incomplete.');
    const basic = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const url = new URL('https://zoom.us/oauth/token');
    url.searchParams.set('grant_type', 'account_credentials');
    url.searchParams.set('account_id', this.accountId!);
    const response = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: { authorization: `Basic ${basic}` }
    });
    if (!response.ok)
      throw new ServiceUnavailableException(
        `Zoom OAuth request failed with HTTP ${response.status}.`
      );
    const data = (await response.json()) as ZoomTokenResponse;
    if (!data.access_token || !data.expires_in)
      throw new ServiceUnavailableException('Zoom OAuth response is incomplete.');
    this.token = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1_000 };
    return data.access_token;
  }

  private configured(): boolean {
    return Boolean(this.accountId && this.clientId && this.clientSecret && this.hostUserId);
  }

  private validateSession(input: CreateSessionInput, idempotencyKey: string): void {
    if (!idempotencyKey?.trim())
      throw new BadRequestException('Idempotency-Key header is required.');
    if (!input.hearing_reference?.trim())
      throw new BadRequestException('hearing_reference is required.');
    const start = new Date(input.start_at);
    const end = new Date(input.end_at);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      throw new BadRequestException('start_at and end_at must be valid and end_at must be later.');
    }
  }

  private requestHash(input: CreateSessionInput): string {
    return createHash('sha256')
      .update(
        JSON.stringify({
          hearing_reference: input.hearing_reference,
          start_at: input.start_at,
          end_at: input.end_at,
          recording_policy: input.recording_policy ?? 'DISABLED'
        })
      )
      .digest('hex');
  }

  private async fetchWithTimeout(input: string | URL, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError')
        throw new ServiceUnavailableException('Zoom API request timed out.');
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  private assertProductionConfiguration(): void {
    if (!this.configured()) throw new Error('Zoom production credentials are incomplete.');
    if (!this.pool)
      throw new Error(
        'DATABASE_URL or DATABASE_URL_FILE is required for durable Zoom idempotency in production.'
      );
  }
}
