import { Module } from '@nestjs/common';
import { ObservabilityModule } from '../../infrastructure/observability.module.js';
import { PersistenceModule } from '../../infrastructure/persistence.module.js';
import { WorkflowSupportModule } from '../../infrastructure/workflow-support.module.js';
import { LiaisonController } from './liaison.controller.js';
import { LiaisonService } from './liaison.service.js';

@Module({
  imports: [PersistenceModule, ObservabilityModule, WorkflowSupportModule],
  controllers: [LiaisonController],
  providers: [LiaisonService],
  exports: [LiaisonService]
})
export class LiaisonModule {}
