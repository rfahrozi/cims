import fs from 'fs';

let content = fs.readFileSync('packages/domain/src/hearing-intake.ts', 'utf8');

// Update HearingIntakeStatus
content = content.replace(
  "export type HearingIntakeStatus = 'DRAFT' | 'SUBMITTED' | 'ACTIVE' | 'RETURNED' | 'ARCHIVED';",
  "export type HearingIntakeStatus = 'DRAFT' | 'SUBMITTED' | 'ADMIN_VERIFIED' | 'JUDGE_VALIDATION' | 'DATA_APPROVED' | 'ACTIVE' | 'RETURNED' | 'ARCHIVED';"
);

// Update HearingIntakeAction
content = content.replace(
  "export type HearingIntakeAction = 'SUBMIT' | 'ACTIVATE' | 'RETURN' | 'REOPEN' | 'ARCHIVE';",
  "export type HearingIntakeAction = 'SUBMIT' | 'ADMIN_VERIFY' | 'JUDGE_VERIFY' | 'APPROVE_DATA' | 'ACTIVATE' | 'RETURN' | 'REOPEN' | 'ARCHIVE';"
);

// Update transition mapping
const oldTransitions = `
    DRAFT: { SUBMIT: 'SUBMITTED', ARCHIVE: 'ARCHIVED' },
    SUBMITTED: { ACTIVATE: 'ACTIVE', RETURN: 'RETURNED', ARCHIVE: 'ARCHIVED' },
    ACTIVE: { ARCHIVE: 'ARCHIVED' },
    RETURNED: { REOPEN: 'DRAFT', SUBMIT: 'SUBMITTED', ARCHIVE: 'ARCHIVED' },
    ARCHIVED: {}
`;
const newTransitions = `
    DRAFT: { SUBMIT: 'SUBMITTED', ARCHIVE: 'ARCHIVED' },
    SUBMITTED: { ADMIN_VERIFY: 'ADMIN_VERIFIED', RETURN: 'RETURNED', ARCHIVE: 'ARCHIVED' },
    ADMIN_VERIFIED: { JUDGE_VERIFY: 'JUDGE_VALIDATION', RETURN: 'RETURNED', ARCHIVE: 'ARCHIVED' },
    JUDGE_VALIDATION: { APPROVE_DATA: 'DATA_APPROVED', RETURN: 'RETURNED', ARCHIVE: 'ARCHIVED' },
    DATA_APPROVED: { ACTIVATE: 'ACTIVE', ARCHIVE: 'ARCHIVED' },
    ACTIVE: { ARCHIVE: 'ARCHIVED' },
    RETURNED: { REOPEN: 'DRAFT', SUBMIT: 'SUBMITTED', ARCHIVE: 'ARCHIVED' },
    ARCHIVED: {}
`;

content = content.replace(oldTransitions, newTransitions);

fs.writeFileSync('packages/domain/src/hearing-intake.ts', content);
