import { AdapterError } from './errors.mjs';

function mapError(status, body = {}) {
  const zoomCode = body.code;
  if (status === 401 || status === 403 || zoomCode === 124)
    return ['AUTHENTICATION_FAILED', 401, false];
  if (status === 404 || zoomCode === 3001 || zoomCode === 1001)
    return ['SESSION_NOT_FOUND', 404, false];
  if (status === 429) return ['RATE_LIMITED', 429, true];
  if (status >= 500) return ['PROVIDER_UNAVAILABLE', 503, true];
  return ['PROVIDER_ERROR', status || 500, false];
}

export class ZoomClient {
  constructor(config, tokenProvider, fetchImpl = fetch) {
    this.config = config;
    this.tokens = tokenProvider;
    this.fetch = fetchImpl;
  }
  async request(path, { method = 'GET', body, correlationId } = {}) {
    const token = await this.tokens.getToken();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);
    let response;
    try {
      response = await this.fetch(`${this.config.apiBaseUrl}${path}`, {
        method,
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
          'x-correlation-id': correlationId || ''
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal
      });
    } catch (error) {
      throw new AdapterError(
        error.name === 'AbortError' ? 'TIMEOUT' : 'PROVIDER_UNAVAILABLE',
        'Zoom API could not be reached.',
        503,
        { cause: error.message },
        true
      );
    } finally {
      clearTimeout(timer);
    }
    if (response.status === 204) return null;
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const [code, status, retryable] = mapError(response.status, data);
      throw new AdapterError(
        code,
        data.message || `Zoom API returned HTTP ${response.status}.`,
        status,
        { zoom_status: response.status, zoom_code: data.code, zoom_errors: data.errors },
        retryable
      );
    }
    return data;
  }
  createMeeting(payload, correlationId) {
    return this.request(`/users/${encodeURIComponent(this.config.hostUserId)}/meetings`, {
      method: 'POST',
      body: payload,
      correlationId
    });
  }
  getMeeting(meetingId, correlationId) {
    return this.request(`/meetings/${encodeURIComponent(meetingId)}`, { correlationId });
  }
  updateMeeting(meetingId, payload, correlationId) {
    return this.request(`/meetings/${encodeURIComponent(meetingId)}`, {
      method: 'PATCH',
      body: payload,
      correlationId
    });
  }
  deleteMeeting(meetingId, correlationId) {
    return this.request(`/meetings/${encodeURIComponent(meetingId)}`, {
      method: 'DELETE',
      correlationId
    });
  }
  addRegistrant(meetingId, payload, correlationId) {
    return this.request(`/meetings/${encodeURIComponent(meetingId)}/registrants`, {
      method: 'POST',
      body: payload,
      correlationId
    });
  }
  updateRegistrantStatus(meetingId, payload, correlationId) {
    return this.request(`/meetings/${encodeURIComponent(meetingId)}/registrants/status`, {
      method: 'PUT',
      body: payload,
      correlationId
    });
  }
  inMeetingControl(meetingId, payload, correlationId) {
    return this.request(`/live_meetings/${encodeURIComponent(meetingId)}/events`, {
      method: 'PATCH',
      body: payload,
      correlationId
    });
  }
}
