import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KmsSecretService } from './kms-secret.service.js';

@Injectable()
export class ProductionConfigValidator implements OnApplicationBootstrap {
  constructor(
    private readonly config: ConfigService,
    private readonly kmsSecret: KmsSecretService
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (
      ((this.config && this.config.get ? this.config.get<string>('NODE_ENV') : undefined) ??
        'development') !== 'production'
    )
      return;
    const role = (this.config.get<string>('CIMS_PROCESS_ROLE') ?? 'API').toUpperCase();
    this.assertEqual('PERSISTENCE_MODE', 'POSTGRES');
    await this.requireSecret('DATABASE_URL', 12);
    await this.requireSecret('TOKEN_PEPPER', 32);
    await this.requireSecret('AUDIT_HASH_KEY', 32);
    const encryption = await this.requireSecret('FIELD_ENCRYPTION_KEY', 40);
    if (Buffer.from(encryption, 'base64').length !== 32)
      throw new Error('FIELD_ENCRYPTION_KEY must decode to exactly 32 bytes.');
    if (this.config.get<string>('ENABLE_LEGACY_PROXY') === 'true')
      throw new Error('ENABLE_LEGACY_PROXY=true is forbidden in production.');
    this.assertEqual('DB_SSL', 'TRUE');
    if (this.config.get<string>('RETENTION_EXECUTION_ENABLED') === 'true') {
      throw new Error(
        'RETENTION_EXECUTION_ENABLED=true is forbidden until a legally approved disposition workflow is implemented.'
      );
    }

    if (role === 'API') {
      this.assertEqual('AUTH_MODE', 'OIDC');
      this.requireValue('OIDC_ISSUER');
      this.requireValue('OIDC_AUDIENCE');
      await this.requireSecret('WEBHOOK_SHARED_SECRET', 32);

      const evidenceMode = (this.config.get<string>('EVIDENCE_STORAGE_MODE') ?? '').toUpperCase();
      if (evidenceMode !== 'HTTP' && evidenceMode !== 'S3') {
         throw new Error('EVIDENCE_STORAGE_MODE must be HTTP or S3 in production.');
      }

      if (evidenceMode === 'HTTP') {
         this.requireValue('EVIDENCE_STORAGE_URL');
         await this.requireSecret('EVIDENCE_STORAGE_API_KEY', 16);
      }
      if (this.config.get<string>('OUTBOX_WORKER_ENABLED') !== 'false') {
        throw new Error('API process must use OUTBOX_WORKER_ENABLED=false in production.');
      }
    } else if (role === 'WORKER') {
      if (this.config.get<string>('OUTBOX_WORKER_ENABLED') === 'false') {
        throw new Error('Worker process requires OUTBOX_WORKER_ENABLED=true.');
      }
      await this.validateGateway('NOTIFICATION_GATEWAY');
      await this.validateGateway('OFFICIAL_SYSTEM_GATEWAY');

      const evidenceMode = (this.config.get<string>('EVIDENCE_STORAGE_MODE') ?? '').toUpperCase();
      if (evidenceMode !== 'HTTP' && evidenceMode !== 'S3') {
         throw new Error('EVIDENCE_STORAGE_MODE must be HTTP or S3 in production.');
      }

      if (evidenceMode === 'HTTP') {
         this.requireValue('EVIDENCE_STORAGE_URL');
         await this.requireSecret('EVIDENCE_STORAGE_API_KEY', 16);
      }
      if ((this.config.get<string>('VIDEO_PROVIDER_MODE') ?? 'MOCK').toUpperCase() === 'HTTP')
        this.requireValue('VIDEO_PROVIDER_URL');
    } else {
      throw new Error(`Unsupported CIMS_PROCESS_ROLE: ${role}`);
    }
  }

  private async validateGateway(prefix: string): Promise<void> {
    const mode = (this.config.get<string>(`${prefix}_MODE`) ?? 'MOCK').toUpperCase();
    if (mode !== 'HTTP') return;
    this.requireValue(`${prefix}_URL`);
    await this.requireSecret(`${prefix}_API_KEY`, 16);
  }

  private assertEqual(name: string, expected: string): void {
    const actual = (this.config.get<string>(name) ?? '').toUpperCase();
    if (actual !== expected) throw new Error(`${name} must be ${expected} in production.`);
  }

  private requireValue(name: string): string {
    const value = this.config.get<string>(name)?.trim();
    if (!value) throw new Error(`${name} is required in production.`);
    return value;
  }

  private async requireSecret(name: string, minimumLength: number): Promise<string> {
    const value = await this.kmsSecret.getSecret(name);
    if (!value || value.length < minimumLength)
      throw new Error(
        `${name} must be provided through a secret manager and contain at least ${minimumLength} characters.`
      );
    return value;
  }
}
