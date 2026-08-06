import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KMSClient, DecryptCommand } from '@aws-sdk/client-kms';
import { secretValue } from './secret-value.js';

@Injectable()
export class KmsSecretService {
  private readonly logger = new Logger(KmsSecretService.name);
  private readonly client: KMSClient | null = null;
  private readonly enabled: boolean = false;

  constructor(private readonly config: ConfigService) {
    if (this.config && this.config.get) {
      this.enabled = this.config.get<string>('KMS_ENABLED') === 'true';
    }

    if (this.enabled) {
      this.client = new KMSClient({
        region: this.config.get<string>('AWS_REGION') || 'ap-southeast-1',
        endpoint: this.config.get<string>('KMS_ENDPOINT') || undefined
      });
      this.logger.log('KMS Integration enabled.');
    } else {
      this.logger.log('KMS Integration disabled. Falling back to local secrets.');
    }
  }

  /**
   * Mengambil secret. Jika KMS diaktifkan dan nilainya berawalan `kms:`,
   * maka akan didekripsi menggunakan AWS KMS. Jika tidak, membaca dari env/file lokal.
   */
  async getSecret(name: string): Promise<string | undefined> {
    const rawValue = secretValue(this.config, name);
    if (!rawValue) return undefined;

    if (this.enabled && rawValue.startsWith('kms:')) {
      return this.decryptWithKms(rawValue.substring(4));
    }

    return rawValue;
  }

  /**
   * Mengambil secret yang bersifat wajib.
   */
  async getRequiredSecret(name: string, minimumLength = 16): Promise<string> {
    const value = await this.getSecret(name);
    if (!value || value.length < minimumLength) {
      throw new Error(`${name} is not configured or is too short.`);
    }
    return value;
  }

  private async decryptWithKms(ciphertextBase64: string): Promise<string> {
    if (!this.client) throw new Error('KMS Client is not initialized.');

    try {
      const command = new DecryptCommand({
        CiphertextBlob: Buffer.from(ciphertextBase64, 'base64')
      });

      const response = await this.client.send(command);
      if (!response.Plaintext) {
        throw new Error('KMS decryption returned empty plaintext.');
      }

      return Buffer.from(response.Plaintext).toString('utf-8');
    } catch (error) {
      this.logger.error(`Failed to decrypt secret via KMS: ${(error as Error).message}`);
      throw new Error('KMS Decryption failed');
    }
  }
}
