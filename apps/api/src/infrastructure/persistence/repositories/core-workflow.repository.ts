import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DomainError,
  type ActiveSchedule,
  type Determination,
  type OrganizationType,
  type ScheduleConflict,
  type ScheduleProposal,
  type ScheduleResource
} from '@cims/domain';
import type { PoolClient } from 'pg';
import type { CurrentUser } from '../../../common/current-user.decorator.js';
import {
  InMemoryStore,
  type HearingRecord,
  type OrganizationRecord,
  type HearingAgendaItemRecord
} from '../../workflow-support/in-memory.store.js';
import { PgPoolService } from '../database/pg-pool.service.js';
import { PersistenceModeService } from '../database/persistence-mode.service.js';

export interface ElectronicHearingRequestRecord {
  id: string;
  hearingId: string;
  requestedMode: 'ELECTRONIC' | 'HYBRID';
  reason: string;
  status: 'SUBMITTED' | 'REVIEWED' | 'CANCELLED';
  createdBy: string;
  createdAt: string;
  rowVersion: number;
}

export interface DeterminationRecord extends Determination {
  version: number;
  isCurrent: boolean;
  createdBy: string;
  rowVersion: number;
}

export interface ProposalRecord extends ScheduleProposal {
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  rowVersion: number;
}

export interface ScheduleRecord extends ActiveSchedule {
  displayTimezone: string;
  approvalReason: string;
  approvedBy: string;
  approvedAt: string;
  rowVersion: number;
}

@Injectable()
export class CoreWorkflowRepository {
  constructor(
    private readonly mode: PersistenceModeService,
    private readonly memory: InMemoryStore,
    private readonly pg: PgPoolService
  ) {}

  async listHearings(user?: CurrentUser): Promise<HearingRecord[]> {
    if (!this.mode.postgres) {
      if (!user) return this.memory.hearings; // If public user, return all
      if (user!.roles.includes('SYSTEM_ADMIN')) return this.memory.hearings;
      const allowed = new Set(
        this.memory.hearingAssignments
          .filter((item) => user!.organizationIds.includes(item.organizationId))
          .map((item) => item.hearingId)
      );
      for (const assignment of this.memory.hearingUserAssignments.filter(
        (item) => item.userId === user!.id && item.active
      ))
        allowed.add(assignment.hearingId);
      return this.memory.hearings.filter((item) => allowed.has(item.id));
    }

    // For postgres, we also need to allow public access (user is undefined)
    if (!user) {
      const client = await this.pg.pool.connect();
      try {
        const result = await client.query(
          `select h.id, h.case_number, h.hearing_type, h.state, h.case_id, h.hearing_sequence, h.intake_status, h.data_source, c.case_title
             from hearings h
             left join court_cases c on c.id=h.case_id
            order by h.created_at desc, h.id`
        );
        return result.rows.map((row: any) => ({
          id: String(row.id),
          caseNumber: String(row.case_number),
          type: String(row.hearing_type),
          state: String(row.state),
          caseId: row.case_id ? String(row.case_id) : undefined,
          hearingSequence: row.hearing_sequence ? Number(row.hearing_sequence) : undefined,
          intakeStatus: row.intake_status ? String(row.intake_status) : undefined,
          dataSource: row.data_source ? String(row.data_source) : undefined,
          caseTitle: row.case_title ? String(row.case_title) : undefined
        }));
      } finally {
        client.release();
      }
    }

    return this.pg.transactionAs(user!, async (client) => {
      const result = await client.query(
        `select h.id, h.case_number, h.hearing_type, h.state, h.case_id, h.hearing_sequence, h.intake_status, h.data_source, c.case_title
           from hearings h
           left join court_cases c on c.id=h.case_id
          order by h.created_at desc, h.id`
      );
      return result.rows.map((row: any) => ({
        id: String(row.id),
        caseNumber: String(row.case_number),
        type: String(row.hearing_type),
        state: String(row.state),
        caseId: row.case_id ? String(row.case_id) : undefined,
        hearingSequence: row.hearing_sequence ? Number(row.hearing_sequence) : undefined,
        intakeStatus: row.intake_status ? String(row.intake_status) : undefined,
        dataSource: row.data_source ? String(row.data_source) : undefined,
        caseTitle: row.case_title ? String(row.case_title) : undefined
      }));
    });
  }

  async getHearing(id: string, user: CurrentUser, client?: PoolClient): Promise<HearingRecord> {
    if (!this.mode.postgres) {
      const hearing = this.memory.hearings.find((item) => item.id === id);
      if (!hearing) throw new NotFoundException('Hearing not found');
      return hearing;
    }
    const query = async (connection: PoolClient) => {
      const result = await connection.query(
        `select h.id, h.case_number, h.hearing_type, h.state, h.case_id, h.hearing_sequence, h.intake_status, h.data_source, c.case_title
           from hearings h left join court_cases c on c.id=h.case_id
          where h.id=$1`,
        [id]
      );
      const row = result.rows[0];
      if (!row) throw new NotFoundException('Hearing not found');
      return {
        id: String(row.id),
        caseNumber: String(row.case_number),
        type: String(row.hearing_type),
        state: String(row.state),
        caseId: row.case_id ? String(row.case_id) : undefined,
        hearingSequence: row.hearing_sequence ? Number(row.hearing_sequence) : undefined,
        intakeStatus: row.intake_status ? String(row.intake_status) : undefined,
        dataSource: row.data_source ? String(row.data_source) : undefined,
        caseTitle: row.case_title ? String(row.case_title) : undefined
      };
    };
    return client ? query(client) : this.pg.transactionAs(user, query);
  }

  async hasActiveIntake(
    hearingId: string,
    user: CurrentUser,
    client?: PoolClient
  ): Promise<boolean> {
    if (!this.mode.postgres) {
      const hearing = await this.getHearing(hearingId, user);
      return (hearing.intakeStatus ?? 'ACTIVE') === 'ACTIVE';
    }
    const query = async (connection: PoolClient) => {
      const result = await connection.query(`select intake_status from hearings where id=$1`, [
        hearingId
      ]);
      return result.rows[0]?.intake_status === 'ACTIVE';
    };
    return client ? query(client) : this.pg.transactionAs(user, query);
  }

  async assertActiveIntake(
    hearingId: string,
    user: CurrentUser,
    client?: PoolClient
  ): Promise<void> {
    if (!(await this.hasActiveIntake(hearingId, user, client))) {
      throw new DomainError(
        'HEARING_DATA_NOT_ACTIVE',
        'Data awal persidangan harus berstatus ACTIVE sebelum workflow berikutnya dijalankan.',
        409,
        { hearingId }
      );
    }
  }

  async updateHearingState(
    hearingId: string,
    state: string,
    user: CurrentUser,
    expectedRowVersion?: number,
    client?: PoolClient
  ): Promise<void> {
    if (!this.mode.postgres) {
      const hearing = await this.getHearing(hearingId, user);
      hearing.state = state;
      return;
    }
    const update = async (connection: PoolClient) => {
      const values: unknown[] = [hearingId, state];
      let predicate = '';
      if (expectedRowVersion !== undefined) {
        values.push(expectedRowVersion);
        predicate = ' and row_version=$3';
      }
      const result = await connection.query(
        `update hearings
            set state=$2, row_version=row_version+1, updated_at=now()
          where id=$1${predicate}
          returning id`,
        values
      );
      if (result.rowCount !== 1) {
        throw new DomainError(
          'OPTIMISTIC_CONCURRENCY_CONFLICT',
          'Hearing was changed by another transaction.',
          409,
          {
            hearingId,
            expectedRowVersion
          }
        );
      }
    };
    if (client) await update(client);
    else await this.pg.transactionAs(user, update);
  }

  async getOrganization(id: string, user: CurrentUser): Promise<OrganizationRecord> {
    if (!this.mode.postgres) {
      const organization = this.memory.organizations.find((item) => item.id === id);
      if (!organization)
        throw new DomainError('ORGANIZATION_NOT_FOUND', 'User organization was not found.', 404);
      return organization;
    }
    const rows = await this.pg.transactionAs(
      user,
      async (client) =>
        (
          await client.query(
            'select id,name,organization_type from organizations where id=$1 and active=true',
            [id]
          )
        ).rows
    );
    const row = rows[0];
    if (!row)
      throw new DomainError('ORGANIZATION_NOT_FOUND', 'User organization was not found.', 404);
    return {
      id: String(row.id),
      name: String(row.name),
      type: String(row.organization_type) as OrganizationType
    };
  }

  async requiredOrganizationTypes(
    hearingId: string,
    user: CurrentUser
  ): Promise<OrganizationType[]> {
    if (!this.mode.postgres) {
      return this.memory.hearingAssignments
        .filter((item) => item.hearingId === hearingId)
        .map(
          (item) =>
            this.memory.organizations.find(
              (organization) => organization.id === item.organizationId
            )?.type
        )
        .filter((item): item is OrganizationType => Boolean(item));
    }
    return this.pg.transactionAs(user!, async (client) => {
      const result = await client.query(
        `select distinct o.organization_type
           from hearing_assignments a
           join organizations o on o.id=a.organization_id
          where a.hearing_id=$1 and a.active=true and o.active=true
          order by o.organization_type`,
        [hearingId]
      );
      return result.rows.map((row) => String(row.organization_type) as OrganizationType);
    });
  }

  async createRequest(
    input: { hearingId: string; requestedMode: 'ELECTRONIC' | 'HYBRID'; reason: string },
    user: CurrentUser
  ): Promise<ElectronicHearingRequestRecord> {
    if (!this.mode.postgres) {
      await this.getHearing(input.hearingId, user);
      const item = {
        id: this.memory.id(),
        hearingId: input.hearingId,
        requestedMode: input.requestedMode,
        reason: input.reason,
        status: 'SUBMITTED' as const,
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        rowVersion: 1
      };
      this.memory.requests.push(item as unknown as Record<string, unknown>);
      return item;
    }
    return this.pg.transactionAs(user!, async (client) => {
      await this.getHearing(input.hearingId, user, client);
      const result = await client.query(
        `insert into electronic_hearing_requests(hearing_id,requested_mode,reason,status,created_by)
         values($1,$2,$3,'SUBMITTED',$4)
         returning id,hearing_id,requested_mode,reason,status,created_by,created_at::text,row_version`,
        [input.hearingId, input.requestedMode, input.reason, user.id]
      );
      return this.mapRequest(result.rows[0]);
    });
  }

  async createDetermination(
    input: {
      hearingId: string;
      decision: 'APPROVED' | 'REJECTED';
      hearingMode?: 'LANGSUNG' | 'ELEKTRONIK' | 'HYBRID';
      officialReference: string;
      reason: string;
    },
    user: CurrentUser
  ): Promise<DeterminationRecord> {
    if (!this.mode.postgres) {
      await this.getHearing(input.hearingId, user);
      const version =
        this.memory.determinations.filter((item) => item.hearingId === input.hearingId).length + 1;
      const item: DeterminationRecord = {
        id: this.memory.id(),
        hearingId: input.hearingId,
        decision: input.decision,
        hearingMode: input.hearingMode,
        officialReference: input.officialReference,
        reason: input.reason,
        createdAt: new Date().toISOString(),
        version,
        isCurrent: true,
        createdBy: user.id,
        rowVersion: 1
      };
      this.memory.determinations.push(item);
      return item;
    }
    return this.pg.transactionAs(user!, async (client) => {
      await this.getHearing(input.hearingId, user, client);
      await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))', [
        `determination:${input.hearingId}`
      ]);
      const versionResult = await client.query(
        'select coalesce(max(version),0)+1 as version from judicial_determinations where hearing_id=$1',
        [input.hearingId]
      );
      const version = Number(versionResult.rows[0]?.version ?? 1);
      await client.query(
        'update judicial_determinations set is_current=false where hearing_id=$1 and is_current=true',
        [input.hearingId]
      );
      const result = await client.query(
        `insert into judicial_determinations(hearing_id,version,decision,hearing_mode,official_reference,reason,is_current,created_by)
         values($1,$2,$3,$4,$5,$6,true,$7)
         returning id,hearing_id,version,decision,hearing_mode,official_reference,reason,is_current,created_by,created_at::text,row_version`,
        [
          input.hearingId,
          version,
          input.decision,
          input.hearingMode ?? null,
          input.officialReference,
          input.reason,
          user.id
        ]
      );
      return this.mapDetermination(result.rows[0]);
    });
  }

  async determinations(hearingId: string, user: CurrentUser): Promise<DeterminationRecord[]> {
    if (!this.mode.postgres) {
      return this.memory.determinations
        .filter((item) => item.hearingId === hearingId)
        .map((item, index) => ({
          ...item,
          version: (item as Partial<DeterminationRecord>).version ?? index + 1,
          isCurrent:
            (item as Partial<DeterminationRecord>).isCurrent ??
            index === this.memory.determinations.length - 1,
          createdBy: (item as Partial<DeterminationRecord>).createdBy ?? 'legacy-memory',
          rowVersion: (item as Partial<DeterminationRecord>).rowVersion ?? 1
        }));
    }
    return this.pg.transactionAs(user!, async (client) => {
      const result = await client.query(
        `select id,hearing_id,version,decision,hearing_mode,official_reference,reason,is_current,created_by,created_at::text,row_version
           from judicial_determinations
          where hearing_id=$1
          order by version desc`,
        [hearingId]
      );
      return result.rows.map((row) => this.mapDetermination(row));
    });
  }

  async hasApprovedDetermination(hearingId: string, user: CurrentUser): Promise<boolean> {
    if (!this.mode.postgres) {
      return this.memory.determinations.some(
        (item) => item.hearingId === hearingId && item.decision === 'APPROVED'
      );
    }
    const rows = await this.pg.transactionAs(
      user,
      async (client) =>
        (
          await client.query(
            `select exists(
           select 1 from judicial_determinations
            where hearing_id=$1 and is_current=true and decision='APPROVED'
         ) as valid`,
            [hearingId]
          )
        ).rows
    );
    return Boolean(rows[0]?.valid);
  }

  async createProposal(
    input: {
      hearingId: string;
      startAt: string;
      endAt: string;
      displayTimezone: string;
      resources: ScheduleResource[];
    },
    user: CurrentUser
  ): Promise<ProposalRecord> {
    if (!this.mode.postgres) {
      const proposal: ProposalRecord = {
        id: this.memory.id(),
        hearingId: input.hearingId,
        startAt: input.startAt,
        endAt: input.endAt,
        displayTimezone: input.displayTimezone,
        resources: input.resources,
        status: 'DRAFT',
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        rowVersion: 1
      };
      this.memory.proposals.push(proposal);
      return proposal;
    }
    return this.pg.transactionAs(user!, async (client) => {
      await this.getHearing(input.hearingId, user, client);
      const result = await client.query(
        `insert into schedule_proposals(hearing_id,start_at,end_at,display_timezone,status,created_by)
         values($1,$2,$3,$4,'DRAFT',$5)
         returning id,hearing_id,start_at::text,end_at::text,display_timezone,status,created_by,created_at::text,updated_at::text,row_version`,
        [input.hearingId, input.startAt, input.endAt, input.displayTimezone, user.id]
      );
      const id = String(result.rows[0].id);
      for (const resource of input.resources) {
        await client.query(
          `insert into schedule_proposal_resources(proposal_id,resource_type,resource_id,requirement)
           values($1,$2,$3,$4)`,
          [id, resource.resourceType, resource.resourceId, resource.requirement]
        );
      }
      return this.mapProposal(result.rows[0], input.resources);
    });
  }

  async getProposal(id: string, user: CurrentUser, client?: PoolClient): Promise<ProposalRecord> {
    if (!this.mode.postgres) {
      const item = this.memory.proposals.find((proposal) => proposal.id === id) as
        ProposalRecord | undefined;
      if (!item) throw new NotFoundException('Proposal not found');
      return {
        ...item,
        createdBy: item.createdBy ?? 'legacy-memory',
        createdAt: item.createdAt ?? new Date().toISOString(),
        updatedAt: item.updatedAt ?? new Date().toISOString(),
        rowVersion: item.rowVersion ?? 1
      };
    }
    const query = async (connection: PoolClient) => {
      const result = await connection.query(
        `select id,hearing_id,start_at::text,end_at::text,display_timezone,status,created_by,created_at::text,updated_at::text,row_version
           from schedule_proposals where id=$1`,
        [id]
      );
      const row = result.rows[0];
      if (!row) throw new NotFoundException('Proposal not found');
      const resourceRows = await connection.query(
        `select resource_type,resource_id,requirement
           from schedule_proposal_resources
          where proposal_id=$1
          order by resource_type,resource_id`,
        [id]
      );
      return this.mapProposal(
        row,
        resourceRows.rows.map((resource) => ({
          resourceType: String(resource.resource_type) as ScheduleResource['resourceType'],
          resourceId: String(resource.resource_id),
          requirement: String(resource.requirement) as ScheduleResource['requirement']
        }))
      );
    };
    return client ? query(client) : this.pg.transactionAs(user, query);
  }

  async activeSchedulesForConflict(
    proposal: ProposalRecord,
    user: CurrentUser
  ): Promise<ScheduleRecord[]> {
    if (!this.mode.postgres) {
      return this.memory.schedules.map((schedule) => ({
        ...schedule,
        displayTimezone:
          (schedule as Partial<ScheduleRecord>).displayTimezone ?? proposal.displayTimezone,
        approvalReason: (schedule as Partial<ScheduleRecord>).approvalReason ?? 'legacy-memory',
        approvedBy: (schedule as Partial<ScheduleRecord>).approvedBy ?? 'legacy-memory',
        approvedAt: (schedule as Partial<ScheduleRecord>).approvedAt ?? new Date().toISOString(),
        rowVersion: (schedule as Partial<ScheduleRecord>).rowVersion ?? 1
      }));
    }
    return this.pg.transactionAs(user!, async (client) => {
      const result = await client.query(
        `select id,hearing_id,start_at::text,end_at::text,display_timezone,version,status,approval_reason,approved_by,approved_at::text,row_version
           from hearing_schedules
          where status='ACTIVE' and hearing_id<>$1 and start_at < $3::timestamptz and end_at > $2::timestamptz`,
        [proposal.hearingId, proposal.startAt, proposal.endAt]
      );
      const schedules: ScheduleRecord[] = [];
      for (const row of result.rows) {
        const resourceRows = await client.query(
          `select resource_type,resource_id,requirement from hearing_schedule_resources where schedule_id=$1`,
          [row.id]
        );
        schedules.push(
          this.mapSchedule(
            row,
            resourceRows.rows.map((resource) => ({
              resourceType: String(resource.resource_type) as ScheduleResource['resourceType'],
              resourceId: String(resource.resource_id),
              requirement: String(resource.requirement) as ScheduleResource['requirement']
            }))
          )
        );
      }
      return schedules;
    });
  }

  async saveConflictCheck(
    proposalId: string,
    conflicts: ScheduleConflict[],
    user: CurrentUser,
    expectedRowVersion?: number
  ): Promise<ProposalRecord> {
    if (!this.mode.postgres) {
      const proposal = await this.getProposal(proposalId, user);
      proposal.status = 'CHECKED';
      proposal.rowVersion += 1;
      proposal.updatedAt = new Date().toISOString();
      this.memory.conflicts.set(proposalId, conflicts);
      return proposal;
    }
    return this.pg.transactionAs(user!, async (client) => {
      const proposal = await this.getProposal(proposalId, user, client);
      const expected = expectedRowVersion ?? proposal.rowVersion;
      const update = await client.query(
        `update schedule_proposals
            set status='CHECKED', row_version=row_version+1, updated_at=now()
          where id=$1 and row_version=$2
          returning id`,
        [proposalId, expected]
      );
      if (update.rowCount !== 1) {
        throw new DomainError(
          'OPTIMISTIC_CONCURRENCY_CONFLICT',
          'Schedule proposal was changed by another transaction.',
          409,
          {
            proposalId,
            expectedRowVersion: expected
          }
        );
      }
      await client.query('delete from schedule_conflicts where proposal_id=$1', [proposalId]);
      for (const conflict of conflicts) {
        await client.query(
          `insert into schedule_conflicts(proposal_id,conflict_code,severity,message,resource_type,resource_id)
           values($1,$2,$3,$4,$5,$6)`,
          [
            proposalId,
            conflict.code,
            conflict.severity,
            conflict.message,
            conflict.resourceType ?? null,
            conflict.resourceId ?? null
          ]
        );
      }
      return this.getProposal(proposalId, user, client);
    });
  }

  async conflicts(
    proposalId: string,
    user: CurrentUser,
    client?: PoolClient
  ): Promise<ScheduleConflict[]> {
    if (!this.mode.postgres) return this.memory.conflicts.get(proposalId) ?? [];
    const query = async (connection: PoolClient) => {
      const result = await connection.query(
        `select conflict_code,severity,message,resource_type,resource_id
           from schedule_conflicts
          where proposal_id=$1
          order by severity,resource_type,resource_id`,
        [proposalId]
      );
      return result.rows.map((row: any) => ({
        code: String(row.conflict_code),
        severity: String(row.severity) as ScheduleConflict['severity'],
        message: String(row.message),
        resourceType: row.resource_type ? String(row.resource_type) : undefined,
        resourceId: row.resource_id ? String(row.resource_id) : undefined
      }));
    };
    return client ? query(client) : this.pg.transactionAs(user, query);
  }

  async approveProposal(
    proposalId: string,
    reason: string,
    user: CurrentUser,
    expectedRowVersion?: number
  ): Promise<ScheduleRecord> {
    if (!this.mode.postgres) {
      const proposal = await this.getProposal(proposalId, user);
      const conflicts = await this.conflicts(proposalId, user);
      if (proposal.status !== 'CHECKED')
        throw new DomainError(
          'CONFLICT_CHECK_REQUIRED',
          'Conflict check is required before approval.',
          409
        );
      if (conflicts.some((item) => item.severity === 'REQUIRED'))
        throw new DomainError(
          'CONFLICT_UNRESOLVED',
          'Required scheduling conflicts remain.',
          409,
          conflicts
        );
      for (const schedule of this.memory.schedules.filter(
        (item) => item.hearingId === proposal.hearingId && item.status === 'ACTIVE'
      ))
        schedule.status = 'SUPERSEDED';
      const schedule: ScheduleRecord = {
        id: this.memory.id(),
        hearingId: proposal.hearingId,
        startAt: proposal.startAt,
        endAt: proposal.endAt,
        displayTimezone: proposal.displayTimezone,
        version:
          this.memory.schedules.filter((item) => item.hearingId === proposal.hearingId).length + 1,
        status: 'ACTIVE',
        resources: proposal.resources,
        approvalReason: reason,
        approvedBy: user.id,
        approvedAt: new Date().toISOString(),
        rowVersion: 1
      };
      this.memory.schedules.push(schedule);
      proposal.status = 'APPROVED';
      proposal.rowVersion += 1;
      return schedule;
    }
    return this.pg.transactionAs(user!, async (client) => {
      const proposal = await this.getProposal(proposalId, user, client);
      if (proposal.status !== 'CHECKED')
        throw new DomainError(
          'CONFLICT_CHECK_REQUIRED',
          'Conflict check is required before approval.',
          409
        );
      const blocking = (await this.conflicts(proposalId, user, client)).filter(
        (item) => item.severity === 'REQUIRED'
      );
      if (blocking.length)
        throw new DomainError(
          'CONFLICT_UNRESOLVED',
          'Required scheduling conflicts remain.',
          409,
          blocking
        );
      await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))', [
        `schedule:${proposal.hearingId}`
      ]);
      const expected = expectedRowVersion ?? proposal.rowVersion;
      const proposalUpdate = await client.query(
        `update schedule_proposals
            set status='APPROVED', row_version=row_version+1, updated_at=now()
          where id=$1 and row_version=$2
          returning id`,
        [proposalId, expected]
      );
      if (proposalUpdate.rowCount !== 1) {
        throw new DomainError(
          'OPTIMISTIC_CONCURRENCY_CONFLICT',
          'Schedule proposal was changed by another transaction.',
          409,
          {
            proposalId,
            expectedRowVersion: expected
          }
        );
      }
      await client.query(
        `update hearing_schedules
            set status='SUPERSEDED', row_version=row_version+1
          where hearing_id=$1 and status='ACTIVE'`,
        [proposal.hearingId]
      );
      const versionResult = await client.query(
        'select coalesce(max(version),0)+1 as version from hearing_schedules where hearing_id=$1',
        [proposal.hearingId]
      );
      const version = Number(versionResult.rows[0]?.version ?? 1);
      const result = await client.query(
        `insert into hearing_schedules(hearing_id,version,start_at,end_at,display_timezone,status,approval_reason,approved_by)
         values($1,$2,$3,$4,$5,'ACTIVE',$6,$7)
         returning id,hearing_id,start_at::text,end_at::text,display_timezone,version,status,approval_reason,approved_by,approved_at::text,row_version`,
        [
          proposal.hearingId,
          version,
          proposal.startAt,
          proposal.endAt,
          proposal.displayTimezone,
          reason,
          user.id
        ]
      );
      const scheduleId = String(result.rows[0].id);
      for (const resource of proposal.resources) {
        await client.query(
          `insert into hearing_schedule_resources(schedule_id,resource_type,resource_id,requirement)
           values($1,$2,$3,$4)`,
          [scheduleId, resource.resourceType, resource.resourceId, resource.requirement]
        );
      }
      await this.updateHearingState(proposal.hearingId, 'SCHEDULED', user, undefined, client);
      return this.mapSchedule(result.rows[0], proposal.resources);
    });
  }

  async schedules(hearingId: string, user: CurrentUser): Promise<ScheduleRecord[]> {
    if (!this.mode.postgres) {
      return this.memory.schedules
        .filter((item) => item.hearingId === hearingId)
        .map((schedule) => ({
          ...schedule,
          displayTimezone: (schedule as Partial<ScheduleRecord>).displayTimezone ?? 'Asia/Jakarta',
          approvalReason: (schedule as Partial<ScheduleRecord>).approvalReason ?? 'legacy-memory',
          approvedBy: (schedule as Partial<ScheduleRecord>).approvedBy ?? 'legacy-memory',
          approvedAt: (schedule as Partial<ScheduleRecord>).approvedAt ?? new Date().toISOString(),
          rowVersion: (schedule as Partial<ScheduleRecord>).rowVersion ?? 1
        }));
    }
    return this.pg.transactionAs(user!, async (client) => {
      const result = await client.query(
        `select id,hearing_id,start_at::text,end_at::text,display_timezone,version,status,approval_reason,approved_by,approved_at::text,row_version
           from hearing_schedules
          where hearing_id=$1
          order by version desc`,
        [hearingId]
      );
      const schedules: ScheduleRecord[] = [];
      for (const row of result.rows) {
        const resources = await client.query(
          'select resource_type,resource_id,requirement from hearing_schedule_resources where schedule_id=$1 order by resource_type,resource_id',
          [row.id]
        );
        schedules.push(
          this.mapSchedule(
            row,
            resources.rows.map((resource) => ({
              resourceType: String(resource.resource_type) as ScheduleResource['resourceType'],
              resourceId: String(resource.resource_id),
              requirement: String(resource.requirement) as ScheduleResource['requirement']
            }))
          )
        );
      }
      return schedules;
    });
  }

  // M-05: Mengambil riwayat lengkap jadwal persidangan
  async scheduleHistory(hearingId: string, user: CurrentUser): Promise<ScheduleRecord[]> {
    if (!this.mode.postgres) {
      return this.memory.schedules
        .filter((schedule) => schedule.hearingId === hearingId)
        .sort((a, b) => b.version - a.version)
        .map((schedule) => ({
          ...schedule,
          displayTimezone: (schedule as Partial<ScheduleRecord>).displayTimezone ?? 'Asia/Jakarta',
          approvalReason: (schedule as Partial<ScheduleRecord>).approvalReason ?? 'legacy-memory',
          approvedBy: (schedule as Partial<ScheduleRecord>).approvedBy ?? 'legacy-memory',
          approvedAt: (schedule as Partial<ScheduleRecord>).approvedAt ?? new Date().toISOString(),
          rowVersion: (schedule as Partial<ScheduleRecord>).rowVersion ?? 1
        }));
    }
    return this.pg.transactionAs(user!, async (client) => {
      const result = await client.query(
        `select id,hearing_id,start_at::text,end_at::text,display_timezone,version,status,approval_reason,approved_by,approved_at::text,row_version
           from hearing_schedules
          where hearing_id=$1
          order by version desc`,
        [hearingId]
      );
      const schedules: ScheduleRecord[] = [];
      for (const row of result.rows) {
        const resources = await client.query(
          'select resource_type,resource_id,requirement from hearing_schedule_resources where schedule_id=$1 order by resource_type,resource_id',
          [row.id]
        );
        schedules.push(
          this.mapSchedule(
            row,
            resources.rows.map((resource) => ({
              resourceType: String(resource.resource_type) as ScheduleResource['resourceType'],
              resourceId: String(resource.resource_id),
              requirement: String(resource.requirement) as ScheduleResource['requirement']
            }))
          )
        );
      }
      return schedules;
    });
  }

  async activeSchedule(
    hearingId: string,
    user: CurrentUser,
    client?: PoolClient
  ): Promise<ScheduleRecord | undefined> {
    if (!this.mode.postgres)
      return (await this.schedules(hearingId, user)).find((item) => item.status === 'ACTIVE');
    const query = async (connection: PoolClient) => {
      const result = await connection.query(
        `select id,hearing_id,start_at::text,end_at::text,display_timezone,version,status,approval_reason,approved_by,approved_at::text,row_version
           from hearing_schedules
          where hearing_id=$1 and status='ACTIVE'
          order by version desc limit 1`,
        [hearingId]
      );
      const row = result.rows[0];
      if (!row) return undefined;
      const resources = await connection.query(
        'select resource_type,resource_id,requirement from hearing_schedule_resources where schedule_id=$1',
        [row.id]
      );
      return this.mapSchedule(
        row,
        resources.rows.map((resource) => ({
          resourceType: String(resource.resource_type) as ScheduleResource['resourceType'],
          resourceId: String(resource.resource_id),
          requirement: String(resource.requirement) as ScheduleResource['requirement']
        }))
      );
    };
    return client ? query(client) : this.pg.transactionAs(user, query);
  }

  private mapRequest(row: Record<string, unknown>): ElectronicHearingRequestRecord {
    return {
      id: String(row.id),
      hearingId: String(row.hearing_id),
      requestedMode: String(row.requested_mode) as ElectronicHearingRequestRecord['requestedMode'],
      reason: String(row.reason),
      status: String(row.status) as ElectronicHearingRequestRecord['status'],
      createdBy: String(row.created_by),
      createdAt: String(row.created_at),
      rowVersion: Number(row.row_version)
    };
  }

  private mapDetermination(row: Record<string, unknown>): DeterminationRecord {
    return {
      id: String(row.id),
      hearingId: String(row.hearing_id),
      version: Number(row.version),
      decision: String(row.decision) as DeterminationRecord['decision'],
      hearingMode: row.hearing_mode
        ? (String(row.hearing_mode) as DeterminationRecord['hearingMode'])
        : undefined,
      officialReference: String(row.official_reference),
      reason: String(row.reason),
      isCurrent: Boolean(row.is_current),
      createdBy: String(row.created_by),
      createdAt: String(row.created_at),
      rowVersion: Number(row.row_version)
    };
  }

  private mapProposal(row: Record<string, unknown>, resources: ScheduleResource[]): ProposalRecord {
    return {
      id: String(row.id),
      hearingId: String(row.hearing_id),
      startAt: String(row.start_at),
      endAt: String(row.end_at),
      displayTimezone: String(row.display_timezone),
      status: String(row.status) as ProposalRecord['status'],
      resources,
      createdBy: String(row.created_by),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      rowVersion: Number(row.row_version)
    };
  }

  private mapSchedule(row: Record<string, unknown>, resources: ScheduleResource[]): ScheduleRecord {
    return {
      id: String(row.id),
      hearingId: String(row.hearing_id),
      startAt: String(row.start_at),
      endAt: String(row.end_at),
      displayTimezone: String(row.display_timezone),
      version: Number(row.version),
      status: String(row.status) as ScheduleRecord['status'],
      resources,
      approvalReason: String(row.approval_reason),
      approvedBy: String(row.approved_by),
      approvedAt: String(row.approved_at),
      rowVersion: Number(row.row_version)
    };
  }

  async listCalendar(
    user: CurrentUser,
    from: string,
    to: string,
    organizationId?: string
  ): Promise<
    Array<ScheduleRecord & { caseNumber: string; hearingType: string; caseTitle?: string }>
  > {
    if (!this.mode.postgres) {
      // Memory mock — kembalikan semua jadwal aktif
      const schedules = this.memory.schedules.filter(
        (s) => s.status === 'ACTIVE' && s.startAt >= from && s.startAt <= to
      );
      return schedules.map((s) => {
        const hearing = this.memory.hearings.find((h) => h.id === s.hearingId);
        return {
          ...s,
          displayTimezone: (s as Partial<ScheduleRecord>).displayTimezone ?? 'Asia/Jakarta',
          approvalReason: (s as Partial<ScheduleRecord>).approvalReason ?? 'mock',
          approvedBy: (s as Partial<ScheduleRecord>).approvedBy ?? 'mock',
          approvedAt: (s as Partial<ScheduleRecord>).approvedAt ?? new Date().toISOString(),
          rowVersion: 1,
          caseNumber: hearing?.caseNumber ?? 'Unknown',
          hearingType: hearing?.type ?? 'Unknown',
          caseTitle: hearing?.caseTitle
        };
      });
    }
    return this.pg.transactionAs(user!, async (client) => {
      // H-04: Query join jadwal aktif dengan hearings dan assignment
      // Memfilter berdasarkan rentang waktu, dan memverifikasi akses (RBAC/Assignment)
      const params: unknown[] = [from, to];
      let orgFilter = '';
      if (organizationId) {
        params.push(organizationId);
        orgFilter = `and exists(select 1 from hearing_assignments ha where ha.hearing_id=s.hearing_id and ha.organization_id=$3 and ha.active=true)`;
      }

      // Filter hak akses: SYSTEM_ADMIN bisa semua, lainnya hanya yg di-assign
      let accessFilter = '';
      if (!user.roles.includes('SYSTEM_ADMIN')) {
        params.push(user.organizationIds);
        accessFilter = `and exists(select 1 from hearing_assignments ha2 where ha2.hearing_id=s.hearing_id and ha2.organization_id = any($${params.length}))`;
      }

      const result = await client.query(
        `select s.id, s.hearing_id, s.start_at::text, s.end_at::text, s.display_timezone,
                s.version, s.status, s.approval_reason, s.approved_by, s.approved_at::text, s.row_version,
                h.case_number, h.hearing_type, c.case_title
           from hearing_schedules s
           join hearings h on h.id = s.hearing_id
      left join court_cases c on c.id = h.case_id
          where s.status = 'ACTIVE'
            and s.start_at >= $1::timestamptz
            and s.start_at <= $2::timestamptz
            ${orgFilter}
            ${accessFilter}
          order by s.start_at asc`,
        params
      );

      return Promise.all(
        result.rows.map(async (row) => {
          // Fetch resources for each schedule (n+1 tapi jumlah record dibatasi by daterange)
          const resourceRows = await client.query(
            `select resource_type,resource_id,requirement from hearing_schedule_resources where schedule_id=$1`,
            [row.id]
          );
          const resources = resourceRows.rows.map((r) => ({
            resourceType: String(r.resource_type) as ScheduleResource['resourceType'],
            resourceId: String(r.resource_id),
            requirement: String(r.requirement) as ScheduleResource['requirement']
          }));

          return {
            ...this.mapSchedule(row, resources),
            caseNumber: String(row.case_number),
            hearingType: String(row.hearing_type),
            caseTitle: row.case_title ? String(row.case_title) : undefined
          };
        })
      );
    });
  }

  async getAgendaItems(hearingId: string, user: CurrentUser): Promise<HearingAgendaItemRecord[]> {
    if (!this.mode.postgres) {
      return this.memory.hearingAgendaItems
        .filter((i) => i.hearingId === hearingId)
        .sort((a, b) => a.sequenceNumber - b.sequenceNumber);
    }
    return this.pg.transactionAs(user!, async (client) => {
      const result = await client.query(
        `select id, hearing_id, sequence_number, item_type, item_description, estimated_duration_minutes, status
           from hearing_agenda_items
          where hearing_id=$1
          order by sequence_number`,
        [hearingId]
      );
      return result.rows.map((row: any) => ({
        id: String(row.id),
        hearingId: String(row.hearing_id),
        sequenceNumber: Number(row.sequence_number),
        itemType: String(row.item_type),
        itemDescription: String(row.item_description),
        estimatedDurationMinutes: Number(row.estimated_duration_minutes),
        status: String(row.status) as HearingAgendaItemRecord['status']
      }));
    });
  }

  async saveAgendaItems(
    hearingId: string,
    items: Array<{ itemType: string; itemDescription: string; estimatedDurationMinutes?: number }>,
    user: CurrentUser
  ): Promise<HearingAgendaItemRecord[]> {
    if (!this.mode.postgres) {
      this.memory.hearingAgendaItems = this.memory.hearingAgendaItems.filter(
        (i) => i.hearingId !== hearingId
      );
      const newItems = items.map((input, index) => ({
        id: this.memory.id(),
        hearingId,
        sequenceNumber: index + 1,
        itemType: input.itemType,
        itemDescription: input.itemDescription,
        estimatedDurationMinutes: input.estimatedDurationMinutes ?? 30,
        status: 'PENDING' as const
      }));
      this.memory.hearingAgendaItems.push(...newItems);
      return newItems;
    }
    return this.pg.transactionAs(user!, async (client) => {
      await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))', [
        `agenda:${hearingId}`
      ]);
      await client.query('delete from hearing_agenda_items where hearing_id=$1', [hearingId]);

      const newItems: HearingAgendaItemRecord[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const result = await client.query(
          `insert into hearing_agenda_items(hearing_id, sequence_number, item_type, item_description, estimated_duration_minutes, status, created_by)
           values($1, $2, $3, $4, $5, 'PENDING', $6)
           returning id, hearing_id, sequence_number, item_type, item_description, estimated_duration_minutes, status`,
          [
            hearingId,
            i + 1,
            item.itemType,
            item.itemDescription,
            item.estimatedDurationMinutes ?? 30,
            user.id
          ]
        );
        const row = result.rows[0];
        newItems.push({
          id: String(row.id),
          hearingId: String(row.hearing_id),
          sequenceNumber: Number(row.sequence_number),
          itemType: String(row.item_type),
          itemDescription: String(row.item_description),
          estimatedDurationMinutes: Number(row.estimated_duration_minutes),
          status: String(row.status) as HearingAgendaItemRecord['status']
        });
      }
      return newItems;
    });
  }
}
