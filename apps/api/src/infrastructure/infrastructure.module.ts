import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service.js';
import { InMemoryStore } from './in-memory.store.js';
import { MetricsService } from './metrics.service.js';
import { NotificationGateway } from './notification.gateway.js';
import { OfficialSystemGateway } from './official-system.gateway.js';
import { OutboxWorkerService } from './outbox-worker.service.js';
import { StructuredLogger } from './structured-logger.service.js';
import { VideoProviderGateway } from './video-provider.gateway.js';
import { DatabaseHealthService } from './database/database-health.service.js';
import { IdempotencyService } from './database/idempotency.service.js';
import { OutboxService } from './database/outbox.service.js';
import { PersistenceModeService } from './database/persistence-mode.service.js';
import { PgPoolService } from './database/pg-pool.service.js';
import { FieldCryptoService } from './field-crypto.service.js';
import { CoreWorkflowRepository } from './repositories/core-workflow.repository.js';
import { HearingControlRepository } from './repositories/hearing-control.repository.js';
import { HearingIntakeRepository } from './repositories/hearing-intake.repository.js';
import { IncidentsRepository } from './repositories/incidents.repository.js';
import { NoticesRepository } from './repositories/notices.repository.js';
import { ParticipantsRepository } from './repositories/participants.repository.js';
import { ReadinessRepository } from './repositories/readiness.repository.js';
import { ReconciliationRepository } from './repositories/reconciliation.repository.js';
import { VirtualSessionsRepository } from './repositories/virtual-sessions.repository.js';
import { ProductionConfigValidator } from './config/production-config-validator.service.js';
import { HearingAccessService } from './hearing-access.service.js';
import { GovernanceRepository } from './repositories/governance.repository.js';
import { ProductionReadinessService } from './production-readiness.service.js';
import { EvidenceStorageGateway } from './evidence-storage.gateway.js';
import { CircuitBreakerService } from './circuit-breaker.service.js';

const providers = [
  ProductionReadinessService,
  GovernanceRepository,
  EvidenceStorageGateway,
  CircuitBreakerService,
  ProductionConfigValidator,
  HearingAccessService,
  InMemoryStore,
  PersistenceModeService,
  PgPoolService,
  DatabaseHealthService,
  IdempotencyService,
  OutboxService,
  MetricsService,
  StructuredLogger,
  FieldCryptoService,
  VideoProviderGateway,
  NotificationGateway,
  OfficialSystemGateway,
  CoreWorkflowRepository,
  NoticesRepository,
  ReadinessRepository,
  ReconciliationRepository,
  VirtualSessionsRepository,
  HearingControlRepository,
  HearingIntakeRepository,
  ParticipantsRepository,
  IncidentsRepository,
  AuditService,
  OutboxWorkerService
];

@Global()
@Module({ providers, exports: providers })
export class InfrastructureModule {}
