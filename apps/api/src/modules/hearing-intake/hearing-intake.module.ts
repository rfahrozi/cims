import { Module } from '@nestjs/common';
import { ObservabilityModule } from '../../infrastructure/observability.module.js';
import { PersistenceModule } from '../../infrastructure/persistence.module.js';
import { DisabledHearingImportGateway, HearingImportGateway } from './hearing-import.gateway.js';
import { HearingIntakeController } from './hearing-intake.controller.js';
import { HearingIntakeService } from './hearing-intake.service.js';

@Module({
  imports: [PersistenceModule, ObservabilityModule],
  controllers: [HearingIntakeController],
  providers: [
    HearingIntakeService,
    DisabledHearingImportGateway,
    { provide: HearingImportGateway, useExisting: DisabledHearingImportGateway }
  ],
  exports: [HearingIntakeService]
})
export class HearingIntakeModule {}
