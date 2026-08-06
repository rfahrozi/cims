import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PersistenceModule } from './persistence.module.js';
import { WorkflowSupportModule } from './workflow-support.module.js';
import { FieldCryptoService } from './security/field-crypto.service.js';
import { HearingAccessService } from './security/hearing-access.service.js';
import { ProductionReadinessService } from './security/production-readiness.service.js';
import { AppConfigModule } from './config/config.module.js';

const providers = [FieldCryptoService, HearingAccessService, ProductionReadinessService];

@Global()
@Module({
  imports: [ConfigModule, AppConfigModule],
  providers,
  exports: [FieldCryptoService, HearingAccessService, ProductionReadinessService]
})
export class SecurityModule {}
