import { Module } from '@nestjs/common';
import { HearingsModule } from '../hearings/hearings.module.js';
import { NoticesController } from './notices.controller.js';
import { NoticesService } from './notices.service.js';

@Module({
  imports: [HearingsModule],
  controllers: [NoticesController],
  providers: [NoticesService],
  exports: [NoticesService]
})
export class NoticesModule {}
