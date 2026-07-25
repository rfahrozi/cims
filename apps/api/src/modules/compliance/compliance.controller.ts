import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUserContext, type CurrentUser } from '../../common/current-user.decorator.js';
import { OutboxService } from '../../infrastructure/database/outbox.service.js';
import { PersistenceModeService } from '../../infrastructure/database/persistence-mode.service.js';
import { HearingsService } from '../hearings/hearings.service.js';

@ApiTags('compliance')
@Controller('compliance-dashboard')
export class ComplianceController {
  constructor(
    private readonly hearings: HearingsService,
    private readonly persistence: PersistenceModeService,
    private readonly outbox: OutboxService,
  ) {}

  @Get()
  async data(@CurrentUserContext() user: CurrentUser) {
    const hearings = await this.hearings.list(user);
    return {
      release: '0.19.0',
      persistence_mode: this.persistence.mode,
      hearings: await Promise.all(hearings.map(async (item) => ({
        id: item.id,
        case_number: item.caseNumber,
        state: item.state,
        gate: await this.hearings.gate(item.id, user),
      }))),
      outbox: this.persistence.postgres ? await this.outbox.status() : { mode: 'MEMORY', pending: 0 },
      migration: {
        backend: 'NESTJS_TYPESCRIPT',
        frontend: 'REACT_SHADCN',
        postgres_native_modules: [
          'hearings', 'determinations', 'scheduling', 'official_notice', 'acknowledgment',
          'readiness', 'identity_verification', 'room_inspection', 'virtual_session',
          'hearing_control', 'audit', 'participants', 'attendance', 'incidents',
        ],
        transactional_outbox: this.persistence.postgres,
        legacy_proxy: process.env.ENABLE_LEGACY_PROXY === 'true',
      },
    };
  }
}
