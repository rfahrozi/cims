import { Global, Module } from '@nestjs/common';
import { IntegrationModule } from './integration.module.js';
import { ObservabilityModule } from './observability.module.js';
import { PersistenceModule } from './persistence.module.js';
import { SecurityModule } from './security.module.js';
import { WorkflowSupportModule } from './workflow-support.module.js';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
  imports: [
    ConfigModule,
    PersistenceModule,
    IntegrationModule,
    ObservabilityModule,
    SecurityModule,
    WorkflowSupportModule
  ],
  exports: [
    PersistenceModule,
    IntegrationModule,
    ObservabilityModule,
    SecurityModule,
    WorkflowSupportModule
  ]
})
export class InfrastructureModule {}