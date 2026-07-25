import { Module } from '@nestjs/common';
import { InfrastructureModule } from '../../infrastructure/infrastructure.module.js';
import { SchedulingController } from './scheduling.controller.js';
import { SchedulingService } from './scheduling.service.js';

@Module({
  imports: [InfrastructureModule],
  controllers: [SchedulingController],
  providers: [SchedulingService],
  exports: [SchedulingService],
})
export class SchedulingModule {}
