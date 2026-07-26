import { Module } from '@nestjs/common';
import { HearingsModule } from '../hearings/hearings.module.js';
import { NoticesModule } from '../notices/notices.module.js';
import { ReadinessController } from './readiness.controller.js';
import { ReadinessService } from './readiness.service.js';

@Module({
  imports: [HearingsModule, NoticesModule],
  controllers: [ReadinessController],
  providers: [ReadinessService],
  exports: [ReadinessService]
})
export class ReadinessModule {}
