import { Module } from '@nestjs/common';
import { InfrastructureModule } from '../../infrastructure/infrastructure.module.js';
import { CustodyController } from './custody.controller.js';
import { CustodyService } from './custody.service.js';

@Module({
  imports: [InfrastructureModule],
  controllers: [CustodyController],
  providers: [CustodyService],
  exports: [CustodyService]
})
export class CustodyModule {}
