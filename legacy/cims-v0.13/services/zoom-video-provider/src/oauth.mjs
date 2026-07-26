import { AdapterError } from './errors.mjs';
import { missingZoomCredentials } from './config.mjs';

export class ZoomTokenProvider {
  constructor(config, fetchImpl = fetch) {
    this.config = config;
    this.fetch = fetchImpl;
    this.cached = null;
  }
  async getToken(force = false) {
    const missing = missingZoomCredentials(this.config);
    if (missing.length)
      throw new AdapterError(
        'ZOOM_CONFIGURATION_INCOMPLETE',
        'Zoom Server-to-Server OAuth credentials are incomplete.',
        503,
        { missing },
        false
      );
    if (!force && this.cached && this.cached.expiresAt > Date.now() + 60_000)
      return this.cached.token;
    const body = new URLSearchParams({
      grant_type: 'account_credentials',
      account_id: this.config.accountId
    });
    const basic = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString(
      'base64'
    );
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);
    let response;
    try {
      response = await this.fetch(this.config.oauthUrl, {
        method: 'POST',
        headers: {
          authorization: `Basic ${basic}`,
          'content-type': 'application/x-www-form-urlencoded'
        },
        body,
        signal: controller.signal
      });
    } catch (error) {
      throw new AdapterError(
        error.name === 'AbortError' ? 'TIMEOUT' : 'PROVIDER_UNAVAILABLE',
        'Zoom OAuth endpoint could not be reached.',
        503,
        { cause: error.message },
        true
      );
    } finally {
      clearTimeout(timer);
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.access_token) {
      throw new AdapterError(
        'AUTHENTICATION_FAILED',
        data.reason || data.error_description || 'Zoom OAuth authentication failed.',
        401,
        { zoom_status: response.status, zoom_error: data.error },
        false
      );
    }
    this.cached = {
      token: data.access_token,
      expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000
    };
    return this.cached.token;
  }
}
