import fs from 'fs';

let content = fs.readFileSync(
  'apps/api/src/infrastructure/persistence/repositories/notices.repository.ts',
  'utf8'
);

const importCoreOld = `
import { PersistenceModeService } from '../database/persistence-mode.service.js';
import { PgPoolService } from '../database/pg-pool.service.js';
`;
const importCoreNew = `
import { PersistenceModeService } from '../database/persistence-mode.service.js';
import { PgPoolService } from '../database/pg-pool.service.js';
import { CoreWorkflowRepository } from './core-workflow.repository.js';
`;

content = content.replace(importCoreOld, importCoreNew);

const constructorOld = `
  constructor(
    private readonly mode: PersistenceModeService,
    private readonly memory: InMemoryStore,
    private readonly pg: PgPoolService,
    private readonly outbox: OutboxService
  ) {}
`;
const constructorNew = `
  constructor(
    private readonly mode: PersistenceModeService,
    private readonly memory: InMemoryStore,
    private readonly pg: PgPoolService,
    private readonly outbox: OutboxService,
    private readonly core: CoreWorkflowRepository
  ) {}
`;

content = content.replace(constructorOld, constructorNew);

const gateOld = `
  async gate(hearingId: string, user: CurrentUser): Promise<NoticeGateResult> {
    const notices = await this.list(hearingId, user);
    return evaluateNoticeGate({
      notices,
      recipients: notices.flatMap((notice) => notice.recipients)
    });
  }
`;
const gateNew = `
  async gate(hearingId: string, user: CurrentUser): Promise<NoticeGateResult> {
    const notices = await this.list(hearingId, user);
    const schedule = await this.core.activeSchedule(hearingId, user);
    if (!schedule) throw new DomainError('SCHEDULE_REQUIRED', 'Schedule is missing.');
    return evaluateNoticeGate({
      scheduleStartAt: schedule.startAt,
      notices,
      recipients: notices.flatMap((notice) => notice.recipients)
    });
  }
`;

content = content.replace(gateOld, gateNew);

fs.writeFileSync(
  'apps/api/src/infrastructure/persistence/repositories/notices.repository.ts',
  content
);
