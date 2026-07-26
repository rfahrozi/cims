import { Module } from '@nestjs/common';
import { IntegrationModule } from '../../infrastructure/integration.module.js';
import { PersistenceModule } from '../../infrastructure/persistence.module.js';
import { HealthController } from './health.controller.js';

@Module({
  imports: [PersistenceModule, IntegrationModule],
  controllers: [HealthController]
})
export class HealthModule {}
