import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PersistenceModule } from './persistence.module.js';
import { WorkflowSupportModule } from './workflow-support.module.js';
import { ProductionConfigValidator } from './config/production-config-validator.service.js';
import { FieldCryptoService } from './security/field-crypto.service.js';
import { HearingAccessService } from './security/hearing-access.service.js';
import { ProductionReadinessService } from './security/production-readiness.service.js';

const providers = [
  ProductionConfigValidator,
  FieldCryptoService,
  HearingAccessService,
  ProductionReadinessService
];

@Global()
@Module({
  imports: [ConfigModule],
  providers,
  exports: [FieldCryptoService, HearingAccessService, ProductionReadinessService]
})
export class SecurityModule {}
