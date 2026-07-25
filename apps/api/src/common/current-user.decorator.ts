
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { CimsRole } from '@cims/domain';

export interface CurrentUser {
  id: string;
  name: string;
  email?: string;
  role: CimsRole;
  roles: CimsRole[];
  organizationId: string;
  organizationIds: string[];
  permissions: string[];
  hearingAssignments: string[];
  authSource: 'DEV' | 'OIDC';
}

export const CurrentUserContext = createParamDecorator((_data: unknown, context: ExecutionContext): CurrentUser => {
  const request = context.switchToHttp().getRequest<{ user?: CurrentUser }>();
  if (!request.user) throw new Error('Authenticated user context is missing.');
  return request.user;
});
