import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainError } from '@cims/domain';
import { randomUUID, createHmac } from 'node:crypto';
import { KmsSecretService } from '../config/kms-secret.service.js';
import { CircuitBreakerService } from './circuit-breaker.service.js';

export interface NotificationDeliveryRequest {
  channel: 'EMAIL' | 'WHATSAPP' | 'SMS' | 'IN_APP';
  destination: string;
  subject: string;
  message: string;
  officialReference: string;
  correlationId?: string;
  idempotencyKey?: string;
}

export interface NotificationDeliveryResult {
  status: 'DELIVERED' | 'FAILED';
  providerReference?: string;
  evidence: Record<string, unknown>;
  errorCode?: string;
}

@Injectable()
export class NotificationGateway {
  private readonly logger = new Logger(NotificationGateway.name);

  constructor(
    private readonly config: ConfigService,
    private readonly kmsSecret: KmsSecretService,
    private readonly circuitBreaker: CircuitBreakerService
  ) {}

  async capability(): Promise<{ mode: 'MOCK' | 'HTTP'; configured: boolean }> {
    const mode = this.mode;
    if (mode === 'MOCK') return { mode, configured: true };
    const url = this.config.get<string>('NOTIFICATION_GATEWAY_URL');
    const key = await this.kmsSecret.getSecret('NOTIFICATION_GATEWAY_API_KEY');
    return { mode, configured: Boolean(url && key) };
  }

  async send(input: NotificationDeliveryRequest): Promise<NotificationDeliveryResult> {
    if (this.mode === 'MOCK') {
      const shouldFail = input.destination.toLowerCase().includes('fail');
      return {
        status: shouldFail ? 'FAILED' : 'DELIVERED',
        providerReference: shouldFail ? undefined : `MOCK-NOTICE-${randomUUID()}`,
        evidence: {
          mode: 'MOCK',
          channel: input.channel,
          destination_masked: this.mask(input.destination),
          official_reference: input.officialReference
        },
        errorCode: shouldFail ? 'MOCK_DELIVERY_FAILURE' : undefined
      };
    }

    const baseUrl = this.config.get<string>('NOTIFICATION_GATEWAY_URL');
    if (!baseUrl) {
      throw new DomainError(
        'NOTIFICATION_GATEWAY_CONFIG_INVALID',
        'NOTIFICATION_GATEWAY_URL is required in HTTP mode.',
        500
      );
    }

    const apiKey = await this.kmsSecret.getSecret('NOTIFICATION_GATEWAY_API_KEY');
    const signingSecret =
      (await this.kmsSecret.getSecret('NOTIFICATION_GATEWAY_SIGNING_SECRET')) ?? apiKey;

    return this.circuitBreaker.execute('notification-gateway', async () => {
      // Implementasi Retry dengan Exponential Backoff (Maks 3 kali)
      const maxRetries = 3;
      let attempt = 0;
      let lastError: any;

      const idempotencyKey = input.idempotencyKey || randomUUID();
      const payload = JSON.stringify({
        channel: input.channel,
        destination: input.destination,
        subject: input.subject,
        message: input.message,
        official_reference: input.officialReference
      });

      // Menambahkan signature payload sebagai bentuk perlindungan (Integrity Check)
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = signingSecret
        ? createHmac('sha256', signingSecret).update(`${timestamp}.${payload}`).digest('hex')
        : '';

      while (attempt < maxRetries) {
        try {
          const response = await fetch(`${baseUrl.replace(/\/$/, '')}/deliveries`, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'idempotency-key': idempotencyKey,
              ...(input.correlationId ? { 'x-correlation-id': input.correlationId } : {}),
              ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
              ...(signature ? { 'x-cims-signature': signature, 'x-cims-timestamp': timestamp } : {})
            },
            body: payload,
            signal: AbortSignal.timeout(
              Number(this.config.get<string>('NOTIFICATION_GATEWAY_TIMEOUT_MS') ?? 10_000)
            )
          });

          const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;

          // Mengatasi temporary failures (HTTP 429 Too Many Requests atau 5xx Server Error) dengan retry
          if (!response.ok && (response.status === 429 || response.status >= 500)) {
            throw new Error(`Temporary provider failure: HTTP ${response.status}`);
          }

          // Permanent failure / Client error (HTTP 4xx selain 429) -> Jangan retry
          if (!response.ok) {
            return {
              status: 'FAILED',
              evidence: {
                http_status: response.status,
                destination_masked: this.mask(input.destination)
              },
              errorCode: String(body.error_code ?? 'NOTIFICATION_GATEWAY_ERROR')
            };
          }

          // Success
          return {
            status: 'DELIVERED',
            providerReference: String(body.provider_reference ?? body.id ?? randomUUID()),
            evidence: {
              http_status: response.status,
              destination_masked: this.mask(input.destination),
              receipt_hash: body.receipt_hash ?? null
            }
          };
        } catch (err: any) {
          lastError = err;
          attempt++;
          if (attempt >= maxRetries) break;
          // Exponential backoff: 1s, 2s, 4s...
          const backoff = Math.pow(2, attempt - 1) * 1000;
          this.logger.warn(
            `Notification delivery attempt ${attempt} failed. Retrying in ${backoff}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, backoff));
        }
      }

      this.logger.error(
        `Notification gateway delivery permanently failed after ${maxRetries} attempts.`
      );
      return {
        status: 'FAILED',
        evidence: {
          destination_masked: this.mask(input.destination),
          last_error: lastError?.message || 'TIMEOUT'
        },
        errorCode: 'NOTIFICATION_GATEWAY_TIMEOUT'
      };
    });
  }

  private get mode(): 'MOCK' | 'HTTP' {
    return (this.config.get<string>('NOTIFICATION_GATEWAY_MODE') ?? 'MOCK').toUpperCase() === 'HTTP'
      ? 'HTTP'
      : 'MOCK';
  }

  private mask(value: string): string {
    return value.length <= 4 ? '****' : `${value.slice(0, 2)}***${value.slice(-2)}`;
  }
}
