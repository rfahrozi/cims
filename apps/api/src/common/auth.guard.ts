import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import { OidcTokenVerifierService } from './oidc-token-verifier.service.js';
import { personas } from './dev-identity.interceptor.js';

@Injectable()
export class CimsAuthGuard implements CanActivate {
  private readonly logger = new Logger(CimsAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
    private readonly verifier: OidcTokenVerifierService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      user?: unknown;
      query?: Record<string, string>;
      url?: string;
      originalUrl?: string;
    }>();

    // Bypass eksplisit untuk Healthcheck (Liveness / Readiness Probe dari Docker)
    const url = request.url || request.originalUrl || '';
    if (url.includes('/live') || url.includes('/ready') || url.includes('/health')) {
      return true;
    }

    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass()
      ])
    ) {
      return true;
    }

    const mode = (this.config.get<string>('AUTH_MODE') ?? 'DEV').toUpperCase();
    const env = (this.config.get<string>('NODE_ENV') ?? 'development').toLowerCase();

    if (mode === 'DEV') {
      if (env !== 'development' && env !== 'test') {
        this.logger.error(`Critical Security Incident: DEV auth attempted in ${env} environment.`);
        throw new UnauthorizedException(
          'DEV auth is strictly forbidden in non-development environments.'
        );
      }

      // In DEV mode, SSE events don't send custom headers, so we check query params first
      const rawQuery = request.query?.persona;
      const rawHeader = request.headers['x-cims-dev-persona'];

      const key =
        (Array.isArray(rawQuery) ? rawQuery[0] : rawQuery) ||
        (Array.isArray(rawHeader) ? rawHeader[0] : rawHeader);

      if (!key || !personas[key]) {
        throw new UnauthorizedException('Valid persona is required for DEV auth.');
      }

      request.user = personas[key];
      return true;
    }

    const raw = request.headers.authorization;
    let value = Array.isArray(raw) ? raw[0] : raw;

    // Untuk endpoint SSE atau yang hanya bisa mengirim via query params
    if (!value && request.query?.token) {
      value = `Bearer ${request.query.token}`;
    }

    if (!value?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer token is required.');
    }

    try {
      request.user = await this.verifier.verify(value.slice(7));
      return true;
    } catch (err) {
      this.logger.warn(
        `Token verification failed: ${err instanceof Error ? err.message : String(err)}`
      );
      throw new UnauthorizedException('Invalid or expired token.');
    }
  }
}
