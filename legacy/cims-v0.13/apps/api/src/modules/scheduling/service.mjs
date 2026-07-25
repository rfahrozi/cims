import { randomUUID } from 'node:crypto';
import { DomainError, assert } from '../../common/domain-error.mjs';
import { requirePermission } from '../iam/authorization.mjs';
import { ConflictEngine } from './conflict-engine.mjs';

const now = () => new Date().toISOString();

export class SchedulingService {
  constructor(db, audit, determinationService, caseService) {
    this.db = db;
    this.audit = audit;
    this.determination = determinationService;
    this.caseService = caseService;
    this.conflictEngine = new ConflictEngine(db);
  }

  availability(context, hearingId, from, to) {
    requirePermission(context, 'schedule.read', hearingId);
    this.caseService.getHearing(hearingId);
    assert(from && to && !Number.isNaN(Date.parse(from)) && !Number.isNaN(Date.parse(to)), 'VALIDATION_ERROR', 'from and to must be valid date-times.', 400);
    assert(Date.parse(to) > Date.parse(from), 'VALIDATION_ERROR', 'to must be after from.', 400);
    const resources = [];
    const assignments = this.db.all(`select a.assignment_role as resource_type, a.user_id as resource_id, u.name
      from hearing_assignments a join users u on u.id=a.user_id where a.hearing_id=?`, hearingId);
    for (const assignment of assignments) {
      const overlap = this.db.get(`select 1 from hearing_schedules hs join hearing_schedule_resources hsr on hsr.schedule_id=hs.id
        where hs.status='ACTIVE' and hsr.resource_reference=? and hs.hearing_id<>? and hs.start_at<? and hs.end_at>? limit 1`, assignment.resource_id, hearingId, to, from);
      resources.push({resource_type: assignment.resource_type, resource_id: assignment.resource_id, resource_name: assignment.name, status: overlap ? 'UNAVAILABLE' : 'AVAILABLE', reasons: overlap ? ['Overlapping active schedule.'] : []});
    }
    const rooms = this.db.all(`select code, name from resource_catalog where resource_type='ROOM' and status='ACTIVE'`);
    for (const room of rooms) {
      const overlap = this.db.get(`select 1 from hearing_schedules hs join hearing_schedule_resources hsr on hsr.schedule_id=hs.id
        where hs.status='ACTIVE' and hsr.resource_type='ROOM' and hsr.resource_reference=? and hs.hearing_id<>? and hs.start_at<? and hs.end_at>? limit 1`, room.code, hearingId, to, from);
      resources.push({resource_type: 'ROOM', resource_id: room.code, resource_name: room.name, status: overlap ? 'UNAVAILABLE' : 'AVAILABLE', reasons: overlap ? ['Overlapping active schedule.'] : []});
    }
    return {hearing_id: hearingId, resources, generated_at: now()};
  }

  createProposal(context, hearingId, payload, correlationId) {
    requirePermission(context, 'schedule.write', hearingId);
    this.caseService.getHearing(hearingId);
    this.determination.assertValid(hearingId);
    this.#validateProposal(payload);
    const version = Number(this.db.get('select coalesce(max(version),0)+1 as version from schedule_proposals where hearing_id=?', hearingId).version);
    const id = randomUUID();
    const createdAt = now();
    this.db.transaction(() => {
      this.db.run(`insert into schedule_proposals(id, hearing_id, version, start_at, end_at, display_timezone, notes, status, created_by, created_at)
        values(?,?,?,?,?,?,?,?,?,?)`, id, hearingId, version, new Date(payload.start_at).toISOString(), new Date(payload.end_at).toISOString(), payload.display_timezone, payload.notes ?? null, 'DRAFT', context.id, createdAt);
      for (const resource of payload.resources) {
        this.db.run('insert into schedule_proposal_resources(id, proposal_id, resource_type, resource_reference, requirement) values(?,?,?,?,?)',
          randomUUID(), id, resource.resource_type, resource.resource_id, resource.requirement);
      }
    });
    this.audit.append({eventType: 'SCHEDULE_PROPOSAL_CREATED', actorUserId: context.id, actorOrganizationId: context.organization_id, objectType: 'SCHEDULE_PROPOSAL', objectId: id, correlationId, payload: {hearing_id: hearingId, version, start_at: payload.start_at, end_at: payload.end_at, resources: payload.resources}});
    return {id, hearing_id: hearingId, version, start_at: new Date(payload.start_at).toISOString(), end_at: new Date(payload.end_at).toISOString(), display_timezone: payload.display_timezone, resources: payload.resources, notes: payload.notes ?? null, status: 'DRAFT'};
  }

  checkConflicts(context, proposalId, correlationId) {
    const proposal = this.#proposal(proposalId);
    requirePermission(context, 'schedule.write', proposal.hearing_id);
    this.determination.assertValid(proposal.hearing_id);
    const resources = this.#proposalResources(proposalId);
    const conflicts = this.conflictEngine.evaluate(proposal, resources, {excludeHearingId: proposal.hearing_id});
    this.db.transaction(() => {
      this.db.run('delete from schedule_conflicts where proposal_id=?', proposalId);
      for (const conflict of conflicts) {
        this.db.run(`insert into schedule_conflicts(id, proposal_id, rule_code, severity, resource_type, resource_reference, message, resolution_options_json)
          values(?,?,?,?,?,?,?,?)`, conflict.id, proposalId, conflict.rule_code, conflict.severity, conflict.resource_type ?? null, conflict.resource_id ?? null, conflict.message, JSON.stringify(conflict.resolution_options ?? []));
      }
      this.db.run(`update schedule_proposals set status='CHECKED' where id=?`, proposalId);
    });
    const status = conflicts.some((item) => item.severity === 'REQUIRED') ? 'BLOCKED' : conflicts.some((item) => item.severity === 'WARNING') ? 'WARNING' : 'CLEAR';
    this.audit.append({eventType: 'SCHEDULE_CONFLICT_CHECKED', actorUserId: context.id, actorOrganizationId: context.organization_id, objectType: 'SCHEDULE_PROPOSAL', objectId: proposalId, correlationId, payload: {hearing_id: proposal.hearing_id, status, conflicts}});
    return {proposal_id: proposalId, status, conflicts: conflicts.map((item) => ({rule_code: item.rule_code, severity: item.severity, resource_type: item.resource_type, resource_id: item.resource_id, message: item.message, resolution_options: item.resolution_options ?? []}))};
  }

  approve(context, proposalId, {reason}, correlationId) {
    const proposal = this.#proposal(proposalId);
    requirePermission(context, 'schedule.approve', proposal.hearing_id);
    this.determination.assertValid(proposal.hearing_id);
    assert(typeof reason === 'string' && reason.trim().length >= 3, 'VALIDATION_ERROR', 'Approval reason must contain at least three characters.', 400);
    if (proposal.status !== 'CHECKED') throw new DomainError('CONFLICT_CHECK_REQUIRED', 'Proposal must be checked before approval.', 409);
    const unresolved = this.db.get(`select count(*) as count from schedule_conflicts where proposal_id=? and severity='REQUIRED' and resolved_at is null`, proposalId);
    if (Number(unresolved.count) > 0) throw new DomainError('CONFLICT_UNRESOLVED', 'Required schedule conflicts must be resolved before approval.', 409);
    const resources = this.#proposalResources(proposalId);
    const scheduleId = randomUUID();
    const createdAt = now();
    let version;
    this.db.transaction(() => {
      version = Number(this.db.get('select coalesce(max(version),0)+1 as version from hearing_schedules where hearing_id=?', proposal.hearing_id).version);
      this.db.run(`update hearing_schedules set status='SUPERSEDED' where hearing_id=? and status='ACTIVE'`, proposal.hearing_id);
      this.db.run(`insert into hearing_schedules(id, hearing_id, proposal_id, version, start_at, end_at, display_timezone, status, approved_by, approval_reason, created_at)
        values(?,?,?,?,?,?,?,?,?,?,?)`, scheduleId, proposal.hearing_id, proposalId, version, proposal.start_at, proposal.end_at, proposal.display_timezone, 'ACTIVE', context.id, reason.trim(), createdAt);
      for (const resource of resources) {
        this.db.run('insert into hearing_schedule_resources(id, schedule_id, resource_type, resource_reference, requirement) values(?,?,?,?,?)', randomUUID(), scheduleId, resource.resource_type, resource.resource_id, resource.requirement);
      }
      this.db.run(`update schedule_proposals set status='APPROVED' where id=?`, proposalId);
      this.db.run(`update hearings set state='SCHEDULED', updated_at=? where id=?`, createdAt, proposal.hearing_id);
    });
    const schedule = {id: scheduleId, hearing_id: proposal.hearing_id, proposal_id: proposalId, version, status: 'ACTIVE', start_at: proposal.start_at, end_at: proposal.end_at, display_timezone: proposal.display_timezone, resources, approval_reason: reason.trim(), created_at: createdAt};
    this.audit.append({eventType: 'HEARING_SCHEDULE_ACTIVATED', actorUserId: context.id, actorOrganizationId: context.organization_id, objectType: 'HEARING', objectId: proposal.hearing_id, correlationId, payload: schedule});
    return schedule;
  }

  reschedule(context, hearingId, payload, correlationId) {
    requirePermission(context, 'schedule.approve', hearingId);
    this.determination.assertValid(hearingId);
    const active = this.db.get(`select * from hearing_schedules where hearing_id=? and status='ACTIVE'`, hearingId);
    if (!active) throw new DomainError('SCHEDULE_NOT_ACTIVE', 'An active schedule is required before rescheduling.', 409);
    const resources = this.db.all(`select resource_type, resource_reference as resource_id, requirement from hearing_schedule_resources where schedule_id=?`, active.id);
    const proposalPayload = {start_at: payload.new_start_at, end_at: payload.new_end_at, display_timezone: payload.display_timezone ?? active.display_timezone, resources, notes: `Reschedule basis: ${payload.basis_reference}`};
    this.#validateProposal(proposalPayload);
    const proposal = this.createProposal(context, hearingId, proposalPayload, correlationId);
    const result = this.checkConflicts(context, proposal.id, correlationId);
    if (result.status === 'BLOCKED') throw new DomainError('CONFLICT_UNRESOLVED', 'Reschedule has required conflicts.', 409, {proposal_id: proposal.id, conflicts: result.conflicts});
    const approved = this.approve(context, proposal.id, {reason: payload.reason}, correlationId);
    this.db.run('update hearing_schedules set basis_reference=? where id=?', payload.basis_reference, approved.id);
    this.audit.append({eventType: 'HEARING_RESCHEDULED', actorUserId: context.id, actorOrganizationId: context.organization_id, objectType: 'HEARING', objectId: hearingId, correlationId, payload: {old_schedule_id: active.id, new_schedule_id: approved.id, basis_reference: payload.basis_reference}});
    return {...approved, basis_reference: payload.basis_reference};
  }

  listSchedules(context, hearingId) {
    requirePermission(context, 'schedule.read', hearingId);
    return this.db.all('select * from hearing_schedules where hearing_id=? order by version desc', hearingId).map((schedule) => ({...schedule, resources: this.db.all('select resource_type, resource_reference as resource_id, requirement from hearing_schedule_resources where schedule_id=?', schedule.id)}));
  }

  resolveConflict(context, proposalId, conflictId, note, correlationId) {
    const proposal = this.#proposal(proposalId);
    requirePermission(context, 'schedule.approve', proposal.hearing_id);
    assert(typeof note === 'string' && note.trim().length >= 3, 'VALIDATION_ERROR', 'Resolution note is required.', 400);
    const conflict = this.db.get('select * from schedule_conflicts where id=? and proposal_id=?', conflictId, proposalId);
    if (!conflict) throw new DomainError('CONFLICT_NOT_FOUND', 'Schedule conflict was not found.', 404);
    this.db.run('update schedule_conflicts set resolved_at=?, resolved_by=?, resolution_note=? where id=?', now(), context.id, note.trim(), conflictId);
    this.audit.append({eventType: 'SCHEDULE_CONFLICT_RESOLVED', actorUserId: context.id, actorOrganizationId: context.organization_id, objectType: 'SCHEDULE_CONFLICT', objectId: conflictId, correlationId, payload: {proposal_id: proposalId, note: note.trim()}});
    return {id: conflictId, proposal_id: proposalId, status: 'RESOLVED', resolution_note: note.trim()};
  }

  #validateProposal(payload) {
    assert(payload.start_at && payload.end_at && !Number.isNaN(Date.parse(payload.start_at)) && !Number.isNaN(Date.parse(payload.end_at)), 'VALIDATION_ERROR', 'start_at and end_at must be valid date-times.', 400);
    assert(Date.parse(payload.end_at) > Date.parse(payload.start_at), 'VALIDATION_ERROR', 'end_at must be after start_at.', 400);
    assert(typeof payload.display_timezone === 'string' && payload.display_timezone.includes('/'), 'VALIDATION_ERROR', 'display_timezone must be an IANA timezone.', 400);
    assert(Array.isArray(payload.resources) && payload.resources.length > 0, 'VALIDATION_ERROR', 'At least one schedule resource is required.', 400);
    for (const resource of payload.resources) {
      assert(resource.resource_type && resource.resource_id && ['REQUIRED', 'PREFERRED'].includes(resource.requirement), 'VALIDATION_ERROR', 'Each resource requires resource_type, resource_id, and requirement.', 400);
    }
  }

  #proposal(proposalId) {
    const proposal = this.db.get('select * from schedule_proposals where id=?', proposalId);
    if (!proposal) throw new DomainError('PROPOSAL_NOT_FOUND', 'Schedule proposal was not found.', 404);
    return proposal;
  }

  #proposalResources(proposalId) {
    return this.db.all(`select resource_type, resource_reference as resource_id, requirement from schedule_proposal_resources where proposal_id=?`, proposalId);
  }
}
