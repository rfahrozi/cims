import fs from 'fs';

let content = fs.readFileSync(
  'apps/api/src/infrastructure/persistence/repositories/readiness.repository.ts',
  'utf8'
);

const gateOld = `
  async gate(hearingId: string, user: CurrentUser): Promise<ReadinessGateResult> {
    const requiredOrganizationTypes = await this.core.requiredOrganizationTypes(hearingId, user);
    const submissions = await this.list(hearingId, user);
    return evaluateReadinessGate({ requiredOrganizationTypes, submissions });
  }
`;
const gateNew = `
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

content = content.replace(gateOld, gateNew);

fs.writeFileSync(
  'apps/api/src/infrastructure/persistence/repositories/readiness.repository.ts',
  content
);
