import { randomUUID } from 'node:crypto';
import { DomainError, assert } from '../../common/domain-error.mjs';
import { requirePermission } from '../iam/authorization.mjs';

const now = () => new Date().toISOString();

export class DeterminationService {
  constructor(db, audit, caseService) {
    this.db = db;
    this.audit = audit;
    this.caseService = caseService;
  }

  createRequest(context, payload, correlationId) {
    requirePermission(context, 'determination.request');
    assert(payload.case_reference_id, 'VALIDATION_ERROR', 'case_reference_id is required.', 400);
    assert(
      ['ELECTRONIC', 'HYBRID'].includes(payload.requested_mode),
      'VALIDATION_ERROR',
      'requested_mode must be ELECTRONIC or HYBRID.',
      400
    );
    assert(
      typeof payload.reason === 'string' && payload.reason.trim().length >= 10,
      'VALIDATION_ERROR',
      'reason must contain at least 10 characters.',
      400
    );
    const caseReference = this.db.get(
      'select * from case_references where id=?',
      payload.case_reference_id
    );
    if (!caseReference)
      throw new DomainError('CASE_NOT_FOUND', 'Case reference was not found.', 404);
    if (!context.isSystemAdmin) {
      const assigned = this.db.get(
        `select 1 from hearing_assignments a join hearings h on h.id=a.hearing_id
        where h.case_reference_id=? and a.user_id=? and (a.valid_until is null or a.valid_until>?) limit 1`,
        payload.case_reference_id,
        context.id,
        now()
      );
      if (!assigned)
        throw new DomainError(
          'CASE_SCOPE_FORBIDDEN',
          'User is not assigned to a hearing in this case.',
          403
        );
    }
    const id = randomUUID();
    const createdAt = now();
    this.db.run(
      `insert into electronic_hearing_requests(id, case_reference_id, requested_mode, reason, evidence_references_json, status, requested_by, created_at)
      values(?,?,?,?,?,?,?,?)`,
      id,
      payload.case_reference_id,
      payload.requested_mode,
      payload.reason.trim(),
      JSON.stringify(payload.evidence_references ?? []),
      'SUBMITTED',
      context.id,
      createdAt
    );
    this.audit.append({
      eventType: 'ELECTRONIC_HEARING_REQUEST_CREATED',
      actorUserId: context.id,
      actorOrganizationId: context.organization_id,
      objectType: 'ELECTRONIC_HEARING_REQUEST',
      objectId: id,
      correlationId,
      payload: {
        case_reference_id: payload.case_reference_id,
        requested_mode: payload.requested_mode
      }
    });
    return {
      id,
      ...payload,
      evidence_references: payload.evidence_references ?? [],
      status: 'SUBMITTED',
      created_at: createdAt
    };
  }

  createDetermination(context, payload, correlationId) {
    requirePermission(context, 'determination.write', payload.hearing_id);
    const hearing = this.caseService.getHearing(payload.hearing_id);
    assert(
      ['APPROVED', 'REJECTED'].includes(payload.decision),
      'VALIDATION_ERROR',
      'decision must be APPROVED or REJECTED.',
      400
    );
    assert(
      ['IN_PERSON', 'ELECTRONIC', 'HYBRID'].includes(payload.mode),
      'VALIDATION_ERROR',
      'mode is invalid.',
      400
    );
    assert(
      payload.effective_at && !Number.isNaN(Date.parse(payload.effective_at)),
      'VALIDATION_ERROR',
      'effective_at must be a valid date-time.',
      400
    );
    assert(
      typeof payload.official_reference === 'string' && payload.official_reference.trim(),
      'VALIDATION_ERROR',
      'official_reference is required.',
      400
    );
    assert(
      /^[A-Fa-f0-9]{64}$/.test(payload.document_hash ?? ''),
      'VALIDATION_ERROR',
      'document_hash must be a 64-character SHA-256 hex value.',
      400
    );
    if (payload.decision === 'APPROVED')
      assert(
        ['ELECTRONIC', 'HYBRID'].includes(payload.mode),
        'VALIDATION_ERROR',
        'Approved electronic determination must use ELECTRONIC or HYBRID mode.',
        400
      );
    const version = Number(
      this.db.get(
        'select coalesce(max(version),0)+1 as version from judicial_determinations where hearing_id=?',
        payload.hearing_id
      ).version
    );
    const id = randomUUID();
    const createdAt = now();
    try {
      this.db.run(
        `insert into judicial_determinations(id, hearing_id, version, decision, mode, reason, effective_at, official_reference, document_hash, created_by, created_at)
        values(?,?,?,?,?,?,?,?,?,?,?)`,
        id,
        payload.hearing_id,
        version,
        payload.decision,
        payload.mode,
        payload.reason ?? null,
        new Date(payload.effective_at).toISOString(),
        payload.official_reference.trim(),
        payload.document_hash.toLowerCase(),
        context.id,
        createdAt
      );
    } catch (error) {
      if (String(error.message).includes('UNIQUE'))
        throw new DomainError(
          'DETERMINATION_DUPLICATE',
          'Official reference and document hash have already been recorded.',
          409
        );
      throw error;
    }
    this.db.run(
      'update hearings set state=?, updated_at=? where id=?',
      payload.decision === 'APPROVED' ? 'DETERMINED' : 'DRAFT',
      createdAt,
      hearing.id
    );
    this.db.run(
      `update electronic_hearing_requests set status='DECIDED' where case_reference_id=? and status in ('SUBMITTED','UNDER_REVIEW')`,
      hearing.case_reference_id
    );
    this.audit.append({
      eventType:
        payload.decision === 'APPROVED'
          ? 'JUDICIAL_DETERMINATION_APPROVED'
          : 'JUDICIAL_DETERMINATION_REJECTED',
      actorUserId: context.id,
      actorOrganizationId: context.organization_id,
      objectType: 'HEARING',
      objectId: payload.hearing_id,
      correlationId,
      payload: {
        determination_id: id,
        version,
        mode: payload.mode,
        official_reference: payload.official_reference
      }
    });
    return {
      id,
      ...payload,
      document_hash: payload.document_hash.toLowerCase(),
      version,
      created_at: createdAt
    };
  }

  latest(hearingId) {
    return this.db.get(
      'select * from judicial_determinations where hearing_id=? order by version desc limit 1',
      hearingId
    );
  }

  assertValid(hearingId, at = new Date()) {
    const latest = this.latest(hearingId);
    if (
      !latest ||
      latest.decision !== 'APPROVED' ||
      !['ELECTRONIC', 'HYBRID'].includes(latest.mode) ||
      Date.parse(latest.effective_at) > at.getTime()
    ) {
      throw new DomainError(
        'DETERMINATION_REQUIRED',
        'A valid judicial determination is required for this hearing.',
        409,
        { hearing_id: hearingId }
      );
    }
    return latest;
  }

  gateStatus(context, hearingId) {
    requirePermission(context, 'hearing.read', hearingId);
    const determination = this.latest(hearingId);
    const valid = Boolean(
      determination &&
        determination.decision === 'APPROVED' &&
        ['ELECTRONIC', 'HYBRID'].includes(determination.mode) &&
        Date.parse(determination.effective_at) <= Date.now()
    );
    const schedule = this.db.get(
      `select * from hearing_schedules where hearing_id=? and status='ACTIVE' order by version desc limit 1`,
      hearingId
    );
    return {
      hearing_id: hearingId,
      determination: determination
        ? {
            id: determination.id,
            version: determination.version,
            decision: determination.decision,
            mode: determination.mode,
            effective_at: determination.effective_at,
            official_reference: determination.official_reference
          }
        : null,
      determination_valid: valid,
      schedule_active: Boolean(schedule),
      active_schedule: schedule ?? null,
      next_gate: !valid
        ? 'JUDICIAL_DETERMINATION'
        : !schedule
          ? 'SCHEDULING'
          : 'NOTICE_AND_READINESS'
    };
  }
}
