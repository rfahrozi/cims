import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainError } from '@cims/domain';
import { randomUUID } from 'node:crypto';
import { secretValue } from '../config/secret-value.js';
import { CircuitBreakerService } from './circuit-breaker.service.js';

export interface NotificationDeliveryRequest {
  channel: 'EMAIL' | 'WHATSAPP' | 'SMS' | 'IN_APP';
  destination: string;
  subject: string;
  message: string;
  officialReference: string;
  correlationId?: string;
}

export interface NotificationDeliveryResult {
  status: 'DELIVERED' | 'FAILED';
  providerReference?: string;
  evidence: Record<string, unknown>;
  errorCode?: string;
}

@Injectable()
export class NotificationGateway {
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
          this.config.get<string>('NOTIFICATION_GATEWAY_URL') &&
          secretValue(this.config, 'NOTIFICATION_GATEWAY_API_KEY')
        )
    };
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
    if (!baseUrl)
      throw new DomainError(
        'NOTIFICATION_GATEWAY_CONFIG_INVALID',
        'NOTIFICATION_GATEWAY_URL is required in HTTP mode.',
        500
      );
    return this.circuitBreaker.execute('notification-gateway', async () => {
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/deliveries`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(input.correlationId ? { 'x-correlation-id': input.correlationId } : {}),
          ...(secretValue(this.config, 'NOTIFICATION_GATEWAY_API_KEY')
            ? {
                authorization: `Bearer ${secretValue(this.config, 'NOTIFICATION_GATEWAY_API_KEY')}`
              }
            : {})
        },
        body: JSON.stringify({
          channel: input.channel,
          destination: input.destination,
          subject: input.subject,
          message: input.message,
          official_reference: input.officialReference
        }),
        signal: AbortSignal.timeout(
          Number(this.config.get<string>('NOTIFICATION_GATEWAY_TIMEOUT_MS') ?? 10_000)
        )
      });
      const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
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
      return {
        status: 'DELIVERED',
        providerReference: String(body.provider_reference ?? body.id ?? randomUUID()),
        evidence: {
          http_status: response.status,
          destination_masked: this.mask(input.destination),
          receipt_hash: body.receipt_hash ?? null
        }
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
