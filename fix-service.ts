import fs from 'fs';

let contentNotices = fs.readFileSync(
  'apps/api/src/infrastructure/persistence/repositories/notices.repository.ts',
  'utf8'
);

const noticeGateOld = `
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

const noticeGateNew = `
  async gate(hearingId: string, user: CurrentUser): Promise<NoticeGateResult> {
    const notices = await this.list(hearingId, user);
    const schedule = await this.core.activeSchedule(hearingId, user);
    
    // Return empty state if schedule is not available yet rather than throwing 409
    if (!schedule) {
      return {
        noticeCount: 0,
        requiredAcknowledgmentCount: 0,
        acknowledgedCount: 0,
        ready: false
      };
    }
    
    return evaluateNoticeGate({
      scheduleStartAt: schedule.startAt,
      notices,
      recipients: notices.flatMap((notice) => notice.recipients)
    });
  }
`;

contentNotices = contentNotices.replace(noticeGateOld, noticeGateNew);
fs.writeFileSync(
  'apps/api/src/infrastructure/persistence/repositories/notices.repository.ts',
  contentNotices
);

let contentReadiness = fs.readFileSync(
  'apps/api/src/infrastructure/persistence/repositories/readiness.repository.ts',
  'utf8'
);

const readinessGateOld = `
  async gate(hearingId: string, user: CurrentUser): Promise<ReadinessGateResult> {
    const requiredOrganizationTypes = await this.core.requiredOrganizationTypes(hearingId, user);
    const submissions = await this.list(hearingId, user);
    const schedule = await this.core.activeSchedule(hearingId, user);
    if (!schedule) throw new DomainError('SCHEDULE_REQUIRED', 'Schedule is missing.');
    return evaluateReadinessGate({ 
      scheduleStartAt: schedule.startAt,
      requiredOrganizationTypes, 
      submissions 
    });
  }
`;

const readinessGateNew = `
  async gate(hearingId: string, user: CurrentUser): Promise<ReadinessGateResult> {
    const requiredOrganizationTypes = await this.core.requiredOrganizationTypes(hearingId, user);
    const submissions = await this.list(hearingId, user);
    const schedule = await this.core.activeSchedule(hearingId, user);
    
    // Return empty state if schedule is not available yet rather than throwing 409
    if (!schedule) {
      return {
        requiredOrganizationTypes,
        organizations: requiredOrganizationTypes.map(org => ({
          organizationType: org,
          status: 'MISSING'
        })),
        ready: false
      };
    }
    
    return evaluateReadinessGate({ 
      scheduleStartAt: schedule.startAt,
      requiredOrganizationTypes, 
      submissions 
    });
  }
`;

contentReadiness = contentReadiness.replace(readinessGateOld, readinessGateNew);
fs.writeFileSync(
  'apps/api/src/infrastructure/persistence/repositories/readiness.repository.ts',
  contentReadiness
);
