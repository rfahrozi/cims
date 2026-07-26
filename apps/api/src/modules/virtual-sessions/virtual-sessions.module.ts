import { Module } from '@nestjs/common';
import { IntegrationModule } from '../../infrastructure/integration.module.js';
import { ObservabilityModule } from '../../infrastructure/observability.module.js';
import { PersistenceModule } from '../../infrastructure/persistence.module.js';
import { HearingsModule } from '../hearings/hearings.module.js';
import { NoticesModule } from '../notices/notices.module.js';
import { ReadinessModule } from '../readiness/readiness.module.js';
import { VirtualSessionsController } from './virtual-sessions.controller.js';
import { VirtualSessionsService } from './virtual-sessions.service.js';

@Module({
  imports: [PersistenceModule, ObservabilityModule, IntegrationModule, HearingsModule, NoticesModule, ReadinessModule],
  controllers: [VirtualSessionsController],
  providers: [VirtualSessionsService],
  exports: [VirtualSessionsService]
})
export class VirtualSessionsModule {}
