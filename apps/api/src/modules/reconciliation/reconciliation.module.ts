import { Module } from '@nestjs/common';
import { ObservabilityModule } from '../../infrastructure/observability.module.js';
import { PersistenceModule } from '../../infrastructure/persistence.module.js';
import { ReconciliationController } from './reconciliation.controller.js';
import { ReconciliationService } from './reconciliation.service.js';

@Module({
  imports: [PersistenceModule, ObservabilityModule],
  controllers: [ReconciliationController],
  providers: [ReconciliationService]
})
export class ReconciliationModule {}
