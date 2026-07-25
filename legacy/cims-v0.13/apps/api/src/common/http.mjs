import { randomUUID } from 'node:crypto';
import { DomainError } from './domain-error.mjs';

export function correlationId(request) {
  const supplied = request.headers['x-correlation-id'];
  return typeof supplied === 'string' && supplied.length >= 8 ? supplied : randomUUID();
}

export async function readJson(request, maxBytes = 1_000_000) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) throw new DomainError('PAYLOAD_TOO_LARGE', 'Request body exceeds the configured size limit.', 413);
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new DomainError('INVALID_JSON', 'Request body must be valid JSON.', 400);
  }
}

export function applySecurityHeaders(response) {
  response.setHeader('x-content-type-options', 'nosniff');
  response.setHeader('x-frame-options', 'DENY');
  response.setHeader('referrer-policy', 'no-referrer');
  response.setHeader('permissions-policy', 'camera=(), microphone=(), geolocation=()');
  response.setHeader('content-security-policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
}

export function sendJson(response, status, payload, corrId, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'x-correlation-id': corrId,
    'cache-control': 'no-store',
    ...extraHeaders,
  });
  response.end(body);
}

export function sendError(response, error, corrId) {
  const normalized = error instanceof DomainError
    ? error
    : new DomainError('INTERNAL_ERROR', 'An unexpected error occurred.', 500);
  if (!(error instanceof DomainError)) console.error(error);
  sendJson(response, normalized.status, {
    error: {
      code: normalized.code,
      message: normalized.message,
      correlation_id: corrId,
      details: normalized.details ?? {},
    },
  }, corrId);
}

export function applyCors(request, response, allowedOrigins) {
  const origin = request.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    response.setHeader('access-control-allow-origin', origin);
    response.setHeader('vary', 'origin');
  }
  response.setHeader('access-control-allow-methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  response.setHeader('access-control-allow-headers', 'authorization,content-type,idempotency-key,x-correlation-id');
  response.setHeader('access-control-expose-headers', 'x-correlation-id');
}
