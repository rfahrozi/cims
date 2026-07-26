import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUserContext, type CurrentUser } from '../../common/current-user.decorator.js';
import { SensitiveRateGuard, SensitiveEndpoint } from '../../common/sensitive-rate.guard.js';
import { OutboxService } from '../../infrastructure/persistence/database/outbox.service.js';
import { PersistenceModeService } from '../../infrastructure/persistence/database/persistence-mode.service.js';
import { HearingsService } from '../hearings/hearings.service.js';

@ApiTags('compliance')
@Controller('compliance-dashboard')
export class ComplianceController {
  constructor(
    private readonly hearings: HearingsService,
    private readonly persistence: PersistenceModeService,
    private readonly outbox: OutboxService
  ) {}

  /**
   * M-10 DLP: Compliance dashboard mengekspos data agregat semua perkara.
   * Dibatasi 15 request/menit per IP untuk mencegah scraping massal.
   */
  @Get()
  @UseGuards(SensitiveRateGuard)
  @SensitiveEndpoint({ maxPerMinute: 15, label: 'compliance-dashboard' })
  async data(@CurrentUserContext() user: CurrentUser) {
    const hearings = await this.hearings.list(user);
    return {
      release: '0.20.0',
      persistence_mode: this.persistence.mode,
      hearings: await Promise.all(
        hearings.map(async (item) => ({
          id: item.id,
          case_number: item.caseNumber,
          state: item.state,
          gate: await this.hearings.gate(item.id, user)
        }))
      ),
      outbox: this.persistence.postgres
        ? await this.outbox.status()
        : { mode: 'MEMORY', pending: 0 },
      migration: {
        backend: 'NESTJS_TYPESCRIPT',
        frontend: 'REACT_SHADCN',
        postgres_native_modules: [
          'hearings',
          'determinations',
          'scheduling',
          'official_notice',
          'acknowledgment',
          'readiness',
          'identity_verification',
          'room_inspection',
          'virtual_session',
          'hearing_control',
          'audit',
          'participants',
          'attendance',
          'incidents'
        ],
        transactional_outbox: this.persistence.postgres,
        legacy_proxy: process.env.ENABLE_LEGACY_PROXY === 'true'
      }
    };
  }
}
