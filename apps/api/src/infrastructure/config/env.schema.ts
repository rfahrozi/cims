export type NodeEnv = 'development' | 'test' | 'preproduction' | 'production';
export type AuthMode = 'DEV' | 'OIDC';
export type PersistenceMode = 'MEMORY' | 'POSTGRES';

export interface RuntimeEnv {
  NODE_ENV: NodeEnv;
  CIMS_PROCESS_ROLE: string;
  API_PORT: number;
  WEB_ORIGINS: string[];
  AUTH_MODE: AuthMode;
  OIDC_ISSUER?: string;
  OIDC_AUDIENCE: string;
  OIDC_JWKS_URL?: string;

  PERSISTENCE_MODE: PersistenceMode;
  DB_SSL: boolean;

  RATE_LIMIT_MAX: number;
  RATE_LIMIT_WINDOW_MS: number;
  REQUEST_BODY_LIMIT_BYTES: number;
  TRUST_PROXY: boolean;
  SWAGGER_ENABLED: boolean;

  NOTIFICATION_GATEWAY_MODE: string;
  NOTIFICATION_GATEWAY_URL?: string;

  OFFICIAL_SYSTEM_GATEWAY_MODE: string;
  OFFICIAL_SYSTEM_GATEWAY_URL?: string;

  VIDEO_PROVIDER_MODE: string;
  VIDEO_PROVIDER_URL?: string;

  EVIDENCE_STORAGE_MODE: string;
}

const NODE_ENVS = ['development', 'test', 'preproduction', 'production'] as const;
const AUTH_MODES = ['DEV', 'OIDC'] as const;
const PERSISTENCE_MODES = ['MEMORY', 'POSTGRES'] as const;

function readOptional(raw: NodeJS.ProcessEnv, key: string): string | undefined {
  const value = raw[key]?.trim();
  return value ? value : undefined;
}

function readBoolean(raw: NodeJS.ProcessEnv, key: string, fallback: boolean): boolean {
  const value = readOptional(raw, key);
  if (!value) return fallback;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${key} must be "true" or "false". Received: ${value}`);
}

function readInteger(
  raw: NodeJS.ProcessEnv,
  key: string,
  fallback: number,
  options: { min?: number } = {}
): number {
  const value = readOptional(raw, key);
  const parsed = value ? Number(value) : fallback;

  if (!Number.isInteger(parsed)) {
    throw new Error(`${key} must be an integer. Received: ${value ?? fallback}`);
  }

  if (options.min !== undefined && parsed < options.min) {
    throw new Error(`${key} must be >= ${options.min}. Received: ${parsed}`);
  }

  return parsed;
}

function readEnum<T extends readonly string[]>(
  raw: NodeJS.ProcessEnv,
  key: string,
  allowed: T,
  fallback: T[number]
): T[number] {
  const value = (readOptional(raw, key) ?? fallback).toUpperCase();
  if (!allowed.includes(value as T[number])) {
    throw new Error(`${key} must be one of: ${allowed.join(', ')}. Received: ${value}`);
  }
  return value as T[number];
}

function readNodeEnv(raw: NodeJS.ProcessEnv): NodeEnv {
  const value = (readOptional(raw, 'NODE_ENV') ?? 'development').toLowerCase();
  if (!NODE_ENVS.includes(value as NodeEnv)) {
    throw new Error(`NODE_ENV must be one of: ${NODE_ENVS.join(', ')}. Received: ${value}`);
  }
  return value as NodeEnv;
}

function readCsv(raw: NodeJS.ProcessEnv, key: string, fallback: string): string[] {
  const value = readOptional(raw, key) ?? fallback;
  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (items.length === 0) {
    throw new Error(`${key} must contain at least one origin.`);
  }

  return items;
}

export function validateEnvOrThrow(raw: NodeJS.ProcessEnv): RuntimeEnv {
  return {
    NODE_ENV: readNodeEnv(raw),
    CIMS_PROCESS_ROLE: readOptional(raw, 'CIMS_PROCESS_ROLE') ?? 'API',
    API_PORT: readInteger(raw, 'API_PORT', 3000, { min: 1 }),
    WEB_ORIGINS: readCsv(raw, 'WEB_ORIGINS', 'http://localhost:5173'),

    AUTH_MODE: readEnum(raw, 'AUTH_MODE', AUTH_MODES, 'DEV'),
    OIDC_ISSUER: readOptional(raw, 'OIDC_ISSUER'),
    OIDC_AUDIENCE: readOptional(raw, 'OIDC_AUDIENCE') ?? 'cims-api',
    OIDC_JWKS_URL: readOptional(raw, 'OIDC_JWKS_URL'),

    PERSISTENCE_MODE: readEnum(raw, 'PERSISTENCE_MODE', PERSISTENCE_MODES, 'MEMORY'),
    DB_SSL: readBoolean(raw, 'DB_SSL', false),

    RATE_LIMIT_MAX: readInteger(raw, 'RATE_LIMIT_MAX', 300, { min: 1 }),
    RATE_LIMIT_WINDOW_MS: readInteger(raw, 'RATE_LIMIT_WINDOW_MS', 60000, { min: 1000 }),
    REQUEST_BODY_LIMIT_BYTES: readInteger(raw, 'REQUEST_BODY_LIMIT_BYTES', 1048576, {
      min: 1024
    }),
    TRUST_PROXY: readBoolean(raw, 'TRUST_PROXY', false),
    SWAGGER_ENABLED: readBoolean(raw, 'SWAGGER_ENABLED', true),

    NOTIFICATION_GATEWAY_MODE:
      (readOptional(raw, 'NOTIFICATION_GATEWAY_MODE') ?? 'MOCK').toUpperCase(),
    NOTIFICATION_GATEWAY_URL: readOptional(raw, 'NOTIFICATION_GATEWAY_URL'),

    OFFICIAL_SYSTEM_GATEWAY_MODE:
      (readOptional(raw, 'OFFICIAL_SYSTEM_GATEWAY_MODE') ?? 'MOCK').toUpperCase(),
    OFFICIAL_SYSTEM_GATEWAY_URL: readOptional(raw, 'OFFICIAL_SYSTEM_GATEWAY_URL'),

    VIDEO_PROVIDER_MODE: (readOptional(raw, 'VIDEO_PROVIDER_MODE') ?? 'MOCK').toUpperCase(),
    VIDEO_PROVIDER_URL: readOptional(raw, 'VIDEO_PROVIDER_URL'),

    EVIDENCE_STORAGE_MODE: (readOptional(raw, 'EVIDENCE_STORAGE_MODE') ?? 'LOCAL').toUpperCase()
  };
}