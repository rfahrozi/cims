import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainError } from '@cims/domain';
import { randomUUID, createHmac } from 'node:crypto';
import { KmsSecretService } from '../config/kms-secret.service.js';
import { CircuitBreakerService } from './circuit-breaker.service.js';

@Injectable()
export class OfficialSystemGateway {
  private readonly logger = new Logger(OfficialSystemGateway.name);

  constructor(
    private readonly config: ConfigService,
    private readonly kmsSecret: KmsSecretService,
    private readonly circuitBreaker: CircuitBreakerService
  ) {}

  async capability(): Promise<{ mode: 'MOCK' | 'HTTP'; configured: boolean }> {
    const mode = this.mode;
    if (mode === 'MOCK') return { mode, configured: true };
    const url = this.config.get<string>('OFFICIAL_SYSTEM_GATEWAY_URL');
    const key = await this.kmsSecret.getSecret('OFFICIAL_SYSTEM_GATEWAY_API_KEY');
    return { mode, configured: Boolean(url && key) };
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
    if (!baseUrl) {
      throw new DomainError(
        'OFFICIAL_SYSTEM_GATEWAY_CONFIG_INVALID',
        'OFFICIAL_SYSTEM_GATEWAY_URL is required in HTTP mode.',
        500
      );
    }

    const apiKey = await this.kmsSecret.getSecret('OFFICIAL_SYSTEM_GATEWAY_API_KEY');
    const signingSecret =
      (await this.kmsSecret.getSecret('OFFICIAL_SYSTEM_GATEWAY_SIGNING_SECRET')) ?? apiKey;

    return this.circuitBreaker.execute('official-system-gateway', async () => {
      // Implementasi Retry dengan Exponential Backoff (Maks 3 kali)
      const maxRetries = 3;
      let attempt = 0;
      let lastError: any;

      const idempotencyKey = randomUUID();
      const payload = JSON.stringify(cimsSnapshot);

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = signingSecret
        ? createHmac('sha256', signingSecret).update(`${timestamp}.${payload}`).digest('hex')
        : '';

      while (attempt < maxRetries) {
        try {
          const response = await fetch(
            `${baseUrl.replace(/\/$/, '')}/hearings/${encodeURIComponent(hearingId)}/snapshot`,
            {
              method: 'POST', // POST digunakan untuk merekam idempotency & req body
              headers: {
                accept: 'application/json',
                'content-type': 'application/json',
                'idempotency-key': idempotencyKey,
                ...(correlationId ? { 'x-correlation-id': correlationId } : {}),
                ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
                ...(signature
                  ? { 'x-cims-signature': signature, 'x-cims-timestamp': timestamp }
                  : {})
              },
              body: payload,
              signal: AbortSignal.timeout(
                Number(this.config.get<string>('OFFICIAL_SYSTEM_GATEWAY_TIMEOUT_MS') ?? 10_000)
              )
            }
          );

          if (!response.ok && (response.status === 429 || response.status >= 500)) {
            throw new Error(`Temporary provider failure: HTTP ${response.status}`);
          }

          if (!response.ok) {
            throw new DomainError(
              'OFFICIAL_SYSTEM_GATEWAY_ERROR',
              'Official system snapshot request failed.',
              502,
              { status: response.status }
            );
          }

          return (await response.json()) as Record<string, unknown>;
        } catch (err: any) {
          if (err instanceof DomainError) throw err; // Don't retry permanent domain errors

          lastError = err;
          attempt++;
          if (attempt >= maxRetries) break;

          const backoff = Math.pow(2, attempt - 1) * 1000;
          this.logger.warn(
            `Official system gateway snapshot attempt ${attempt} failed. Retrying in ${backoff}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, backoff));
        }
      }

      this.logger.error(
        `Official system gateway delivery permanently failed after ${maxRetries} attempts.`
      );
      throw new DomainError(
        'OFFICIAL_SYSTEM_GATEWAY_TIMEOUT',
        'Official system snapshot request timed out or permanently failed.',
        504,
        { last_error: lastError?.message || 'TIMEOUT' }
      );
    });
  }

  private get mode(): 'MOCK' | 'HTTP' {
    return (this.config.get<string>('OFFICIAL_SYSTEM_GATEWAY_MODE') ?? 'MOCK').toUpperCase() ===
      'HTTP'
      ? 'HTTP'
      : 'MOCK';
  }
}
