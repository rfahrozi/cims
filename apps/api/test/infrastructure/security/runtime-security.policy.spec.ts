import { describe, it, expect, vi } from 'vitest';
import { enforceRuntimeSecurityPolicy } from '../../../src/infrastructure/security/runtime-security.policy.js';
import type { RuntimeEnv } from '../../../src/infrastructure/config/env.schema.js';

describe('enforceRuntimeSecurityPolicy', () => {
  const baseEnv: RuntimeEnv = {
    NODE_ENV: 'development',
    CIMS_PROCESS_ROLE: 'API',
    API_PORT: 3000,
    WEB_ORIGINS: ['http://localhost:5173'],
    AUTH_MODE: 'DEV',
    OIDC_AUDIENCE: 'cims-api',
    PERSISTENCE_MODE: 'MEMORY',
    DB_SSL: false,
    RATE_LIMIT_MAX: 300,
    RATE_LIMIT_WINDOW_MS: 60000,
    REQUEST_BODY_LIMIT_BYTES: 1048576,
    TRUST_PROXY: false,
    SWAGGER_ENABLED: true,
    NOTIFICATION_GATEWAY_MODE: 'MOCK',
    OFFICIAL_SYSTEM_GATEWAY_MODE: 'MOCK',
    VIDEO_PROVIDER_MODE: 'MOCK',
    EVIDENCE_STORAGE_MODE: 'LOCAL'
  };

  const productionEnv: RuntimeEnv = {
    ...baseEnv,
    NODE_ENV: 'production',
    WEB_ORIGINS: ['https://cims.go.id'],
    AUTH_MODE: 'OIDC',
    OIDC_ISSUER: 'https://sso.go.id',
    OIDC_JWKS_URL: 'https://sso.go.id/jwks',
    PERSISTENCE_MODE: 'POSTGRES',
    DB_SSL: true,
    SWAGGER_ENABLED: false,
    NOTIFICATION_GATEWAY_MODE: 'API',
    NOTIFICATION_GATEWAY_URL: 'https://api.gateway/notify',
    OFFICIAL_SYSTEM_GATEWAY_MODE: 'API',
    OFFICIAL_SYSTEM_GATEWAY_URL: 'https://api.gateway/official',
    VIDEO_PROVIDER_MODE: 'API',
    VIDEO_PROVIDER_URL: 'https://api.video/zoom',
    EVIDENCE_STORAGE_MODE: 'S3'
  };

  const validSecrets: Record<string, string> = {
    DATABASE_URL: 'postgres://user:pass@host:5432/db',
    WEBHOOK_SHARED_SECRET: 'super-secret',
    TOKEN_PEPPER: 'pepper123',
    AUDIT_HASH_KEY: 'audit-secret',
    FIELD_ENCRYPTION_KEY: Buffer.alloc(32, 'a').toString('base64'),
    NOTIFICATION_GATEWAY_API_KEY: 'notif-key',
    OFFICIAL_SYSTEM_GATEWAY_API_KEY: 'official-key'
  };

  const resolveSecret = (key: string) => validSecrets[key];

  it('allows development environment with mock settings', () => {
    expect(() => enforceRuntimeSecurityPolicy(baseEnv, resolveSecret)).not.toThrow();
  });

  it('allows production environment with strict settings', () => {
    expect(() => enforceRuntimeSecurityPolicy(productionEnv, resolveSecret)).not.toThrow();
  });

  describe('Serious Environments (staging, preprod, prod)', () => {
    const seriousEnvs = ['staging', 'preproduction', 'production'] as const;

    seriousEnvs.forEach((env) => {
      it(`forbids AUTH_MODE=DEV in ${env}`, () => {
        const testEnv: RuntimeEnv = { ...productionEnv, NODE_ENV: env, AUTH_MODE: 'DEV' };
        expect(() => enforceRuntimeSecurityPolicy(testEnv, resolveSecret)).toThrow(
          /AUTH_MODE=DEV is forbidden/
        );
      });

      it(`forbids PERSISTENCE_MODE=MEMORY in ${env}`, () => {
        const testEnv: RuntimeEnv = { ...productionEnv, NODE_ENV: env, PERSISTENCE_MODE: 'MEMORY' };
        expect(() => enforceRuntimeSecurityPolicy(testEnv, resolveSecret)).toThrow(
          /PERSISTENCE_MODE=MEMORY is forbidden/
        );
      });

      it(`requires DB_SSL in ${env}`, () => {
        const testEnv: RuntimeEnv = { ...productionEnv, NODE_ENV: env, DB_SSL: false };
        expect(() => enforceRuntimeSecurityPolicy(testEnv, resolveSecret)).toThrow(
          /DB_SSL=true is required/
        );
      });

      it(`requires core secrets to be resolved in ${env}`, () => {
        const testEnv: RuntimeEnv = { ...productionEnv, NODE_ENV: env };
        const missingSecretResolver = (key: string) =>
          key === 'DATABASE_URL' ? undefined : validSecrets[key];
        expect(() => enforceRuntimeSecurityPolicy(testEnv, missingSecretResolver)).toThrow(
          /DATABASE_URL is required/
        );
      });
    });
  });

  describe('Production-like Environments (preprod, prod)', () => {
    const prodEnvs = ['preproduction', 'production'] as const;

    prodEnvs.forEach((env) => {
      it(`forbids SWAGGER_ENABLED=true in ${env}`, () => {
        const testEnv: RuntimeEnv = { ...productionEnv, NODE_ENV: env, SWAGGER_ENABLED: true };
        expect(() => enforceRuntimeSecurityPolicy(testEnv, resolveSecret)).toThrow(
          /SWAGGER_ENABLED=true is forbidden/
        );
      });

      it(`forbids MOCK modes in ${env}`, () => {
        const testEnv: RuntimeEnv = {
          ...productionEnv,
          NODE_ENV: env,
          NOTIFICATION_GATEWAY_MODE: 'MOCK'
        };
        expect(() => enforceRuntimeSecurityPolicy(testEnv, resolveSecret)).toThrow(
          /NOTIFICATION_GATEWAY_MODE=MOCK is forbidden/
        );
      });

      it(`requires HTTPS for WEB_ORIGINS in ${env}`, () => {
        const testEnv: RuntimeEnv = {
          ...productionEnv,
          NODE_ENV: env,
          WEB_ORIGINS: ['http://cims.go.id']
        };
        expect(() => enforceRuntimeSecurityPolicy(testEnv, resolveSecret)).toThrow(
          /WEB_ORIGINS must use HTTPS/
        );
      });

      it(`rejects localhost in WEB_ORIGINS for ${env}`, () => {
        const testEnv: RuntimeEnv = {
          ...productionEnv,
          NODE_ENV: env,
          WEB_ORIGINS: ['https://localhost:8080']
        };
        expect(() => enforceRuntimeSecurityPolicy(testEnv, resolveSecret)).toThrow(
          /WEB_ORIGINS must not point to localhost/
        );
      });
    });
  });

  describe('Secret validation', () => {
    it('rejects placeholders', () => {
      const resolver = (key: string) =>
        key === 'DATABASE_URL' ? 'replace-with-db-url' : validSecrets[key];
      expect(() => enforceRuntimeSecurityPolicy(productionEnv, resolver)).toThrow(
        /DATABASE_URL must not use placeholder/
      );
    });

    it('validates 32-byte base64 keys', () => {
      const resolver = (key: string) =>
        key === 'FIELD_ENCRYPTION_KEY' ? 'short-key' : validSecrets[key];
      expect(() => enforceRuntimeSecurityPolicy(productionEnv, resolver)).toThrow(
        /FIELD_ENCRYPTION_KEY must be a valid base64 string|decode to exactly 32 bytes/
      );
    });
  });
});
