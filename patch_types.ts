import fs from 'fs';

let content = fs.readFileSync('packages/domain/src/types.ts', 'utf8');

const noticeInputOld = `
export interface NoticeGateInput {
  notices: Array<{ id: string; status: NoticeStatus }>;
  recipients: Array<{
    noticeId: string;
    requiredAck: boolean;
    status: NoticeRecipientStatus;
  }>;
}
`;

const noticeInputNew = `
export interface NoticeGateInput {
  scheduleStartAt: string;
  notices: Array<{ id: string; status: NoticeStatus; type?: NoticeType }>;
  recipients: Array<{
    noticeId: string;
    organizationType?: OrganizationType;
    requiredAck: boolean;
    status: NoticeRecipientStatus;
    deliveredAt?: string;
  }>;
}
`;

content = content.replace(noticeInputOld, noticeInputNew);

const readinessInputOld = `
export interface ReadinessGateInput {
  requiredOrganizationTypes: OrganizationType[];
  submissions: Array<{
    organizationType: OrganizationType;
    version: number;
    status: ReadinessStatus;
  }>;
}
`;

const readinessInputNew = `
export interface ReadinessGateInput {
  scheduleStartAt: string;
  requiredOrganizationTypes: OrganizationType[];
  submissions: Array<{
    organizationType: OrganizationType;
    version: number;
    status: ReadinessStatus;
  }>;
}
`;

content = content.replace(readinessInputOld, readinessInputNew);

const readinessResultOld = `
export interface ReadinessGateResult {
  requiredOrganizationTypes: OrganizationType[];
  organizations: Array<{
    organizationType: OrganizationType;
    status: ReadinessStatus | 'MISSING';
    version?: number;
  }>;
  ready: boolean;
}
`;

const readinessResultNew = `
export interface ReadinessGateResult {
  requiredOrganizationTypes: OrganizationType[];
  organizations: Array<{
    organizationType: OrganizationType;
    status: ReadinessStatus | 'MISSING' | 'AUTO_FORCED';
    version?: number;
    warningMessage?: string;
  }>;
  ready: boolean;
}
`;

content = content.replace(readinessResultOld, readinessResultNew);

fs.writeFileSync('packages/domain/src/types.ts', content);
