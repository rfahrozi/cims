
import { DomainError } from './errors.js';

export const CIMS_ROLES = [
  'COURT_CLERK',
  'SUBSTITUTE_CLERK',
  'JUDGE',
  'PROSECUTOR',
  'CORRECTIONS',
  'IT_OPERATOR',
  'SECURITY_OFFICER',
  'AUDITOR',
  'LIAISON_OFFICER',
  'SYSTEM_ADMIN',
] as const;

export type CimsRole = typeof CIMS_ROLES[number];

export interface AuthorizationSubject {
  userId: string;
  roles: readonly CimsRole[];
  organizationIds: readonly string[];
  hearingAssignments: readonly string[];
  permissions: readonly string[];
}

export interface AuthorizationResource {
  hearingId?: string;
  organizationId?: string;
  protectedIdentity?: boolean;
}

export function canAccessResource(subject: AuthorizationSubject, permission: string, resource: AuthorizationResource): boolean {
  if (subject.roles.includes('SYSTEM_ADMIN')) return true;
  if (!subject.permissions.includes(permission)) return false;
  if (resource.organizationId && !subject.organizationIds.includes(resource.organizationId)) return false;
  if (resource.hearingId && !subject.hearingAssignments.includes(resource.hearingId)) return false;
  if (resource.protectedIdentity && !subject.permissions.includes('participant.protected.read')) return false;
  return true;
}

export function assertAccess(subject: AuthorizationSubject, permission: string, resource: AuthorizationResource = {}): void {
  if (!canAccessResource(subject, permission, resource)) {
    throw new DomainError('FORBIDDEN', 'Access is denied by CIMS RBAC and ABAC policy.', 403, {
      permission,
      hearingId: resource.hearingId,
      organizationId: resource.organizationId,
    });
  }
}
