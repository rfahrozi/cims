import { Body, Controller, Headers, Param, Post, RawBodyRequest, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { Public } from '../../common/public.decorator.js';
import { ProviderWebhookService } from './provider-webhook.service.js';

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
