import { Module } from '@nestjs/common';
import { ObservabilityModule } from '../../infrastructure/observability.module.js';
import { PersistenceModule } from '../../infrastructure/persistence.module.js';
import { WorkflowSupportModule } from '../../infrastructure/workflow-support.module.js';
import { CustodyController } from './custody.controller.js';
import { CustodyService } from './custody.service.js';

@Module({
  imports: [PersistenceModule, ObservabilityModule, WorkflowSupportModule],
  controllers: [CustodyController],
  providers: [CustodyService],
  exports: [CustodyService]
})
export class CustodyModule {}
