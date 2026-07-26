import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainError } from '@cims/domain';
import { randomUUID } from 'node:crypto';
import { CircuitBreakerService } from './circuit-breaker.service.js';

@Injectable()
export class VideoProviderGateway {
  private readonly timeoutMs: number;
  constructor(
    private readonly config: ConfigService,
    private readonly circuitBreaker: CircuitBreakerService
  ) {
    this.timeoutMs = Number((config && config.get ? config.get<string>('VIDEO_PROVIDER_TIMEOUT_MS') : undefined) ?? 15_000);
  }

  capability(): { mode: 'MOCK' | 'HTTP'; configured: boolean } {
    return {
      mode: this.mode,
      configured: this.mode === 'MOCK' || Boolean(this.config && this.config.get ? this.config.get<string>('VIDEO_PROVIDER_URL') : undefined)
    };
  }

  async health(correlationId?: string): Promise<{ status: 'HEALTHY' | 'DOWN'; mode: string }> {
    if (this.mode === 'MOCK') return { status: 'HEALTHY', mode: 'MOCK' };
    try {
      const response = await this.circuitBreaker.execute('video-provider', () =>
        this.fetchWithTimeout(`${this.baseUrl()}/health`, { headers: this.headers(correlationId) })
      );
      return { status: response.ok ? 'HEALTHY' : 'DOWN', mode: 'HTTP' };
    } catch {
      return { status: 'DOWN', mode: 'HTTP' };
    }
  }

  async createSession(
    input: { hearingReference: string; startAt: string; endAt: string; recordingPolicy: string },
    correlationId?: string,
    idempotencyKey?: string
  ) {
    if (this.mode === 'MOCK') return { providerSessionReference: `MOCK-SESSION-${randomUUID()}` };
    return this.circuitBreaker.execute('video-provider', async () => {
      const response = await this.fetchWithTimeout(`${this.baseUrl()}/sessions`, {
        method: 'POST',
        headers: {
          ...this.headers(correlationId),
          'content-type': 'application/json',
          'idempotency-key': idempotencyKey ?? correlationId ?? randomUUID()
        },
        body: JSON.stringify({
          hearing_reference: input.hearingReference,
          start_at: input.startAt,
          end_at: input.endAt,
          recording_policy: input.recordingPolicy
        })
      });
      if (!response.ok)
        throw new DomainError('PROVIDER_ERROR', 'Video provider failed to create a session.', 502);
      const body = (await response.json()) as { provider_session_reference: string };
      return { providerSessionReference: body.provider_session_reference };
    });
  }

  async createRoom(
    providerSessionReference: string,
    input: { roomCode: string; roomType: string; recordingAllowed: boolean },
    correlationId?: string,
    idempotencyKey?: string
  ) {
    if (this.mode === 'MOCK')
      return { providerRoomReference: `MOCK-ROOM-${input.roomCode}-${randomUUID()}` };
    return this.circuitBreaker.execute('video-provider', async () => {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl()}/sessions/${encodeURIComponent(providerSessionReference)}/rooms`,
        {
          method: 'POST',
          headers: {
            ...this.headers(correlationId),
            'content-type': 'application/json',
            'idempotency-key': idempotencyKey ?? correlationId ?? randomUUID()
          },
          body: JSON.stringify({
            room_code: input.roomCode,
            room_type: input.roomType,
            recording_allowed: input.recordingAllowed
          })
        }
      );
      if (!response.ok)
        throw new DomainError('PROVIDER_ERROR', 'Video provider failed to create a room.', 502);
      const body = (await response.json()) as { provider_room_reference: string };
      return { providerRoomReference: body.provider_room_reference };
    });
  }

  private get mode(): 'MOCK' | 'HTTP' {
    return (this.config && this.config.get ? this.config.get<string>('VIDEO_PROVIDER_MODE', 'MOCK') : 'MOCK') === 'HTTP' ? 'HTTP' : 'MOCK';
  }
  private baseUrl(): string {
    return (this.config && this.config.get ? this.config.get('VIDEO_PROVIDER_URL', 'http://localhost:3010') : 'http://localhost:3010');
  }
  private headers(correlationId?: string): Record<string, string> {
    return correlationId ? { 'x-correlation-id': correlationId } : {};
  }
  private async fetchWithTimeout(input: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError')
        throw new DomainError('PROVIDER_TIMEOUT', 'Video provider request timed out.', 504);
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}
