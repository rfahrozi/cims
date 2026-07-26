import { Module } from '@nestjs/common';
import { HearingsModule } from '../hearings/hearings.module.js';
import { NoticesModule } from '../notices/notices.module.js';
import { ReadinessModule } from '../readiness/readiness.module.js';
import { VirtualSessionsController } from './virtual-sessions.controller.js';
import { VirtualSessionsService } from './virtual-sessions.service.js';

@Module({
  imports: [HearingsModule, NoticesModule, ReadinessModule],
  controllers: [VirtualSessionsController],
  providers: [VirtualSessionsService],
  exports: [VirtualSessionsService]
})
export class VirtualSessionsModule {}
