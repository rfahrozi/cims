import { Module } from '@nestjs/common';
import { ObservabilityModule } from '../../infrastructure/observability.module.js';
import { PersistenceModule } from '../../infrastructure/persistence.module.js';
import { WorkflowSupportModule } from '../../infrastructure/workflow-support.module.js';
import { HearingsModule } from '../hearings/hearings.module.js';
import { AppealDecisionController } from './appeal-decision.controller.js';
import { AppealDecisionRepository } from './appeal-decision.repository.js';
import { AppealDecisionService } from './appeal-decision.service.js';

@Module({
  imports: [PersistenceModule, ObservabilityModule, WorkflowSupportModule, HearingsModule],
  controllers: [AppealDecisionController],
  providers: [AppealDecisionService, AppealDecisionRepository],
  exports: [AppealDecisionService]
})
export class AppealDecisionModule {}
