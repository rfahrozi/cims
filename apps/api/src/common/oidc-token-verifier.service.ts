import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { CIMS_ROLES, MFA_REQUIRED_ROLES, type CimsRole } from '@cims/domain';
import type { CurrentUser } from './current-user.decorator.js';

@Injectable()
export class OidcTokenVerifierService {
  private readonly jwks;
  private readonly issuer: string;
  private readonly audience: string;
  private readonly clientRolePrefix: string;

  constructor(private readonly config: ConfigService) {
    this.issuer = this.config.get<string>('OIDC_ISSUER') || '';
    this.audience = this.config.get<string>('OIDC_AUDIENCE') || '';

    // Prefix untuk menyingkirkan "cims-" apabila IAM provider memberikan format seperti "cims-court-clerk"
    this.clientRolePrefix = this.config.get<string>('OIDC_ROLE_PREFIX') || '';

    const jwksUrl =
      this.config.get<string>('OIDC_JWKS_URL') ||
      (this.issuer
        ? `${this.issuer.replace(/\/$/, '')}/protocol/openid-connect/certs`
        : 'http://invalid.local/jwks');
    this.jwks = createRemoteJWKSet(new URL(jwksUrl));
  }

  async verify(token: string): Promise<CurrentUser> {
    if (!this.issuer || !this.audience)
      throw new UnauthorizedException('OIDC configuration is incomplete.');
    const { payload } = await jwtVerify(token, this.jwks, {
      issuer: this.issuer,
      audience: this.audience
    });
    return this.mapClaims(payload);
  }

  private mapClaims(payload: JWTPayload): CurrentUser {
    // 1. Ekstrak Custom Root Roles
    const customRoles = Array.isArray(payload.roles) ? payload.roles : [];

    // 2. Ekstrak Keycloak Realm Roles (jika ada)
    const realmRoles =
      typeof payload.realm_access === 'object' &&
      payload.realm_access &&
      'roles' in payload.realm_access &&
      Array.isArray((payload.realm_access as { roles?: unknown }).roles)
        ? (payload.realm_access as { roles: unknown[] }).roles
        : [];

    // 3. Ekstrak Client-Specific Roles dari Resource Access (Format default Keycloak)
    let clientRoles: unknown[] = [];
    if (
      typeof payload.resource_access === 'object' &&
      payload.resource_access &&
      this.audience in payload.resource_access
    ) {
      const resource = (payload.resource_access as Record<string, unknown>)[this.audience];
      if (resource && typeof resource === 'object' && 'roles' in resource) {
        const resObj = resource as { roles: unknown[] };
        if (Array.isArray(resObj.roles)) clientRoles = resObj.roles;
      }
    }

    // Gabungkan semua _strings_ menjadi set deduplikasi
    const rawRoles = Array.from(
      new Set(
        [...customRoles, ...realmRoles, ...clientRoles]
          .filter((item) => typeof item === 'string')
          .map((roleStr) => String(roleStr))
      )
    );

    // Validasi dan Filter Roles yang Valid terhadap CimsRole Enum
    const validCimsRoles = rawRoles
      .map((r) => {
        let normalized = r.toUpperCase();
        // Hapus prefix jika ada (contoh: CIMS_COURT_CLERK menjadi COURT_CLERK)
        if (this.clientRolePrefix && normalized.startsWith(this.clientRolePrefix.toUpperCase())) {
          normalized = normalized.slice(this.clientRolePrefix.length).replace(/^_/, '');
        }
        // Konversi strip (-) menjadi garis bawah (_) jika dikirim dengan hyphen dari IAM
        normalized = normalized.replace(/-/g, '_');
        return normalized;
      })
      .filter((normalized): normalized is CimsRole =>
        (CIMS_ROLES as readonly string[]).includes(normalized)
      );

    // Hilangkan Duplikat Final
    const roles = Array.from(new Set(validCimsRoles));

    const organizationIds = Array.isArray(payload.organization_ids)
      ? payload.organization_ids.filter((item): item is string => typeof item === 'string')
      : [];
    const permissions = Array.isArray(payload.permissions)
      ? payload.permissions.filter((item): item is string => typeof item === 'string')
      : [];
    const hearingAssignments = Array.isArray(payload.hearing_assignments)
      ? payload.hearing_assignments.filter((item): item is string => typeof item === 'string')
      : [];

    if (!payload.sub) throw new UnauthorizedException('Missing subject (sub) claim.');
    if (roles.length === 0)
      throw new UnauthorizedException(
        'No valid CIMS roles found in token. Please check Identity Provider mapping.'
      );
    if (organizationIds.length === 0)
      throw new UnauthorizedException(
        'Missing organization_ids claim. Cannot establish data boundary.'
      );

    // H-11 / Sprint 11: MFA validation via ACR/AMR claims
    const hasMfaRole = roles.some((role) => MFA_REQUIRED_ROLES.includes(role));
    if (hasMfaRole) {
      // Keycloak AMR usually array like ['pwd', 'otp'] or ['pwd', 'mfa']
      const amr = payload.amr as unknown;
      const amrArray = Array.isArray(amr) ? amr.map(String) : [];
      // Keycloak ACR is typically '1' (password), '2' (MFA), etc
      const acr = payload.acr ? String(payload.acr).toLowerCase() : '';

      const mfaViaAmr = amrArray.includes('otp') || amrArray.includes('mfa');
      const mfaViaAcr = acr === '2' || acr === 'mfa';

      if (!mfaViaAmr && !mfaViaAcr) {
        throw new UnauthorizedException(
          'MFA_REQUIRED: Multi-Factor Authentication is strictly required for your role. Your token lacks MFA claims (acr/amr).'
        );
      }
    }

    return {
      id: payload.sub,
      name: typeof payload.name === 'string' ? payload.name : payload.sub,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      role: roles[0],
      roles,
      organizationId: organizationIds[0],
      organizationIds,
      permissions,
      hearingAssignments,
      authSource: 'OIDC'
    };
  }
}
