import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DomainError } from '@cims/domain';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { secretValue } from '../config/secret-value.js';
import { CircuitBreakerService } from './circuit-breaker.service.js';

export interface EvidenceStorageResult {
  storageUri: string;
  objectHash: string;
  sizeBytes: number;
}

export interface EvidenceStorageGetResult {
  bytes: Buffer;
  contentType: string;
  sizeBytes: number;
}

@Injectable()
export class EvidenceStorageGateway {
  private s3Client?: S3Client;

  constructor(
    private readonly config: ConfigService,
    private readonly circuitBreaker: CircuitBreakerService
  ) {
    if (this.mode === 'S3') {
      const endpoint = this.config.get<string>('S3_ENDPOINT');
      const region = this.config.get<string>('S3_REGION') || 'us-east-1';
      const accessKeyId = secretValue(this.config, 'S3_ACCESS_KEY');
      const secretAccessKey = secretValue(this.config, 'S3_SECRET_KEY');

      if (endpoint && accessKeyId && secretAccessKey) {
        this.s3Client = new S3Client({
          endpoint,
          region,
          credentials: { accessKeyId, secretAccessKey },
          forcePathStyle: true // Diperlukan untuk MinIO
        });
      }
    }
  }

  capability(): { mode: 'LOCAL' | 'HTTP' | 'DISABLED' | 'S3'; configured: boolean } {
    const mode = this.mode;
    if (mode === 'LOCAL') return { mode, configured: true };
    if (mode === 'DISABLED') return { mode, configured: false };
    if (mode === 'S3') return { mode, configured: Boolean(this.s3Client) };
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

    return this.putBuffer(objectKey, bytes, objectHash, 'application/json', correlationId);
  }

  async putBuffer(
    objectKey: string,
    bytes: Buffer,
    objectHash: string,
    contentType: string = 'application/octet-stream',
    correlationId?: string
  ): Promise<EvidenceStorageResult> {
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

    if (this.mode === 'S3') {
      if (!this.s3Client) {
        throw new DomainError(
          'EVIDENCE_STORAGE_CONFIG_INVALID',
          'S3 configuration is incomplete.',
          500
        );
      }
      return this.circuitBreaker.execute('evidence-storage', async () => {
        const bucket = this.config.get<string>('S3_BUCKET') || 'cims-evidence';
        await this.s3Client!.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: objectKey,
            Body: bytes,
            ContentType: contentType,
            Metadata: {
              'x-cims-correlation-id': correlationId || '',
              'x-content-sha256': objectHash
            }
          })
        );

        const endpoint = this.config.get<string>('S3_ENDPOINT')?.replace(/\/$/, '') || '';
        return {
          storageUri: `${endpoint}/${bucket}/${encodeURIComponent(objectKey)}`,
          objectHash,
          sizeBytes: bytes.length
        };
      });
    }

    // Default HTTP Mode
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
          'content-type': contentType,
          'x-content-sha256': objectHash,
          ...(correlationId ? { 'x-correlation-id': correlationId } : {})
        },
        body: bytes as any,
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

  /**
   * Baca file dari evidence storage berdasarkan object key.
   * Digunakan untuk download dokumen Penetapan yang sudah diupload Panitera.
   */
  async getBuffer(objectKey: string, correlationId?: string): Promise<EvidenceStorageGetResult> {
    if (this.mode === 'DISABLED')
      throw new DomainError('EVIDENCE_STORAGE_DISABLED', 'Evidence storage is disabled.', 503);

    if (this.mode === 'LOCAL') {
      const directory = this.config.get<string>('EVIDENCE_LOCAL_DIR') ?? '/tmp/cims-evidence';
      const safeName = objectKey.replace(/[^a-zA-Z0-9._/-]/g, '_');
      const target = path.join(directory, safeName);
      try {
        const bytes = await readFile(target);
        const ext = path.extname(safeName).toLowerCase();
        const contentType =
          ext === '.pdf'
            ? 'application/pdf'
            : ext === '.jpg' || ext === '.jpeg'
              ? 'image/jpeg'
              : ext === '.png'
                ? 'image/png'
                : 'application/octet-stream';
        return { bytes, contentType, sizeBytes: bytes.length };
      } catch {
        throw new DomainError('EVIDENCE_NOT_FOUND', 'Document not found in local storage.', 404);
      }
    }

    if (this.mode === 'S3') {
      if (!this.s3Client)
        throw new DomainError(
          'EVIDENCE_STORAGE_CONFIG_INVALID',
          'S3 configuration is incomplete.',
          500
        );
      return this.circuitBreaker.execute('evidence-storage', async () => {
        const bucket = this.config.get<string>('S3_BUCKET') || 'cims-evidence';
        const response = await this.s3Client!.send(
          new GetObjectCommand({ Bucket: bucket, Key: objectKey })
        );
        if (!response.Body)
          throw new DomainError('EVIDENCE_NOT_FOUND', 'Document not found in S3.', 404);
        const chunks: Uint8Array[] = [];
        for await (const chunk of response.Body as AsyncIterable<Uint8Array>) chunks.push(chunk);
        const bytes = Buffer.concat(chunks);
        return {
          bytes,
          contentType: response.ContentType ?? 'application/octet-stream',
          sizeBytes: bytes.length
        };
      });
    }

    // HTTP mode
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
        method: 'GET',
        headers: {
          authorization: `Bearer ${apiKey}`,
          ...(correlationId ? { 'x-correlation-id': correlationId } : {})
        },
        signal: AbortSignal.timeout(
          Number(this.config.get<string>('EVIDENCE_STORAGE_TIMEOUT_MS') ?? 15_000)
        )
      });
      if (!response.ok) {
        if (response.status === 404)
          throw new DomainError('EVIDENCE_NOT_FOUND', 'Document not found in storage.', 404);
        throw new DomainError(
          'EVIDENCE_STORAGE_ERROR',
          'Evidence storage returned an error.',
          502,
          { status: response.status }
        );
      }
      const bytes = Buffer.from(await response.arrayBuffer());
      return {
        bytes,
        contentType: response.headers.get('content-type') ?? 'application/octet-stream',
        sizeBytes: bytes.length
      };
    });
  }

  private get mode(): 'LOCAL' | 'HTTP' | 'DISABLED' | 'S3' {
    const value = (this.config.get<string>('EVIDENCE_STORAGE_MODE') ?? 'LOCAL').toUpperCase();
    if (value === 'HTTP') return 'HTTP';
    if (value === 'S3') return 'S3';
    if (value === 'DISABLED') return 'DISABLED';
    return 'LOCAL';
  }
}
