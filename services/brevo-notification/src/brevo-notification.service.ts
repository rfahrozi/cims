import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { secretValue } from './secret-value.js';
import type {
  BrevoSendResponse,
  DeliveryRequest,
  DeliveryResult
} from './brevo-notification.types.js';

@Injectable()
export class BrevoNotificationService {
  private readonly logger = new Logger(BrevoNotificationService.name);

  private readonly brevoApiKey?: string;
  private readonly senderEmail: string;
  private readonly senderName: string;
  private readonly whatsappMode: string;
  private readonly whatsappApiUrl?: string;
  private readonly whatsappApiKey?: string;
  private readonly timeoutMs: number;

  constructor(private readonly config: ConfigService) {
    this.brevoApiKey = secretValue(config, 'BREVO_API_KEY');
    this.senderEmail = config.get<string>('BREVO_SENDER_EMAIL') ?? 'noreply@cims.local';
    this.senderName = config.get<string>('BREVO_SENDER_NAME') ?? 'CIMS Persidangan Elektronik';
    this.whatsappMode = config.get<string>('WHATSAPP_PROVIDER_MODE') ?? 'STUB';
    this.whatsappApiUrl = config.get<string>('WHATSAPP_API_URL')?.trim() || undefined;
    this.whatsappApiKey = secretValue(config, 'WHATSAPP_API_KEY');
    this.timeoutMs = Number(config.get<string>('BREVO_TIMEOUT_MS') ?? 10_000);
  }

  async deliver(req: DeliveryRequest): Promise<DeliveryResult> {
    switch (req.channel) {
      case 'EMAIL':
        return this.sendBrevoEmail(req);
      case 'WHATSAPP':
        return this.handleWhatsApp(req);
      case 'SMS':
        return this.stubChannel('SMS', req);
      case 'IN_APP':
        return this.stubChannel('IN_APP', req);
      default:
        return {
          status: 'FAILED',
          evidence: { reason: 'Unsupported channel', channel: req.channel },
          error_code: 'UNSUPPORTED_CHANNEL'
        };
    }
  }

  // ── Email via Brevo Transactional Email API ────────────────────────────────

  private async sendBrevoEmail(req: DeliveryRequest): Promise<DeliveryResult> {
    if (!this.brevoApiKey) {
      this.logger.warn('BREVO_API_KEY not configured — treating as stub delivery');
      return this.stubChannel('EMAIL_NO_KEY', req);
    }

    const payload = {
      sender: { name: this.senderName, email: this.senderEmail },
      to: [{ email: req.destination }],
      subject: req.subject,
      textContent: req.message,
      headers: {
        'X-CIMS-Official-Reference': req.official_reference,
        ...(req.correlation_id ? { 'X-Correlation-Id': req.correlation_id } : {})
      }
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': this.brevoApiKey,
          'content-type': 'application/json',
          accept: 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        this.logger.error(`Brevo API error ${response.status}: ${body.slice(0, 500)}`);
        return {
          status: 'FAILED',
          evidence: {
            brevo_status: response.status,
            destination_masked: this.maskEmail(req.destination),
            error_preview: body.slice(0, 200)
          },
          error_code: `BREVO_HTTP_${response.status}`
        };
      }

      const data = (await response.json()) as BrevoSendResponse;
      const messageId = data.messageId ?? 'unknown';

      this.logger.log(
        `Email delivered via Brevo — messageId=${messageId} ref=${req.official_reference}`
      );
      return {
        status: 'DELIVERED',
        provider_reference: messageId,
        evidence: {
          provider: 'BREVO',
          message_id: messageId,
          destination_masked: this.maskEmail(req.destination),
          sender_email: this.senderEmail,
          official_reference: req.official_reference,
          delivered_at: new Date().toISOString()
        }
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.logger.error(`Brevo API timeout after ${this.timeoutMs}ms`);
        throw new BadGatewayException({ code: 'BREVO_TIMEOUT', retryable: true });
      }
      this.logger.error(
        `Brevo fetch error: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new ServiceUnavailableException({ code: 'BREVO_UNAVAILABLE', retryable: true });
    } finally {
      clearTimeout(timer);
    }
  }

  // ── WhatsApp — STUB mode sekarang, HTTP saat provider siap ────────────────

  private async handleWhatsApp(req: DeliveryRequest): Promise<DeliveryResult> {
    if (this.whatsappMode === 'HTTP' && this.whatsappApiUrl && this.whatsappApiKey) {
      return this.sendWhatsAppHttp(req);
    }
    // Default: STUB — siapkan jalur, log, return DELIVERED
    return this.stubChannel('WHATSAPP', req);
  }

  /**
   * Implementasi HTTP WhatsApp — akan diaktifkan saat provider (Twilio/360dialog/dll) siap.
   * Mengikuti kontrak umum: POST {WHATSAPP_API_URL}/messages
   * Body: { to, body, official_reference }
   */
  private async sendWhatsAppHttp(req: DeliveryRequest): Promise<DeliveryResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${this.whatsappApiUrl}/messages`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.whatsappApiKey}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          to: req.destination,
          body: `${req.subject}\n\n${req.message}`,
          official_reference: req.official_reference
        }),
        signal: controller.signal
      });
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        return {
          status: 'FAILED',
          evidence: {
            provider: 'WHATSAPP_HTTP',
            http_status: response.status,
            error_preview: body.slice(0, 200)
          },
          error_code: `WHATSAPP_HTTP_${response.status}`
        };
      }
      const data = (await response.json()) as { message_id?: string };
      this.logger.log(`WhatsApp delivered via HTTP — ref=${req.official_reference}`);
      return {
        status: 'DELIVERED',
        provider_reference: data.message_id,
        evidence: {
          provider: 'WHATSAPP_HTTP',
          message_id: data.message_id,
          delivered_at: new Date().toISOString()
        }
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new BadGatewayException({ code: 'WHATSAPP_TIMEOUT', retryable: true });
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  // ── Stub — channel belum tersedia, log dan return DELIVERED ───────────────

  private stubChannel(channel: string, req: DeliveryRequest): DeliveryResult {
    this.logger.log(
      `[STUB:${channel}] destination=${req.destination} subject="${req.subject}" ref=${req.official_reference}`
    );
    return {
      status: 'DELIVERED',
      provider_reference: `STUB-${channel}-${Date.now()}`,
      evidence: {
        provider: 'STUB',
        channel,
        destination_masked: channel.includes('EMAIL')
          ? this.maskEmail(req.destination)
          : req.destination.slice(0, 4) + '****',
        note: `Channel ${channel} in STUB mode — message logged but not physically sent`,
        stub_at: new Date().toISOString()
      }
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return '***@***';
    return `${local?.slice(0, 2) ?? '**'}***@${domain}`;
  }

  health() {
    return {
      status: 'UP',
      provider: 'BREVO_NOTIFICATION',
      brevo_configured: Boolean(this.brevoApiKey),
      whatsapp_mode: this.whatsappMode,
      whatsapp_configured: Boolean(this.whatsappApiUrl && this.whatsappApiKey),
      sender_email: this.senderEmail,
      checked_at: new Date().toISOString()
    };
  }
}
