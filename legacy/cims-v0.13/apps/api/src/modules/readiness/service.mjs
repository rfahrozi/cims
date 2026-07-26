import { randomUUID } from 'node:crypto';
import { DomainError, assert } from '../../common/domain-error.mjs';
import { requirePermission } from '../iam/authorization.mjs';
const now = () => new Date().toISOString();
const requiredOrgTypes = ['COURT', 'PROSECUTION', 'CORRECTIONS'];
export class ReadinessService {
  constructor(db, audit, caseService, noticeService) {
    this.db = db;
    this.audit = audit;
    this.caseService = caseService;
    this.notice = noticeService;
  }
  verifyIdentity(context, hearingId, payload, correlationId) {
    requirePermission(context, 'readiness.verify', hearingId);
    this.caseService.getHearing(hearingId);
    assert(
      payload.participant_reference && payload.method,
      'VALIDATION_ERROR',
      'participant_reference and method are required.',
      400
    );
    assert(
      ['PASS', 'FAIL'].includes(payload.result),
      'VALIDATION_ERROR',
      'result must be PASS or FAIL.',
      400
    );
    const id = randomUUID(),
      at = now();
    this.db.run(
      `insert into identity_verifications(id,hearing_id,organization_id,participant_reference,method,result,notes,verified_by,verified_at) values(?,?,?,?,?,?,?,?,?)`,
      id,
      hearingId,
      context.organization_id,
      payload.participant_reference,
      payload.method,
      payload.result,
      payload.notes ?? null,
      context.id,
      at
    );
    this.audit.append({
      eventType: 'IDENTITY_VERIFIED',
      actorUserId: context.id,
      actorOrganizationId: context.organization_id,
      objectType: 'HEARING',
      objectId: hearingId,
      correlationId,
      payload: {
        verification_id: id,
        result: payload.result,
        participant_reference: payload.participant_reference
      }
    });
    return {
      id,
      hearing_id: hearingId,
      organization_id: context.organization_id,
      ...payload,
      verified_at: at
    };
  }
  inspectRoom(context, hearingId, payload, correlationId) {
    requirePermission(context, 'readiness.verify', hearingId);
    this.caseService.getHearing(hearingId);
    assert(payload.location_code, 'VALIDATION_ERROR', 'location_code is required.', 400);
    const result =
      payload.camera_full_view &&
      payload.unauthorized_person_absent &&
      payload.confidentiality_ready
        ? 'PASS'
        : 'FAIL';
    const id = randomUUID(),
      at = now();
    this.db.run(
      `insert into room_inspections(id,hearing_id,organization_id,location_code,camera_full_view,unauthorized_person_absent,confidentiality_ready,result,notes,inspected_by,inspected_at) values(?,?,?,?,?,?,?,?,?,?,?)`,
      id,
      hearingId,
      context.organization_id,
      payload.location_code,
      payload.camera_full_view ? 1 : 0,
      payload.unauthorized_person_absent ? 1 : 0,
      payload.confidentiality_ready ? 1 : 0,
      result,
      payload.notes ?? null,
      context.id,
      at
    );
    this.audit.append({
      eventType: 'ROOM_INSPECTED',
      actorUserId: context.id,
      actorOrganizationId: context.organization_id,
      objectType: 'HEARING',
      objectId: hearingId,
      correlationId,
      payload: { inspection_id: id, result, location_code: payload.location_code }
    });
    return {
      id,
      hearing_id: hearingId,
      organization_id: context.organization_id,
      ...payload,
      result,
      inspected_at: at
    };
  }
  submit(context, hearingId, payload, correlationId) {
    requirePermission(context, 'readiness.write', hearingId);
    this.caseService.getHearing(hearingId);
    if (
      !this.db.get(
        "select 1 from hearing_schedules where hearing_id=? and status='ACTIVE'",
        hearingId
      )
    )
      throw new DomainError('SCHEDULE_REQUIRED', 'An active schedule is required.', 409);
    assert(
      this.notice.gate(hearingId).ready,
      'NOTICE_ACK_REQUIRED',
      'Required official notices must be acknowledged before final readiness submission.',
      409
    );
    assert(payload.location_code, 'VALIDATION_ERROR', 'location_code is required.', 400);
    assert(
      Array.isArray(payload.items) && payload.items.length > 0,
      'VALIDATION_ERROR',
      'readiness items are required.',
      400
    );
    assert(payload.technical_test, 'VALIDATION_ERROR', 'technical_test is required.', 400);
    for (const item of payload.items) {
      assert(
        item.item_code && ['PASS', 'FAIL', 'NA'].includes(item.result),
        'VALIDATION_ERROR',
        'Each readiness item needs item_code and a valid result.',
        400
      );
    }
    for (const key of [
      'camera',
      'microphone',
      'audio',
      'primary_network',
      'backup_network',
      'provider_access'
    ]) {
      assert(
        ['PASS', 'FAIL', 'NA'].includes(payload.technical_test[key]),
        'VALIDATION_ERROR',
        `${key} test is invalid.`,
        400
      );
    }
    const org = this.db.get('select * from organizations where id=?', context.organization_id);
    if (org.type === 'CORRECTIONS') {
      const identity = this.db.get(
        "select * from identity_verifications where hearing_id=? and organization_id=? and result='PASS' order by verified_at desc limit 1",
        hearingId,
        context.organization_id
      );
      const room = this.db.get(
        "select * from room_inspections where hearing_id=? and organization_id=? and result='PASS' order by inspected_at desc limit 1",
        hearingId,
        context.organization_id
      );
      if (!identity || !room)
        throw new DomainError(
          'VERIFICATION_REQUIRED',
          'Corrections readiness requires passed identity verification and room inspection.',
          409,
          { identity_verified: Boolean(identity), room_inspected: Boolean(room) }
        );
    }
    const itemReady = payload.items
      .filter((i) => i.required !== false)
      .every((i) => i.result === 'PASS');
    const tech = payload.technical_test;
    const techReady =
      ['camera', 'microphone', 'audio', 'primary_network', 'provider_access'].every(
        (k) => tech[k] === 'PASS'
      ) && ['PASS', 'NA'].includes(tech.backup_network);
    const status = itemReady && techReady ? 'READY' : 'NOT_READY';
    const version = Number(
      this.db.get(
        'select coalesce(max(version),0)+1 as version from readiness_submissions where hearing_id=? and organization_id=?',
        hearingId,
        context.organization_id
      ).version
    );
    const id = randomUUID(),
      at = now();
    this.db.transaction(() => {
      this.db.run(
        `insert into readiness_submissions(id,hearing_id,organization_id,version,location_code,status,submitted_by,submitted_at) values(?,?,?,?,?,?,?,?)`,
        id,
        hearingId,
        context.organization_id,
        version,
        payload.location_code,
        status,
        context.id,
        at
      );
      for (const item of payload.items)
        this.db.run(
          'insert into readiness_items(id,submission_id,item_code,required,result,notes) values(?,?,?,?,?,?)',
          randomUUID(),
          id,
          item.item_code,
          item.required === false ? 0 : 1,
          item.result,
          item.notes ?? null
        );
      this.db.run(
        `insert into technical_tests(id,submission_id,camera,microphone,audio,primary_network,backup_network,provider_access,tested_at) values(?,?,?,?,?,?,?,?,?)`,
        randomUUID(),
        id,
        tech.camera,
        tech.microphone,
        tech.audio,
        tech.primary_network,
        tech.backup_network,
        tech.provider_access,
        at
      );
    });
    this.audit.append({
      eventType: 'READINESS_SUBMITTED',
      actorUserId: context.id,
      actorOrganizationId: context.organization_id,
      objectType: 'HEARING',
      objectId: hearingId,
      correlationId,
      payload: { submission_id: id, organization_type: org.type, status, version }
    });
    return this.#hydrate(this.db.get('select * from readiness_submissions where id=?', id));
  }
  list(context, hearingId) {
    requirePermission(context, 'readiness.read', hearingId);
    return this.db
      .all(
        'select * from readiness_submissions where hearing_id=? order by submitted_at desc',
        hearingId
      )
      .map((x) => this.#hydrate(x));
  }
  gate(hearingId) {
    const assigned = this.db.all(
      `select distinct o.id,o.type,o.name from hearing_assignments a join organizations o on o.id=a.organization_id where a.hearing_id=? and o.type in ('COURT','PROSECUTION','CORRECTIONS')`,
      hearingId
    );
    const latest = assigned.map((org) => {
      const s = this.db.get(
        'select * from readiness_submissions where hearing_id=? and organization_id=? order by version desc limit 1',
        hearingId,
        org.id
      );
      return {
        organization_id: org.id,
        organization_type: org.type,
        organization_name: org.name,
        status: s?.status ?? 'MISSING',
        submission_id: s?.id ?? null
      };
    });
    const requiredTypes = requiredOrgTypes.filter((t) => assigned.some((o) => o.type === t));
    return {
      required_organization_types: requiredTypes,
      organizations: latest,
      ready:
        requiredTypes.length === requiredOrgTypes.length &&
        latest.every((x) => x.status === 'READY')
    };
  }
  #hydrate(s) {
    return {
      ...s,
      items: this.db.all(
        'select * from readiness_items where submission_id=? order by item_code',
        s.id
      ),
      technical_test: this.db.get('select * from technical_tests where submission_id=?', s.id)
    };
  }
}
