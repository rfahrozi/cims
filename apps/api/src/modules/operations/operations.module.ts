import { Module } from '@nestjs/common';
import { ObservabilityModule } from '../../infrastructure/observability.module.js';
import { PersistenceModule } from '../../infrastructure/persistence.module.js';
import { SecurityModule } from '../../infrastructure/security.module.js';
import { OperationsController } from './operations.controller.js';

@Module({
  imports: [PersistenceModule, ObservabilityModule, SecurityModule],
  controllers: [OperationsController]
})
export class OperationsModule {}
