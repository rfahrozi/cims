import { Controller, Get, HttpCode, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { Public } from '../../common/public.decorator.js';
import { DatabaseHealthService } from '../../infrastructure/persistence/database/database-health.service.js';
import { PersistenceModeService } from '../../infrastructure/persistence/database/persistence-mode.service.js';
import { CircuitBreakerService } from '../../infrastructure/integration/circuit-breaker.service.js';
import { NotificationGateway } from '../../infrastructure/integration/notification.gateway.js';
import { OfficialSystemGateway } from '../../infrastructure/integration/official-system.gateway.js';
import { VideoProviderGateway } from '../../infrastructure/integration/video-provider.gateway.js';

const VERSION = '0.19.0';
const SERVICE = 'cims-api';

@Controller()
export class HealthController {
  constructor(
    private readonly database: DatabaseHealthService,
    private readonly persistence: PersistenceModeService,
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly notification: NotificationGateway,
    private readonly officialSystem: OfficialSystemGateway,
    private readonly videoProvider: VideoProviderGateway
  ) {}

  /**
   * GET /health
   * Liveness probe sederhana — selalu OK selama proses berjalan.
   * Digunakan oleh HEALTHCHECK Dockerfile dan load balancer basic check.
   */
  @Public()
  @Get('health')
  @HttpCode(200)
  health() {
    return {
      status: 'HEALTHY',
      service: SERVICE,
      version: VERSION,
      stack: 'NestJS + Fastify + TypeScript',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * GET /health/live
   * Kubernetes/Docker liveness probe — proses masih hidup dan merespons.
   * Tidak memeriksa dependency eksternal.
   * HTTP 200 = hidup, HTTP 503 = proses bermasalah (jarang terjadi).
   */
  @Public()
  @Get('live')
  @HttpCode(200)
  live() {
    return {
      status: 'UP',
      service: SERVICE,
      version: VERSION,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * GET /health/ready
   * Kubernetes/Docker readiness probe — apakah API siap melayani traffic.
   * Memeriksa: database, persistence mode, circuit breaker state.
   * HTTP 200 = siap, HTTP 503 = belum siap (dependency bermasalah).
   */
  @Public()
  @Get('ready')
  async ready(@Res({ passthrough: true }) reply: FastifyReply) {
    const checks: Array<{
      name: string;
      status: 'UP' | 'DOWN' | 'DEGRADED' | 'SKIPPED';
      detail?: string;
    }> = [];
    let allReady = true;

    // ── Database ──────────────────────────────────────────────────────────
    try {
      const db = await this.database.check();
      const up = db.status === 'UP' || db.status === 'SKIPPED';
      checks.push({
        name: 'database',
        status: db.status === 'UP' ? 'UP' : db.status === 'SKIPPED' ? 'SKIPPED' : 'DOWN',
        detail:
          db.status === 'UP'
            ? `PostgreSQL connected — ${db.databaseTime ?? ''}`
            : `Persistence mode: ${db.mode}`
      });
      if (!up) allReady = false;
    } catch (error) {
      checks.push({
        name: 'database',
        status: 'DOWN',
        detail: error instanceof Error ? error.message : String(error)
      });
      allReady = false;
    }

    // ── Persistence mode ──────────────────────────────────────────────────
    checks.push({
      name: 'persistence_mode',
      status: 'UP',
      detail: `Mode: ${this.persistence.mode}`
    });

    // ── Circuit breakers ──────────────────────────────────────────────────
    const circuits = this.circuitBreaker.snapshot();
    const openCircuits = Object.entries(circuits).filter(([, v]) => v.state === 'OPEN');
    checks.push({
      name: 'circuit_breakers',
      status: openCircuits.length === 0 ? 'UP' : 'DEGRADED',
      detail:
        openCircuits.length === 0
          ? `All ${Object.keys(circuits).length} circuits CLOSED`
          : `Open: ${openCircuits.map(([k]) => k).join(', ')}`
    });
    // Circuit breaker OPEN = degraded, bukan down — masih bisa melayani request lain
    // Tidak menandai allReady = false karena sistem tetap bisa berjalan

    // ── Gateway modes (informatif, bukan blocking) ────────────────────────
    const notif = this.notification.capability();
    checks.push({
      name: 'notification_gateway',
      status: notif.configured ? 'UP' : 'DEGRADED',
      detail: `Mode: ${notif.mode}${notif.mode === 'MOCK' ? ' (mock — tidak mengirim notifikasi nyata)' : ''}`
    });

    const official = this.officialSystem.capability();
    checks.push({
      name: 'official_system_gateway',
      status: official.configured ? 'UP' : 'DEGRADED',
      detail: `Mode: ${official.mode}`
    });

    const video = this.videoProvider.capability();
    checks.push({
      name: 'video_provider',
      status: video.configured ? 'UP' : 'DEGRADED',
      detail: `Mode: ${video.mode}`
    });

    const overallStatus = allReady ? 'READY' : 'NOT_READY';
    reply.status(allReady ? 200 : 503);

    return {
      status: overallStatus,
      service: SERVICE,
      version: VERSION,
      timestamp: new Date().toISOString(),
      checks
    };
  }
}
