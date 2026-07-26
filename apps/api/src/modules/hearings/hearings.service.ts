import { Injectable } from '@nestjs/common';
import { nextGate } from '@cims/domain';
import { requireRoles } from '../../common/authorization.js';
import type { CurrentUser } from '../../common/current-user.decorator.js';
import { CoreWorkflowRepository } from '../../infrastructure/repositories/core-workflow.repository.js';
import { HearingControlRepository } from '../../infrastructure/repositories/hearing-control.repository.js';
import { NoticesRepository } from '../../infrastructure/repositories/notices.repository.js';
import { ReadinessRepository } from '../../infrastructure/repositories/readiness.repository.js';
import { VirtualSessionsRepository } from '../../infrastructure/repositories/virtual-sessions.repository.js';

@Injectable()
export class HearingsService {
  constructor(
    private readonly core: CoreWorkflowRepository,
    private readonly notices: NoticesRepository,
    private readonly readiness: ReadinessRepository,
    private readonly virtualSessions: VirtualSessionsRepository,
    private readonly hearingControl: HearingControlRepository
  ) {}

  list(user: CurrentUser) {
    return this.core.listHearings(user);
  }

  get(id: string, user: CurrentUser) {
    return this.core.getHearing(id, user);
  }

  async getAgenda(id: string, user: CurrentUser) {
    await this.core.getHearing(id, user);
    return this.core.getAgendaItems(id, user);
  }

  async saveAgenda(
    id: string,
    items: Array<{ itemType: string; itemDescription: string; estimatedDurationMinutes?: number }>,
    user: CurrentUser
  ) {
    requireRoles(user, ['COURT_CLERK', 'JUDGE']);
    await this.core.getHearing(id, user);
    return this.core.saveAgendaItems(id, items, user);
  }

  async gate(id: string, user: CurrentUser) {
    await this.get(id, user);
    const [
      hearingData,
      determination,
      activeSchedule,
      notice,
      readiness,
      virtualSession,
      hearingEnded
    ] = await Promise.all([
      this.core.hasActiveIntake(id, user),
      this.core.hasApprovedDetermination(id, user),
      this.core.activeSchedule(id, user),
      this.notices.gate(id, user),
      this.readiness.gate(id, user),
      this.virtualSessions.isReady(id, user),
      this.hearingControl.ended(id, user)
    ]);
    const schedule = Boolean(activeSchedule);
    return {
      hearing_id: id,
      hearing_data: hearingData,
      determination,
      schedule,
      notice,
      readiness,
      virtual_session: virtualSession,
      hearing_ended: hearingEnded,
      next_gate: nextGate({
        hearingData,
        determination,
        schedule,
        notice: notice.ready,
        readiness: readiness.ready,
        virtualSession,
        hearingEnded
      })
    };
  }
}
