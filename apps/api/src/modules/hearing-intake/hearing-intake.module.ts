import { Module } from '@nestjs/common';
import { HearingIntakeController } from './hearing-intake.controller.js';
import { HearingIntakeService } from './hearing-intake.service.js';
import { DisabledHearingImportGateway, HearingImportGateway } from './hearing-import.gateway.js';

@Module({
  controllers: [HearingIntakeController],
  providers: [
    HearingIntakeService,
    DisabledHearingImportGateway,
    { provide: HearingImportGateway, useExisting: DisabledHearingImportGateway }
  ],
  exports: [HearingIntakeService]
})
export class HearingIntakeModule {}
