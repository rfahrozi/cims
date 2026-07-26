import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { AdapterError, assert } from './errors.mjs';

const safeEqual = (a, b) => {
  const aa = Buffer.from(String(a)),
    bb = Buffer.from(String(b));
  return aa.length === bb.length && timingSafeEqual(aa, bb);
};

export function validationResponse(secretToken, body) {
  const plainToken = body?.payload?.plainToken;
  assert(
    body?.event === 'endpoint.url_validation' && plainToken,
    'WEBHOOK_VALIDATION_INVALID',
    'Zoom URL validation payload is invalid.',
    400
  );
  return {
    plainToken,
    encryptedToken: createHmac('sha256', secretToken).update(plainToken).digest('hex')
  };
}

export function verifyZoomWebhook(config, headers, rawBody) {
  const timestamp = String(headers['x-zm-request-timestamp'] || '');
  const signature = String(headers['x-zm-signature'] || '');
  assert(
    timestamp && signature,
    'WEBHOOK_SIGNATURE_REQUIRED',
    'Zoom webhook signature headers are required.',
    401
  );
  if (Math.abs(Date.now() - Number(timestamp) * 1000) > config.webhookToleranceSeconds * 1000)
    throw new AdapterError(
      'WEBHOOK_EXPIRED',
      'Zoom webhook timestamp is outside the accepted window.',
      401
    );
  const message = `v0:${timestamp}:${rawBody}`;
  const expected = `v0=${createHmac('sha256', config.webhookSecretToken).update(message).digest('hex')}`;
  if (!safeEqual(signature, expected))
    throw new AdapterError('WEBHOOK_SIGNATURE_INVALID', 'Zoom webhook signature is invalid.', 401);
  return true;
}

const EVENT_MAP = {
  'meeting.started': 'session.started',
  'meeting.ended': 'session.ended',
  'meeting.deleted': 'session.cancelled',
  'meeting.participant_joined': 'participant.joined',
  'meeting.participant_left': 'participant.left',
  'meeting.participant_joined_waiting_room': 'participant.waiting-room-joined',
  'meeting.participant_left_waiting_room': 'participant.waiting-room-left',
  'meeting.participant_joined_breakout_room': 'participant.breakout-room-joined',
  'meeting.participant_left_breakout_room': 'participant.breakout-room-left',
  'recording.started': 'recording.started',
  'recording.stopped': 'recording.stopped',
  'recording.completed': 'recording.completed'
};

export function translateZoomEvent(body) {
  const object = body?.payload?.object || {};
  const participant = object.participant || body?.payload?.object?.participant || null;
  return {
    event_id: String(body?.event_ts || Date.now()) + '-' + randomUUID(),
    event_type: EVENT_MAP[body?.event] || `zoom.${body?.event || 'unknown'}`,
    occurred_at: new Date(Number(body?.event_ts || Date.now())).toISOString(),
    provider_session_reference: object.id !== undefined ? String(object.id) : null,
    provider_participant_reference:
      participant?.registrant_id || participant?.participant_user_id || participant?.id || null,
    provider_room_reference: object.breakout_room_uuid || null,
    zoom_event: body?.event || null
  };
}

export async function emitCimsWebhook(config, event, fetchImpl = fetch) {
  if (!config.cimsWebhookUrl || !config.cimsProviderWebhookSecret)
    return { delivered: false, reason: 'CIMS_WEBHOOK_NOT_CONFIGURED' };
  const timestamp = new Date().toISOString();
  const raw = JSON.stringify(event);
  const signature = createHmac('sha256', config.cimsProviderWebhookSecret)
    .update(`${timestamp}.${raw}`)
    .digest('hex');
  const response = await fetchImpl(config.cimsWebhookUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-Provider-Signature': signature,
      'X-Provider-Timestamp': timestamp,
      'X-Provider-Event-Id': event.event_id
    },
    body: raw
  });
  if (!response.ok)
    throw new AdapterError(
      'CIMS_WEBHOOK_DELIVERY_FAILED',
      `CIMS webhook returned HTTP ${response.status}.`,
      503,
      { status: response.status },
      true
    );
  return { delivered: true, status: response.status };
}
