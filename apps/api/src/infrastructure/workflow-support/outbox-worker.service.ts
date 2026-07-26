import { Injectable, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CurrentUser } from '../../common/current-user.decorator.js';
import { AuditService } from '../observability/audit.service.js';
import { MetricsService } from '../observability/metrics.service.js';
import { NotificationGateway } from '../integration/notification.gateway.js';
import { OfficialSystemGateway } from '../integration/official-system.gateway.js';
import { OutboxService, type OutboxEventRecord } from '../persistence/database/outbox.service.js';
import { PersistenceModeService } from '../persistence/database/persistence-mode.service.js';
import { CoreWorkflowRepository } from '../persistence/repositories/core-workflow.repository.js';
import { NoticesRepository } from '../persistence/repositories/notices.repository.js';
import { ReconciliationRepository } from '../persistence/repositories/reconciliation.repository.js';
import { VirtualSessionsRepository } from '../persistence/repositories/virtual-sessions.repository.js';
import { VideoProviderGateway } from '../integration/video-provider.gateway.js';
import { GovernanceRepository } from '../persistence/repositories/governance.repository.js';

@Injectable()
export class OutboxWorkerService implements OnApplicationBootstrap, OnApplicationShutdown {
  private timer?: NodeJS.Timeout;
  private running = false;
  private readonly workerId = `cims-api-${process.pid}-${Math.random().toString(16).slice(2)}`;
  private readonly enabled: boolean;
  private readonly intervalMs: number;
  private readonly batchSize: number;
  private readonly maxAttempts: number;

  constructor(
    config: ConfigService,
    private readonly mode: PersistenceModeService,
    private readonly outbox: OutboxService,
    private readonly notifications: NotificationGateway,
    private readonly notices: NoticesRepository,
    private readonly reconciliation: ReconciliationRepository,
    private readonly officialSystem: OfficialSystemGateway,
    private readonly virtualSessions: VirtualSessionsRepository,
    private readonly core: CoreWorkflowRepository,
    private readonly videoProvider: VideoProviderGateway,
    private readonly audit: AuditService,
    private readonly metrics: MetricsService,
    private readonly governance: GovernanceRepository
  ) {
    this.enabled =
      (config && config.get ? config.get<string>('OUTBOX_WORKER_ENABLED') : undefined) !== 'false';
    this.intervalMs = Number(
      (config && config.get ? config.get<string>('OUTBOX_POLL_INTERVAL_MS') : undefined) ?? 1000
    );
    this.batchSize = Number(
      (config && config.get ? config.get<string>('OUTBOX_BATCH_SIZE') : undefined) ?? 20
    );
    this.maxAttempts = Number(
      (config && config.get ? config.get<string>('OUTBOX_MAX_ATTEMPTS') : undefined) ?? 8
    );
  }

  onApplicationBootstrap(): void {
    if (!this.mode.postgres || !this.enabled) return;
    this.timer = setInterval(() => void this.tick(), this.intervalMs);
    this.timer.unref();
    void this.tick();
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    while (this.running) await new Promise((resolve) => setTimeout(resolve, 25));
  }

  async tick(): Promise<void> {
    if (this.running || !this.mode.postgres || !this.enabled) return;
    this.running = true;
    try {
      const events = await this.outbox.claimBatch(this.workerId, this.batchSize);
      for (const event of events) await this.process(event);
    } finally {
      this.running = false;
    }
  }

  private async process(event: OutboxEventRecord): Promise<void> {
    const started = Date.now();
    try {
      if (event.eventType === 'OFFICIAL_NOTICE_DELIVERY_REQUESTED') await this.deliverNotice(event);
      else if (event.eventType === 'VIRTUAL_SESSION_PROVISION_REQUESTED')
        await this.provisionVirtualSession(event);
      else if (event.eventType === 'OFFICIAL_RECONCILIATION_REQUESTED') await this.reconcile(event);
      else if (event.eventType === 'EVIDENCE_EXPORT_REQUESTED') await this.exportEvidence(event);
      else if (event.eventType === 'SCHEDULE_CHANGED') await this.notifyScheduleChange(event);
      else throw new Error(`Unsupported outbox event type: ${event.eventType}`);
      await this.outbox.markPublished(event.id);
      this.metrics.increment('outbox_events_published_total', { event_type: event.eventType });
      this.metrics.observe('outbox_handler_duration_ms', Date.now() - started, {
        event_type: event.eventType
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.outbox.markFailed(event.id, message, event.attemptCount, this.maxAttempts);
      this.metrics.increment('outbox_events_failed_total', { event_type: event.eventType });
    }
  }

  private async deliverNotice(event: OutboxEventRecord): Promise<void> {
    const recipientId = String(event.payload.recipient_id ?? event.aggregateId);
    const payload = await this.notices.deliveryPayload(recipientId);
    const result = await this.notifications.send({
      channel: payload.channel,
      destination: payload.destination,
      subject: payload.subject,
      message: payload.message,
      officialReference: payload.officialReference,
      correlationId: event.correlationId
    });
    await this.notices.recordDeliveryResult(recipientId, result);
    await this.audit.append({
      eventType:
        result.status === 'DELIVERED'
          ? 'OFFICIAL_NOTICE_DELIVERED'
          : 'OFFICIAL_NOTICE_DELIVERY_FAILED',
      objectType: 'HEARING',
      objectId: payload.hearingId,
      correlationId: event.correlationId,
      payload: {
        notice_id: payload.noticeId,
        recipient_id: recipientId,
        channel: payload.channel,
        provider_reference: result.providerReference ?? null,
        error_code: result.errorCode ?? null
      }
    });
  }

  private async provisionVirtualSession(event: OutboxEventRecord): Promise<void> {
    const id = String(event.payload.virtual_session_id ?? event.aggregateId);
    const session = await this.virtualSessions.getById(id);
    if (!session || session.state === 'READY') return;
    const user = this.systemUser(session.hearingId);
    const schedule = await this.core.activeSchedule(session.hearingId, user);
    if (!schedule)
      throw new Error('Active schedule was not found for virtual session provisioning.');
    const health = await this.videoProvider.health(event.correlationId);
    if (health.status !== 'HEALTHY') throw new Error('Video provider is not healthy.');
    try {
      const providerSession = await this.videoProvider.createSession(
        {
          hearingReference: session.hearingId,
          startAt: schedule.startAt,
          endAt: schedule.endAt,
          recordingPolicy: session.recordingPolicy
        },
        event.correlationId,
        event.id
      );
      const definitions = [
        ['MAIN', 'MAIN', session.recordingPolicy === 'COURT_CONTROLLED'],
        ['WAITING', 'WAITING', false],
        ['DEFENDANT', 'DEFENDANT', false],
        ['WITNESS', 'WITNESS', false],
        ['CONSULTATION', 'CONSULTATION', false]
      ] as const;
      const rooms: Array<{
        roomCode: 'DEFENDANT' | 'MAIN' | 'WAITING' | 'WITNESS' | 'CONSULTATION';
        roomType: string;
        providerRoomReference: string;
        recordingAllowed: boolean;
      }> = [];
      for (const [roomCode, roomType, recordingAllowed] of definitions) {
        const room = await this.videoProvider.createRoom(
          providerSession.providerSessionReference,
          { roomCode, roomType, recordingAllowed },
          event.correlationId,
          `${event.id}:${roomCode}`
        );
        rooms.push({
          roomCode,
          roomType,
          providerRoomReference: room.providerRoomReference,
          recordingAllowed
        });
      }
      await this.virtualSessions.markReady(id, providerSession.providerSessionReference, rooms);
      await this.audit.append(
        {
          eventType: 'VIRTUAL_SESSION_READY',
          objectType: 'HEARING',
          objectId: session.hearingId,
          correlationId: event.correlationId,
          payload: {
            virtual_session_id: id,
            provider_session_reference: providerSession.providerSessionReference,
            room_count: rooms.length
          }
        },
        user
      );
    } catch (error) {
      await this.virtualSessions.markFailed(
        id,
        error instanceof Error ? error.name : 'PROVIDER_ERROR'
      );
      throw error;
    }
  }

  private async exportEvidence(event: OutboxEventRecord): Promise<void> {
    const exportId = String(event.payload.export_id ?? event.aggregateId);
    const hearingId = String(event.payload.hearing_id ?? '');
    if (!hearingId) throw new Error('Evidence export event is missing hearing_id.');
    await this.governance.processEvidenceExport(exportId, hearingId, event.correlationId);
    await this.audit.append(
      {
        eventType: 'EVIDENCE_EXPORT_COMPLETED',
        objectType: 'HEARING',
        objectId: hearingId,
        correlationId: event.correlationId,
        payload: { evidence_export_id: exportId }
      },
      this.systemUser(hearingId)
    );
  }

  private async reconcile(event: OutboxEventRecord): Promise<void> {
    const runId = String(event.payload.run_id ?? event.aggregateId);
    const claimed = await this.reconciliation.claimForProcessing(runId);
    if (!claimed) return;
    try {
      const cimsSnapshot = await this.reconciliation.cimsSnapshot(claimed.hearingId);
      const sourceSnapshot = await this.officialSystem.snapshot(
        claimed.hearingId,
        cimsSnapshot,
        event.correlationId
      );
      await this.reconciliation.complete(runId, cimsSnapshot, sourceSnapshot);
      await this.audit.append(
        {
          eventType: 'RECONCILIATION_COMPLETED',
          objectType: 'HEARING',
          objectId: claimed.hearingId,
          correlationId: event.correlationId,
          payload: { reconciliation_run_id: runId, source_system: claimed.sourceSystem }
        },
        this.systemUser(claimed.hearingId)
      );
    } catch (error) {
      await this.reconciliation.fail(runId, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * H-02: Kirim pemberitahuan PERUBAHAN_JADWAL ke semua penerima notice aktif.
   * Dipanggil oleh outbox worker saat jadwal lama di-supersede oleh jadwal baru.
   * SOP 10.3: perubahan jadwal wajib memicu pemberitahuan ulang ke semua pihak.
   */
  private async notifyScheduleChange(event: OutboxEventRecord): Promise<void> {
    const hearingId = String(event.payload.hearing_id ?? event.aggregateId);
    const newStartAt = String(event.payload.new_start_at ?? '');
    const newEndAt = String(event.payload.new_end_at ?? '');
    const changeReason = String(event.payload.change_reason ?? 'Jadwal sidang telah diubah.');
    const scheduleId = String(event.payload.schedule_id ?? '');

    const user = this.systemUser(hearingId);

    // Ambil semua notice aktif untuk hearing ini dan kirim ulang sebagai PERUBAHAN_JADWAL
    const existingNotices = await this.notices.list(hearingId, user);
    const activeNotices = existingNotices.filter(
      (n: { status: string }) => !['CANCELLED'].includes(n.status)
    );

    if (activeNotices.length === 0) {
      // Tidak ada notice sebelumnya — catat di audit saja
      await this.audit.append(
        {
          eventType: 'SCHEDULE_CHANGE_NO_PRIOR_NOTICES',
          objectType: 'HEARING',
          objectId: hearingId,
          correlationId: event.correlationId,
          payload: { schedule_id: scheduleId, note: 'Tidak ada notice aktif untuk di-re-notify.' }
        },
        user
      );
      return;
    }

    // Kumpulkan semua penerima unik dari notice sebelumnya
    const recipientSet = new Map<
      string,
      {
        recipientUserId?: string;
        recipientOrganizationId?: string;
        recipientName: string;
        destination: string;
        channel: string;
      }
    >();

    for (const notice of activeNotices as Array<{
      recipients?: Array<{
        recipientUserId?: string;
        recipientOrganizationId?: string;
        recipientName: string;
        destination: string;
        preferredChannel: string;
      }>;
    }>) {
      for (const r of notice.recipients ?? []) {
        const key = r.recipientUserId ?? r.recipientOrganizationId ?? r.destination;
        if (!recipientSet.has(key)) {
          recipientSet.set(key, {
            recipientUserId: r.recipientUserId,
            recipientOrganizationId: r.recipientOrganizationId,
            recipientName: r.recipientName,
            destination: r.destination,
            channel: r.preferredChannel
          });
        }
      }
    }

    if (recipientSet.size === 0) return;

    // Kirim notifikasi perubahan jadwal ke setiap penerima via notification gateway
    const startFormatted = newStartAt
      ? new Date(newStartAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
      : '(lihat sistem)';

    for (const [, recipient] of recipientSet) {
      try {
        await this.notifications.send({
          channel: recipient.channel as 'EMAIL' | 'WHATSAPP' | 'SMS' | 'IN_APP',
          destination: recipient.destination,
          subject: `[CIMS] Perubahan Jadwal Sidang — ${hearingId}`,
          message: `Jadwal sidang telah diubah.\n\nJadwal baru: ${startFormatted}\nAlasan: ${changeReason}\n\nHarap konfirmasi penerimaan pemberitahuan ini.`,
          officialReference: `PERUBAHAN-JADWAL/${scheduleId}`,
          correlationId: event.correlationId
        });
      } catch (err) {
        // Log tapi tidak gagalkan seluruh event — lanjutkan ke penerima berikutnya
        await this.audit.append(
          {
            eventType: 'SCHEDULE_CHANGE_NOTIFY_FAILED',
            objectType: 'HEARING',
            objectId: hearingId,
            correlationId: event.correlationId,
            payload: {
              recipient_name: recipient.recipientName,
              error: err instanceof Error ? err.message : String(err)
            }
          },
          user
        );
      }
    }

    await this.audit.append(
      {
        eventType: 'SCHEDULE_CHANGE_NOTIFICATIONS_SENT',
        objectType: 'HEARING',
        objectId: hearingId,
        correlationId: event.correlationId,
        payload: {
          schedule_id: scheduleId,
          new_start_at: newStartAt,
          new_end_at: newEndAt,
          change_reason: changeReason,
          recipient_count: recipientSet.size
        }
      },
      user
    );
  }

  private systemUser(hearingId: string): CurrentUser {
    return {
      id: 'cims-outbox-worker',
      name: 'CIMS Outbox Worker',
      role: 'SYSTEM_ADMIN',
      roles: ['SYSTEM_ADMIN'],
      organizationId: 'system',
      organizationIds: [],
      permissions: ['*'],
      hearingAssignments: [hearingId],
      authSource: 'DEV'
    };
  }
}
