import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import {
  DomainError,
  assertConsultationParticipants,
  assertJoinTokenUsable,
  publicParticipantName,
  transitionParticipant,
  assertAdvocateLocation
} from '@cims/domain';
import { AuditService } from '../../infrastructure/observability/audit.service.js';
import { ParticipantsRepository } from '../../infrastructure/persistence/repositories/participants.repository.js';
import type { CurrentUser } from '../../common/current-user.decorator.js';
import { requirePermission } from '../../common/authorization.js';
import { secretValue } from '../../infrastructure/config/secret-value.js';
import type {
  AdmitParticipantDto,
  RecordLocationDto,
  RegisterParticipantDto,
  StartConsultationDto
} from './dto.js';

@Injectable()
export class ParticipantsService {
  private readonly tokenPepper: string;
  constructor(
    config: ConfigService,
    private readonly repository: ParticipantsRepository,
    private readonly audit: AuditService
  ) {
    this.tokenPepper =
      secretValue(config, 'TOKEN_PEPPER') ?? 'development-token-pepper-not-for-production';
  }
  async list(hearingId: string, user: CurrentUser) {
    requirePermission(user, 'participant.read', hearingId);
    const canSee =
      user.permissions.includes('participant.protected.read') ||
      user.roles.includes('SYSTEM_ADMIN');
    return (await this.repository.list(hearingId, user)).map((item) => ({
      ...item,
      displayName: publicParticipantName({
        displayName: item.displayName,
        protectedIdentity: item.protectedIdentity,
        alias: item.alias,
        viewerCanSeeProtectedIdentity: canSee
      }),
      contactEmailEncrypted: undefined
    }));
  }
  async register(hearingId: string, dto: RegisterParticipantDto, user: CurrentUser) {
    requirePermission(user, 'participant.write', hearingId);
    const participant = await this.repository.create(
      {
        hearingId,
        organizationId: dto.organizationId,
        role: dto.role,
        displayName: dto.displayName,
        alias: dto.alias,
        protectedIdentity: dto.protectedIdentity,
        agendaItemId: dto.agendaItemId,
        contactEmail: dto.contactEmail,
        createdBy: user.id
      },
      user
    );
    await this.audit.record('PARTICIPANT_REGISTERED', 'HEARING_PARTICIPANT', participant.id, user, {
      hearingId,
      role: dto.role,
      protectedIdentity: dto.protectedIdentity
    });
    return { ...participant, contactEmailEncrypted: undefined };
  }
  async issueToken(
    hearingId: string,
    participantId: string,
    ttlSeconds: number,
    user: CurrentUser
  ) {
    requirePermission(user, 'participant.write', hearingId);
    const participant = await this.findParticipant(hearingId, participantId, user);
    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = this.hash(rawToken);
    const now = new Date();
    await this.repository.revokeActiveTokens(participantId, now.toISOString(), user);
    const next = transitionParticipant(participant.state as never, 'ISSUE_TOKEN');
    await this.repository.setState(participantId, next, user);
    const record = {
      id: randomUUID(),
      participantId,
      hearingId,
      tokenHash,
      fingerprint: tokenHash.slice(0, 12),
      expiresAt: new Date(now.getTime() + ttlSeconds * 1000).toISOString(),
      createdBy: user.id,
      createdAt: now.toISOString()
    };
    await this.repository.createToken(record, user);
    await this.audit.record(
      'PARTICIPANT_TOKEN_ISSUED',
      'PARTICIPANT_ACCESS_TOKEN',
      record.id,
      user,
      { hearingId, participantId, expiresAt: record.expiresAt, fingerprint: record.fingerprint }
    );
    return { token: rawToken, expiresAt: record.expiresAt, fingerprint: record.fingerprint };
  }
  async exchange(tokenValue: string) {
    const tokenHash = this.hash(tokenValue);
    const record = await this.repository.findTokenByHash(tokenHash);
    if (!record) throw new DomainError('JOIN_TOKEN_INVALID', 'The join token is invalid.', 401);
    assertJoinTokenUsable(record, tokenHash);
    await this.repository.consumeIntoWaiting(record, new Date().toISOString());
    return {
      participantId: record.participantId,
      hearingId: record.hearingId,
      state: 'WAITING',
      accessFingerprint: record.fingerprint
    };
  }
  async admit(
    hearingId: string,
    participantId: string,
    dto: AdmitParticipantDto,
    user: CurrentUser
  ) {
    requirePermission(user, 'participant.admit', hearingId);
    const participant = await this.findParticipant(hearingId, participantId, user);
    const next = transitionParticipant(participant.state as never, 'ADMIT');
    const session = await this.repository.admit(
      hearingId,
      participantId,
      dto.roomCode,
      new Date().toISOString(),
      user
    );
    if (!session)
      throw new DomainError(
        'WAITING_SESSION_REQUIRED',
        'The participant is not in the waiting room.'
      );
    await this.audit.record('PARTICIPANT_ADMITTED', 'HEARING_PARTICIPANT', participantId, user, {
      hearingId,
      roomCode: dto.roomCode
    });
    return { participant: { ...participant, state: next }, session };
  }
  async leave(
    hearingId: string,
    participantId: string,
    reason: string | undefined,
    user: CurrentUser
  ) {
    requirePermission(user, 'participant.admit', hearingId);
    const participant = await this.findParticipant(hearingId, participantId, user);
    const next = transitionParticipant(participant.state as never, 'LEAVE');
    await this.repository.leave(hearingId, participantId, new Date().toISOString(), user);
    await this.audit.record('PARTICIPANT_LEFT', 'HEARING_PARTICIPANT', participantId, user, {
      hearingId,
      reason
    });
    return { ...participant, state: next };
  }
  async attendance(hearingId: string, user: CurrentUser) {
    requirePermission(user, 'attendance.read', hearingId);
    const events = await this.repository.attendance(hearingId, user);
    return {
      hearingId,
      participantCount: new Set(events.map((item) => item.participantId)).size,
      events
    };
  }
  async startConsultation(hearingId: string, dto: StartConsultationDto, user: CurrentUser) {
    requirePermission(user, 'consultation.manage', hearingId);
    if (await this.repository.activeConsultation(hearingId, user))
      throw new DomainError(
        'CONSULTATION_ALREADY_ACTIVE',
        'A private consultation is already active.'
      );
    const defendant = await this.findParticipant(hearingId, dto.defendantParticipantId, user);
    const advocate = await this.findParticipant(hearingId, dto.advocateParticipantId, user);
    assertConsultationParticipants([defendant.role as never, advocate.role as never]);
    const record = await this.repository.createConsultation(
      {
        hearingId,
        defendantParticipantId: defendant.id,
        advocateParticipantId: advocate.id,
        startedBy: user.id,
        startedAt: new Date().toISOString()
      },
      user
    );
    await this.audit.record(
      'PRIVATE_CONSULTATION_STARTED',
      'CONSULTATION_SESSION',
      record.id,
      user,
      { hearingId, recordingAllowed: false }
    );
    return { ...record, recordingAllowed: false };
  }
  async endConsultation(hearingId: string, user: CurrentUser) {
    requirePermission(user, 'consultation.manage', hearingId);
    const record = await this.repository.endConsultation(
      hearingId,
      user.id,
      new Date().toISOString(),
      user
    );
    if (!record)
      throw new DomainError('CONSULTATION_NOT_ACTIVE', 'No private consultation is active.');
    await this.audit.record('PRIVATE_CONSULTATION_ENDED', 'CONSULTATION_SESSION', record.id, user, {
      hearingId
    });
    return record;
  }

  async recordLocation(
    hearingId: string,
    participantId: string,
    dto: RecordLocationDto,
    user: CurrentUser,
    correlationId?: string
  ) {
    requirePermission(user, 'participant.write', hearingId);
    const participant = await this.findParticipant(hearingId, participantId, user);

    // H-12: SOP 10.8 — Jika peran adalah advokat, validasi lokasinya relatif terhadap terdakwa
    if (participant.role === 'ADVOCATE') {
      const defendantLocationType = 'CORRECTIONS'; // Simulasi/placeholder: dalam realitas harus fetch dari record terdakwa
      assertAdvocateLocation(dto.location_type, defendantLocationType, dto.determination_reference);
    }

    const record = await this.repository.recordLocation(
      hearingId,
      participantId,
      participant.role,
      dto,
      user
    );
    await this.audit.record(
      'PARTICIPANT_LOCATION_RECORDED',
      'HEARING_PARTICIPANT',
      participantId,
      user,
      { locationType: dto.location_type, determinationReference: dto.determination_reference },
      correlationId
    );
    return record;
  }

  private async findParticipant(hearingId: string, participantId: string, user: CurrentUser) {
    const p = await this.repository.find(hearingId, participantId, user);
    if (!p) throw new DomainError('PARTICIPANT_NOT_FOUND', 'Participant was not found.', 404);
    return p;
  }
  private hash(value: string) {
    return createHmac('sha256', this.tokenPepper).update(value).digest('hex');
  }
}
