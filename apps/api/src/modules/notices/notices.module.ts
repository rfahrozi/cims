import { Module } from '@nestjs/common';
import { ObservabilityModule } from '../../infrastructure/observability.module.js';
import { PersistenceModule } from '../../infrastructure/persistence.module.js';
import { HearingsModule } from '../hearings/hearings.module.js';
import { NoticesController } from './notices.controller.js';
import { NoticesService } from './notices.service.js';

@Module({
  imports: [PersistenceModule, ObservabilityModule, HearingsModule],
  controllers: [NoticesController],
  providers: [NoticesService],
  exports: [NoticesService]
})
export class NoticesModule {}
