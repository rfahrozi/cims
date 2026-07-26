import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Observable } from 'rxjs';
import type { CurrentUser } from './current-user.decorator.js';

const workflowPermissions = [
  'hearing.read',
  'hearing.write',
  'determination.write',
  'schedule.write',
  'notice.write',
  'notice.acknowledge',
  'readiness.write',
  'participant.read',
  'participant.write',
  'participant.admit',
  'attendance.read',
  'consultation.manage',
  'incident.write',
  'incident.read',
  'audit.read',
  'virtual-session.manage'
];
const intakeWriterPermissions = [
  'hearing.intake.read',
  'hearing.intake.create',
  'hearing.intake.write',
  'hearing.intake.submit',
  'hearing.import.read'
];
const intakeReviewerPermissions = [
  ...intakeWriterPermissions,
  'hearing.intake.review',
  'hearing.import.execute'
];
const governanceReadPermissions = [
  'governance.read',
  'retention.read',
  'retention.preview',
  'evidence.export',
  'production.readiness.read'
];
const governanceManagePermissions = [
  ...governanceReadPermissions,
  'legal-hold.manage',
  'access-review.manage'
];
const hearingAssignments = ['hearing-demo-001'];
export const personas: Record<string, CurrentUser> = {
  'substitute-clerk': {
    id: 'substitute-clerk-demo',
    name: 'Panitera Pengganti Demo',
    role: 'SUBSTITUTE_CLERK',
    roles: ['SUBSTITUTE_CLERK'],
    organizationId: 'court-demo',
    organizationIds: ['court-demo'],
    permissions: [...workflowPermissions, ...intakeWriterPermissions],
    hearingAssignments,
    authSource: 'DEV'
  },
  'court-clerk': {
    id: 'clerk-demo',
    name: 'Panitera Demo',
    role: 'COURT_CLERK',
    roles: ['COURT_CLERK'],
    organizationId: 'court-demo',
    organizationIds: ['court-demo'],
    permissions: [
      ...workflowPermissions,
      ...intakeReviewerPermissions,
      ...governanceReadPermissions,
      'legal-hold.manage',
      'evidence.export'
    ],
    hearingAssignments,
    authSource: 'DEV'
  },
  judge: {
    id: 'judge-demo',
    name: 'Hakim Demo',
    role: 'JUDGE',
    roles: ['JUDGE'],
    organizationId: 'court-demo',
    organizationIds: ['court-demo'],
    permissions: [...workflowPermissions, 'hearing.control', 'participant.protected.read'],
    hearingAssignments,
    authSource: 'DEV'
  },
  prosecutor: {
    id: 'prosecutor-demo',
    name: 'Penuntut Umum Demo',
    role: 'PROSECUTOR',
    roles: ['PROSECUTOR'],
    organizationId: 'prosecution-demo',
    organizationIds: ['prosecution-demo'],
    permissions: [
      'hearing.read',
      'notice.write',
      'notice.acknowledge',
      'readiness.write',
      'participant.read',
      'incident.read'
    ],
    hearingAssignments,
    authSource: 'DEV'
  },
  corrections: {
    id: 'corrections-demo',
    name: 'Petugas Pemasyarakatan Demo',
    role: 'CORRECTIONS',
    roles: ['CORRECTIONS'],
    organizationId: 'corrections-demo',
    organizationIds: ['corrections-demo'],
    permissions: [
      'hearing.read',
      'notice.acknowledge',
      'readiness.write',
      'participant.read',
      'participant.write',
      'incident.read'
    ],
    hearingAssignments,
    authSource: 'DEV'
  },
  'it-operator': {
    id: 'it-demo',
    name: 'Operator TI Demo',
    role: 'IT_OPERATOR',
    roles: ['IT_OPERATOR'],
    organizationId: 'court-demo',
    organizationIds: ['court-demo'],
    permissions: [
      'hearing.read',
      'virtual-session.manage',
      'participant.read',
      'participant.admit',
      'incident.write',
      'incident.read'
    ],
    hearingAssignments,
    authSource: 'DEV'
  },
  'security-officer': {
    id: 'security-demo',
    name: 'Security Officer Demo',
    role: 'SECURITY_OFFICER',
    roles: ['SECURITY_OFFICER'],
    organizationId: 'court-demo',
    organizationIds: ['court-demo'],
    permissions: [
      'hearing.read',
      'incident.write',
      'incident.read',
      'audit.read',
      'participant.protected.read',
      ...governanceManagePermissions
    ],
    hearingAssignments,
    authSource: 'DEV'
  },
  auditor: {
    id: 'auditor-demo',
    name: 'Auditor Demo',
    role: 'AUDITOR',
    roles: ['AUDITOR'],
    organizationId: 'court-demo',
    organizationIds: ['court-demo'],
    permissions: ['hearing.read', 'incident.read', 'audit.read', ...governanceManagePermissions],
    hearingAssignments,
    authSource: 'DEV'
  },
  'system-admin': {
    id: 'admin-demo',
    name: 'Administrator Demo',
    role: 'SYSTEM_ADMIN',
    roles: ['SYSTEM_ADMIN'],
    organizationId: 'court-demo',
    organizationIds: ['court-demo', 'prosecution-demo', 'corrections-demo'],
    permissions: ['*'],
    hearingAssignments,
    authSource: 'DEV'
  }
};

@Injectable()
export class DevIdentityInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | string[] | undefined>; user?: CurrentUser }>();
    const raw = request.headers['x-cims-dev-persona'];
    const key = Array.isArray(raw) ? raw[0] : raw;
    request.user = personas[key ?? 'substitute-clerk'] ?? personas['substitute-clerk'];
    return next.handle();
  }
}
