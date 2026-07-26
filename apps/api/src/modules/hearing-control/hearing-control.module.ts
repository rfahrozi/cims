import { Module } from '@nestjs/common';
import { ObservabilityModule } from '../../infrastructure/observability.module.js';
import { PersistenceModule } from '../../infrastructure/persistence.module.js';
import { HearingsModule } from '../hearings/hearings.module.js';
import { HearingControlController } from './hearing-control.controller.js';
import { HearingControlService } from './hearing-control.service.js';

@Module({
  imports: [PersistenceModule, ObservabilityModule, HearingsModule],
  controllers: [HearingControlController],
  providers: [HearingControlService]
})
export class HearingControlModule {}
