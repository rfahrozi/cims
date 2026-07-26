import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainError } from '@cims/domain';
import { secretValue } from '../config/secret-value.js';
import { CircuitBreakerService } from './circuit-breaker.service.js';

@Injectable()
export class OfficialSystemGateway {
  constructor(
    private readonly config: ConfigService,
    private readonly circuitBreaker: CircuitBreakerService
  ) {}

  capability(): { mode: 'MOCK' | 'HTTP'; configured: boolean } {
    return {
      mode: this.mode,
      configured:
        this.mode === 'MOCK' ||
        Boolean(
          this.config.get<string>('OFFICIAL_SYSTEM_GATEWAY_URL') &&
            secretValue(this.config, 'OFFICIAL_SYSTEM_GATEWAY_API_KEY')
        )
    };
  }

  async snapshot(
    hearingId: string,
    cimsSnapshot: Record<string, unknown>,
    correlationId?: string
  ): Promise<Record<string, unknown>> {
    if (this.mode === 'MOCK') {
      if (hearingId.toLowerCase().includes('mismatch'))
        return { ...cimsSnapshot, state: 'MOCK_MISMATCH_STATE' };
      return structuredClone(cimsSnapshot);
    }
    const baseUrl = this.config.get<string>('OFFICIAL_SYSTEM_GATEWAY_URL');
    if (!baseUrl)
      throw new DomainError(
        'OFFICIAL_SYSTEM_GATEWAY_CONFIG_INVALID',
        'OFFICIAL_SYSTEM_GATEWAY_URL is required in HTTP mode.',
        500
      );
    return this.circuitBreaker.execute('official-system-gateway', async () => {
      const response = await fetch(
        `${baseUrl.replace(/\/$/, '')}/hearings/${encodeURIComponent(hearingId)}/snapshot`,
        {
          headers: {
            accept: 'application/json',
            ...(correlationId ? { 'x-correlation-id': correlationId } : {}),
            ...(secretValue(this.config, 'OFFICIAL_SYSTEM_GATEWAY_API_KEY')
              ? {
                  authorization: `Bearer ${secretValue(this.config, 'OFFICIAL_SYSTEM_GATEWAY_API_KEY')}`
                }
              : {})
          },
          signal: AbortSignal.timeout(
            Number(this.config.get<string>('OFFICIAL_SYSTEM_GATEWAY_TIMEOUT_MS') ?? 10_000)
          )
        }
      );
      if (!response.ok)
        throw new DomainError(
          'OFFICIAL_SYSTEM_GATEWAY_ERROR',
          'Official system snapshot request failed.',
          502,
          { status: response.status }
        );
      return (await response.json()) as Record<string, unknown>;
    });
  }

  private get mode(): 'MOCK' | 'HTTP' {
    return (this.config.get<string>('OFFICIAL_SYSTEM_GATEWAY_MODE') ?? 'MOCK').toUpperCase() ===
      'HTTP'
      ? 'HTTP'
      : 'MOCK';
  }
}
