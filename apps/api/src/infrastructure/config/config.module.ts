import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { KmsSecretService } from './kms-secret.service.js';
import { ProductionConfigValidator } from './production-config-validator.service.js';

@Global()
@Module({
  imports: [NestConfigModule],
  providers: [KmsSecretService, ProductionConfigValidator],
  exports: [KmsSecretService, ProductionConfigValidator]
})
export class AppConfigModule {}
