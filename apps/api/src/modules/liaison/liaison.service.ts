import { Injectable } from '@nestjs/common';
import { requireRoles } from '../../common/authorization.js';
import type { CurrentUser } from '../../common/current-user.decorator.js';
import { AuditService } from '../../infrastructure/audit.service.js';
import { DomainError } from '@cims/domain';
import { PersistenceModeService } from '../../infrastructure/database/persistence-mode.service.js';
import { PgPoolService } from '../../infrastructure/database/pg-pool.service.js';
import { InMemoryStore } from '../../infrastructure/in-memory.store.js';
import type {
  CreateDelegationDto,
  CreateEscalationDto,
  CreateLiaisonOfficerDto,
  CreateOrganizationUnitDto,
  ResolveEscalationDto,
  RevokeDelegationDto,
} from './dto.js';

// ── Exported types ─────────────────────────────────────────────────────────────
export interface OrgUnit { id: string; organizationId: string; unitCode: string; unitName: string; unitType: string; jurisdictionArea?: string; active: boolean; createdAt: string; }
export interface LiaisonOfficer { id: string; userId: string; userName: string; organizationId: string; organizationUnitId?: string; appointedFrom: string; appointedUntil?: string; appointmentReference: string; active: boolean; contactEmail?: string; contactPhone?: string; appointedBy: string; createdAt: string; rowVersion: number; }
export interface Delegation { id: string; delegatorUserId: string; delegatorName: string; delegateUserId: string; delegateName: string; organizationId: string; scope: string; validFrom: string; validUntil: string; delegationReason: string; officialReference: string; status: string; createdBy: string; createdAt: string; revokedBy?: string; revokedAt?: string; }
export interface Escalation { id: string; hearingId?: string; liaisonOfficerId: string; escalationType: string; description: string; escalatedTo: string; escalatedToName: string; status: string; resolutionNotes?: string; resolvedAt?: string; createdAt: string; updatedAt: string; }

@Injectable()
export class LiaisonService {
  constructor(
    private readonly mode: PersistenceModeService,
    private readonly pg: PgPoolService,
    private readonly memory: InMemoryStore,
    private readonly audit: AuditService,
  ) {}

  // ── Organization Units ────────────────────────────────────────────────────

  async createUnit(user: CurrentUser, dto: CreateOrganizationUnitDto, correlationId?: string): Promise<OrgUnit> {
    requireRoles(user, ['SYSTEM_ADMIN', 'COURT_CLERK']);
    const now = new Date().toISOString();
    if (!this.mode.postgres) {
      const item: OrgUnit = { id: this.memory.id(), organizationId: dto.organization_id, unitCode: dto.unit_code, unitName: dto.unit_name, unitType: dto.unit_type, jurisdictionArea: dto.jurisdiction_area, active: true, createdAt: now };
      this.mem().units.push(item);
      await this.audit.record('ORG_UNIT_CREATED', 'ORGANIZATION', dto.organization_id, user, { unit_code: dto.unit_code }, correlationId);
      return item;
    }
    return this.pg.transactionAs(user, async (c) => {
      const row = (await c.query(
        `insert into organization_units(organization_id,unit_code,unit_name,unit_type,jurisdiction_area)
         values($1,$2,$3,$4,$5) returning id,organization_id,unit_code,unit_name,unit_type,jurisdiction_area,active,created_at::text`,
        [dto.organization_id, dto.unit_code, dto.unit_name, dto.unit_type, dto.jurisdiction_area ?? null],
      )).rows[0];
      await this.audit.record('ORG_UNIT_CREATED', 'ORGANIZATION', dto.organization_id, user, { unit_code: dto.unit_code }, correlationId);
      return this.mapUnit(row);
    });
  }

  async listUnits(organizationId: string): Promise<OrgUnit[]> {
    if (!this.mode.postgres) return this.mem().units.filter(u => u.organizationId === organizationId && u.active);
    return this.pg.transactionAs(this.systemUser(), async (c) => {
      const rows = (await c.query(`select id,organization_id,unit_code,unit_name,unit_type,jurisdiction_area,active,created_at::text from organization_units where organization_id=$1 and active=true order by unit_name`, [organizationId])).rows;
      return rows.map(r => this.mapUnit(r));
    });
  }

  // ── Liaison Officers ──────────────────────────────────────────────────────

  async createLiaison(user: CurrentUser, dto: CreateLiaisonOfficerDto, correlationId?: string): Promise<LiaisonOfficer> {
    requireRoles(user, ['SYSTEM_ADMIN', 'COURT_CLERK']);
    const now = new Date().toISOString();
    if (!this.mode.postgres) {
      const item: LiaisonOfficer = { id: this.memory.id(), userId: dto.user_id, userName: dto.user_name, organizationId: dto.organization_id, organizationUnitId: dto.organization_unit_id, appointedFrom: dto.appointed_from, appointedUntil: dto.appointed_until, appointmentReference: dto.appointment_reference, active: true, contactEmail: dto.contact_email, contactPhone: dto.contact_phone, appointedBy: user.id, createdAt: now, rowVersion: 1 };
      this.mem().liaisons.push(item);
      await this.audit.record('LIAISON_OFFICER_APPOINTED', 'ORGANIZATION', dto.organization_id, user, { user_id: dto.user_id, appointment_reference: dto.appointment_reference }, correlationId);
      return item;
    }
    return this.pg.transactionAs(user, async (c) => {
      const row = (await c.query(
        `insert into liaison_officers(user_id,user_name,organization_id,organization_unit_id,appointed_from,appointed_until,appointment_reference,contact_email,contact_phone,appointed_by)
         values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         returning id,user_id,user_name,organization_id,organization_unit_id,appointed_from::text,appointed_until::text,appointment_reference,active,contact_email,contact_phone,appointed_by,created_at::text,row_version`,
        [dto.user_id, dto.user_name, dto.organization_id, dto.organization_unit_id ?? null, dto.appointed_from, dto.appointed_until ?? null, dto.appointment_reference, dto.contact_email ?? null, dto.contact_phone ?? null, user.id],
      )).rows[0];
      await this.audit.record('LIAISON_OFFICER_APPOINTED', 'ORGANIZATION', dto.organization_id, user, { user_id: dto.user_id }, correlationId);
      return this.mapLiaison(row);
    });
  }

  async listLiaisons(organizationId: string, user: CurrentUser): Promise<LiaisonOfficer[]> {
    requireRoles(user, ['SYSTEM_ADMIN', 'COURT_CLERK', 'LIAISON_OFFICER', 'AUDITOR']);
    if (!this.mode.postgres) return this.mem().liaisons.filter(l => l.organizationId === organizationId && l.active);
    return this.pg.transactionAs(user, async (c) => {
      const rows = (await c.query(`select id,user_id,user_name,organization_id,organization_unit_id,appointed_from::text,appointed_until::text,appointment_reference,active,contact_email,contact_phone,appointed_by,created_at::text,row_version from liaison_officers where organization_id=$1 and active=true order by appointed_from desc`, [organizationId])).rows;
      return rows.map(r => this.mapLiaison(r));
    });
  }

  async deactivateLiaison(id: string, reason: string, user: CurrentUser, correlationId?: string): Promise<LiaisonOfficer> {
    requireRoles(user, ['SYSTEM_ADMIN', 'COURT_CLERK']);
    if (!this.mode.postgres) {
      const l = this.mem().liaisons.find(x => x.id === id);
      if (!l) throw new DomainError('LIAISON_NOT_FOUND', 'Liaison officer not found.', 404);
      l.active = false; l.rowVersion++;
      await this.audit.record('LIAISON_OFFICER_DEACTIVATED', 'ORGANIZATION', l.organizationId, user, { liaison_id: id, reason }, correlationId);
      return l;
    }
    return this.pg.transactionAs(user, async (c) => {
      const row = (await c.query(`update liaison_officers set active=false,row_version=row_version+1,updated_at=now() where id=$1 returning id,user_id,user_name,organization_id,organization_unit_id,appointed_from::text,appointed_until::text,appointment_reference,active,contact_email,contact_phone,appointed_by,created_at::text,row_version`, [id])).rows[0];
      if (!row) throw new DomainError('LIAISON_NOT_FOUND', 'Liaison officer not found.', 404);
      await this.audit.record('LIAISON_OFFICER_DEACTIVATED', 'ORGANIZATION', row.organization_id, user, { liaison_id: id, reason }, correlationId);
      return this.mapLiaison(row);
    });
  }

  // ── Delegations ───────────────────────────────────────────────────────────

  async createDelegation(user: CurrentUser, dto: CreateDelegationDto, correlationId?: string): Promise<Delegation> {
    requireRoles(user, ['SYSTEM_ADMIN', 'LIAISON_OFFICER', 'COURT_CLERK']);
    if (dto.delegate_user_id === user.id) throw new DomainError('DELEGATION_SELF_FORBIDDEN', 'Cannot delegate to yourself.', 409);
    const now = new Date().toISOString();
    if (!this.mode.postgres) {
      const item: Delegation = { id: this.memory.id(), delegatorUserId: user.id, delegatorName: user.name, delegateUserId: dto.delegate_user_id, delegateName: dto.delegate_name, organizationId: dto.organization_id, scope: dto.scope, validFrom: dto.valid_from, validUntil: dto.valid_until, delegationReason: dto.delegation_reason, officialReference: dto.official_reference, status: 'ACTIVE', createdBy: user.id, createdAt: now };
      this.mem().delegations.push(item);
      await this.audit.record('DELEGATION_CREATED', 'ORGANIZATION', dto.organization_id, user, { delegate_user_id: dto.delegate_user_id, scope: dto.scope }, correlationId);
      return item;
    }
    return this.pg.transactionAs(user, async (c) => {
      const row = (await c.query(
        `insert into delegations(delegator_user_id,delegator_name,delegate_user_id,delegate_name,organization_id,scope,valid_from,valid_until,delegation_reason,official_reference,created_by)
         values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         returning id,delegator_user_id,delegator_name,delegate_user_id,delegate_name,organization_id,scope,valid_from::text,valid_until::text,delegation_reason,official_reference,status,created_by,created_at::text`,
        [user.id, user.name, dto.delegate_user_id, dto.delegate_name, dto.organization_id, dto.scope, dto.valid_from, dto.valid_until, dto.delegation_reason, dto.official_reference, user.id],
      )).rows[0];
      await this.audit.record('DELEGATION_CREATED', 'ORGANIZATION', dto.organization_id, user, { delegate_user_id: dto.delegate_user_id }, correlationId);
      return this.mapDelegation(row);
    });
  }

  async listDelegations(organizationId: string, user: CurrentUser): Promise<Delegation[]> {
    requireRoles(user, ['SYSTEM_ADMIN', 'LIAISON_OFFICER', 'COURT_CLERK', 'AUDITOR']);
    if (!this.mode.postgres) return this.mem().delegations.filter(d => d.organizationId === organizationId && d.status === 'ACTIVE');
    return this.pg.transactionAs(user, async (c) => {
      const rows = (await c.query(`select id,delegator_user_id,delegator_name,delegate_user_id,delegate_name,organization_id,scope,valid_from::text,valid_until::text,delegation_reason,official_reference,status,created_by,created_at::text from delegations where organization_id=$1 and status='ACTIVE' order by valid_from desc`, [organizationId])).rows;
      return rows.map(r => this.mapDelegation(r));
    });
  }

  async revokeDelegation(id: string, dto: RevokeDelegationDto, user: CurrentUser, correlationId?: string): Promise<Delegation> {
    requireRoles(user, ['SYSTEM_ADMIN', 'LIAISON_OFFICER', 'COURT_CLERK']);
    const now = new Date().toISOString();
    if (!this.mode.postgres) {
      const d = this.mem().delegations.find(x => x.id === id);
      if (!d) throw new DomainError('DELEGATION_NOT_FOUND', 'Delegation not found.', 404);
      d.status = 'REVOKED'; d.revokedBy = user.id; d.revokedAt = now;
      await this.audit.record('DELEGATION_REVOKED', 'ORGANIZATION', d.organizationId, user, { delegation_id: id, reason: dto.reason }, correlationId);
      return d;
    }
    return this.pg.transactionAs(user, async (c) => {
      const row = (await c.query(`update delegations set status='REVOKED',revoked_by=$2,revoked_at=now() where id=$1 returning id,delegator_user_id,delegator_name,delegate_user_id,delegate_name,organization_id,scope,valid_from::text,valid_until::text,delegation_reason,official_reference,status,created_by,created_at::text,revoked_by,revoked_at::text`, [id, user.id])).rows[0];
      if (!row) throw new DomainError('DELEGATION_NOT_FOUND', 'Delegation not found.', 404);
      await this.audit.record('DELEGATION_REVOKED', 'ORGANIZATION', row.organization_id, user, { delegation_id: id }, correlationId);
      return this.mapDelegation(row);
    });
  }

  // ── Escalations ───────────────────────────────────────────────────────────

  async createEscalation(user: CurrentUser, dto: CreateEscalationDto, correlationId?: string): Promise<Escalation> {
    requireRoles(user, ['LIAISON_OFFICER', 'COURT_CLERK', 'SYSTEM_ADMIN']);
    const now = new Date().toISOString();
    if (!this.mode.postgres) {
      const item: Escalation = { id: this.memory.id(), hearingId: dto.hearing_id, liaisonOfficerId: dto.liaison_officer_id, escalationType: dto.escalation_type, description: dto.description, escalatedTo: dto.escalated_to, escalatedToName: dto.escalated_to_name, status: 'OPEN', createdAt: now, updatedAt: now };
      this.mem().escalations.push(item);
      await this.audit.record('ESCALATION_CREATED', dto.hearing_id ? 'HEARING' : 'ORGANIZATION', dto.hearing_id ?? dto.liaison_officer_id, user, { escalation_type: dto.escalation_type }, correlationId);
      return item;
    }
    return this.pg.transactionAs(user, async (c) => {
      const row = (await c.query(
        `insert into liaison_escalations(hearing_id,liaison_officer_id,escalation_type,description,escalated_to,escalated_to_name)
         values($1,$2,$3,$4,$5,$6)
         returning id,hearing_id,liaison_officer_id,escalation_type,description,escalated_to,escalated_to_name,status,resolution_notes,resolved_at::text,created_at::text,updated_at::text`,
        [dto.hearing_id ?? null, dto.liaison_officer_id, dto.escalation_type, dto.description, dto.escalated_to, dto.escalated_to_name],
      )).rows[0];
      await this.audit.record('ESCALATION_CREATED', dto.hearing_id ? 'HEARING' : 'ESCALATION', dto.hearing_id ?? row.id, user, { escalation_type: dto.escalation_type }, correlationId);
      return this.mapEscalation(row);
    });
  }

  async listEscalations(hearingId: string | undefined, liaisonOfficerId: string | undefined, user: CurrentUser): Promise<Escalation[]> {
    requireRoles(user, ['LIAISON_OFFICER', 'COURT_CLERK', 'SYSTEM_ADMIN', 'AUDITOR']);
    if (!this.mode.postgres) {
      return this.mem().escalations.filter(e =>
        (!hearingId || e.hearingId === hearingId) &&
        (!liaisonOfficerId || e.liaisonOfficerId === liaisonOfficerId),
      );
    }
    return this.pg.transactionAs(user, async (c) => {
      const rows = (await c.query(
        `select id,hearing_id,liaison_officer_id,escalation_type,description,escalated_to,escalated_to_name,status,resolution_notes,resolved_at::text,created_at::text,updated_at::text
           from liaison_escalations where ($1::text is null or hearing_id=$1) and ($2::text is null or liaison_officer_id=$2) order by created_at desc`,
        [hearingId ?? null, liaisonOfficerId ?? null],
      )).rows;
      return rows.map(r => this.mapEscalation(r));
    });
  }

  async resolveEscalation(id: string, dto: ResolveEscalationDto, user: CurrentUser, correlationId?: string): Promise<Escalation> {
    requireRoles(user, ['LIAISON_OFFICER', 'COURT_CLERK', 'SYSTEM_ADMIN']);
    const now = new Date().toISOString();
    if (!this.mode.postgres) {
      const e = this.mem().escalations.find(x => x.id === id);
      if (!e) throw new DomainError('ESCALATION_NOT_FOUND', 'Escalation not found.', 404);
      e.status = 'RESOLVED'; e.resolutionNotes = dto.resolution_notes; e.resolvedAt = now; e.updatedAt = now;
      await this.audit.record('ESCALATION_RESOLVED', e.hearingId ? 'HEARING' : 'ESCALATION', e.hearingId ?? id, user, { resolution_notes: dto.resolution_notes }, correlationId);
      return e;
    }
    return this.pg.transactionAs(user, async (c) => {
      const row = (await c.query(`update liaison_escalations set status='RESOLVED',resolution_notes=$2,resolved_at=now(),updated_at=now() where id=$1 returning id,hearing_id,liaison_officer_id,escalation_type,description,escalated_to,escalated_to_name,status,resolution_notes,resolved_at::text,created_at::text,updated_at::text`, [id, dto.resolution_notes])).rows[0];
      if (!row) throw new DomainError('ESCALATION_NOT_FOUND', 'Escalation not found.', 404);
      await this.audit.record('ESCALATION_RESOLVED', row.hearing_id ? 'HEARING' : 'ESCALATION', row.hearing_id ?? id, user, { resolution_notes: dto.resolution_notes }, correlationId);
      return this.mapEscalation(row);
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private mem() {
    const s = this.memory as unknown as { liaisonUnits?: OrgUnit[]; liaisonOfficers?: LiaisonOfficer[]; liaisonDelegations?: Delegation[]; liaisonEscalations?: Escalation[] };
    s.liaisonUnits ??= []; s.liaisonOfficers ??= []; s.liaisonDelegations ??= []; s.liaisonEscalations ??= [];
    return { units: s.liaisonUnits, liaisons: s.liaisonOfficers, delegations: s.liaisonDelegations, escalations: s.liaisonEscalations };
  }

  private systemUser(): CurrentUser {
    return { id: 'cims-system', name: 'CIMS System', role: 'SYSTEM_ADMIN', roles: ['SYSTEM_ADMIN'], organizationId: 'system', organizationIds: [], permissions: ['*'], hearingAssignments: [], authSource: 'DEV' };
  }

  private mapUnit(r: Record<string, unknown>): OrgUnit {
    return { id: String(r.id), organizationId: String(r.organization_id), unitCode: String(r.unit_code), unitName: String(r.unit_name), unitType: String(r.unit_type), jurisdictionArea: r.jurisdiction_area ? String(r.jurisdiction_area) : undefined, active: Boolean(r.active), createdAt: String(r.created_at) };
  }

  private mapLiaison(r: Record<string, unknown>): LiaisonOfficer {
    return { id: String(r.id), userId: String(r.user_id), userName: String(r.user_name), organizationId: String(r.organization_id), organizationUnitId: r.organization_unit_id ? String(r.organization_unit_id) : undefined, appointedFrom: String(r.appointed_from), appointedUntil: r.appointed_until ? String(r.appointed_until) : undefined, appointmentReference: String(r.appointment_reference), active: Boolean(r.active), contactEmail: r.contact_email ? String(r.contact_email) : undefined, contactPhone: r.contact_phone ? String(r.contact_phone) : undefined, appointedBy: String(r.appointed_by), createdAt: String(r.created_at), rowVersion: Number(r.row_version) };
  }

  private mapDelegation(r: Record<string, unknown>): Delegation {
    return { id: String(r.id), delegatorUserId: String(r.delegator_user_id), delegatorName: String(r.delegator_name), delegateUserId: String(r.delegate_user_id), delegateName: String(r.delegate_name), organizationId: String(r.organization_id), scope: String(r.scope), validFrom: String(r.valid_from), validUntil: String(r.valid_until), delegationReason: String(r.delegation_reason), officialReference: String(r.official_reference), status: String(r.status), createdBy: String(r.created_by), createdAt: String(r.created_at), revokedBy: r.revoked_by ? String(r.revoked_by) : undefined, revokedAt: r.revoked_at ? String(r.revoked_at) : undefined };
  }

  private mapEscalation(r: Record<string, unknown>): Escalation {
    return { id: String(r.id), hearingId: r.hearing_id ? String(r.hearing_id) : undefined, liaisonOfficerId: String(r.liaison_officer_id), escalationType: String(r.escalation_type), description: String(r.description), escalatedTo: String(r.escalated_to), escalatedToName: String(r.escalated_to_name), status: String(r.status), resolutionNotes: r.resolution_notes ? String(r.resolution_notes) : undefined, resolvedAt: r.resolved_at ? String(r.resolved_at) : undefined, createdAt: String(r.created_at), updatedAt: String(r.updated_at) };
  }
}
