import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { AdapterError } from './errors.mjs';

function resolveKey(config) {
  if (config.dataKey) {
    const key = Buffer.from(config.dataKey, 'base64');
    if (key.length !== 32)
      throw new AdapterError(
        'DATA_KEY_INVALID',
        'ZOOM_ADAPTER_DATA_KEY must be a base64-encoded 32-byte key.',
        500
      );
    return key;
  }
  if (config.environment === 'production')
    throw new AdapterError(
      'DATA_KEY_REQUIRED',
      'ZOOM_ADAPTER_DATA_KEY is required in production.',
      500
    );
  return createHash('sha256')
    .update(`development:${config.cimsProviderWebhookSecret || 'zoom-adapter'}`)
    .digest();
}

export class CryptoStore {
  constructor(config) {
    this.key = resolveKey(config);
  }
  encrypt(value) {
    if (value === null || value === undefined || value === '') return null;
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, ciphertext]).toString('base64url');
  }
  decrypt(value) {
    if (!value) return null;
    const data = Buffer.from(value, 'base64url');
    const iv = data.subarray(0, 12),
      tag = data.subarray(12, 28),
      ciphertext = data.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  }
}
