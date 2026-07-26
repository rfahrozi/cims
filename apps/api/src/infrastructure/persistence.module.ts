import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseHealthService } from './persistence/database/database-health.service.js';
import { IdempotencyService } from './persistence/database/idempotency.service.js';
import { OutboxService } from './persistence/database/outbox.service.js';
import { PersistenceModeService } from './persistence/database/persistence-mode.service.js';
import { PgPoolService } from './persistence/database/pg-pool.service.js';
import { CoreWorkflowRepository } from './persistence/repositories/core-workflow.repository.js';
import { GovernanceRepository } from './persistence/repositories/governance.repository.js';
import { HearingControlRepository } from './persistence/repositories/hearing-control.repository.js';
import { HearingIntakeRepository } from './persistence/repositories/hearing-intake.repository.js';
import { IncidentsRepository } from './persistence/repositories/incidents.repository.js';
import { NoticesRepository } from './persistence/repositories/notices.repository.js';
import { ParticipantsRepository } from './persistence/repositories/participants.repository.js';
import { ReadinessRepository } from './persistence/repositories/readiness.repository.js';
import { ReconciliationRepository } from './persistence/repositories/reconciliation.repository.js';
import { VirtualSessionsRepository } from './persistence/repositories/virtual-sessions.repository.js';

const providers = [
  PersistenceModeService,
  PgPoolService,
  DatabaseHealthService,
  IdempotencyService,
  OutboxService,
  CoreWorkflowRepository,
  GovernanceRepository,
  HearingControlRepository,
  HearingIntakeRepository,
  IncidentsRepository,
  NoticesRepository,
  ParticipantsRepository,
  ReadinessRepository,
  ReconciliationRepository,
  VirtualSessionsRepository
];

@Module({
  imports: [ConfigModule],
  providers,
  exports: [
    DatabaseHealthService,
    PersistenceModeService,
    PgPoolService,
    OutboxService,
    IdempotencyService,
    CoreWorkflowRepository,
    GovernanceRepository,
    HearingControlRepository,
    HearingIntakeRepository,
    IncidentsRepository,
    NoticesRepository,
    ParticipantsRepository,
    ReadinessRepository,
    ReconciliationRepository,
    VirtualSessionsRepository
  ]
})
export class PersistenceModule {}