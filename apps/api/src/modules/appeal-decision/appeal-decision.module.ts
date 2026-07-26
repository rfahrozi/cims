import { Module } from '@nestjs/common';
import { InfrastructureModule } from '../../infrastructure/infrastructure.module.js';
import { HearingsModule } from '../hearings/hearings.module.js';
import { AppealDecisionController } from './appeal-decision.controller.js';
import { AppealDecisionRepository } from './appeal-decision.repository.js';
import { AppealDecisionService } from './appeal-decision.service.js';

@Module({
  imports: [InfrastructureModule, HearingsModule],
  controllers: [AppealDecisionController],
  providers: [AppealDecisionService, AppealDecisionRepository],
  exports: [AppealDecisionService]
})
export class AppealDecisionModule {}
