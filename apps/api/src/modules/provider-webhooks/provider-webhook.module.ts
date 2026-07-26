import { Module } from '@nestjs/common';
import { ObservabilityModule } from '../../infrastructure/observability.module.js';
import { PersistenceModule } from '../../infrastructure/persistence.module.js';
import { ProviderWebhookController } from './provider-webhook.controller.js';
import { ProviderWebhookService } from './provider-webhook.service.js';

@Module({
  imports: [PersistenceModule, ObservabilityModule],
  controllers: [ProviderWebhookController],
  providers: [ProviderWebhookService]
})
export class ProviderWebhookModule {}
