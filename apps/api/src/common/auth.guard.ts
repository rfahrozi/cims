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

@Injectable()
export class CimsAuthGuard implements CanActivate {
  private readonly logger = new Logger(CimsAuthGuard.name);

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
    ) {
      return true;
    }

    const mode = (this.config.get<string>('AUTH_MODE') ?? 'DEV').toUpperCase();

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      user?: unknown;
      query?: Record<string, string>;
    }>();

    // Ambil Bearer token dari header Authorization atau query param
    const raw = request.headers.authorization;
    let value = Array.isArray(raw) ? raw[0] : raw;

    // Untuk endpoint SSE atau yang hanya bisa mengirim via query params
    if (!value && request.query?.token) {
      value = `Bearer ${request.query.token}`;
    }

    if (mode === 'DEV') {
      // Jika ada Bearer token, coba decode sebagai token lokal (base64url JSON)
      if (value?.startsWith('Bearer ')) {
        try {
          const token = value.slice(7);
          const decoded = JSON.parse(Buffer.from(token, 'base64url').toString());
          if (decoded.email && decoded.role) {
            request.user = {
              id: decoded.email,
              name: decoded.email,
              email: decoded.email,
              role: decoded.role,
              roles: [decoded.role],
              organizationId: decoded.organization_id ?? 'court-demo',
              organizationIds: [decoded.organization_id ?? 'court-demo'],
              permissions: [],
              hearingAssignments: [],
              authSource: 'DEV'
            };
            return true;
          }
        } catch {
          // Token tidak valid, lanjut ke error
        }
      }

      throw new UnauthorizedException('Bearer token is required. Please login first.');
    }

    // Mode OIDC
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
