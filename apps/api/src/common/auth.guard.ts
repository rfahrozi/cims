
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import { OidcTokenVerifierService } from './oidc-token-verifier.service.js';

@Injectable()
export class CimsAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly config: ConfigService, private readonly verifier: OidcTokenVerifierService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])) return true;
    const mode = (this.config.get<string>('AUTH_MODE') ?? 'DEV').toUpperCase();
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined>; user?: unknown }>();
    if (mode === 'DEV') return true;
    const raw = request.headers.authorization;
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (!value?.startsWith('Bearer ')) throw new UnauthorizedException('Bearer token is required.');
    request.user = await this.verifier.verify(value.slice(7));
    return true;
  }
}
