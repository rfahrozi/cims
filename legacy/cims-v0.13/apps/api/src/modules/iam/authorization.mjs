import { DomainError } from '../../common/domain-error.mjs';

export function authorizationContext(db, userId, at = new Date()) {
  const user = db.get(`select u.id, u.organization_id, u.email, u.name, u.status, o.code as organization_code, o.name as organization_name
    from users u join organizations o on o.id=u.organization_id where u.id=?`, userId);
  if (!user || user.status !== 'ACTIVE') throw new DomainError('UNAUTHENTICATED', 'User is not active.', 401);
  const iso = at.toISOString();
  const roles = db.all(`select distinct ur.role_code from user_roles ur
    where ur.user_id=? and ur.valid_from<=? and (ur.valid_until is null or ur.valid_until>?)`, userId, iso, iso).map((row) => row.role_code);
  const permissions = db.all(`select distinct rp.permission_code from user_roles ur
    join role_permissions rp on rp.role_code=ur.role_code
    where ur.user_id=? and ur.valid_from<=? and (ur.valid_until is null or ur.valid_until>?)`, userId, iso, iso).map((row) => row.permission_code);
  const hearingAssignments = db.all(`select hearing_id, assignment_role from hearing_assignments
    where user_id=? and valid_from<=? and (valid_until is null or valid_until>?)`, userId, iso, iso);
  const delegations = db.all(`select hearing_id, permission_code from delegations
    where user_id=? and valid_from<=? and valid_until>?`, userId, iso, iso);
  return {
    ...user,
    roles,
    permissions,
    assignments: hearingAssignments,
    delegations,
    isSystemAdmin: roles.includes('SYSTEM_ADMIN'),
  };
}

export function requirePermission(context, permission, hearingId) {
  const permissionAllowed = context.isSystemAdmin || context.permissions.includes(permission)
    || context.delegations.some((item) => item.permission_code === permission && (!hearingId || item.hearing_id === hearingId));
  if (!permissionAllowed) throw new DomainError('FORBIDDEN', `Permission ${permission} is required.`, 403);
  if (hearingId && !context.isSystemAdmin) {
    const assigned = context.assignments.some((item) => item.hearing_id === hearingId)
      || context.delegations.some((item) => item.hearing_id === hearingId && item.permission_code === permission);
    if (!assigned) throw new DomainError('HEARING_SCOPE_FORBIDDEN', 'User is not assigned or delegated to this hearing.', 403, {hearing_id: hearingId});
  }
}
