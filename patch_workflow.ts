import fs from 'fs';

let content = fs.readFileSync('packages/domain/src/workflow.ts', 'utf8');

const evaluateNoticeOld = `
export function evaluateNoticeGate(input: NoticeGateInput): NoticeGateResult {
  const activeNoticeIds = new Set(
    input.notices.filter((item) => item.status !== 'CANCELLED').map((item) => item.id)
  );
  const required = input.recipients.filter(
    (item) => activeNoticeIds.has(item.noticeId) && item.requiredAck
  );
  const acknowledged = required.filter((item) => item.status === 'ACKNOWLEDGED');
  return {
    noticeCount: activeNoticeIds.size,
    requiredAcknowledgmentCount: required.length,
    acknowledgedCount: acknowledged.length,
    ready:
      activeNoticeIds.size > 0 && required.length > 0 && acknowledged.length === required.length
  };
}
`;

const evaluateNoticeNew = `
export function evaluateNoticeGate(input: NoticeGateInput): NoticeGateResult {
  const activeNoticeIds = new Set(
    input.notices.filter((item) => item.status !== 'CANCELLED').map((item) => item.id)
  );
  const required = input.recipients.filter(
    (item) => activeNoticeIds.has(item.noticeId) && item.requiredAck
  );
  const acknowledged = required.filter((item) => item.status === 'ACKNOWLEDGED');
  
  // H-3 Validation untuk Kejaksaan -> Rutan
  const scheduleStart = new Date(input.scheduleStartAt).getTime();
  let rutanNoticeOnTime = true;
  
  for (const r of input.recipients) {
    if (r.organizationType === 'CORRECTIONS' && r.deliveredAt) {
      const deliveredTime = new Date(r.deliveredAt).getTime();
      const daysDifference = (scheduleStart - deliveredTime) / (1000 * 60 * 60 * 24);
      if (daysDifference < 3) {
        rutanNoticeOnTime = false;
        break;
      }
    }
  }

  return {
    noticeCount: activeNoticeIds.size,
    requiredAcknowledgmentCount: required.length,
    acknowledgedCount: acknowledged.length,
    ready:
      activeNoticeIds.size > 0 && 
      required.length > 0 && 
      acknowledged.length === required.length &&
      rutanNoticeOnTime
  };
}
`;

content = content.replace(evaluateNoticeOld, evaluateNoticeNew);

const evaluateReadinessOld = `
export function evaluateReadinessGate(input: ReadinessGateInput): ReadinessGateResult {
  const latestByType = new Map<
    string,
    {
      organizationType: ReadinessGateInput['submissions'][number]['organizationType'];
      version: number;
      status: ReadinessGateInput['submissions'][number]['status'];
    }
  >();
  for (const submission of input.submissions) {
    const current = latestByType.get(submission.organizationType);
    if (!current || submission.version > current.version)
      latestByType.set(submission.organizationType, submission);
  }
  const organizations = input.requiredOrganizationTypes.map((organizationType) => {
    const submission = latestByType.get(organizationType);
    return submission
      ? { organizationType, status: submission.status, version: submission.version }
      : { organizationType, status: 'MISSING' as const };
  });
  return {
    requiredOrganizationTypes: input.requiredOrganizationTypes,
    organizations,
    ready:
      organizations.length === input.requiredOrganizationTypes.length &&
      organizations.every((item) => item.status === 'READY')
  };
}
`;

const evaluateReadinessNew = `
export function evaluateReadinessGate(input: ReadinessGateInput): ReadinessGateResult {
  const latestByType = new Map<
    string,
    {
      organizationType: ReadinessGateInput['submissions'][number]['organizationType'];
      version: number;
      status: ReadinessGateInput['submissions'][number]['status'] | 'AUTO_FORCED';
    }
  >();
  
  for (const submission of input.submissions) {
    const current = latestByType.get(submission.organizationType);
    if (!current || submission.version > current.version)
      latestByType.set(submission.organizationType, submission);
  }
  
  const scheduleStart = new Date(input.scheduleStartAt).getTime();
  const now = new Date().getTime();
  const hoursUntilHearing = (scheduleStart - now) / (1000 * 60 * 60);
  const isEmergencyForced = hoursUntilHearing <= 2 && hoursUntilHearing > -24; // Force jika < 2 jam
  
  const organizations = input.requiredOrganizationTypes.map((organizationType) => {
    const submission = latestByType.get(organizationType);
    
    if (submission && submission.status === 'READY') {
      return { organizationType, status: 'READY' as const, version: submission.version };
    }
    
    if (isEmergencyForced) {
      return { 
        organizationType, 
        status: 'AUTO_FORCED' as const, 
        warningMessage: 'Validasi kesiapan dipaksa (auto-forced) oleh sistem karena waktu persidangan < 2 jam'
      };
    }
    
    return submission
      ? { organizationType, status: submission.status, version: submission.version }
      : { organizationType, status: 'MISSING' as const };
  });
  
  return {
    requiredOrganizationTypes: input.requiredOrganizationTypes,
    organizations,
    ready:
      organizations.length === input.requiredOrganizationTypes.length &&
      organizations.every((item) => item.status === 'READY' || item.status === 'AUTO_FORCED')
  };
}
`;

content = content.replace(evaluateReadinessOld, evaluateReadinessNew);

fs.writeFileSync('packages/domain/src/workflow.ts', content);
