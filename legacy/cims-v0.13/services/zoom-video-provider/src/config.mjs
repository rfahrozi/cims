import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../../../..');
const bool = (value, fallback=false) => value === undefined ? fallback : ['1','true','yes','on'].includes(String(value).toLowerCase());

export function loadZoomAdapterConfig(overrides={}) {
  return {
    port: Number(overrides.port ?? process.env.ZOOM_ADAPTER_PORT ?? 4200),
    environment: overrides.environment ?? process.env.NODE_ENV ?? 'development',
    dbPath: overrides.dbPath ?? process.env.ZOOM_ADAPTER_DB_PATH ?? path.join(root, 'var/zoom-adapter.sqlite'),
    accountId: overrides.accountId ?? process.env.ZOOM_ACCOUNT_ID ?? '',
    clientId: overrides.clientId ?? process.env.ZOOM_CLIENT_ID ?? '',
    clientSecret: overrides.clientSecret ?? process.env.ZOOM_CLIENT_SECRET ?? '',
    hostUserId: overrides.hostUserId ?? process.env.ZOOM_HOST_USER_ID ?? '',
    oauthUrl: overrides.oauthUrl ?? process.env.ZOOM_OAUTH_URL ?? 'https://zoom.us/oauth/token',
    apiBaseUrl: String(overrides.apiBaseUrl ?? process.env.ZOOM_API_BASE_URL ?? 'https://api.zoom.us/v2').replace(/\/$/, ''),
    webhookSecretToken: overrides.webhookSecretToken ?? process.env.ZOOM_WEBHOOK_SECRET_TOKEN ?? '',
    cimsWebhookUrl: overrides.cimsWebhookUrl ?? process.env.CIMS_WEBHOOK_URL ?? 'http://127.0.0.1:4000/api/v1/provider-webhooks/video',
    cimsProviderWebhookSecret: overrides.cimsProviderWebhookSecret ?? process.env.CIMS_PROVIDER_WEBHOOK_SECRET ?? '',
    topicPrefix: overrides.topicPrefix ?? process.env.ZOOM_TOPIC_PREFIX ?? 'CIMS Persidangan',
    timezone: overrides.timezone ?? process.env.ZOOM_DEFAULT_TIMEZONE ?? 'UTC',
    dataKey: overrides.dataKey ?? process.env.ZOOM_ADAPTER_DATA_KEY ?? '',
    requestTimeoutMs: Number(overrides.requestTimeoutMs ?? process.env.ZOOM_REQUEST_TIMEOUT_MS ?? 12000),
    webhookToleranceSeconds: Number(overrides.webhookToleranceSeconds ?? process.env.ZOOM_WEBHOOK_TOLERANCE_SECONDS ?? 300),
    allowManualLiveControls: overrides.allowManualLiveControls ?? bool(process.env.ZOOM_ALLOW_MANUAL_LIVE_CONTROLS, true),
    registrationEnabled: overrides.registrationEnabled ?? bool(process.env.ZOOM_REGISTRATION_ENABLED, true),
  };
}

export function missingZoomCredentials(config) {
  return ['accountId','clientId','clientSecret','hostUserId'].filter((key) => !config[key]);
}
