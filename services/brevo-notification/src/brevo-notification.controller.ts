import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { BrevoNotificationService } from './brevo-notification.service.js';
import type { DeliveryRequest } from './brevo-notification.types.js';

@Controller()
export class BrevoNotificationController {
  constructor(private readonly service: BrevoNotificationService) {}

  /** Liveness probe — dipanggil oleh NotificationGateway.HTTP sebelum pengiriman */
  @Get('health')
  health() {
    return this.service.health();
  }

  /**
   * Endpoint pengiriman notifikasi — dipanggil oleh OutboxWorkerService via NotificationGateway.
   * Kontrak: POST /deliveries
   * Body : { channel, destination, subject, message, official_reference, correlation_id? }
   * Response: { status: 'DELIVERED'|'FAILED', provider_reference?, evidence }
   */
  @Post('deliveries')
  @HttpCode(200)
  deliver(@Body() body: DeliveryRequest) {
    return this.service.deliver(body);
  }
}
