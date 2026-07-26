import { Module } from '@nestjs/common';
import { ObservabilityModule } from '../../infrastructure/observability.module.js';
import { PersistenceModule } from '../../infrastructure/persistence.module.js';
import { DeterminationsController } from './determinations.controller.js';
import { DeterminationsService } from './determinations.service.js';
import { HearingsModule } from '../hearings/hearings.module.js';
@Module({
  imports: [PersistenceModule, ObservabilityModule, HearingsModule],
  controllers: [DeterminationsController],
  providers: [DeterminationsService],
  exports: [DeterminationsService]
})
export class DeterminationsModule {}
