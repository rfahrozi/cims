import type { NodeEnv, RuntimeEnv } from '../config/env.schema.js';

export type SecretResolver = (key: string) => string | undefined;

function isPlaceholder(value: string): boolean {
  return value.startsWith('replace-with-');
}

function requireSecret(key: string, resolveSecret: SecretResolver): string {
  const value = resolveSecret(key)?.trim();

  if (!value) {
    throw new Error(`${key} is required.`);
  }

  if (isPlaceholder(value)) {
    throw new Error(`${key} must not use placeholder values.`);
  }

  return value;
}

function assertHttpsOrigins(origins: string[], envName: string): void {
  for (const origin of origins) {
    if (!origin.startsWith('https://')) {
      throw new Error(`${envName} WEB_ORIGINS must use HTTPS. Invalid origin: ${origin}`);
    }

    if (
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.includes('0.0.0.0')
    ) {
      throw new Error(
        `${envName} WEB_ORIGINS must not point to localhost. Invalid origin: ${origin}`
      );
    }
  }
}

function assertBase64Key32Bytes(key: string, value: string): void {
  let decoded: Buffer;

  try {
    decoded = Buffer.from(value, 'base64');
  } catch {
    throw new Error(`${key} must be a valid base64 string.`);
  }

  if (decoded.length !== 32) {
    throw new Error(`${key} must decode to exactly 32 bytes.`);
  }
}

function isSeriousEnvironment(env: NodeEnv): boolean {
  return ['staging', 'preproduction', 'production'].includes(env);
}

function isProductionLikeEnvironment(env: NodeEnv): boolean {
  return ['preproduction', 'production'].includes(env);
}

export function enforceRuntimeSecurityPolicy(env: RuntimeEnv, resolveSecret: SecretResolver): void {
  // 1. Validasi Dependensi Base Konfigurasi
  if (env.AUTH_MODE === 'OIDC') {
    if (!env.OIDC_ISSUER || !env.OIDC_JWKS_URL) {
      throw new Error('AUTH_MODE=OIDC requires OIDC_ISSUER and OIDC_JWKS_URL.');
    }
  }

  if (env.PERSISTENCE_MODE === 'POSTGRES') {
    requireSecret('DATABASE_URL', resolveSecret);
  }

  if (env.NOTIFICATION_GATEWAY_MODE !== 'MOCK') {
    if (!env.NOTIFICATION_GATEWAY_URL) {
      throw new Error(
        'NOTIFICATION_GATEWAY_URL is required when NOTIFICATION_GATEWAY_MODE is not MOCK.'
      );
    }
    requireSecret('NOTIFICATION_GATEWAY_API_KEY', resolveSecret);
  }

  if (env.OFFICIAL_SYSTEM_GATEWAY_MODE !== 'MOCK') {
    if (!env.OFFICIAL_SYSTEM_GATEWAY_URL) {
      throw new Error(
        'OFFICIAL_SYSTEM_GATEWAY_URL is required when OFFICIAL_SYSTEM_GATEWAY_MODE is not MOCK.'
      );
    }
    requireSecret('OFFICIAL_SYSTEM_GATEWAY_API_KEY', resolveSecret);
  }

  if (env.VIDEO_PROVIDER_MODE !== 'MOCK' && !env.VIDEO_PROVIDER_URL) {
    throw new Error('VIDEO_PROVIDER_URL is required when VIDEO_PROVIDER_MODE is not MOCK.');
  }

  const fieldEncryptionKey = resolveSecret('FIELD_ENCRYPTION_KEY');
  if (fieldEncryptionKey) {
    if (isPlaceholder(fieldEncryptionKey)) {
      throw new Error('FIELD_ENCRYPTION_KEY must not use placeholder values.');
    }
    assertBase64Key32Bytes('FIELD_ENCRYPTION_KEY', fieldEncryptionKey);
  }

  // 2. FORBIDDEN ENVIRONMENT MATRIX

  // Aturan untuk Serious Environments (Staging, Preproduction, Production)
  if (isSeriousEnvironment(env.NODE_ENV)) {
    if (env.AUTH_MODE === 'DEV') {
      throw new Error(`AUTH_MODE=DEV is forbidden in ${env.NODE_ENV}.`);
    }
    if (env.PERSISTENCE_MODE === 'MEMORY') {
      throw new Error(`PERSISTENCE_MODE=MEMORY is forbidden in ${env.NODE_ENV}.`);
    }
    if (!env.DB_SSL) {
      throw new Error(`DB_SSL=true is required in ${env.NODE_ENV}.`);
    }

    // Validasi secret utama wajib di environment serius
    requireSecret('DATABASE_URL', resolveSecret);
    requireSecret('WEBHOOK_SHARED_SECRET', resolveSecret);
    requireSecret('TOKEN_PEPPER', resolveSecret);
    requireSecret('AUDIT_HASH_KEY', resolveSecret);

    const requiredFieldKey = requireSecret('FIELD_ENCRYPTION_KEY', resolveSecret);
    assertBase64Key32Bytes('FIELD_ENCRYPTION_KEY', requiredFieldKey);
  }

  // Aturan ekstra ketat untuk Production dan Preproduction
  if (isProductionLikeEnvironment(env.NODE_ENV)) {
    if (env.SWAGGER_ENABLED) {
      throw new Error(`SWAGGER_ENABLED=true is forbidden in ${env.NODE_ENV}.`);
    }
    if (env.NOTIFICATION_GATEWAY_MODE === 'MOCK') {
      throw new Error(`NOTIFICATION_GATEWAY_MODE=MOCK is forbidden in ${env.NODE_ENV}.`);
    }
    if (env.OFFICIAL_SYSTEM_GATEWAY_MODE === 'MOCK') {
      throw new Error(`OFFICIAL_SYSTEM_GATEWAY_MODE=MOCK is forbidden in ${env.NODE_ENV}.`);
    }
    if (env.VIDEO_PROVIDER_MODE === 'MOCK') {
      throw new Error(`VIDEO_PROVIDER_MODE=MOCK is forbidden in ${env.NODE_ENV}.`);
    }
    if (env.EVIDENCE_STORAGE_MODE === 'LOCAL') {
      throw new Error(`EVIDENCE_STORAGE_MODE=LOCAL is forbidden in ${env.NODE_ENV}.`);
    }

    assertHttpsOrigins(env.WEB_ORIGINS, env.NODE_ENV);
  }
}
