import { Module } from '@nestjs/common';
import { ObservabilityModule } from '../../infrastructure/observability.module.js';
import { PersistenceModule } from '../../infrastructure/persistence.module.js';
import { HearingsModule } from '../hearings/hearings.module.js';
import { NoticesModule } from '../notices/notices.module.js';
import { ReadinessController } from './readiness.controller.js';
import { ReadinessService } from './readiness.service.js';

@Module({
  imports: [PersistenceModule, ObservabilityModule, HearingsModule, NoticesModule],
  controllers: [ReadinessController],
  providers: [ReadinessService],
  exports: [ReadinessService]
})
export class ReadinessModule {}
