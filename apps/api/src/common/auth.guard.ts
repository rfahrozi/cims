import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import { OidcTokenVerifierService } from './oidc-token-verifier.service.js';
import { personas } from './dev-identity.interceptor.js';

@Injectable()
export class CimsAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
    private readonly verifier: OidcTokenVerifierService
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass()
      ])
    )
      return true;
    const mode = (this.config.get<string>('AUTH_MODE') ?? 'DEV').toUpperCase();
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      user?: unknown;
      query?: Record<string, string>;
    }>();

    if (mode === 'DEV') {
      const raw = request.headers['x-cims-dev-persona'];
      const key = Array.isArray(raw) ? raw[0] : raw;
      request.user = personas[key ?? 'substitute-clerk'] ?? personas['substitute-clerk'];
      return true;
    }

    const raw = request.headers.authorization;
    let value = Array.isArray(raw) ? raw[0] : raw;

    // Untuk endpoint SSE atau yang hanya bisa mengirim via query params
    if (!value && request.query?.token) {
      value = `Bearer ${request.query.token}`;
    }

    if (!value?.startsWith('Bearer ')) throw new UnauthorizedException('Bearer token is required.');
    request.user = await this.verifier.verify(value.slice(7));
    return true;
  }
}
