import { Controller, Get, Header, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { Public } from '../../common/public.decorator.js';
import { DatabaseHealthService } from '../../infrastructure/persistence/database/database-health.service.js';
import { MetricsService } from '../../infrastructure/observability/metrics.service.js';
import { ProductionReadinessService } from '../../infrastructure/security/production-readiness.service.js';
@ApiTags('operations')
@Controller()
export class OperationsController {
  constructor(
    private readonly database: DatabaseHealthService,
    private readonly metrics: MetricsService,
    private readonly readiness: ProductionReadinessService
  ) {}
  @Public() @Get('health/live') live() {
    return { status: 'UP', timestamp: new Date().toISOString() };
  }
  @Public() @Get('health/ready') async ready(@Res({ passthrough: true }) reply: FastifyReply) {
    const assessment = await this.readiness.assess();
    if (assessment.decision === 'NO_GO') reply.status(503);
    return {
      status: assessment.decision === 'NO_GO' ? 'DOWN' : 'UP',
      database: await this.database.check(),
      decision: assessment.decision,
      checks: assessment.checks.filter((item) => item.blocking),
      timestamp: new Date().toISOString()
    };
  }
  @Public() @Get('metrics') @Header('content-type', 'text/plain; version=0.0.4') metricsText() {
    return this.metrics.render();
  }
}
