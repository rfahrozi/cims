import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseHealthService } from './database/database-health.service.js';
import { IdempotencyService } from './database/idempotency.service.js';
import { OutboxService } from './database/outbox.service.js';
import { PersistenceModeService } from './database/persistence-mode.service.js';
import { PgPoolService } from './database/pg-pool.service.js';
import { CoreWorkflowRepository } from './repositories/core-workflow.repository.js';
import { GovernanceRepository } from './repositories/governance.repository.js';
import { HearingControlRepository } from './repositories/hearing-control.repository.js';
import { HearingIntakeRepository } from './repositories/hearing-intake.repository.js';
import { IncidentsRepository } from './repositories/incidents.repository.js';
import { NoticesRepository } from './repositories/notices.repository.js';
import { ParticipantsRepository } from './repositories/participants.repository.js';
import { ReadinessRepository } from './repositories/readiness.repository.js';
import { ReconciliationRepository } from './repositories/reconciliation.repository.js';
import { VirtualSessionsRepository } from './repositories/virtual-sessions.repository.js';

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
  exports: providers
})
export class PersistenceModule {}