import { Injectable } from '@nestjs/common';
import { DomainError } from '@cims/domain';
import { requireRoles } from '../../common/authorization.js';
import type { CurrentUser } from '../../common/current-user.decorator.js';
import { AuditService } from '../../infrastructure/audit.service.js';
import { PersistenceModeService } from '../../infrastructure/database/persistence-mode.service.js';
import { CoreWorkflowRepository } from '../../infrastructure/repositories/core-workflow.repository.js';
import { NoticesRepository } from '../../infrastructure/repositories/notices.repository.js';
import { ReadinessRepository } from '../../infrastructure/repositories/readiness.repository.js';
import { VirtualSessionsRepository } from '../../infrastructure/repositories/virtual-sessions.repository.js';
import { VideoProviderGateway } from '../../infrastructure/video-provider.gateway.js';
import type { ProvisionVirtualSessionDto } from './dto.js';

@Injectable()
export class VirtualSessionsService {
  constructor(
    private readonly mode: PersistenceModeService,
    private readonly core: CoreWorkflowRepository,
    private readonly notices: NoticesRepository,
    private readonly readiness: ReadinessRepository,
    private readonly repository: VirtualSessionsRepository,
    private readonly provider: VideoProviderGateway,
    private readonly audit: AuditService,
  ) {}

  async provision(user: CurrentUser, hearingId: string, dto: ProvisionVirtualSessionDto, correlationId?: string, traceparent?: string) {
    requireRoles(user, ['COURT_CLERK', 'IT_OPERATOR']);
    await this.core.getHearing(hearingId, user);
    if (!(await this.core.hasApprovedDetermination(hearingId, user))) {
      throw new DomainError('DETERMINATION_REQUIRED', 'A valid judicial determination is required.', 409);
    }
    const schedule = await this.core.activeSchedule(hearingId, user);
    if (!schedule) throw new DomainError('SCHEDULE_REQUIRED', 'An active schedule is required.', 409);
    const noticeGate = await this.notices.gate(hearingId, user);
    if (!noticeGate.ready) throw new DomainError('NOTICE_ACK_REQUIRED', 'Required official notices must be acknowledged.', 409, noticeGate);
    const readinessGate = await this.readiness.gate(hearingId, user);
    if (!readinessGate.ready) throw new DomainError('READINESS_REQUIRED', 'All required organizations must be READY.', 409, readinessGate);
    const health = await this.provider.health(correlationId);
    if (health.status !== 'HEALTHY') throw new DomainError('PROVIDER_UNAVAILABLE', 'Video provider is not healthy.', 503, health);

    const session = await this.repository.requestProvision({
      hearingId,
      scheduleId: schedule.id,
      providerCode: health.mode,
      recordingPolicy: dto.recording_policy ?? 'DISABLED',
      createdBy: user.id,
    }, user, { correlationId, traceparent });

    await this.audit.append({
      eventType: 'VIRTUAL_SESSION_PROVISION_REQUESTED',
      objectType: 'HEARING',
      objectId: hearingId,
      actorUserId: user.id,
      actorOrganizationId: user.organizationId,
      correlationId,
      payload: { virtual_session_id: session.id, schedule_id: schedule.id, provider_code: health.mode },
    }, user);

    if (this.mode.postgres || session.state === 'READY') return session;

    try {
      const providerSession = await this.provider.createSession({
        hearingReference: hearingId,
        startAt: schedule.startAt,
        endAt: schedule.endAt,
        recordingPolicy: session.recordingPolicy,
      }, correlationId);
      const definitions = [
        ['MAIN', 'MAIN', session.recordingPolicy === 'COURT_CONTROLLED'],
        ['WAITING', 'WAITING', false],
        ['DEFENDANT', 'DEFENDANT', false],
        ['WITNESS', 'WITNESS', false],
        ['CONSULTATION', 'CONSULTATION', false],
      ] as const;
      const rooms: Array<{
        roomCode: 'MAIN' | 'WAITING' | 'DEFENDANT' | 'WITNESS' | 'CONSULTATION';
        roomType: string;
        providerRoomReference: string;
        recordingAllowed: boolean;
      }> = [];
      for (const [roomCode, roomType, recordingAllowed] of definitions) {
        const room = await this.provider.createRoom(providerSession.providerSessionReference, { roomCode, roomType, recordingAllowed }, correlationId);
        rooms.push({ roomCode, roomType, providerRoomReference: room.providerRoomReference, recordingAllowed });
      }
      await this.repository.markReady(session.id, providerSession.providerSessionReference, rooms);
      return this.repository.get(hearingId, user);
    } catch (error) {
      await this.repository.markFailed(session.id, error instanceof DomainError ? error.code : 'PROVIDER_ERROR');
      throw error;
    }
  }

  async get(hearingId: string, user: CurrentUser) {
    await this.core.getHearing(hearingId, user);
    return this.repository.get(hearingId, user);
  }
}
