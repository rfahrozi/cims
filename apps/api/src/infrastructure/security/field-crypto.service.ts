import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { KmsSecretService } from '../config/kms-secret.service.js';

/**
 * Key versioning untuk field encryption.
 *
 * Format ciphertext: [keyVersion(1)] + [iv(12)] + [authTag(16)] + [ciphertext(N)]
 *
 * keyVersion byte:
 *   0x00 = development fallback (TIDAK untuk produksi)
 *   0x01 = FIELD_ENCRYPTION_KEY (versi awal)
 *   0x02 = FIELD_ENCRYPTION_KEY_V2 (rotasi pertama)
 *   0x03 = FIELD_ENCRYPTION_KEY_V3 (rotasi kedua)
 *   ... dst.
 *
 * Enkripsi selalu menggunakan kunci AKTIF (versi tertinggi yang terkonfigurasi).
 * Dekripsi membaca byte versi dari data dan memilih kunci yang tepat — backward compatible.
 *
 * Cara menggunakan key rotation:
 *   1. Generate kunci baru: openssl rand -base64 32
 *   2. Tambahkan FIELD_ENCRYPTION_KEY_V2 ke secrets dan docker-compose
 *   3. Restart service — enkripsi baru akan menggunakan V2, data lama masih bisa didekripsi
 *   4. Jalankan re-encryption job (opsional) untuk migrasi data lama ke kunci baru
 */

const DEV_VERSION = 0x00;
const MIN_VERSION = 0x01;
const MAX_VERSION = 0x03; // Maksimum 3 versi yang didukung saat ini

interface KeyEntry {
  version: number;
  key: Buffer;
}

@Injectable()
export class FieldCryptoService implements OnApplicationBootstrap {
  private readonly logger = new Logger(FieldCryptoService.name);

  /** Semua kunci yang tersedia untuk dekripsi, keyed by version byte */
  private readonly keys = new Map<number, Buffer>();
  /** Kunci aktif untuk enkripsi baru — versi tertinggi yang terkonfigurasi */
  private activeVersion: number = DEV_VERSION;
  private isInitialized = false;

  constructor(
    private readonly config: ConfigService,
    private readonly kmsSecret: KmsSecretService
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const environment =
      (this.config && this.config.get ? this.config.get<string>('NODE_ENV') : undefined) ??
      'development';

    const loaded: KeyEntry[] = [];

    // ── Load semua versi kunci ─────────────────────────────────────────────
    // V1 — kunci asli (FIELD_ENCRYPTION_KEY)
    const raw1 = (await this.kmsSecret.getSecret('FIELD_ENCRYPTION_KEY')) ?? '';
    const decoded1 = raw1 ? Buffer.from(raw1, 'base64') : Buffer.alloc(0);
    if (decoded1.length === 32) {
      loaded.push({ version: 0x01, key: decoded1 });
    } else if (environment === 'production') {
      throw new Error('FIELD_ENCRYPTION_KEY must be a valid 32-byte base64 key in production.');
    } else {
      // Dev fallback — SHA-256 dari konstanta
      const devKey = createHash('sha256')
        .update(raw1 || 'cims-development-only-key')
        .digest();
      loaded.push({ version: DEV_VERSION, key: devKey });
      this.logger.warn(
        'FieldCryptoService: using DEVELOPMENT fallback key — not for production use!'
      );
    }

    // V2 — rotasi pertama (FIELD_ENCRYPTION_KEY_V2)
    const raw2 = (await this.kmsSecret.getSecret('FIELD_ENCRYPTION_KEY_V2')) ?? '';
    if (raw2) {
      const decoded2 = Buffer.from(raw2, 'base64');
      if (decoded2.length !== 32) {
        throw new Error('FIELD_ENCRYPTION_KEY_V2 must be a valid 32-byte base64 key.');
      }
      loaded.push({ version: 0x02, key: decoded2 });
      this.logger.log('FieldCryptoService: V2 key loaded — rotation active');
    }

    // V3 — rotasi kedua (FIELD_ENCRYPTION_KEY_V3)
    const raw3 = (await this.kmsSecret.getSecret('FIELD_ENCRYPTION_KEY_V3')) ?? '';
    if (raw3) {
      const decoded3 = Buffer.from(raw3, 'base64');
      if (decoded3.length !== 32) {
        throw new Error('FIELD_ENCRYPTION_KEY_V3 must be a valid 32-byte base64 key.');
      }
      loaded.push({ version: 0x03, key: decoded3 });
      this.logger.log('FieldCryptoService: V3 key loaded — rotation active');
    }

    // Daftarkan semua kunci ke map
    for (const entry of loaded) {
      this.keys.set(entry.version, entry.key);
    }

    // Kunci aktif = versi tertinggi yang terkonfigurasi
    this.activeVersion = Math.max(...loaded.map((e) => e.version));

    this.logger.log(
      `FieldCryptoService: ${loaded.length} key(s) loaded — ` +
        `active=v${this.activeVersion}, ` +
        `versions=[${loaded.map((e) => `v${e.version}`).join(',')}]`
    );

    if (environment === 'production' && this.activeVersion === DEV_VERSION) {
      throw new Error('No valid production encryption key configured.');
    }

    this.isInitialized = true;
  }

  private ensureInitialized() {
    if (!this.isInitialized) {
      // Allow fallback if not yet initialized, though normally shouldn't happen after bootstrap
      if (this.keys.size === 0 && this.activeVersion === DEV_VERSION) {
        this.keys.set(
          DEV_VERSION,
          createHash('sha256').update('cims-development-only-key').digest()
        );
      }
    }
  }

  /**
   * Enkripsi nilai dengan kunci aktif (versi tertinggi).
   * Format: [keyVersion(1)] + [iv(12)] + [authTag(16)] + [ciphertext(N)]
   */
  encrypt(value: string | undefined): Buffer | undefined {
    this.ensureInitialized();
    if (value === undefined) return undefined;
    const key = this.keys.get(this.activeVersion);
    if (!key) throw new Error('No active encryption key available.');
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    // Prefix dengan version byte agar dekripsi tahu kunci mana yang dipakai
    return Buffer.concat([Buffer.from([this.activeVersion]), iv, tag, ciphertext]);
  }

  /**
   * Dekripsi nilai — membaca version byte dan memilih kunci yang sesuai.
   * Backward compatible: data yang dienkripsi dengan kunci lama tetap bisa didekripsi.
   */
  decrypt(value: Buffer | undefined | null): string | undefined {
    this.ensureInitialized();
    if (!value) return undefined;
    if (value.length < 30)
      throw new Error('Encrypted field too short — possibly corrupted or wrong format.');

    const versionByte = value[0];

    // Fallback untuk data lama yang menggunakan version byte = 1 tanpa key versioning
    // (format lama: byte[0]=1 selalu berarti kunci tunggal pertama)
    const lookupVersion =
      versionByte === 0x01 || versionByte === DEV_VERSION ? versionByte : versionByte;

    const key = this.keys.get(lookupVersion);
    if (!key) {
      throw new Error(
        `No decryption key for version 0x${versionByte.toString(16).padStart(2, '0')}. ` +
          `Available versions: [${[...this.keys.keys()].map((v) => `0x${v.toString(16)}`).join(',')}]`
      );
    }

    const iv = value.subarray(1, 13);
    const tag = value.subarray(13, 29);
    const ciphertext = value.subarray(29);
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  }

  /**
   * Hash deterministik untuk pencarian field terenkripsi (bukan reversible).
   * Menggunakan SHA-256 dengan normalisasi ID-aware.
   */
  searchHash(value: string): string {
    return createHash('sha256').update(value.trim().toLocaleLowerCase('id-ID')).digest('hex');
  }

  /**
   * Kembalikan versi kunci aktif — berguna untuk monitoring dan re-encryption job.
   */
  activeKeyVersion(): number {
    this.ensureInitialized();
    return this.activeVersion;
  }

  /**
   * Cek apakah data perlu di-re-encrypt ke kunci terbaru.
   * Digunakan oleh re-encryption job untuk iterasi data lama.
   */
  needsReEncryption(value: Buffer | undefined | null): boolean {
    this.ensureInitialized();
    if (!value || value.length < 1) return false;
    return value[0] !== this.activeVersion;
  }

  /**
   * Re-enkripsi data dari kunci lama ke kunci aktif dalam satu operasi.
   * Berguna untuk background job migrasi kunci.
   */
  reEncrypt(value: Buffer | undefined | null): Buffer | undefined {
    const decrypted = this.decrypt(value);
    if (decrypted === undefined) return undefined;
    return this.encrypt(decrypted);
  }
}
