import { Module } from '@nestjs/common';
import { ObservabilityModule } from '../../infrastructure/observability.module.js';
import { PersistenceModule } from '../../infrastructure/persistence.module.js';
import { SecurityModule } from '../../infrastructure/security.module.js';
import { GovernanceController } from './governance.controller.js';
import { GovernanceService } from './governance.service.js';

@Module({
  imports: [PersistenceModule, ObservabilityModule, SecurityModule],
  controllers: [GovernanceController],
  providers: [GovernanceService]
})
export class GovernanceModule {}
