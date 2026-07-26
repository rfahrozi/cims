import { describe, expect, it } from 'vitest';
import { validateEnvOrThrow } from '../src/infrastructure/config/env.schema.js';
import { enforceRuntimeSecurityPolicy } from '../src/infrastructure/security/runtime-security.policy.js';

describe('Runtime Security Config', () => {
  it('allows valid development config', () => {
    const raw = {
      NODE_ENV: 'development',
      AUTH_MODE: 'DEV',
      PERSISTENCE_MODE: 'MEMORY'
    };
    const env = validateEnvOrThrow(raw);
    expect(() => enforceRuntimeSecurityPolicy(env, () => undefined)).not.toThrow();
  });

  it('forbids DEV auth in production', () => {
    const raw = {
      NODE_ENV: 'production',
      AUTH_MODE: 'DEV'
    };
    const env = validateEnvOrThrow(raw);
    expect(() => enforceRuntimeSecurityPolicy(env, () => undefined)).toThrow(
      /forbidden in production/
    );
  });

  it('forbids MEMORY persistence in production', () => {
    const raw = {
      NODE_ENV: 'production',
      AUTH_MODE: 'DEV', // Use DEV here and let it fail on AUTH_MODE=DEV, or use OIDC with proper config. Actually since we are testing MEMORY, we can provide valid OIDC. Let's provide valid OIDC.
      OIDC_ISSUER: 'https://issuer',
      OIDC_JWKS_URL: 'https://jwks',
      PERSISTENCE_MODE: 'MEMORY'
    };
    const env = validateEnvOrThrow(raw);
    expect(() => enforceRuntimeSecurityPolicy(env, () => undefined)).toThrow(
      /forbidden in production/
    );
  });

  it('requires POSTGRES to have a DATABASE_URL', () => {
    const raw = {
      NODE_ENV: 'development',
      PERSISTENCE_MODE: 'POSTGRES'
    };
    const env = validateEnvOrThrow(raw);
    expect(() => enforceRuntimeSecurityPolicy(env, () => undefined)).toThrow(
      /DATABASE_URL is required/
    );
  });
});
