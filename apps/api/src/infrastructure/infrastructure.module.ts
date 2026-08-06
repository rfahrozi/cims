import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module.js';
import { IntegrationModule } from './integration.module.js';
import { ObservabilityModule } from './observability.module.js';
import { PersistenceModule } from './persistence.module.js';
import { SecurityModule } from './security.module.js';
import { WorkflowSupportModule } from './workflow-support.module.js';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    AppConfigModule,
    PersistenceModule,
    IntegrationModule,
    ObservabilityModule,
    SecurityModule,
    WorkflowSupportModule
  ],
  exports: [
    AppConfigModule,
    PersistenceModule,
    IntegrationModule,
    ObservabilityModule,
    SecurityModule,
    WorkflowSupportModule
  ]
})
export class InfrastructureModule {}
