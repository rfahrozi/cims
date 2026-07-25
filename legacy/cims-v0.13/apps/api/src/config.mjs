import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../../../..');
function booleanEnv(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}
export function loadConfig(overrides = {}) {
  return {
    port: Number(overrides.port ?? process.env.CIMS_API_PORT ?? 4000),
    dbPath: overrides.dbPath ?? process.env.CIMS_DB_PATH ?? path.join(root, 'var/cims-dev.sqlite'),
    tokenSecret: overrides.tokenSecret ?? process.env.CIMS_TOKEN_SECRET ?? 'development-only-change-me-at-least-32-characters',
    tokenTtlSeconds: Number(overrides.tokenTtlSeconds ?? process.env.CIMS_TOKEN_TTL_SECONDS ?? 3600),
    otpMode: overrides.otpMode ?? process.env.CIMS_OTP_MODE ?? 'fixed',
    fixedOtp: overrides.fixedOtp ?? process.env.CIMS_FIXED_OTP ?? '123456',
    exposeDevelopmentOtp: overrides.exposeDevelopmentOtp ?? booleanEnv('CIMS_EXPOSE_DEVELOPMENT_OTP', true),
    allowedOrigins: Array.isArray(overrides.allowedOrigins) ? overrides.allowedOrigins : String(overrides.allowedOrigins ?? process.env.CIMS_ALLOWED_ORIGINS ?? 'http://localhost:4173,http://127.0.0.1:4173').split(',').map((item) => item.trim()).filter(Boolean),
    environment: overrides.environment ?? process.env.NODE_ENV ?? 'development',
    providerBaseUrl: overrides.providerBaseUrl ?? process.env.CIMS_PROVIDER_BASE_URL ?? 'http://127.0.0.1:4100',
    providerWebhookSecret: overrides.providerWebhookSecret ?? process.env.CIMS_PROVIDER_WEBHOOK_SECRET ?? 'development-only-secret-change-me',
    providerCode: overrides.providerCode ?? process.env.CIMS_PROVIDER_CODE ?? 'CIMS-MOCK',
    notificationMode: overrides.notificationMode ?? process.env.CIMS_NOTIFICATION_MODE ?? 'simulated',
    participantTokenTtlMinutes: Number(overrides.participantTokenTtlMinutes ?? process.env.CIMS_PARTICIPANT_TOKEN_TTL_MINUTES ?? 30),
    loginRateLimitPerMinute: Number(overrides.loginRateLimitPerMinute ?? process.env.CIMS_LOGIN_RATE_LIMIT_PER_MINUTE ?? 10),
    publicRateLimitPerMinute: Number(overrides.publicRateLimitPerMinute ?? process.env.CIMS_PUBLIC_RATE_LIMIT_PER_MINUTE ?? 30),
    accountLockoutThreshold: Number(overrides.accountLockoutThreshold ?? process.env.CIMS_ACCOUNT_LOCKOUT_THRESHOLD ?? 5),
    accountLockoutMinutes: Number(overrides.accountLockoutMinutes ?? process.env.CIMS_ACCOUNT_LOCKOUT_MINUTES ?? 15),
  };
}
