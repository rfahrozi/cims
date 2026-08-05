import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  UnauthorizedException
} from '@nestjs/common';
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
const hearingAssignments = ['hearing-demo-001', 'hearing-demo-002', 'hearing-demo-003'];

// NIP sebagai user_id agar konsisten dengan data nyata
const substitutClerkPermissions = [...workflowPermissions, ...intakeWriterPermissions];

export const personas: Record<string, CurrentUser> = {
  // ── Panitera Pengganti (4 persona sesuai data pegawai nyata) ─────────────
  'substitute-clerk': {
    id: '196908201993031005',
    name: 'AGUSMAN, S.H., M.H.',
    role: 'SUBSTITUTE_CLERK',
    roles: ['SUBSTITUTE_CLERK'],
    organizationId: 'court-demo',
    organizationIds: ['court-demo'],
    permissions: substitutClerkPermissions,
    hearingAssignments,
    authSource: 'DEV'
  },
  'substitute-clerk-2': {
    id: '196505281994032001',
    name: 'NURLAILI, S.H., M.H.',
    role: 'SUBSTITUTE_CLERK',
    roles: ['SUBSTITUTE_CLERK'],
    organizationId: 'court-demo',
    organizationIds: ['court-demo'],
    permissions: substitutClerkPermissions,
    hearingAssignments,
    authSource: 'DEV'
  },
  'substitute-clerk-3': {
    id: '198409022009041004',
    name: 'SYAIFUL ISLAMI, S.H.',
    role: 'SUBSTITUTE_CLERK',
    roles: ['SUBSTITUTE_CLERK'],
    organizationId: 'court-demo',
    organizationIds: ['court-demo'],
    permissions: substitutClerkPermissions,
    hearingAssignments,
    authSource: 'DEV'
  },
  'substitute-clerk-4': {
    id: '196511281993031003',
    name: 'SUPRIADI, S.H.',
    role: 'SUBSTITUTE_CLERK',
    roles: ['SUBSTITUTE_CLERK'],
    organizationId: 'court-demo',
    organizationIds: ['court-demo'],
    permissions: substitutClerkPermissions,
    hearingAssignments,
    authSource: 'DEV'
  },
  'court-clerk': {
    id: '196809011996031001',
    name: 'SAPTA PUTRA, S.H.',
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
  // ── Hakim (10 persona sesuai data nyata) ──────────────────────────────
  'judge-1': {
    id: '196005031988041001',
    name: 'Drs. ARIFIN, S.H., M.Hum.',
    role: 'JUDGE',
    roles: ['JUDGE'],
    organizationId: 'court-demo',
    organizationIds: ['court-demo'],
    permissions: [...workflowPermissions, 'hearing.control', 'participant.protected.read'],
    hearingAssignments,
    authSource: 'DEV'
  },
  'judge-2': {
    id: '196105171988031008',
    name: 'Dr ZULFAHMI, S.H., M.Hum.',
    role: 'JUDGE',
    roles: ['JUDGE'],
    organizationId: 'court-demo',
    organizationIds: ['court-demo'],
    permissions: [...workflowPermissions, 'hearing.control', 'participant.protected.read'],
    hearingAssignments,
    authSource: 'DEV'
  },
  'judge-3': {
    id: '196303121985032003',
    name: 'ELIWARTI, S.H., M.H.',
    role: 'JUDGE',
    roles: ['JUDGE'],
    organizationId: 'court-demo',
    organizationIds: ['court-demo'],
    permissions: [...workflowPermissions, 'hearing.control', 'participant.protected.read'],
    hearingAssignments,
    authSource: 'DEV'
  },
  'judge-4': {
    id: '196506301992121001',
    name: 'WENDRA RAIS, S.H., M.H.',
    role: 'JUDGE',
    roles: ['JUDGE'],
    organizationId: 'court-demo',
    organizationIds: ['court-demo'],
    permissions: [...workflowPermissions, 'hearing.control', 'participant.protected.read'],
    hearingAssignments,
    authSource: 'DEV'
  },
  'judge-5': {
    id: '196503151992121001',
    name: 'ESTIONO, S.H., M.H.',
    role: 'JUDGE',
    roles: ['JUDGE'],
    organizationId: 'court-demo',
    organizationIds: ['court-demo'],
    permissions: [...workflowPermissions, 'hearing.control', 'participant.protected.read'],
    hearingAssignments,
    authSource: 'DEV'
  },
  'judge-6': {
    id: '196308261988031003',
    name: 'BAGUS IRAWAN, S.H., M.H.',
    role: 'JUDGE',
    roles: ['JUDGE'],
    organizationId: 'court-demo',
    organizationIds: ['court-demo'],
    permissions: [...workflowPermissions, 'hearing.control', 'participant.protected.read'],
    hearingAssignments,
    authSource: 'DEV'
  },
  'judge-7': {
    id: '196512111992121001',
    name: 'ELFIAN, S.H., M.H.',
    role: 'JUDGE',
    roles: ['JUDGE'],
    organizationId: 'court-demo',
    organizationIds: ['court-demo'],
    permissions: [...workflowPermissions, 'hearing.control', 'participant.protected.read'],
    hearingAssignments,
    authSource: 'DEV'
  },
  'judge-8': {
    id: '196209221992121001',
    name: 'MORGAN SIMANJUNTAK, S.H., M.Hum.',
    role: 'JUDGE',
    roles: ['JUDGE'],
    organizationId: 'court-demo',
    organizationIds: ['court-demo'],
    permissions: [...workflowPermissions, 'hearing.control', 'participant.protected.read'],
    hearingAssignments,
    authSource: 'DEV'
  },
  'judge-9': {
    id: '196301101991032002',
    name: 'DAHLIA PANJAITAN, S.H.',
    role: 'JUDGE',
    roles: ['JUDGE'],
    organizationId: 'court-demo',
    organizationIds: ['court-demo'],
    permissions: [...workflowPermissions, 'hearing.control', 'participant.protected.read'],
    hearingAssignments,
    authSource: 'DEV'
  },
  'judge-10': {
    id: '1403010103624882',
    name: 'Dr. M. SURYADI, S.H., M.H.',
    role: 'JUDGE',
    roles: ['JUDGE'],
    organizationId: 'court-demo',
    organizationIds: ['court-demo'],
    permissions: [...workflowPermissions, 'hearing.control', 'participant.protected.read'],
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
    if (!key || !personas[key]) {
      throw new UnauthorizedException(
        'Valid x-cims-dev-persona header is required for DEV identity interceptor.'
      );
    }
    request.user = personas[key];
    return next.handle();
  }
}
