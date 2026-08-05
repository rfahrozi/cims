import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { CimsAuthGuard } from '../../src/common/auth.guard.js';
import { OidcTokenVerifierService } from '../../src/common/oidc-token-verifier.service.js';
import { IS_PUBLIC_KEY } from '../../src/common/public.decorator.js';

describe('CimsAuthGuard', () => {
  let guard: CimsAuthGuard;
  let reflector: Reflector;
  let config: ConfigService;
  let verifier: OidcTokenVerifierService;
  let context: ExecutionContext;
  let request: any;

  beforeEach(() => {
    reflector = { getAllAndOverride: vi.fn() } as unknown as Reflector;
    config = { get: vi.fn() } as unknown as ConfigService;
    verifier = { verify: vi.fn() } as unknown as OidcTokenVerifierService;
    guard = new CimsAuthGuard(reflector, config, verifier);

    request = { headers: {}, query: {} };
    context = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: () => request
      })
    } as unknown as ExecutionContext;
  });

  it('allows access to public routes', async () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue(true);
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, expect.any(Array));
  });

  describe('when AUTH_MODE is DEV', () => {
    beforeEach(() => {
      vi.mocked(reflector.getAllAndOverride).mockReturnValue(false);
      vi.mocked(config.get).mockImplementation((key) => {
        if (key === 'AUTH_MODE') return 'DEV';
        if (key === 'NODE_ENV') return 'development';
        return undefined;
      });
    });

    it('rejects DEV mode if NODE_ENV is production', async () => {
      vi.mocked(config.get).mockImplementation((key) => {
        if (key === 'AUTH_MODE') return 'DEV';
        if (key === 'NODE_ENV') return 'production';
        return undefined;
      });
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('rejects DEV mode if missing valid persona header', async () => {
      await expect(guard.canActivate(context)).rejects.toThrow(
        /Valid x-cims-dev-persona header is required/
      );
    });

    it('allows DEV mode with valid persona', async () => {
      request.headers['x-cims-dev-persona'] = 'system-admin';
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(request.user).toBeDefined();
      expect(request.user.role).toBe('SYSTEM_ADMIN');
    });
  });

  describe('when AUTH_MODE is OIDC', () => {
    beforeEach(() => {
      vi.mocked(reflector.getAllAndOverride).mockReturnValue(false);
      vi.mocked(config.get).mockImplementation((key) => {
        if (key === 'AUTH_MODE') return 'OIDC';
        if (key === 'NODE_ENV') return 'production';
        return undefined;
      });
    });

    it('rejects missing token', async () => {
      await expect(guard.canActivate(context)).rejects.toThrow(/Bearer token is required/);
    });

    it('accepts token from query string (e.g. for SSE)', async () => {
      request.query.token = 'valid-token';
      vi.mocked(verifier.verify).mockResolvedValue({ sub: 'user-1' } as any);
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(verifier.verify).toHaveBeenCalledWith('valid-token');
      expect(request.user.sub).toBe('user-1');
    });

    it('rejects invalid token', async () => {
      request.headers.authorization = 'Bearer invalid-token';
      vi.mocked(verifier.verify).mockRejectedValue(new Error('Invalid token signature'));
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('accepts valid token', async () => {
      request.headers.authorization = 'Bearer valid-token';
      vi.mocked(verifier.verify).mockResolvedValue({ sub: 'user-1' } as any);
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(request.user.sub).toBe('user-1');
    });
  });
});
