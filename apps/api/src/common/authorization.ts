import { DomainError } from '@cims/domain';
import type { CimsRole } from '@cims/domain';
import type { CurrentUser } from './current-user.decorator.js';

export function requireRoles(user: CurrentUser, roles: CimsRole[]): void {
  if (user.roles.includes('SYSTEM_ADMIN')) return;
  if (!roles.some((role) => user.roles.includes(role))) {
    throw new DomainError(
      'FORBIDDEN',
      'The current role is not authorized for this operation.',
      403,
      { roles: user.roles, requiredRoles: roles }
    );
  }
}

export function requirePermission(
  user: CurrentUser,
  permission: string,
  _hearingId?: string,
  organizationId?: string
): void {
  if (user.roles.includes('SYSTEM_ADMIN') || user.permissions.includes('*')) return;
  if (!user.permissions.includes(permission))
    throw new DomainError('FORBIDDEN', 'Required permission is missing.', 403, { permission });
  if (organizationId && !user.organizationIds.includes(organizationId))
    throw new DomainError('FORBIDDEN', 'The organization scope is not allowed.', 403, {
      organizationId
    });
}
