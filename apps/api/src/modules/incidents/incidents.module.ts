import { Module } from '@nestjs/common';
import { ObservabilityModule } from '../../infrastructure/observability.module.js';
import { PersistenceModule } from '../../infrastructure/persistence.module.js';
import { IncidentsController } from './incidents.controller.js';
import { IncidentsService } from './incidents.service.js';

@Module({
  imports: [PersistenceModule, ObservabilityModule],
  controllers: [IncidentsController],
  providers: [IncidentsService],
  exports: [IncidentsService]
})
export class IncidentsModule {}
