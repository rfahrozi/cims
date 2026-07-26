import { Module } from '@nestjs/common';
import { ObservabilityModule } from '../../infrastructure/observability.module.js';
import { PersistenceModule } from '../../infrastructure/persistence.module.js';
import { HearingsController } from './hearings.controller.js';
import { HearingsService } from './hearings.service.js';

@Module({
  imports: [PersistenceModule, ObservabilityModule],
  controllers: [HearingsController],
  providers: [HearingsService],
  exports: [HearingsService]
})
export class HearingsModule {}
