import { Module } from '@nestjs/common';
import { ObservabilityModule } from '../../infrastructure/observability.module.js';
import { PersistenceModule } from '../../infrastructure/persistence.module.js';
import { ParticipantsController } from './participants.controller.js';
import { ParticipantsService } from './participants.service.js';
@Module({
  imports: [PersistenceModule, ObservabilityModule],
  controllers: [ParticipantsController],
  providers: [ParticipantsService],
  exports: [ParticipantsService]
})
export class ParticipantsModule {}
