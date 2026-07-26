import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuditService } from './audit.service.js';
import { MetricsService } from './metrics.service.js';
import { StructuredLogger } from './structured-logger.service.js';

const providers = [AuditService, MetricsService, StructuredLogger];

@Module({
  imports: [ConfigModule],
  providers,
  exports: providers
})
export class ObservabilityModule {}