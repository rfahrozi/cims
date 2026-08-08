import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuditService } from './observability/audit.service.js';
import { MetricsService } from './observability/metrics.service.js';
import { StructuredLogger } from './observability/structured-logger.service.js';
import { MetricsInterceptor } from './observability/metrics.interceptor.js';

const providers = [AuditService, MetricsService, StructuredLogger, MetricsInterceptor];

@Global()
@Module({
  imports: [ConfigModule],
  providers,
  exports: providers
})
export class ObservabilityModule {}
