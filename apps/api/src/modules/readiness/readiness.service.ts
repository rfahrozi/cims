import { Injectable } from '@nestjs/common';
import { DomainError } from '@cims/domain';
import { requireRoles } from '../../common/authorization.js';
import type { CurrentUser } from '../../common/current-user.decorator.js';
import { AuditService } from '../../infrastructure/observability/audit.service.js';
import { CoreWorkflowRepository } from '../../infrastructure/persistence/repositories/core-workflow.repository.js';
import { NoticesRepository } from '../../infrastructure/persistence/repositories/notices.repository.js';
import { ReadinessRepository } from '../../infrastructure/persistence/repositories/readiness.repository.js';
import type { IdentityVerificationDto, RoomInspectionDto, SubmitReadinessDto } from './dto.js';

@Injectable()
export class ReadinessService {
  constructor(
    private readonly core: CoreWorkflowRepository,
    private readonly notices: NoticesRepository,
    private readonly repository: ReadinessRepository,
    private readonly audit: AuditService
  ) {}

  async verifyIdentity(
    user: CurrentUser,
    hearingId: string,
    dto: IdentityVerificationDto,
    correlationId?: string
  ) {
    // SOP 10.9: Selain Pemasyarakatan (terdakwa), Panitera juga memverifikasi saksi, dan Jaksa juga bisa memverifikasi ahli
    requireRoles(user, ['CORRECTIONS', 'COURT_CLERK', 'PROSECUTOR']);
    await this.core.getHearing(hearingId, user);

    // Validasi peran pengawas untuk peran rentan (saksi/ahli)
    if (['WITNESS', 'EXPERT', 'INTERPRETER'].includes(dto.participant_role ?? '')) {
      if (!dto.supervisor_officer_id || !dto.supervisor_officer_name) {
        throw new DomainError(
          'SUPERVISOR_REQUIRED',
          'Verifikasi saksi, ahli, atau penerjemah wajib mencantumkan petugas pengawas (SOP 10.9).',
          422
        );
      }
    }

    const record = await this.repository.createIdentityVerification(
      {
        hearingId,
        organizationId: user.organizationId,
        participantReference: dto.participant_reference,
        participantRole: dto.participant_role,
        method: dto.method,
        result: dto.result,
        locationCode: dto.location_code,
        supervisorOfficerId: dto.supervisor_officer_id,
        supervisorOfficerName: dto.supervisor_officer_name,
        notes: dto.notes,
        verifiedBy: user.id,
        verifiedAt: new Date().toISOString()
      },
      user
    );
    await this.audit.append(
      {
        eventType: 'IDENTITY_VERIFIED',
        objectType: 'HEARING',
        objectId: hearingId,
        actorUserId: user.id,
        actorOrganizationId: user.organizationId,
        correlationId,
        payload: {
          verification_id: record.id,
          participant_reference: dto.participant_reference,
          participant_role: dto.participant_role ?? null,
          supervisor_officer_id: dto.supervisor_officer_id ?? null,
          result: record.result
        }
      },
      user
    );
    return record;
  }

  async inspectRoom(
    user: CurrentUser,
    hearingId: string,
    dto: RoomInspectionDto,
    correlationId?: string
  ) {
    requireRoles(user, ['CORRECTIONS', 'COURT_CLERK', 'IT_OPERATOR']);
    await this.core.getHearing(hearingId, user);
    const result: 'PASS' | 'FAIL' =
      dto.camera_full_view && dto.unauthorized_person_absent && dto.confidentiality_ready
        ? 'PASS'
        : 'FAIL';
    const record = await this.repository.createRoomInspection(
      {
        hearingId,
        organizationId: user.organizationId,
        locationCode: dto.location_code,
        cameraFullView: dto.camera_full_view,
        unauthorizedPersonAbsent: dto.unauthorized_person_absent,
        confidentialityReady: dto.confidentiality_ready,
        result,
        notes: dto.notes,
        inspectedBy: user.id,
        inspectedAt: new Date().toISOString()
      },
      user
    );
    await this.audit.append(
      {
        eventType: 'ROOM_INSPECTED',
        objectType: 'HEARING',
        objectId: hearingId,
        actorUserId: user.id,
        actorOrganizationId: user.organizationId,
        correlationId,
        payload: { inspection_id: record.id, result }
      },
      user
    );
    return record;
  }

  async submit(
    user: CurrentUser,
    hearingId: string,
    dto: SubmitReadinessDto,
    correlationId?: string
  ) {
    requireRoles(user, ['COURT_CLERK', 'PROSECUTOR', 'CORRECTIONS', 'IT_OPERATOR']);
    await this.core.getHearing(hearingId, user);
    if (!(await this.core.activeSchedule(hearingId, user)))
      throw new DomainError('SCHEDULE_REQUIRED', 'An active schedule is required.', 409);
    const noticeGate = await this.notices.gate(hearingId, user);
    if (!noticeGate.ready)
      throw new DomainError(
        'NOTICE_ACK_REQUIRED',
        'Required official notices must be acknowledged before readiness submission.',
        409,
        noticeGate
      );
    const organization = await this.core.getOrganization(user.organizationId, user);
    if (organization.type === 'CORRECTIONS') {
      const verification = await this.repository.latestVerificationStatus(
        hearingId,
        user.organizationId,
        user
      );
      if (!verification.identity || !verification.room) {
        throw new DomainError(
          'VERIFICATION_REQUIRED',
          'Corrections readiness requires passed identity verification and room inspection.',
          409,
          {
            identity_verified: verification.identity,
            room_inspected: verification.room
          }
        );
      }
    }
    const itemReady = dto.items
      .filter((item) => item.required !== false)
      .every((item) => item.result === 'PASS');
    const technical = dto.technical_test;
    const technicalReady =
      [
        technical.camera,
        technical.microphone,
        technical.audio,
        technical.primary_network,
        technical.provider_access
      ].every((item) => item === 'PASS') && ['PASS', 'NA'].includes(technical.backup_network);
    const status: 'READY' | 'NOT_READY' = itemReady && technicalReady ? 'READY' : 'NOT_READY';
    const submission = await this.repository.submit(
      {
        hearingId,
        organizationId: user.organizationId,
        organizationType: organization.type,
        locationCode: dto.location_code,
        status,
        submittedBy: user.id,
        submittedAt: new Date().toISOString(),
        items: dto.items.map((item) => ({
          itemCode: item.item_code,
          required: item.required !== false,
          result: item.result,
          notes: item.notes
        })),
        technicalTest: {
          camera: technical.camera,
          microphone: technical.microphone,
          audio: technical.audio,
          primaryNetwork: technical.primary_network,
          backupNetwork: technical.backup_network,
          providerAccess: technical.provider_access,
          testedAt: new Date().toISOString()
        }
      },
      user
    );
    await this.audit.append(
      {
        eventType: 'READINESS_SUBMITTED',
        objectType: 'HEARING',
        objectId: hearingId,
        actorUserId: user.id,
        actorOrganizationId: user.organizationId,
        correlationId,
        payload: {
          submission_id: submission.id,
          organization_type: submission.organizationType,
          status: submission.status,
          version: submission.version
        }
      },
      user
    );
    return submission;
  }

  async list(hearingId: string, user: CurrentUser) {
    await this.core.getHearing(hearingId, user);
    return this.repository.list(hearingId, user);
  }

  gate(hearingId: string, user: CurrentUser) {
    return this.repository.gate(hearingId, user);
  }
}
