import { Body, Controller, Headers, Param, Post, RawBodyRequest, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { Public } from '../../common/public.decorator.js';
import { ProviderWebhookService } from './provider-webhook.service.js';

// Webhook architecture note:
// ─────────────────────────────────────────────────────────────────────────────
// Zoom sends webhooks to the zoom-provider microservice (port 3010), which
// validates Zoom's native signature (x-zm-signature / x-zm-request-timestamp)
// and then re-delivers events to THIS endpoint using the internal CIMS shared
// secret (x-cims-signature / x-cims-timestamp).
//
// Flow: Zoom Cloud → zoom-provider:3010/webhooks/zoom
//                         (Zoom native sig validation: x-zm-signature)
//       zoom-provider  → api:3000/provider-webhooks/ZOOM
//                         (CIMS internal sig validation: x-cims-signature)
//
// Therefore this endpoint MUST NOT accept raw Zoom webhooks directly.
// If a future deployment routes Zoom webhooks directly here (bypassing
// zoom-provider), a Zoom native signature validator must be added first.
// ─────────────────────────────────────────────────────────────────────────────

@ApiTags('provider-webhooks')
@Controller('provider-webhooks')
export class ProviderWebhookController {
  constructor(private readonly service: ProviderWebhookService) {}

  @Public()
  @Post(':providerCode')
  ingest(
    @Param('providerCode') providerCode: string,
    @Req() request: RawBodyRequest<FastifyRequest>,
    @Body() body: Record<string, unknown>,
    @Headers('x-cims-signature') signature?: string,
    @Headers('x-cims-timestamp') timestamp?: string
  ) {
    const rawBody = request.rawBody ?? Buffer.from(JSON.stringify(body));
    return this.service.ingest(providerCode.toUpperCase(), rawBody, body, { signature, timestamp });
  }
}
