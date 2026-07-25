
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { secretValue } from './config/secret-value.js';

@Injectable()
export class FieldCryptoService {
  private readonly key: Buffer;
  constructor(config: ConfigService) {
    const raw = secretValue(config, 'FIELD_ENCRYPTION_KEY') ?? '';
    const environment = config.get<string>('NODE_ENV') ?? 'development';
    const decoded = raw ? Buffer.from(raw, 'base64') : Buffer.alloc(0);
    if (environment === 'production' && decoded.length !== 32) throw new Error('FIELD_ENCRYPTION_KEY must be a 32-byte base64 key in production.');
    this.key = decoded.length === 32 ? decoded : createHash('sha256').update(raw || 'cims-development-only-key').digest();
  }
  encrypt(value: string | undefined): Buffer | undefined {
    if (value === undefined) return undefined;
    const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', this.key, iv); const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]); const tag = cipher.getAuthTag();
    return Buffer.concat([Buffer.from([1]), iv, tag, ciphertext]);
  }
  decrypt(value: Buffer | undefined | null): string | undefined {
    if (!value) return undefined;
    if (value[0] !== 1 || value.length < 30) throw new Error('Unsupported encrypted field format.');
    const iv=value.subarray(1,13); const tag=value.subarray(13,29); const ciphertext=value.subarray(29); const decipher=createDecipheriv('aes-256-gcm',this.key,iv); decipher.setAuthTag(tag); return Buffer.concat([decipher.update(ciphertext),decipher.final()]).toString('utf8');
  }
  searchHash(value: string): string { return createHash('sha256').update(value.trim().toLocaleLowerCase('id-ID')).digest('hex'); }
}
