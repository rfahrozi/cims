import { Module } from '@nestjs/common';
import { ObservabilityModule } from '../../infrastructure/observability.module.js';
import { PersistenceModule } from '../../infrastructure/persistence.module.js';
import { SchedulingController } from './scheduling.controller.js';
import { SchedulingService } from './scheduling.service.js';

@Module({
  imports: [PersistenceModule, ObservabilityModule],
  controllers: [SchedulingController],
  providers: [SchedulingService],
  exports: [SchedulingService]
})
export class SchedulingModule {}
