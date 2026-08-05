import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { ProviderWebhookService } from '../../../src/modules/provider-webhooks/provider-webhook.service.js';
import { PersistenceModeService } from '../../../src/infrastructure/persistence/database/persistence-mode.service.js';
import { PgPoolService } from '../../../src/infrastructure/persistence/database/pg-pool.service.js';
import { AuditService } from '../../../src/infrastructure/observability/audit.service.js';
import { MetricsService } from '../../../src/infrastructure/observability/metrics.service.js';

describe('ProviderWebhookService', () => {
  let service: ProviderWebhookService;
  let config: ConfigService;
  let modeService: PersistenceModeService;
  let pg: PgPoolService;
  let audit: AuditService;
  let metrics: MetricsService;

  const TEST_SECRET = 'a-very-long-test-secret-that-is-at-least-16-bytes';
  
  beforeEach(() => {
    config = {
      get: vi.fn().mockImplementation((key) => {
        if (key === 'WEBHOOK_SHARED_SECRET') return TEST_SECRET;
        if (key === 'WEBHOOK_TOLERANCE_SECONDS') return '300';
        return undefined;
      })
    } as unknown as ConfigService;
    
    modeService = { postgres: false } as unknown as PersistenceModeService;
    pg = { transaction: vi.fn() } as unknown as PgPoolService;
    audit = { append: vi.fn() } as unknown as AuditService;
    metrics = { increment: vi.fn() } as unknown as MetricsService;
    
    service = new ProviderWebhookService(config, modeService, pg, audit, metrics);
  });

  const generateSignature = (timestamp: string, rawBody: Buffer): string => {
    return `sha256=${createHmac('sha256', TEST_SECRET).update(`${timestamp}.`).update(rawBody).digest('hex')}`;
  };

  it('rejects missing configuration', async () => {
    config = { get: vi.fn().mockReturnValue(undefined) } as unknown as ConfigService;
    service = new ProviderWebhookService(config, modeService, pg, audit, metrics);
    
    await expect(service.ingest('ZOOM', Buffer.from('{}'), {}, {}))
      .rejects.toThrow('Webhook shared secret is not configured.');
  });

  it('rejects missing signature and timestamp', async () => {
    await expect(service.ingest('ZOOM', Buffer.from('{}'), {}, {}))
      .rejects.toThrow('Webhook signature and timestamp are required.');
  });

  it('rejects expired timestamp (anti-replay window)', async () => {
    const rawBody = Buffer.from('{}');
    // Timestamp from 1 hour ago
    const oldTimestamp = Math.floor(Date.now() / 1000 - 3600).toString();
    const signature = generateSignature(oldTimestamp, rawBody);
    
    await expect(service.ingest('ZOOM', rawBody, {}, { timestamp: oldTimestamp, signature }))
      .rejects.toThrow('Webhook timestamp is outside the accepted tolerance.');
  });

  it('rejects future timestamp (anti-replay window)', async () => {
    const rawBody = Buffer.from('{}');
    // Timestamp from 1 hour in the future
    const futureTimestamp = Math.floor(Date.now() / 1000 + 3600).toString();
    const signature = generateSignature(futureTimestamp, rawBody);
    
    await expect(service.ingest('ZOOM', rawBody, {}, { timestamp: futureTimestamp, signature }))
      .rejects.toThrow('Webhook timestamp is outside the accepted tolerance.');
  });

  it('rejects invalid signature', async () => {
    const rawBody = Buffer.from('{"event":"test"}');
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = 'sha256=invalidhash1234567890abcdef1234567890abcdef1234567890abcdef12345';
    
    await expect(service.ingest('ZOOM', rawBody, {}, { timestamp, signature }))
      .rejects.toThrow('Webhook signature is invalid.');
  });

  it('accepts valid signature and returns PROCESSED in memory mode', async () => {
    const payload = { event_id: 'ev-123', event_type: 'participant.waiting' };
    const rawBody = Buffer.from(JSON.stringify(payload));
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = generateSignature(timestamp, rawBody);
    
    const result = await service.ingest('ZOOM', rawBody, payload, { timestamp, signature });
    
    expect(result).toEqual({ status: 'PROCESSED', event_id: 'ev-123', mode: 'MEMORY' });
    expect(metrics.increment).toHaveBeenCalledWith('provider_webhook_events_total', expect.any(Object));
  });

  it('detects and rejects duplicate events in memory mode', async () => {
    const payload = { event_id: 'ev-123', event_type: 'participant.waiting' };
    const rawBody = Buffer.from(JSON.stringify(payload));
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = generateSignature(timestamp, rawBody);
    
    // First ingest
    await service.ingest('ZOOM', rawBody, payload, { timestamp, signature });
    
    // Second ingest (duplicate)
    const result2 = await service.ingest('ZOOM', rawBody, payload, { timestamp, signature });
    expect(result2).toEqual({ status: 'DUPLICATE', event_id: 'ev-123' });
  });

  describe('Postgres mode', () => {
    beforeEach(() => {
      modeService.postgres = true;
      vi.mocked(pg.transaction).mockImplementation(async (cb) => {
        // Mocks successful insertion and processing
        return true; 
      });
    });

    it('processes event and writes to audit when hearing_id is present', async () => {
      const payload = { event_id: 'ev-123', event_type: 'participant.waiting', hearing_id: 'h-1' };
      const rawBody = Buffer.from(JSON.stringify(payload));
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = generateSignature(timestamp, rawBody);
      
      const result = await service.ingest('ZOOM', rawBody, payload, { timestamp, signature });
      
      expect(result).toEqual({ status: 'PROCESSED', event_id: 'ev-123' });
      expect(pg.transaction).toHaveBeenCalled();
      expect(audit.append).toHaveBeenCalledWith(expect.objectContaining({
        eventType: 'VIDEO_PROVIDER_EVENT_RECEIVED',
        objectId: 'h-1'
      }));
    });

    it('returns DUPLICATE when postgres transaction returns false', async () => {
      vi.mocked(pg.transaction).mockResolvedValue(false); // simulates duplicate conflict

      const payload = { event_id: 'ev-123' };
      const rawBody = Buffer.from(JSON.stringify(payload));
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = generateSignature(timestamp, rawBody);
      
      const result = await service.ingest('ZOOM', rawBody, payload, { timestamp, signature });
      
      expect(result).toEqual({ status: 'DUPLICATE', event_id: 'ev-123' });
      expect(metrics.increment).not.toHaveBeenCalled();
    });
  });
});
