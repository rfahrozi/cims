import { Module } from '@nestjs/common';
import { InfrastructureModule } from '../../infrastructure/infrastructure.module.js';
import { AdminConfigController } from './admin-config.controller.js';
import { AdminConfigService } from './admin-config.service.js';

@Module({
  imports: [InfrastructureModule],
  controllers: [AdminConfigController],
  providers: [AdminConfigService]
})
export class AdminConfigModule {}
