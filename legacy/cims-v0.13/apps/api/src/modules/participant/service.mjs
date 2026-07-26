import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { DomainError, assert } from '../../common/domain-error.mjs';
import { requirePermission } from '../iam/authorization.mjs';
import { ProviderClient } from '../virtual/provider-client.mjs';

const now = () => new Date().toISOString();
const hashToken = (token) => createHash('sha256').update(token).digest('hex');
const ROLE_DEFAULT_ROOM = Object.freeze({
  JUDGE: 'MAIN',
  COURT_CLERK: 'MAIN',
  PROSECUTOR: 'MAIN',
  CORRECTIONS: 'DEFENDANT',
  DEFENDANT: 'DEFENDANT',
  ADVOCATE: 'DEFENDANT',
  WITNESS: 'WITNESS',
  EXPERT: 'WITNESS',
  INTERPRETER: 'MAIN',
  OTHER: 'WAITING'
});
const VALID_ROLES = Object.keys(ROLE_DEFAULT_ROOM);

export class ParticipantService {
  constructor(db, audit, config) {
    this.db = db;
    this.audit = audit;
    this.config = config;
    this.provider = new ProviderClient(config);
  }

  register(context, hearingId, payload, correlationId) {
    requirePermission(context, 'participant.manage', hearingId);
    assert(
      typeof payload.participant_reference === 'string' && payload.participant_reference.trim(),
      'VALIDATION_ERROR',
      'participant_reference is required.',
      400
    );
    assert(
      typeof payload.display_name === 'string' && payload.display_name.trim(),
      'VALIDATION_ERROR',
      'display_name is required.',
      400
    );
    assert(
      VALID_ROLES.includes(payload.participant_role),
      'VALIDATION_ERROR',
      'participant_role is invalid.',
      400
    );
    const hearing = this.db.get('select id from hearings where id=?', hearingId);
    if (!hearing) throw new DomainError('HEARING_NOT_FOUND', 'Hearing was not found.', 404);
    if (payload.user_id) {
      const user = this.db.get(
        "select id, organization_id from users where id=? and status='ACTIVE'",
        payload.user_id
      );
      if (!user)
        throw new DomainError(
          'USER_NOT_FOUND',
          'Participant user was not found or is inactive.',
          404
        );
      if (!context.isSystemAdmin) {
        const assigned = this.db.get(
          'select 1 from hearing_assignments where hearing_id=? and user_id=?',
          hearingId,
          payload.user_id
        );
        if (!assigned)
          throw new DomainError(
            'PARTICIPANT_NOT_ASSIGNED',
            'Internal participant must be assigned to the hearing.',
            409
          );
      }
    }
    const protectedIdentity = Boolean(payload.protected_identity);
    if (protectedIdentity)
      assert(
        typeof payload.public_alias === 'string' && payload.public_alias.trim(),
        'VALIDATION_ERROR',
        'public_alias is required for a protected identity.',
        400
      );
    const defaultRoom = payload.default_room_code ?? ROLE_DEFAULT_ROOM[payload.participant_role];
    assert(
      ['MAIN', 'WAITING', 'DEFENDANT', 'WITNESS', 'CONSULTATION'].includes(defaultRoom),
      'VALIDATION_ERROR',
      'default_room_code is invalid.',
      400
    );
    const contactEmail = payload.contact_email
      ? String(payload.contact_email).trim().toLowerCase()
      : null;
    if (contactEmail)
      assert(
        /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contactEmail),
        'VALIDATION_ERROR',
        'contact_email is invalid.',
        400
      );
    const id = randomUUID();
    const createdAt = now();
    try {
      this.db.run(
        `insert into hearing_participants(id,hearing_id,participant_reference,display_name,contact_email,participant_role,user_id,organization_id,protected_identity,public_alias,default_room_code,status,created_by,created_at)
        values(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        id,
        hearingId,
        payload.participant_reference.trim(),
        payload.display_name.trim(),
        contactEmail,
        payload.participant_role,
        payload.user_id ?? null,
        payload.organization_id ?? context.organization_id,
        protectedIdentity ? 1 : 0,
        protectedIdentity ? payload.public_alias.trim() : (payload.public_alias ?? null),
        defaultRoom,
        'REGISTERED',
        context.id,
        createdAt
      );
    } catch (error) {
      if (String(error.message).includes('UNIQUE'))
        throw new DomainError(
          'PARTICIPANT_DUPLICATE',
          'participant_reference is already registered for this hearing.',
          409
        );
      throw error;
    }
    this.audit.append({
      eventType: 'HEARING_PARTICIPANT_REGISTERED',
      actorUserId: context.id,
      actorOrganizationId: context.organization_id,
      objectType: 'HEARING_PARTICIPANT',
      objectId: id,
      correlationId,
      payload: {
        hearing_id: hearingId,
        participant_role: payload.participant_role,
        protected_identity: protectedIdentity,
        contact_email_present: Boolean(contactEmail)
      }
    });
    return this.#publicParticipant(this.#participant(id), context);
  }

  list(context, hearingId) {
    requirePermission(context, 'participant.read', hearingId);
    return this.db
      .all(
        `select p.*, ps.state as session_state, vr.room_code as current_room_code
      from hearing_participants p
      left join participant_sessions ps on ps.participant_id=p.id
      left join virtual_rooms vr on vr.id=ps.current_room_id
      where p.hearing_id=? order by p.created_at`,
        hearingId
      )
      .map((row) => this.#publicParticipant(row, context));
  }

  async issueJoinToken(context, hearingId, participantId, payload, correlationId) {
    requirePermission(context, 'virtual.token.issue', hearingId);
    const participant = this.#participant(participantId, hearingId);
    const session = this.#readyVirtualSession(hearingId);
    const roomCode = payload.room_code ?? 'WAITING';
    const room = this.#room(session.id, roomCode);
    const ttlMinutes = Number(payload.ttl_minutes ?? this.config.participantTokenTtlMinutes ?? 30);
    assert(
      Number.isInteger(ttlMinutes) && ttlMinutes >= 5 && ttlMinutes <= 120,
      'VALIDATION_ERROR',
      'ttl_minutes must be between 5 and 120.',
      400
    );
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000).toISOString();

    const activeTokens = this.db.all(
      `select * from participant_access_tokens where participant_id=? and virtual_session_id=? and state='ISSUED'`,
      participant.id,
      session.id
    );
    for (const token of activeTokens) {
      await this.provider
        .revokeAccess(token.provider_access_reference, correlationId)
        .catch(() => undefined);
      this.db.run(
        "update participant_access_tokens set state='REVOKED',revoked_at=? where id=?",
        now(),
        token.id
      );
    }

    const providerAccess = await this.provider.issueAccess(
      session.provider_session_reference,
      {
        participant_reference: participant.participant_reference,
        participant_email: participant.contact_email,
        participant_name: participant.protected_identity
          ? (participant.public_alias ?? 'Protected Participant')
          : participant.display_name,
        role: participant.participant_role,
        room_reference: room.provider_room_reference,
        room_type: room.room_type,
        expires_at: expiresAt,
        permissions: this.#providerPermissions(participant.participant_role, room.room_type)
      },
      correlationId
    );
    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = hashToken(rawToken);
    const tokenId = randomUUID();
    const issuedAt = now();
    this.db.run(
      `insert into participant_access_tokens(id,participant_id,virtual_session_id,room_id,provider_access_reference,token_hash,token_fingerprint,state,expires_at,issued_by,issued_at)
      values(?,?,?,?,?,?,?,?,?,?,?)`,
      tokenId,
      participant.id,
      session.id,
      room.id,
      providerAccess.participant_access_reference,
      tokenHash,
      tokenHash.slice(0, 16),
      'ISSUED',
      expiresAt,
      context.id,
      issuedAt
    );
    this.#attendance(hearingId, participant.id, 'TOKEN_ISSUED', room.id, context.id, {
      token_id: tokenId,
      expires_at: expiresAt
    });
    this.audit.append({
      eventType: 'PARTICIPANT_JOIN_TOKEN_ISSUED',
      actorUserId: context.id,
      actorOrganizationId: context.organization_id,
      objectType: 'HEARING_PARTICIPANT',
      objectId: participant.id,
      correlationId,
      payload: {
        hearing_id: hearingId,
        token_fingerprint: tokenHash.slice(0, 16),
        room_code: room.room_code,
        expires_at: expiresAt
      }
    });
    return {
      token_id: tokenId,
      participant_id: participant.id,
      participant_role: participant.participant_role,
      join_token: rawToken,
      join_path: `/join?token=${encodeURIComponent(rawToken)}`,
      room_code: room.room_code,
      expires_at: expiresAt,
      warning: 'The plaintext token is returned once and must not be logged or redistributed.'
    };
  }

  async exchangeJoinToken(payload, correlationId) {
    assert(
      typeof payload.join_token === 'string' && payload.join_token.length >= 32,
      'VALIDATION_ERROR',
      'join_token is required.',
      400
    );
    const tokenHash = hashToken(payload.join_token);
    const token = this.db.get(
      `select t.*, p.hearing_id,p.display_name,p.public_alias,p.protected_identity,p.participant_role,p.participant_reference,
      vs.provider_session_reference,vr.room_code,vr.room_type
      from participant_access_tokens t
      join hearing_participants p on p.id=t.participant_id
      join virtual_sessions vs on vs.id=t.virtual_session_id
      join virtual_rooms vr on vr.id=t.room_id
      where t.token_hash=?`,
      tokenHash
    );
    if (!token) throw new DomainError('JOIN_TOKEN_INVALID', 'Join token is invalid.', 401);
    if (token.state !== 'ISSUED')
      throw new DomainError(
        'JOIN_TOKEN_ALREADY_USED',
        'Join token has already been exchanged or revoked.',
        409,
        { state: token.state }
      );
    if (Date.parse(token.expires_at) <= Date.now()) {
      this.db.run("update participant_access_tokens set state='EXPIRED' where id=?", token.id);
      throw new DomainError('JOIN_TOKEN_EXPIRED', 'Join token has expired.', 410);
    }
    const providerAccess = await this.provider.getAccess(
      token.provider_access_reference,
      correlationId
    );
    if (providerAccess.revoked)
      throw new DomainError('JOIN_ACCESS_REVOKED', 'Provider access has been revoked.', 410);
    const exchangedAt = now();
    const state = token.room_type === 'WAITING' ? 'WAITING' : 'ADMITTED';
    this.db.transaction(() => {
      this.db.run(
        "update participant_access_tokens set state='EXCHANGED',exchanged_at=? where id=? and state='ISSUED'",
        exchangedAt,
        token.id
      );
      const existing = this.db.get(
        'select id from participant_sessions where participant_id=? and virtual_session_id=?',
        token.participant_id,
        token.virtual_session_id
      );
      if (existing)
        this.db.run(
          `update participant_sessions set provider_access_reference=?,current_room_id=?,previous_room_id=null,state=?,joined_at=coalesce(joined_at,?),left_at=null,updated_at=? where id=?`,
          token.provider_access_reference,
          token.room_id,
          state,
          exchangedAt,
          exchangedAt,
          existing.id
        );
      else
        this.db.run(
          `insert into participant_sessions(id,participant_id,virtual_session_id,provider_access_reference,current_room_id,state,joined_at,updated_at) values(?,?,?,?,?,?,?,?)`,
          randomUUID(),
          token.participant_id,
          token.virtual_session_id,
          token.provider_access_reference,
          token.room_id,
          state,
          exchangedAt,
          exchangedAt
        );
    });
    this.#attendance(
      token.hearing_id,
      token.participant_id,
      state === 'WAITING' ? 'JOINED_WAITING' : 'ADMITTED',
      token.room_id,
      null,
      { token_fingerprint: token.token_fingerprint }
    );
    this.audit.append({
      eventType: 'PARTICIPANT_JOIN_TOKEN_EXCHANGED',
      objectType: 'HEARING_PARTICIPANT',
      objectId: token.participant_id,
      correlationId,
      payload: { hearing_id: token.hearing_id, room_code: token.room_code, state }
    });
    return {
      participant_session_id: this.db.get(
        'select id from participant_sessions where participant_id=? and virtual_session_id=?',
        token.participant_id,
        token.virtual_session_id
      ).id,
      participant: {
        display_name: token.protected_identity ? token.public_alias : token.display_name,
        role: token.participant_role
      },
      state,
      room_code: token.room_code,
      provider_join_url: providerAccess.participant_join_url,
      expires_at: token.expires_at
    };
  }

  async admit(context, hearingId, participantId, payload, correlationId) {
    requirePermission(context, 'waiting.admit', hearingId);
    const participant = this.#participant(participantId, hearingId);
    const session = this.#participantSession(participant.id);
    assert(
      session.state === 'WAITING',
      'INVALID_PARTICIPANT_STATE',
      'Only a participant in WAITING state can be admitted.',
      409,
      { state: session.state }
    );
    const virtualSession = this.#readyVirtualSession(hearingId);
    const targetCode = payload.target_room_code ?? participant.default_room_code;
    assert(
      !['WAITING', 'CONSULTATION'].includes(targetCode),
      'VALIDATION_ERROR',
      'Admission target must be a hearing room.',
      400
    );
    const targetRoom = this.#room(virtualSession.id, targetCode);
    await this.provider.moveAccess(
      session.provider_access_reference,
      targetRoom.provider_room_reference,
      correlationId
    );
    const changedAt = now();
    this.db.run(
      `update participant_sessions set previous_room_id=current_room_id,current_room_id=?,state='ADMITTED',admitted_at=coalesce(admitted_at,?),updated_at=? where id=?`,
      targetRoom.id,
      changedAt,
      changedAt,
      session.id
    );
    this.#attendance(hearingId, participant.id, 'ADMITTED', targetRoom.id, context.id, {
      target_room_code: targetCode
    });
    this.audit.append({
      eventType: 'PARTICIPANT_ADMITTED',
      actorUserId: context.id,
      actorOrganizationId: context.organization_id,
      objectType: 'HEARING_PARTICIPANT',
      objectId: participant.id,
      correlationId,
      payload: { hearing_id: hearingId, target_room_code: targetCode }
    });
    return this.status(context, hearingId, participant.id);
  }

  async leave(context, hearingId, participantId, payload, correlationId) {
    requirePermission(context, 'waiting.admit', hearingId);
    const participant = this.#participant(participantId, hearingId);
    const session = this.#participantSession(participant.id);
    if (!['LEFT', 'REMOVED'].includes(session.state))
      await this.provider
        .revokeAccess(session.provider_access_reference, correlationId)
        .catch(() => undefined);
    const eventType = payload.removed ? 'REMOVED' : 'LEFT';
    const state = payload.removed ? 'REMOVED' : 'LEFT';
    const changedAt = now();
    this.db.run(
      'update participant_sessions set state=?,left_at=?,updated_at=? where id=?',
      state,
      changedAt,
      changedAt,
      session.id
    );
    this.#attendance(hearingId, participant.id, eventType, session.current_room_id, context.id, {
      reason: payload.reason ?? null
    });
    this.audit.append({
      eventType: `PARTICIPANT_${eventType}`,
      actorUserId: context.id,
      actorOrganizationId: context.organization_id,
      objectType: 'HEARING_PARTICIPANT',
      objectId: participant.id,
      correlationId,
      payload: { hearing_id: hearingId, reason: payload.reason ?? null }
    });
    return this.status(context, hearingId, participant.id);
  }

  status(context, hearingId, participantId) {
    requirePermission(context, 'participant.read', hearingId);
    const participant = this.#participant(participantId, hearingId);
    const session = this.db.get(
      `select ps.*,vr.room_code,vr.room_type from participant_sessions ps join virtual_rooms vr on vr.id=ps.current_room_id where ps.participant_id=? order by ps.updated_at desc limit 1`,
      participant.id
    );
    return { ...this.#publicParticipant(participant, context), session: session ?? null };
  }

  attendance(context, hearingId) {
    requirePermission(context, 'attendance.read', hearingId);
    const participants = this.db
      .all(
        `select p.id,p.participant_reference,p.display_name,p.public_alias,p.protected_identity,p.participant_role,
      ps.state,ps.joined_at,ps.admitted_at,ps.left_at,vr.room_code
      from hearing_participants p left join participant_sessions ps on ps.participant_id=p.id
      left join virtual_rooms vr on vr.id=ps.current_room_id where p.hearing_id=? order by p.created_at`,
        hearingId
      )
      .map((row) => ({
        ...row,
        display_name: row.protected_identity ? row.public_alias : row.display_name
      }));
    const events = this.db
      .all(
        `select ae.*,p.participant_role,case when p.protected_identity=1 then p.public_alias else p.display_name end as display_name,vr.room_code
      from attendance_events ae join hearing_participants p on p.id=ae.participant_id left join virtual_rooms vr on vr.id=ae.room_id
      where ae.hearing_id=? order by ae.sequence`,
        hearingId
      )
      .map((row) => ({ ...row, metadata: JSON.parse(row.metadata_json) }));
    return { hearing_id: hearingId, participants, events };
  }

  async startConsultation(context, hearingId, payload, correlationId) {
    requirePermission(context, 'consultation.control', hearingId);
    const runtime = this.db.get('select * from hearing_runtime where hearing_id=?', hearingId);
    if (!runtime || runtime.state !== 'STARTED')
      throw new DomainError(
        'HEARING_NOT_STARTED',
        'Private consultation requires a STARTED hearing.',
        409
      );
    assert(
      Array.isArray(payload.participant_ids) && payload.participant_ids.length >= 2,
      'VALIDATION_ERROR',
      'At least two participant_ids are required.',
      400
    );
    assert(
      typeof payload.reason === 'string' && payload.reason.trim().length >= 5,
      'VALIDATION_ERROR',
      'Consultation reason is required.',
      400
    );
    const active = this.db.get(
      "select id from consultation_sessions where hearing_id=? and state='ACTIVE'",
      hearingId
    );
    if (active)
      throw new DomainError(
        'CONSULTATION_ALREADY_ACTIVE',
        'A private consultation is already active.',
        409
      );
    const virtualSession = this.#readyVirtualSession(hearingId);
    const room = this.#room(virtualSession.id, 'CONSULTATION');
    assert(
      room.recording_allowed === 0,
      'CONSULTATION_RECORDING_POLICY_INVALID',
      'Consultation room must not allow recording.',
      500
    );
    const participants = payload.participant_ids.map((id) => this.#participant(id, hearingId));
    const sessions = participants.map((participant) => this.#participantSession(participant.id));
    for (const session of sessions)
      assert(
        session.state === 'ADMITTED',
        'INVALID_PARTICIPANT_STATE',
        'Consultation participants must be ADMITTED.',
        409,
        { participant_id: session.participant_id, state: session.state }
      );
    const id = randomUUID();
    const startedAt = now();
    this.db.run(
      `insert into consultation_sessions(id,hearing_id,virtual_session_id,consultation_room_id,state,reason,authorized_by,started_at) values(?,?,?,?,?,?,?,?)`,
      id,
      hearingId,
      virtualSession.id,
      room.id,
      'ACTIVE',
      payload.reason.trim(),
      context.id,
      startedAt
    );
    for (const session of sessions) {
      await this.provider.moveAccess(
        session.provider_access_reference,
        room.provider_room_reference,
        correlationId
      );
      this.db.run(
        'insert into consultation_participants(consultation_id,participant_id,previous_room_id) values(?,?,?)',
        id,
        session.participant_id,
        session.current_room_id
      );
      this.db.run(
        "update participant_sessions set previous_room_id=current_room_id,current_room_id=?,state='CONSULTATION',updated_at=? where id=?",
        room.id,
        startedAt,
        session.id
      );
      this.#attendance(
        hearingId,
        session.participant_id,
        'CONSULTATION_STARTED',
        room.id,
        context.id,
        { consultation_id: id }
      );
    }
    this.audit.append({
      eventType: 'PRIVATE_CONSULTATION_STARTED',
      actorUserId: context.id,
      actorOrganizationId: context.organization_id,
      objectType: 'HEARING',
      objectId: hearingId,
      correlationId,
      payload: {
        consultation_id: id,
        participant_count: participants.length,
        recording_allowed: false
      }
    });
    return this.consultation(context, hearingId);
  }

  async endConsultation(context, hearingId, payload, correlationId) {
    requirePermission(context, 'consultation.control', hearingId);
    const consultation = this.db.get(
      "select * from consultation_sessions where hearing_id=? and state='ACTIVE'",
      hearingId
    );
    if (!consultation)
      throw new DomainError(
        'CONSULTATION_NOT_ACTIVE',
        'No active private consultation was found.',
        409
      );
    const links = this.db.all(
      `select cp.*,ps.id as participant_session_id,ps.provider_access_reference,vr.provider_room_reference,vr.room_code
      from consultation_participants cp join participant_sessions ps on ps.participant_id=cp.participant_id
      join virtual_rooms vr on vr.id=cp.previous_room_id where cp.consultation_id=?`,
      consultation.id
    );
    const endedAt = now();
    for (const link of links) {
      await this.provider.moveAccess(
        link.provider_access_reference,
        link.provider_room_reference,
        correlationId
      );
      this.db.run(
        "update participant_sessions set current_room_id=?,previous_room_id=null,state='ADMITTED',updated_at=? where id=?",
        link.previous_room_id,
        endedAt,
        link.participant_session_id
      );
      this.#attendance(
        hearingId,
        link.participant_id,
        'CONSULTATION_ENDED',
        link.previous_room_id,
        context.id,
        { consultation_id: consultation.id }
      );
    }
    this.db.run(
      "update consultation_sessions set state='ENDED',ended_by=?,ended_at=? where id=?",
      context.id,
      endedAt,
      consultation.id
    );
    this.audit.append({
      eventType: 'PRIVATE_CONSULTATION_ENDED',
      actorUserId: context.id,
      actorOrganizationId: context.organization_id,
      objectType: 'HEARING',
      objectId: hearingId,
      correlationId,
      payload: { consultation_id: consultation.id, reason: payload.reason ?? null }
    });
    return this.consultation(context, hearingId);
  }

  consultation(context, hearingId) {
    requirePermission(context, 'participant.read', hearingId);
    const consultation = this.db.get(
      `select * from consultation_sessions where hearing_id=? order by started_at desc limit 1`,
      hearingId
    );
    if (!consultation) return null;
    const participants = this.db.all(
      `select p.id,p.participant_role,case when p.protected_identity=1 then p.public_alias else p.display_name end as display_name
      from consultation_participants cp join hearing_participants p on p.id=cp.participant_id where cp.consultation_id=?`,
      consultation.id
    );
    return { ...consultation, participants };
  }

  #providerPermissions(role, roomType) {
    const base = ['AUDIO', 'VIDEO'];
    if (['JUDGE', 'COURT_CLERK'].includes(role) && roomType === 'MAIN') base.push('CONTROL');
    if (roomType === 'CONSULTATION') return base.filter((permission) => permission !== 'RECORD');
    return base;
  }

  #readyVirtualSession(hearingId) {
    const session = this.db.get(
      "select * from virtual_sessions where hearing_id=? and state='READY' order by created_at desc limit 1",
      hearingId
    );
    if (!session)
      throw new DomainError(
        'VIRTUAL_SESSION_REQUIRED',
        'A READY virtual session is required.',
        409
      );
    return session;
  }

  #room(virtualSessionId, roomCode) {
    const room = this.db.get(
      'select * from virtual_rooms where virtual_session_id=? and room_code=?',
      virtualSessionId,
      roomCode
    );
    if (!room)
      throw new DomainError(
        'VIRTUAL_ROOM_NOT_FOUND',
        'Requested virtual room was not found.',
        404,
        { room_code: roomCode }
      );
    return room;
  }

  #participant(participantId, hearingId) {
    const participant = hearingId
      ? this.db.get(
          'select * from hearing_participants where id=? and hearing_id=?',
          participantId,
          hearingId
        )
      : this.db.get('select * from hearing_participants where id=?', participantId);
    if (!participant)
      throw new DomainError('PARTICIPANT_NOT_FOUND', 'Hearing participant was not found.', 404);
    if (participant.status !== 'REGISTERED')
      throw new DomainError('PARTICIPANT_INACTIVE', 'Hearing participant is inactive.', 409);
    return participant;
  }

  #participantSession(participantId) {
    const session = this.db.get(
      'select * from participant_sessions where participant_id=? order by updated_at desc limit 1',
      participantId
    );
    if (!session)
      throw new DomainError(
        'PARTICIPANT_SESSION_NOT_FOUND',
        'Participant has not exchanged a join token.',
        409
      );
    return session;
  }

  #publicParticipant(row, context) {
    const canReadProtected =
      context.isSystemAdmin ||
      context.roles.includes('JUDGE') ||
      context.roles.includes('COURT_CLERK');
    const protectedIdentity = Boolean(row.protected_identity);
    return {
      id: row.id,
      hearing_id: row.hearing_id,
      participant_reference:
        protectedIdentity && !canReadProtected ? null : row.participant_reference,
      display_name: protectedIdentity
        ? (row.public_alias ?? 'Protected Participant')
        : row.display_name,
      participant_role: row.participant_role,
      organization_id: row.organization_id,
      user_id: protectedIdentity && !canReadProtected ? null : row.user_id,
      protected_identity: protectedIdentity,
      public_alias: row.public_alias,
      default_room_code: row.default_room_code,
      status: row.status,
      session_state: row.session_state ?? undefined,
      current_room_code: row.current_room_code ?? undefined,
      created_at: row.created_at
    };
  }

  #attendance(hearingId, participantId, eventType, roomId, actorUserId, metadata = {}) {
    this.db.run(
      `insert into attendance_events(id,hearing_id,participant_id,event_type,room_id,actor_user_id,metadata_json,occurred_at) values(?,?,?,?,?,?,?,?)`,
      randomUUID(),
      hearingId,
      participantId,
      eventType,
      roomId ?? null,
      actorUserId ?? null,
      JSON.stringify(metadata),
      now()
    );
  }
}
