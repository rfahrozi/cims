import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProductionConfigValidator } from './config/production-config-validator.service.js';
import { FieldCryptoService } from './field-crypto.service.js';
import { HearingAccessService } from './hearing-access.service.js';
import { ProductionReadinessService } from './production-readiness.service.js';

const providers = [
  ProductionConfigValidator,
  FieldCryptoService,
  HearingAccessService,
  ProductionReadinessService
];

@Module({
  imports: [ConfigModule],
  providers,
  exports: providers
})
export class SecurityModule {}