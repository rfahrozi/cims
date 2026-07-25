import { Module } from '@nestjs/common';
import { InfrastructureModule } from '../../infrastructure/infrastructure.module.js';
import { LiaisonController } from './liaison.controller.js';
import { LiaisonService } from './liaison.service.js';

@Module({
  imports: [InfrastructureModule],
  controllers: [LiaisonController],
  providers: [LiaisonService],
  exports: [LiaisonService],
})
export class LiaisonModule {}
