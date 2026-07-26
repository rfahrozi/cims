import { randomUUID } from 'node:crypto';
import { DomainError, assert } from '../../common/domain-error.mjs';
import {
  hashPassword,
  verifyPassword,
  verifyOtp,
  signAccessToken
} from '../../common/security.mjs';
import { authorizationContext, requirePermission } from './authorization.mjs';

const now = () => new Date().toISOString();

export class IamService {
  constructor(db, config, audit) {
    this.db = db;
    this.config = config;
    this.audit = audit;
  }

  login({ email, password }, correlationId, requestMeta = {}) {
    assert(
      typeof email === 'string' && email.includes('@'),
      'VALIDATION_ERROR',
      'A valid email is required.',
      400
    );
    assert(
      typeof password === 'string' && password.length >= 8,
      'VALIDATION_ERROR',
      'Password is required.',
      400
    );
    const user = this.db.get('select * from users where lower(email)=lower(?)', email.trim());
    const securityState = user
      ? this.db.get('select * from auth_security_state where user_id=?', user.id)
      : null;
    if (securityState?.locked_until && Date.parse(securityState.locked_until) > Date.now()) {
      this.#securityEvent('ACCOUNT_LOCKED_LOGIN_ATTEMPT', email, requestMeta);
      throw new DomainError(
        'ACCOUNT_LOCKED',
        'Account is temporarily locked due to repeated failed authentication attempts.',
        423,
        { locked_until: securityState.locked_until }
      );
    }
    if (!user || user.status !== 'ACTIVE' || !verifyPassword(password, user.password_hash)) {
      if (user) this.#recordFailure(user, 'PASSWORD');
      this.#securityEvent('LOGIN_FAILED', email, requestMeta);
      this.audit.append({
        eventType: 'LOGIN_FAILED',
        actorUserId: user?.id,
        actorOrganizationId: user?.organization_id,
        objectType: 'AUTH',
        objectId: email,
        correlationId,
        payload: { reason: 'INVALID_CREDENTIALS' }
      });
      throw new DomainError('INVALID_CREDENTIALS', 'Email or password is invalid.', 401);
    }
    this.#resetFailures(user.id);
    const challengeId = randomUUID();
    const createdAt = now();
    const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
    this.db.run(
      'insert into auth_challenges(id, user_id, expires_at, created_at) values(?,?,?,?)',
      challengeId,
      user.id,
      expiresAt,
      createdAt
    );
    this.audit.append({
      eventType: 'LOGIN_CHALLENGE_CREATED',
      actorUserId: user.id,
      actorOrganizationId: user.organization_id,
      objectType: 'AUTH_CHALLENGE',
      objectId: challengeId,
      correlationId,
      payload: { expires_at: expiresAt }
    });
    return {
      challenge_id: challengeId,
      expires_at: expiresAt,
      otp_required: true,
      ...(this.config.exposeDevelopmentOtp ? { development_otp: this.config.fixedOtp } : {})
    };
  }

  verifyChallenge({ challenge_id: challengeId, otp }, correlationId, requestMeta = {}) {
    assert(
      typeof challengeId === 'string' && challengeId.length > 0,
      'VALIDATION_ERROR',
      'challenge_id is required.',
      400
    );
    assert(
      typeof otp === 'string' && otp.length === 6,
      'VALIDATION_ERROR',
      'A six-digit OTP is required.',
      400
    );
    const challenge = this.db.get(
      `select c.*, u.otp_secret, u.organization_id, u.status from auth_challenges c
      join users u on u.id=c.user_id where c.id=?`,
      challengeId
    );
    if (
      !challenge ||
      challenge.used_at ||
      challenge.expires_at <= now() ||
      challenge.status === 'DISABLED'
    ) {
      throw new DomainError(
        'CHALLENGE_INVALID',
        'Authentication challenge is invalid or expired.',
        401
      );
    }
    const securityState = this.db.get(
      'select * from auth_security_state where user_id=?',
      challenge.user_id
    );
    if (securityState?.locked_until && Date.parse(securityState.locked_until) > Date.now())
      throw new DomainError('ACCOUNT_LOCKED', 'Account is temporarily locked.', 423, {
        locked_until: securityState.locked_until
      });
    if (!verifyOtp(otp, challenge.otp_secret, this.config)) {
      const user = this.db.get('select * from users where id=?', challenge.user_id);
      this.#recordFailure(user, 'OTP');
      this.#securityEvent('OTP_FAILED', challenge.user_id, requestMeta);
      this.audit.append({
        eventType: 'OTP_FAILED',
        actorUserId: challenge.user_id,
        actorOrganizationId: challenge.organization_id,
        objectType: 'AUTH_CHALLENGE',
        objectId: challengeId,
        correlationId,
        payload: {}
      });
      throw new DomainError('OTP_INVALID', 'OTP is invalid.', 401);
    }
    this.#resetFailures(challenge.user_id);
    this.db.run('update auth_challenges set used_at=? where id=?', now(), challengeId);
    const context = authorizationContext(this.db, challenge.user_id);
    const accessToken = signAccessToken(
      { sub: context.id, organization_id: context.organization_id },
      this.config.tokenSecret,
      this.config.tokenTtlSeconds
    );
    this.audit.append({
      eventType: 'LOGIN_SUCCEEDED',
      actorUserId: context.id,
      actorOrganizationId: context.organization_id,
      objectType: 'USER',
      objectId: context.id,
      correlationId,
      payload: { roles: context.roles }
    });
    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: this.config.tokenTtlSeconds,
      user: this.publicContext(context)
    };
  }

  publicContext(context) {
    return {
      id: context.id,
      email: context.email,
      name: context.name,
      organization_id: context.organization_id,
      organization_code: context.organization_code,
      organization_name: context.organization_name,
      roles: context.roles,
      permissions: context.permissions,
      hearing_assignments: context.assignments
    };
  }

  context(userId) {
    return authorizationContext(this.db, userId);
  }

  listUsers(context) {
    requirePermission(context, 'iam.user.manage');
    return this.db
      .all(
        `select u.id, u.email, u.name, u.status, u.organization_id, o.name as organization_name,
      coalesce(group_concat(ur.role_code), '') as roles
      from users u join organizations o on o.id=u.organization_id
      left join user_roles ur on ur.user_id=u.id
      group by u.id order by u.name`
      )
      .map((row) => ({ ...row, roles: row.roles ? row.roles.split(',') : [] }));
  }

  createUser(context, payload, correlationId) {
    requirePermission(context, 'iam.user.manage');
    for (const field of ['email', 'name', 'password', 'organization_id'])
      assert(payload[field], 'VALIDATION_ERROR', `${field} is required.`, 400);
    const roleCodes = Array.isArray(payload.role_codes) ? payload.role_codes : [];
    assert(roleCodes.length > 0, 'VALIDATION_ERROR', 'At least one role_code is required.', 400);
    const id = randomUUID();
    const createdAt = now();
    try {
      this.db.transaction(() => {
        this.db.run(
          'insert into users(id, organization_id, email, name, password_hash, otp_secret, status, created_at) values(?,?,?,?,?,?,?,?)',
          id,
          payload.organization_id,
          payload.email.trim().toLowerCase(),
          payload.name.trim(),
          hashPassword(payload.password),
          payload.otp_secret ?? 'JBSWY3DPEHPK3PXP',
          'ACTIVE',
          createdAt
        );
        for (const role of roleCodes)
          this.db.run(
            'insert into user_roles(user_id, role_code, organization_id, valid_from) values(?,?,?,?)',
            id,
            role,
            payload.organization_id,
            createdAt
          );
      });
    } catch (error) {
      if (String(error.message).includes('UNIQUE'))
        throw new DomainError('USER_DUPLICATE', 'Email already exists.', 409);
      throw error;
    }
    this.audit.append({
      eventType: 'USER_CREATED',
      actorUserId: context.id,
      actorOrganizationId: context.organization_id,
      objectType: 'USER',
      objectId: id,
      correlationId,
      payload: { email: payload.email, role_codes: roleCodes }
    });
    return {
      id,
      email: payload.email.trim().toLowerCase(),
      name: payload.name.trim(),
      organization_id: payload.organization_id,
      roles: roleCodes,
      status: 'ACTIVE',
      created_at: createdAt
    };
  }

  #recordFailure(user, kind) {
    if (!user) return;
    const current = this.db.get('select * from auth_security_state where user_id=?', user.id);
    const passwordFailures =
      Number(current?.failed_password_attempts ?? 0) + (kind === 'PASSWORD' ? 1 : 0);
    const otpFailures = Number(current?.failed_otp_attempts ?? 0) + (kind === 'OTP' ? 1 : 0);
    const total = passwordFailures + otpFailures;
    const lockedUntil =
      total >= this.config.accountLockoutThreshold
        ? new Date(Date.now() + this.config.accountLockoutMinutes * 60_000).toISOString()
        : null;
    const at = now();
    this.db.run(
      `insert into auth_security_state(user_id,failed_password_attempts,failed_otp_attempts,locked_until,last_failed_at,updated_at) values(?,?,?,?,?,?)
      on conflict(user_id) do update set failed_password_attempts=excluded.failed_password_attempts,failed_otp_attempts=excluded.failed_otp_attempts,locked_until=excluded.locked_until,last_failed_at=excluded.last_failed_at,updated_at=excluded.updated_at`,
      user.id,
      passwordFailures,
      otpFailures,
      lockedUntil,
      at,
      at
    );
  }

  #resetFailures(userId) {
    const at = now();
    this.db.run(
      `insert into auth_security_state(user_id,failed_password_attempts,failed_otp_attempts,locked_until,last_failed_at,updated_at) values(?,0,0,null,null,?)
      on conflict(user_id) do update set failed_password_attempts=0,failed_otp_attempts=0,locked_until=null,last_failed_at=null,updated_at=excluded.updated_at`,
      userId,
      at
    );
  }

  #securityEvent(eventType, principal, meta = {}) {
    this.db.run(
      'insert into security_events(id,event_type,principal_reference,ip_address,route,details_json,occurred_at) values(?,?,?,?,?,?,?)',
      randomUUID(),
      eventType,
      String(principal),
      meta.ip ?? null,
      meta.route ?? null,
      JSON.stringify({ user_agent: meta.userAgent ?? null }),
      now()
    );
  }

  assignHearing(context, hearingId, payload, correlationId) {
    requirePermission(context, 'assignment.manage', hearingId);
    for (const field of ['user_id', 'organization_id', 'assignment_role'])
      assert(payload[field], 'VALIDATION_ERROR', `${field} is required.`, 400);
    const id = randomUUID();
    const validFrom = payload.valid_from ?? now();
    this.db.run(
      'insert into hearing_assignments(id, hearing_id, user_id, organization_id, assignment_role, valid_from, valid_until) values(?,?,?,?,?,?,?)',
      id,
      hearingId,
      payload.user_id,
      payload.organization_id,
      payload.assignment_role,
      validFrom,
      payload.valid_until ?? null
    );
    this.audit.append({
      eventType: 'HEARING_ASSIGNMENT_CREATED',
      actorUserId: context.id,
      actorOrganizationId: context.organization_id,
      objectType: 'HEARING_ASSIGNMENT',
      objectId: id,
      correlationId,
      payload: { hearing_id: hearingId, ...payload }
    });
    return { id, hearing_id: hearingId, ...payload, valid_from: validFrom };
  }
}
