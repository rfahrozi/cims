import { Module } from '@nestjs/common';
import { ProviderWebhookController } from './provider-webhook.controller.js';
import { ProviderWebhookService } from './provider-webhook.service.js';

@Module({ controllers: [ProviderWebhookController], providers: [ProviderWebhookService] })
export class ProviderWebhookModule {}
