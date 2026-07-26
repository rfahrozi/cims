import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { productionGateDecision, type ReadinessCheck } from '@cims/domain';
import type { CurrentUser } from '../common/current-user.decorator.js';
import { DatabaseHealthService } from './database/database-health.service.js';
import { OutboxService } from './database/outbox.service.js';
import { PersistenceModeService } from './database/persistence-mode.service.js';
import { NotificationGateway } from './notification.gateway.js';
import { OfficialSystemGateway } from './official-system.gateway.js';
import { VideoProviderGateway } from './video-provider.gateway.js';
import { EvidenceStorageGateway } from './evidence-storage.gateway.js';
import { CircuitBreakerService } from './circuit-breaker.service.js';
import { GovernanceRepository } from './repositories/governance.repository.js';

@Injectable()
export class ProductionReadinessService {
  constructor(
    private readonly config: ConfigService,
    private readonly persistence: PersistenceModeService,
    private readonly database: DatabaseHealthService,
    private readonly outbox: OutboxService,
    private readonly notification: NotificationGateway,
    private readonly officialSystem: OfficialSystemGateway,
    private readonly videoProvider: VideoProviderGateway,
    private readonly evidenceStorage: EvidenceStorageGateway,
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly governance: GovernanceRepository
  ) {}

  async assess(
    user?: CurrentUser,
    correlationId?: string
  ): Promise<{
    release: string;
    environment: string;
    decision: 'GO' | 'CONDITIONAL_GO' | 'NO_GO';
    checks: ReadinessCheck[];
    dependencies: Record<string, unknown>;
    snapshot_id?: string;
    generated_at: string;
  }> {
    const production = (this.config.get<string>('NODE_ENV') ?? 'development') === 'production';
    const checks: ReadinessCheck[] = [];
    let databaseStatus: Record<string, unknown> = { status: 'UNKNOWN' };
    try {
      databaseStatus = await this.database.check();
      checks.push(
        this.check(
          'DATABASE',
          databaseStatus.status === 'UP' || !production,
          production,
          databaseStatus.status === 'UP' ? 'PostgreSQL is reachable.' : 'PostgreSQL is not active.'
        )
      );
    } catch (error) {
      checks.push({
        code: 'DATABASE',
        status: 'FAIL',
        blocking: true,
        message: error instanceof Error ? error.message : String(error)
      });
    }
    checks.push(
      this.check(
        'PERSISTENCE_MODE',
        this.persistence.postgres || !production,
        production,
        `Persistence mode is ${this.persistence.mode}.`
      )
    );
    checks.push(
      this.check(
        'AUTH_MODE',
        (this.config.get<string>('AUTH_MODE') ?? 'DEV').toUpperCase() === 'OIDC' || !production,
        production,
        `Authentication mode is ${(this.config.get<string>('AUTH_MODE') ?? 'DEV').toUpperCase()}.`
      )
    );
    checks.push(
      this.check(
        'DATABASE_TLS',
        this.config.get<string>('DB_SSL') === 'true' || !production,
        production,
        'Database TLS must be enabled in production.'
      )
    );
    checks.push(
      this.check(
        'LEGACY_PROXY',
        this.config.get<string>('ENABLE_LEGACY_PROXY') !== 'true',
        true,
        'Legacy proxy must remain disabled in production.'
      )
    );
    checks.push(
      this.check(
        'SWAGGER',
        this.config.get<string>('SWAGGER_ENABLED') === 'false' || !production,
        false,
        'Swagger should be disabled on the public production endpoint.'
      )
    );
    checks.push(
      this.check(
        'HEARING_IMPORT',
        this.config.get<string>('HEARING_IMPORT_ENABLED') !== 'true',
        false,
        'Future database import remains disabled until its own approval gate.'
      )
    );
    checks.push(
      this.check(
        'RETENTION_EXECUTION',
        this.config.get<string>('RETENTION_EXECUTION_ENABLED') !== 'true',
        true,
        'Automated retention disposition must remain disabled until a legally approved policy exists.'
      )
    );
    checks.push(
      this.check(
        'PACKAGE_LOCK',
        existsSync(path.join(process.cwd(), 'package-lock.json')) || !production,
        production,
        'An approved package-lock.json is required for deterministic production builds.'
      )
    );

    const notification = this.notification.capability();
    const official = this.officialSystem.capability();
    const video = this.videoProvider.capability();
    const evidence = this.evidenceStorage.capability();
    checks.push(
      this.check(
        'NOTIFICATION_GATEWAY',
        (notification.mode === 'HTTP' && notification.configured) || !production,
        production,
        `Notification gateway mode is ${notification.mode}.`
      )
    );
    checks.push(
      this.check(
        'VIDEO_PROVIDER',
        (video.mode === 'HTTP' && video.configured) || !production,
        production,
        `Video provider mode is ${video.mode}.`
      )
    );
    checks.push(
      this.check(
        'EVIDENCE_STORAGE',
        (evidence.mode === 'HTTP' && evidence.configured) || !production,
        production,
        `Evidence storage mode is ${evidence.mode}.`
      )
    );
    checks.push(
      this.check(
        'OFFICIAL_SYSTEM_GATEWAY',
        (official.mode === 'HTTP' && official.configured) || !production,
        false,
        `Official-system gateway mode is ${official.mode}.`
      )
    );

    let outboxStatus: Record<string, number> = {};
    if (this.persistence.postgres) {
      try {
        outboxStatus = await this.outbox.status();
        checks.push(
          this.check(
            'OUTBOX_DEAD_LETTER',
            Number(outboxStatus.DEAD_LETTER ?? 0) === 0,
            false,
            `${Number(outboxStatus.DEAD_LETTER ?? 0)} dead-letter event(s).`
          )
        );
      } catch (error) {
        checks.push({
          code: 'OUTBOX',
          status: production ? 'FAIL' : 'WARNING',
          blocking: production,
          message: error instanceof Error ? error.message : String(error)
        });
      }
    }

    const decision = productionGateDecision(checks);
    let snapshotId: string | undefined;
    if (user?.roles.includes('SYSTEM_ADMIN'))
      snapshotId = await this.governance.recordReadinessSnapshot(
        '0.19.0',
        decision,
        checks,
        user,
        correlationId
      );
    return {
      release: '0.19.0',
      environment: this.config.get<string>('NODE_ENV') ?? 'development',
      decision,
      checks,
      dependencies: {
        database: databaseStatus,
        notification,
        official_system: official,
        video_provider: video,
        evidence_storage: evidence,
        outbox: outboxStatus,
        circuits: this.circuitBreaker.snapshot()
      },
      snapshot_id: snapshotId,
      generated_at: new Date().toISOString()
    };
  }

  private check(code: string, pass: boolean, blocking: boolean, message: string): ReadinessCheck {
    return { code, status: pass ? 'PASS' : blocking ? 'FAIL' : 'WARNING', blocking, message };
  }
}
