import { Controller, ForbiddenException, Get, Header, Headers, Res } from '@nestjs/common';
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

  @Public()
  @Get('health/live')
  live() {
    return { status: 'UP', timestamp: new Date().toISOString() };
  }

  @Public()
  @Get('health/ready')
  async ready(@Res({ passthrough: true }) reply: FastifyReply) {
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

  /**
   * Prometheus metrics endpoint — M-10 DLP hardening.
   * Dilindungi oleh shared secret (METRICS_BEARER_TOKEN) untuk mencegah information disclosure.
   * Di produksi, akses via Prometheus internal network saja — tidak boleh publik.
   *
   * Jika METRICS_BEARER_TOKEN tidak dikonfigurasi (dev mode), endpoint tetap terbuka
   * tapi mencatat peringatan. Di produksi, token wajib ada.
   */
  @Public() // Auth guard global di-bypass, tapi kita validasi manual di sini
  @Get('metrics')
  @Header('content-type', 'text/plain; version=0.0.4')
  @Header('cache-control', 'no-store')
  metricsText(@Headers('authorization') authHeader?: string) {
    const token = process.env['METRICS_BEARER_TOKEN']?.trim();
    const nodeEnv = process.env['NODE_ENV'] ?? 'development';

    if (token) {
      // Token dikonfigurasi — validasi wajib
      const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
      if (!bearer || bearer !== token) {
        throw new ForbiddenException('Valid bearer token required for metrics access.');
      }
    } else if (nodeEnv === 'production') {
      // Produksi tanpa token = blokir
      throw new ForbiddenException(
        'METRICS_BEARER_TOKEN is not configured. Metrics endpoint is disabled in production without a token.'
      );
    }
    // Dev/preproduction tanpa token: boleh akses (warning sudah di log saat boot)

    return this.metrics.render();
  }
}
