import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DomainError } from '@cims/domain';
import { secretValue } from '../config/secret-value.js';
import { CircuitBreakerService } from '../circuit-breaker.service.js';

export interface EvidenceStorageResult {
  storageUri: string;
  objectHash: string;
  sizeBytes: number;
}

@Injectable()
export class EvidenceStorageGateway {
  constructor(
    private readonly config: ConfigService,
    private readonly circuitBreaker: CircuitBreakerService
  ) {}

  capability(): { mode: 'LOCAL' | 'HTTP' | 'DISABLED'; configured: boolean } {
    const mode = this.mode;
    if (mode === 'LOCAL') return { mode, configured: true };
    if (mode === 'DISABLED') return { mode, configured: false };
    return {
      mode,
      configured: Boolean(
        this.config.get<string>('EVIDENCE_STORAGE_URL') &&
          secretValue(this.config, 'EVIDENCE_STORAGE_API_KEY')
      )
    };
  }

  async putJson(
    objectKey: string,
    value: unknown,
    correlationId?: string
  ): Promise<EvidenceStorageResult> {
    const bytes = Buffer.from(JSON.stringify(value));
    const objectHash = createHash('sha256').update(bytes).digest('hex');
    if (this.mode === 'DISABLED')
      throw new DomainError('EVIDENCE_STORAGE_DISABLED', 'Evidence storage is disabled.', 503);
    if (this.mode === 'LOCAL') {
      const directory = this.config.get<string>('EVIDENCE_LOCAL_DIR') ?? '/tmp/cims-evidence';
      await mkdir(directory, { recursive: true, mode: 0o700 });
      const safeName = objectKey.replace(/[^a-zA-Z0-9._-]/g, '_');
      const target = path.join(directory, safeName);
      await writeFile(target, bytes, { mode: 0o600 });
      return { storageUri: `file://${target}`, objectHash, sizeBytes: bytes.length };
    }
    const baseUrl = this.config.get<string>('EVIDENCE_STORAGE_URL')?.replace(/\/$/, '');
    const apiKey = secretValue(this.config, 'EVIDENCE_STORAGE_API_KEY');
    if (!baseUrl || !apiKey)
      throw new DomainError(
        'EVIDENCE_STORAGE_CONFIG_INVALID',
        'Evidence storage HTTP configuration is incomplete.',
        500
      );
    return this.circuitBreaker.execute('evidence-storage', async () => {
      const response = await fetch(`${baseUrl}/objects/${encodeURIComponent(objectKey)}`, {
        method: 'PUT',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
          'x-content-sha256': objectHash,
          ...(correlationId ? { 'x-correlation-id': correlationId } : {})
        },
        body: bytes,
        signal: AbortSignal.timeout(
          Number(this.config.get<string>('EVIDENCE_STORAGE_TIMEOUT_MS') ?? 15_000)
        )
      });
      const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok)
        throw new DomainError(
          'EVIDENCE_STORAGE_ERROR',
          'Evidence storage rejected the object.',
          502,
          { status: response.status }
        );
      return {
        storageUri: String(
          body.storage_uri ?? body.uri ?? `${baseUrl}/objects/${encodeURIComponent(objectKey)}`
        ),
        objectHash,
        sizeBytes: bytes.length
      };
    });
  }

  private get mode(): 'LOCAL' | 'HTTP' | 'DISABLED' {
    const value = (this.config.get<string>('EVIDENCE_STORAGE_MODE') ?? 'LOCAL').toUpperCase();
    if (value === 'HTTP') return 'HTTP';
    if (value === 'DISABLED') return 'DISABLED';
    return 'LOCAL';
  }
}
