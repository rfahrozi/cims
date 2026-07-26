import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DomainError } from '@cims/domain';
import type { CurrentUser } from './current-user.decorator.js';
import { PERMISSIONS_KEY } from './permissions.decorator.js';
import { HearingAccessService } from '../infrastructure/hearing-access.service.js';

@Injectable()
export class PolicyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly hearingAccess: HearingAccessService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permissions =
      this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass()
      ]) ?? [];
    if (permissions.length === 0) return true;
    const request = context
      .switchToHttp()
      .getRequest<{ user?: CurrentUser; params?: Record<string, string> }>();
    const user = request.user;
    if (!user) throw new DomainError('UNAUTHENTICATED', 'Authenticated user is required.', 401);
    if (!user.roles.includes('SYSTEM_ADMIN') && !user.permissions.includes('*')) {
      if (!permissions.every((permission) => user.permissions.includes(permission))) {
        throw new DomainError('FORBIDDEN', 'Permission policy rejected the operation.', 403, {
          required: permissions
        });
      }
      const hearingId = request.params?.hearingId ?? request.params?.id;
      if (
        hearingId &&
        hearingId.startsWith('hearing') &&
        !(await this.hearingAccess.canAccess(user, hearingId))
      ) {
        throw new DomainError(
          'FORBIDDEN',
          'Hearing assignment and organization policy rejected the operation.',
          403,
          { hearingId }
        );
      }
    }
    return true;
  }
}
