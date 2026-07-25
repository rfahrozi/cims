
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import type { CimsRole } from '@cims/domain';
import type { CurrentUser } from './current-user.decorator.js';

@Injectable()
export class OidcTokenVerifierService {
  private readonly jwks;
  private readonly issuer: string;
  private readonly audience: string;

  constructor(private readonly config: ConfigService) {
    this.issuer = this.config.get<string>('OIDC_ISSUER') || '';
    this.audience = this.config.get<string>('OIDC_AUDIENCE') || '';
    const jwksUrl = this.config.get<string>('OIDC_JWKS_URL') || (this.issuer ? `${this.issuer.replace(/\/$/, '')}/protocol/openid-connect/certs` : 'http://invalid.local/jwks');
    this.jwks = createRemoteJWKSet(new URL(jwksUrl));
  }

  async verify(token: string): Promise<CurrentUser> {
    if (!this.issuer || !this.audience) throw new UnauthorizedException('OIDC configuration is incomplete.');
    const { payload } = await jwtVerify(token, this.jwks, { issuer: this.issuer, audience: this.audience });
    return this.mapClaims(payload);
  }

  private mapClaims(payload: JWTPayload): CurrentUser {
    const customRoles = Array.isArray(payload.roles) ? payload.roles : [];
    const realmRoles = typeof payload.realm_access === 'object' && payload.realm_access && 'roles' in payload.realm_access && Array.isArray((payload.realm_access as { roles?: unknown }).roles)
      ? (payload.realm_access as { roles: unknown[] }).roles
      : [];
    const roles = [...customRoles, ...realmRoles].filter((item): item is CimsRole => typeof item === 'string') as CimsRole[];
    const organizationIds = Array.isArray(payload.organization_ids) ? payload.organization_ids.filter((item): item is string => typeof item === 'string') : [];
    const permissions = Array.isArray(payload.permissions) ? payload.permissions.filter((item): item is string => typeof item === 'string') : [];
    const hearingAssignments = Array.isArray(payload.hearing_assignments) ? payload.hearing_assignments.filter((item): item is string => typeof item === 'string') : [];
    if (!payload.sub || roles.length === 0 || organizationIds.length === 0) throw new UnauthorizedException('Required CIMS identity claims are missing.');
    return {
      id: payload.sub,
      name: typeof payload.name === 'string' ? payload.name : payload.sub,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      role: roles[0], roles,
      organizationId: organizationIds[0], organizationIds,
      permissions, hearingAssignments,
      authSource: 'OIDC',
    };
  }
}
