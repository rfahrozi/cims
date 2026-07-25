import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { DomainError } from './domain-error.mjs';

const base64url = (value) => Buffer.from(value).toString('base64url');

export function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password, encoded) {
  const [algorithm, salt, stored] = String(encoded).split('$');
  if (algorithm !== 'scrypt' || !salt || !stored) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(stored, 'hex');
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function decodeBase32(value) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleaned = value.toUpperCase().replace(/=+$/g, '').replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (const char of cleaned) bits += alphabet.indexOf(char).toString(2).padStart(5, '0');
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

export function generateTotp(secret, at = Date.now(), stepSeconds = 30, digits = 6) {
  const counter = Math.floor(at / 1000 / stepSeconds);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac('sha1', decodeBase32(secret)).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const code = ((digest[offset] & 0x7f) << 24)
    | ((digest[offset + 1] & 0xff) << 16)
    | ((digest[offset + 2] & 0xff) << 8)
    | (digest[offset + 3] & 0xff);
  return String(code % (10 ** digits)).padStart(digits, '0');
}

export function verifyOtp(code, secret, config, at = Date.now()) {
  if (config.otpMode === 'fixed') return timingSafeEqual(Buffer.from(String(code)), Buffer.from(String(config.fixedOtp)));
  for (const drift of [-1, 0, 1]) {
    const expected = generateTotp(secret, at + drift * 30_000);
    if (String(code).length === expected.length && timingSafeEqual(Buffer.from(String(code)), Buffer.from(expected))) return true;
  }
  return false;
}

export function signAccessToken(payload, secret, ttlSeconds) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const body = {...payload, iat: issuedAt, exp: issuedAt + ttlSeconds};
  const headerPart = base64url(JSON.stringify({alg: 'HS256', typ: 'JWT'}));
  const payloadPart = base64url(JSON.stringify(body));
  const signature = createHmac('sha256', secret).update(`${headerPart}.${payloadPart}`).digest('base64url');
  return `${headerPart}.${payloadPart}.${signature}`;
}

export function verifyAccessToken(token, secret) {
  const parts = String(token ?? '').split('.');
  if (parts.length !== 3) throw new DomainError('UNAUTHENTICATED', 'Bearer token is missing or invalid.', 401);
  const [headerPart, payloadPart, signature] = parts;
  const expected = createHmac('sha256', secret).update(`${headerPart}.${payloadPart}`).digest('base64url');
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new DomainError('UNAUTHENTICATED', 'Bearer token signature is invalid.', 401);
  }
  let payload;
  try { payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8')); }
  catch { throw new DomainError('UNAUTHENTICATED', 'Bearer token payload is invalid.', 401); }
  if (!payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) throw new DomainError('TOKEN_EXPIRED', 'Bearer token has expired.', 401);
  return payload;
}

export function bearerToken(request) {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) throw new DomainError('UNAUTHENTICATED', 'Bearer token is required.', 401);
  return authorization.slice(7).trim();
}
