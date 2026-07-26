import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  verifyAccessToken,
  generateTotp
} from '../../apps/api/src/common/security.mjs';

test('password hashing uses salt and verifies correctly', () => {
  const encoded = hashPassword('Secret123!');
  assert.equal(verifyPassword('Secret123!', encoded), true);
  assert.equal(verifyPassword('wrong', encoded), false);
});

test('access token is signed and expires metadata is present', () => {
  const token = signAccessToken({ sub: 'user-1' }, 'a-secret-that-is-long-enough-for-tests', 60);
  const payload = verifyAccessToken(token, 'a-secret-that-is-long-enough-for-tests');
  assert.equal(payload.sub, 'user-1');
  assert.ok(payload.exp > payload.iat);
});

test('TOTP generator returns six digits', () => {
  assert.match(generateTotp('JBSWY3DPEHPK3PXP', 1_700_000_000_000), /^\d{6}$/);
});
