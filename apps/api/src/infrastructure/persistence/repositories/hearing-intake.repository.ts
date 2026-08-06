import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DomainError,
  assertManualIntakeEditable,
  normalizeCaseNumber,
  transitionHearingIntake,
  type HearingIntakeAction,
  type HearingIntakeStatus,
  type ManualHearingIntakeInput
} from '@cims/domain';
import type { CurrentUser } from '../../../common/current-user.decorator.js';
import { FieldCryptoService } from '../../security/field-crypto.service.js';
import {
  InMemoryStore,
  type CourtCaseRecord,
  type HearingDataRevisionRecord,
  type HearingIntakePartyRecord,
  type HearingRecord
} from '../../workflow-support/in-memory.store.js';
import { PersistenceModeService } from '../database/persistence-mode.service.js';
import { PgPoolService } from '../database/pg-pool.service.js';

export interface ManualHearingRecord extends HearingRecord {
  caseId: string;
  officialCaseReference?: string;
  caseClassification: string;
  caseTypeCode: string;
  caseTitle: string;
  hearingSequence: number;
  intakeStatus: HearingIntakeStatus;
  dataSource: 'MANUAL' | 'EXTERNAL_DATABASE';
  courtOrganizationId: string;
  prosecutionOrganizationId: string;
  correctionsOrganizationId?: string;
  defendantCustodyStatus: string;
  notes?: string;
  createdBy: string;
  updatedBy: string;
  submittedBy?: string;
  submittedAt?: string;
  activatedBy?: string;
  activatedAt?: string;
  returnReason?: string;
  rowVersion: number;
  createdAt: string;
  updatedAt: string;
  defendants: Array<{
    id: string;
    displayName: string;
    alias?: string;
    protectedIdentity: boolean;
    custodyStatus: string;
    detentionOrganizationId?: string;
  }>;
}

@Injectable()
export class HearingIntakeRepository {
  constructor(
    private readonly mode: PersistenceModeService,
    private readonly memory: InMemoryStore,
    private readonly pg: PgPoolService,
    private readonly crypto: FieldCryptoService
  ) {}

  async list(
    user: CurrentUser,
    filter: { status?: string; query?: string } = {}
  ): Promise<ManualHearingRecord[]> {
    if (!this.mode.postgres) {
      const allowedIds = new Set(
        this.memory.hearingAssignments
          .filter(
            (item) =>
              user.roles.includes('SYSTEM_ADMIN') ||
              user.organizationIds.includes(item.organizationId)
          )
          .map((item) => item.hearingId)
      );
      return Promise.all(
        this.memory.hearings
          .filter((item) => allowedIds.has(item.id))
          .filter((item) => (item.dataSource ?? 'MANUAL') === 'MANUAL')
          .filter((item) => !filter.status || item.intakeStatus === filter.status)
          .filter(
            (item) =>
              !filter.query ||
              `${item.caseNumber} ${item.caseTitle ?? ''}`
                .toLowerCase()
                .includes(filter.query.toLowerCase())
          )
          .map((item) => this.get(item.id, user))
      );
    }
    return this.pg.transactionAs(user, async (client) => {
      const values: unknown[] = [];
      const predicates: string[] = [];
      if (filter.status) {
        values.push(filter.status);
        predicates.push(`h.intake_status=$${values.length}`);
      }
      if (filter.query) {
        values.push(`%${filter.query}%`);
        predicates.push(
          `(c.case_number ilike $${values.length} or c.case_title ilike $${values.length})`
        );
      }
      const where = predicates.length ? `and ${predicates.join(' and ')}` : '';
      const result = await client.query(
        `select h.id
           from hearings h
           join court_cases c on c.id=h.case_id
          where h.data_source='MANUAL' ${where}
          order by h.created_at desc, h.id`,
        values
      );
      const items: ManualHearingRecord[] = [];
      for (const row of result.rows) items.push(await this.getWithClient(String(row.id), client));
      return items;
    });
  }

  async get(hearingId: string, user: CurrentUser): Promise<ManualHearingRecord> {
    if (!this.mode.postgres) {
      const hearing = this.memory.hearings.find((item) => item.id === hearingId);
      if (!hearing?.caseId || (hearing.dataSource ?? 'MANUAL') !== 'MANUAL')
        throw new NotFoundException('Manual hearing intake not found');
      const courtCase = this.memory.courtCases.find((item) => item.id === hearing.caseId);
      if (!courtCase) throw new NotFoundException('Case record not found');
      const defendants = this.memory.hearingIntakeParties
        .filter((item) => item.hearingId === hearingId)
        .map((item) => ({
          id: item.id,
          displayName: item.displayName,
          alias: item.alias,
          protectedIdentity: item.protectedIdentity,
          custodyStatus: item.custodyStatus,
          detentionOrganizationId: item.detentionOrganizationId
        }));
      const anyHearing = hearing as HearingRecord & Record<string, unknown>;
      return {
        ...hearing,
        caseId: courtCase.id,
        officialCaseReference: courtCase.officialCaseReference,
        caseClassification: courtCase.caseClassification,
        caseTypeCode: courtCase.caseTypeCode,
        caseTitle: courtCase.caseTitle,
        hearingSequence: hearing.hearingSequence ?? 1,
        intakeStatus: (hearing.intakeStatus ?? 'ACTIVE') as HearingIntakeStatus,
        dataSource: (hearing.dataSource ?? 'MANUAL') as 'MANUAL' | 'EXTERNAL_DATABASE',
        courtOrganizationId: courtCase.courtOrganizationId,
        prosecutionOrganizationId: courtCase.prosecutionOrganizationId,
        correctionsOrganizationId: hearing.correctionsOrganizationId,
        defendantCustodyStatus: String(anyHearing.defendantCustodyStatus ?? 'UNKNOWN'),
        notes: typeof anyHearing.notes === 'string' ? anyHearing.notes : undefined,
        createdBy: String(anyHearing.createdBy ?? courtCase.createdBy),
        updatedBy: String(anyHearing.updatedBy ?? courtCase.createdBy),
        submittedBy:
          typeof anyHearing.submittedBy === 'string' ? anyHearing.submittedBy : undefined,
        submittedAt:
          typeof anyHearing.submittedAt === 'string' ? anyHearing.submittedAt : undefined,
        activatedBy:
          typeof anyHearing.activatedBy === 'string' ? anyHearing.activatedBy : undefined,
        activatedAt:
          typeof anyHearing.activatedAt === 'string' ? anyHearing.activatedAt : undefined,
        returnReason:
          typeof anyHearing.returnReason === 'string' ? anyHearing.returnReason : undefined,
        rowVersion: Number(hearing.rowVersion ?? 1),
        createdAt: String(anyHearing.createdAt ?? courtCase.createdAt),
        updatedAt: String(anyHearing.updatedAt ?? courtCase.updatedAt),
        defendants
      };
    }
    return this.pg.transactionAs(user, (client) => this.getWithClient(hearingId, client));
  }

  async create(input: ManualHearingIntakeInput, user: CurrentUser): Promise<ManualHearingRecord> {
    const now = new Date().toISOString();
    const normalized = normalizeCaseNumber(input.caseNumber);
    if (!this.mode.postgres) {
      let courtCase = this.memory.courtCases.find(
        (item) =>
          item.courtOrganizationId === input.courtOrganizationId &&
          item.normalizedCaseNumber === normalized
      );
      if (!courtCase) {
        courtCase = {
          id: this.memory.id(),
          caseNumber: input.caseNumber.trim(),
          normalizedCaseNumber: normalized,
          officialCaseReference: input.officialCaseReference?.trim() || undefined,
          caseClassification: input.caseClassification,
          caseTypeCode: input.caseTypeCode.trim(),
          caseTitle: input.caseTitle.trim(),
          courtOrganizationId: input.courtOrganizationId,
          prosecutionOrganizationId: input.prosecutionOrganizationId,
          dataSource: 'MANUAL',
          createdBy: user.id,
          createdAt: now,
          updatedAt: now,
          rowVersion: 1
        };
        this.memory.courtCases.push(courtCase);
      }
      if (
        this.memory.hearings.some(
          (item) =>
            item.caseId === courtCase!.id &&
            item.hearingSequence === input.hearingSequence &&
            item.intakeStatus !== 'ARCHIVED'
        )
      ) {
        throw new DomainError(
          'HEARING_INTAKE_DUPLICATE',
          'Urutan persidangan untuk perkara tersebut sudah tercatat.',
          409,
          { caseNumber: input.caseNumber, hearingSequence: input.hearingSequence }
        );
      }
      const hearing = {
        id: this.memory.id(),
        caseId: courtCase.id,
        caseNumber: courtCase.caseNumber,
        type: input.hearingType.trim(),
        state: 'DRAFT',
        hearingSequence: input.hearingSequence,
        intakeStatus: 'DRAFT',
        dataSource: 'MANUAL',
        caseTitle: courtCase.caseTitle,
        courtOrganizationId: input.courtOrganizationId,
        prosecutionOrganizationId: input.prosecutionOrganizationId,
        correctionsOrganizationId: input.correctionsOrganizationId,
        defendantCustodyStatus: input.defendantCustodyStatus,
        notes: input.notes?.trim() || undefined,
        createdBy: user.id,
        updatedBy: user.id,
        rowVersion: 1,
        createdAt: now,
        updatedAt: now
      } as HearingRecord & Record<string, unknown>;
      this.memory.hearings.push(hearing as HearingRecord);
      for (const organizationId of [
        input.courtOrganizationId,
        input.prosecutionOrganizationId,
        input.correctionsOrganizationId
      ].filter(Boolean) as string[]) {
        if (
          !this.memory.hearingAssignments.some(
            (item) => item.hearingId === hearing.id && item.organizationId === organizationId
          )
        )
          this.memory.hearingAssignments.push({ hearingId: hearing.id, organizationId });
      }
      this.memory.hearingUserAssignments.push({
        hearingId: hearing.id,
        userId: user.id,
        assignmentRole: 'CREATOR',
        active: true,
        createdAt: now
      });
      this.replaceMemoryDefendants(hearing.id, input, user.id, now);
      this.appendMemoryRevision(hearing.id, 'CREATED', input, user.id, undefined, now);
      if (!user.hearingAssignments.includes(hearing.id)) user.hearingAssignments.push(hearing.id);
      return this.get(hearing.id, user);
    }
    return this.pg.transactionAs(user, async (client) => {
      let caseRow = (
        await client.query(
          `select id from court_cases where court_organization_id=$1 and normalized_case_number=$2 for update`,
          [input.courtOrganizationId, normalized]
        )
      ).rows[0];
      if (!caseRow) {
        caseRow = (
          await client.query(
            `insert into court_cases(case_number,normalized_case_number,official_case_reference,case_classification,case_type_code,case_title,court_organization_id,prosecution_organization_id,data_source,created_by,updated_by)
           values($1,$2,$3,$4,$5,$6,$7,$8,'MANUAL',$9,$9) returning id`,
            [
              input.caseNumber.trim(),
              normalized,
              input.officialCaseReference?.trim() || null,
              input.caseClassification,
              input.caseTypeCode.trim(),
              input.caseTitle.trim(),
              input.courtOrganizationId,
              input.prosecutionOrganizationId,
              user.id
            ]
          )
        ).rows[0];
      }
      const duplicate = await client.query(
        `select id from hearings where case_id=$1 and hearing_sequence=$2 and intake_status<>'ARCHIVED'`,
        [caseRow.id, input.hearingSequence]
      );
      if (duplicate.rowCount)
        throw new DomainError(
          'HEARING_INTAKE_DUPLICATE',
          'Urutan persidangan untuk perkara tersebut sudah tercatat.',
          409
        );
      const hearingRow = (
        await client.query(
          `insert into hearings(case_id,case_number,hearing_type,state,hearing_sequence,intake_status,data_source,court_organization_id,prosecution_organization_id,corrections_organization_id,defendant_custody_status,notes,created_by,updated_by)
         values($1,$2,$3,'DRAFT',$4,'DRAFT','MANUAL',$5,$6,$7,$8,$9,$10,$10) returning id`,
          [
            caseRow.id,
            input.caseNumber.trim(),
            input.hearingType.trim(),
            input.hearingSequence,
            input.courtOrganizationId,
            input.prosecutionOrganizationId,
            input.correctionsOrganizationId ?? null,
            input.defendantCustodyStatus,
            input.notes?.trim() || null,
            user.id
          ]
        )
      ).rows[0];
      for (const organizationId of [
        input.courtOrganizationId,
        input.prosecutionOrganizationId,
        input.correctionsOrganizationId
      ].filter(Boolean) as string[]) {
        await client.query(
          `insert into hearing_assignments(hearing_id,organization_id) values($1,$2) on conflict(hearing_id,organization_id) do update set active=true`,
          [hearingRow.id, organizationId]
        );
      }
      await client.query(
        `insert into hearing_user_assignments(hearing_id,user_id,assignment_role) values($1,$2,'CREATOR') on conflict(hearing_id,user_id) do update set active=true`,
        [hearingRow.id, user.id]
      );
      await this.replacePgDefendants(client, hearingRow.id, input, user.id);
      await this.appendPgRevision(client, hearingRow.id, 'CREATED', input, user.id);
      return this.getWithClient(String(hearingRow.id), client);
    });
  }

  async update(
    hearingId: string,
    input: ManualHearingIntakeInput,
    expectedRowVersion: number,
    user: CurrentUser
  ): Promise<ManualHearingRecord> {
    const current = await this.get(hearingId, user);
    assertManualIntakeEditable(current.intakeStatus);
    const now = new Date().toISOString();
    if (!this.mode.postgres) {
      if (current.rowVersion !== expectedRowVersion)
        throw new DomainError(
          'OPTIMISTIC_CONCURRENCY_CONFLICT',
          'Data persidangan telah diubah pengguna lain.',
          409,
          { actual: current.rowVersion, expected: expectedRowVersion }
        );
      const currentCase = this.memory.courtCases.find((item) => item.id === current.caseId)!;
      const normalized = normalizeCaseNumber(input.caseNumber);
      const targetCase = this.memory.courtCases.find(
        (item) =>
          item.courtOrganizationId === input.courtOrganizationId &&
          item.normalizedCaseNumber === normalized
      );
      const resolvedCase = targetCase ?? currentCase;
      if (
        this.memory.hearings.some(
          (item) =>
            item.id !== hearingId &&
            item.caseId === resolvedCase.id &&
            item.hearingSequence === input.hearingSequence &&
            item.intakeStatus !== 'ARCHIVED'
        )
      ) {
        throw new DomainError(
          'HEARING_INTAKE_DUPLICATE',
          'Urutan persidangan untuk perkara tersebut sudah tercatat.',
          409,
          { caseNumber: input.caseNumber, hearingSequence: input.hearingSequence }
        );
      }
      if (!targetCase || targetCase.id === currentCase.id) {
        currentCase.caseNumber = input.caseNumber.trim();
        currentCase.normalizedCaseNumber = normalized;
        currentCase.officialCaseReference = input.officialCaseReference?.trim() || undefined;
        currentCase.caseClassification = input.caseClassification;
        currentCase.caseTypeCode = input.caseTypeCode.trim();
        currentCase.caseTitle = input.caseTitle.trim();
        currentCase.courtOrganizationId = input.courtOrganizationId;
        currentCase.prosecutionOrganizationId = input.prosecutionOrganizationId;
        currentCase.updatedAt = now;
        currentCase.rowVersion += 1;
      }
      const hearing = this.memory.hearings.find((item) => item.id === hearingId)! as HearingRecord &
        Record<string, unknown>;
      hearing.caseId = resolvedCase.id;
      hearing.caseNumber = input.caseNumber.trim();
      hearing.type = input.hearingType.trim();
      hearing.hearingSequence = input.hearingSequence;
      hearing.caseTitle = input.caseTitle.trim();
      hearing.courtOrganizationId = input.courtOrganizationId;
      hearing.prosecutionOrganizationId = input.prosecutionOrganizationId;
      hearing.correctionsOrganizationId = input.correctionsOrganizationId;
      hearing.defendantCustodyStatus = input.defendantCustodyStatus;
      hearing.notes = input.notes?.trim() || undefined;
      hearing.updatedBy = user.id;
      hearing.updatedAt = now;
      hearing.rowVersion = current.rowVersion + 1;
      this.syncMemoryAssignments(
        hearingId,
        [
          input.courtOrganizationId,
          input.prosecutionOrganizationId,
          input.correctionsOrganizationId
        ].filter(Boolean) as string[]
      );
      this.replaceMemoryDefendants(hearingId, input, user.id, now);
      this.appendMemoryRevision(hearingId, 'UPDATED', input, user.id, undefined, now);
      return this.get(hearingId, user);
    }
    return this.pg.transactionAs(user, async (client) => {
      const locked = (
        await client.query(
          `select intake_status,row_version,case_id from hearings where id=$1 for update`,
          [hearingId]
        )
      ).rows[0];
      if (!locked) throw new NotFoundException('Hearing intake not found');
      assertManualIntakeEditable(locked.intake_status);
      if (Number(locked.row_version) !== expectedRowVersion)
        throw new DomainError(
          'OPTIMISTIC_CONCURRENCY_CONFLICT',
          'Data persidangan telah diubah pengguna lain.',
          409,
          { actual: Number(locked.row_version), expected: expectedRowVersion }
        );
      const normalized = normalizeCaseNumber(input.caseNumber);
      const targetCaseResult = await client.query(
        `select id from court_cases where court_organization_id=$1 and normalized_case_number=$2 for update`,
        [input.courtOrganizationId, normalized]
      );
      let targetCaseId = targetCaseResult.rows[0]?.id
        ? String(targetCaseResult.rows[0].id)
        : String(locked.case_id);
      if (!targetCaseResult.rowCount || targetCaseId === String(locked.case_id)) {
        await client.query(
          `update court_cases set case_number=$2,normalized_case_number=$3,official_case_reference=$4,case_classification=$5,case_type_code=$6,case_title=$7,court_organization_id=$8,prosecution_organization_id=$9,updated_by=$10,row_version=row_version+1,updated_at=now() where id=$1`,
          [
            locked.case_id,
            input.caseNumber.trim(),
            normalized,
            input.officialCaseReference?.trim() || null,
            input.caseClassification,
            input.caseTypeCode.trim(),
            input.caseTitle.trim(),
            input.courtOrganizationId,
            input.prosecutionOrganizationId,
            user.id
          ]
        );
        targetCaseId = String(locked.case_id);
      }
      const duplicate = await client.query(
        `select id from hearings where id<>$1 and case_id=$2 and hearing_sequence=$3 and intake_status<>'ARCHIVED'`,
        [hearingId, targetCaseId, input.hearingSequence]
      );
      if (duplicate.rowCount)
        throw new DomainError(
          'HEARING_INTAKE_DUPLICATE',
          'Urutan persidangan untuk perkara tersebut sudah tercatat.',
          409,
          { caseNumber: input.caseNumber, hearingSequence: input.hearingSequence }
        );
      await client.query(
        `update hearings set case_id=$2,case_number=$3,hearing_type=$4,hearing_sequence=$5,court_organization_id=$6,prosecution_organization_id=$7,corrections_organization_id=$8,defendant_custody_status=$9,notes=$10,updated_by=$11,row_version=row_version+1,updated_at=now() where id=$1`,
        [
          hearingId,
          targetCaseId,
          input.caseNumber.trim(),
          input.hearingType.trim(),
          input.hearingSequence,
          input.courtOrganizationId,
          input.prosecutionOrganizationId,
          input.correctionsOrganizationId ?? null,
          input.defendantCustodyStatus,
          input.notes?.trim() || null,
          user.id
        ]
      );
      await this.syncPgAssignments(
        client,
        hearingId,
        [
          input.courtOrganizationId,
          input.prosecutionOrganizationId,
          input.correctionsOrganizationId
        ].filter(Boolean) as string[]
      );
      await client.query(
        `update hearing_intake_parties set deleted_at=now() where hearing_id=$1 and deleted_at is null`,
        [hearingId]
      );
      await this.replacePgDefendants(client, hearingId, input, user.id);
      await this.appendPgRevision(client, hearingId, 'UPDATED', input, user.id);
      return this.getWithClient(hearingId, client);
    });
  }

  async transition(
    hearingId: string,
    action: HearingIntakeAction,
    reason: string | undefined,
    user: CurrentUser
  ): Promise<ManualHearingRecord> {
    const current = await this.get(hearingId, user);
    const next = transitionHearingIntake(current.intakeStatus, action);
    const now = new Date().toISOString();
    if (!this.mode.postgres) {
      const hearing = this.memory.hearings.find((item) => item.id === hearingId)! as HearingRecord &
        Record<string, unknown>;
      hearing.intakeStatus = next;
      hearing.updatedBy = user.id;
      hearing.updatedAt = now;
      hearing.rowVersion = current.rowVersion + 1;
      if (action === 'SUBMIT') {
        hearing.submittedBy = user.id;
        hearing.submittedAt = now;
        hearing.returnReason = undefined;
      }
      if (action === 'ACTIVATE') {
        hearing.activatedBy = user.id;
        hearing.activatedAt = now;
        hearing.state = 'DRAFT';
      }
      if (action === 'RETURN')
        hearing.returnReason = reason?.trim() || 'Dikembalikan untuk diperbaiki.';
      this.appendMemoryRevision(
        hearingId,
        action,
        await this.snapshot(hearingId, user),
        user.id,
        reason,
        now
      );
      return this.get(hearingId, user);
    }
    return this.pg.transactionAs(user, async (client) => {
      const row = (
        await client.query(
          `select intake_status,row_version from hearings where id=$1 for update`,
          [hearingId]
        )
      ).rows[0];
      if (!row) throw new NotFoundException('Hearing intake not found');
      const databaseNext = transitionHearingIntake(row.intake_status, action);
      await client.query(
        `update hearings set intake_status=$2,updated_by=$3,row_version=row_version+1,updated_at=now(),
          submitted_by=case when $4='SUBMIT' then $3 else submitted_by end,
          submitted_at=case when $4='SUBMIT' then now() else submitted_at end,
          activated_by=case when $4='ACTIVATE' then $3 else activated_by end,
          activated_at=case when $4='ACTIVATE' then now() else activated_at end,
          return_reason=case when $4='RETURN' then $5 when $4 in ('SUBMIT','REOPEN') then null else return_reason end
         where id=$1`,
        [hearingId, databaseNext, user.id, action, reason?.trim() || null]
      );
      const snapshot = await this.getWithClient(hearingId, client);
      await this.appendPgRevision(client, hearingId, action, snapshot, user.id, reason);
      return snapshot;
    });
  }

  async referenceData(user: CurrentUser): Promise<{
    organizations: Array<{ id: string; name: string; type: string }>;
    caseClassifications: string[];
    custodyStatuses: string[];
    hearingTypes: string[];
    judges: Array<{ id: string; name: string }>;
  }> {
    const organizations = !this.mode.postgres
      ? this.memory.organizations.map((item) => ({ id: item.id, name: item.name, type: item.type }))
      : await this.pg.transactionAs(user, async (client) =>
          (
            await client.query(
              `select id,name,organization_type as type from organizations where active=true order by organization_type,name`
            )
          ).rows.map((row) => ({
            id: String(row.id),
            name: String(row.name),
            type: String(row.type)
          }))
        );

    // Mock judges for DEV/Pilot since they aren't stored in postgres organizations table
    // Usually these would come from an external SSO / HR API.
    const judges = [
      { id: '196005031988041001', name: 'Drs. ARIFIN, S.H., M.Hum.' },
      { id: '196105171988031008', name: 'Dr ZULFAHMI, S.H., M.Hum.' },
      { id: '196303121985032003', name: 'ELIWARTI, S.H., M.H.' },
      { id: '196506301992121001', name: 'WENDRA RAIS, S.H., M.H.' },
      { id: '196503151992121001', name: 'ESTIONO, S.H., M.H.' },
      { id: '196308261988031003', name: 'BAGUS IRAWAN, S.H., M.H.' },
      { id: '196512111992121001', name: 'ELFIAN, S.H., M.H.' },
      { id: '196209221992121001', name: 'MORGAN SIMANJUNTAK, S.H., M.Hum.' },
      { id: '196301101991032002', name: 'DAHLIA PANJAITAN, S.H.' },
      { id: '1403010103624882', name: 'Dr. M. SURYADI, S.H., M.H.' },
      { id: 'judge-demo', name: 'Hakim Demo' }
    ];

    return {
      organizations,
      judges,
      caseClassifications: ['GENERAL_CRIMINAL', 'SPECIAL_CRIMINAL'],
      custodyStatuses: ['DETAINED', 'NOT_DETAINED', 'MIXED', 'UNKNOWN'],
      hearingTypes: [
        'PEMBACAAN_DAKWAAN',
        'PEMERIKSAAN_SAKSI',
        'PEMERIKSAAN_AHLI',
        'PEMERIKSAAN_TERDAKWA',
        'TUNTUTAN',
        'PLEDOI',
        'PEMBACAAN_PUTUSAN',
        'LAINNYA'
      ]
    };
  }

  async importSources(): Promise<Array<Record<string, unknown>>> {
    if (!this.mode.postgres) return this.memory.hearingImportSources;
    return this.pg.query(
      `select id,source_code as code,name,source_type,enabled,configuration_status as status,last_health_check_at::text as last_checked_at from hearing_import_sources order by name`
    );
  }

  private async getWithClient(
    hearingId: string,
    client: import('pg').PoolClient
  ): Promise<ManualHearingRecord> {
    const row = (
      await client.query(
        `select h.id,h.case_id,h.case_number,h.hearing_type,h.state,h.hearing_sequence,h.intake_status,h.data_source,
              h.court_organization_id,h.prosecution_organization_id,h.corrections_organization_id,h.defendant_custody_status,h.notes,
              h.created_by,h.updated_by,h.submitted_by,h.submitted_at::text,h.activated_by,h.activated_at::text,h.return_reason,
              h.row_version,h.created_at::text,h.updated_at::text,
              c.official_case_reference,c.case_classification,c.case_type_code,c.case_title
         from hearings h join court_cases c on c.id=h.case_id where h.id=$1`,
        [hearingId]
      )
    ).rows[0];
    if (!row || row.data_source !== 'MANUAL')
      throw new NotFoundException('Manual hearing intake not found');
    const parties = (
      await client.query(
        `select id,display_name_encrypted,alias,protected_identity,custody_status,detention_organization_id
         from hearing_intake_parties where hearing_id=$1 and deleted_at is null order by created_at,id`,
        [hearingId]
      )
    ).rows;
    return {
      id: String(row.id),
      caseId: String(row.case_id),
      caseNumber: String(row.case_number),
      officialCaseReference: row.official_case_reference ?? undefined,
      caseClassification: String(row.case_classification),
      caseTypeCode: String(row.case_type_code),
      caseTitle: String(row.case_title),
      type: String(row.hearing_type),
      state: String(row.state),
      hearingSequence: Number(row.hearing_sequence),
      intakeStatus: row.intake_status,
      dataSource: row.data_source,
      courtOrganizationId: String(row.court_organization_id),
      prosecutionOrganizationId: String(row.prosecution_organization_id),
      correctionsOrganizationId: row.corrections_organization_id ?? undefined,
      defendantCustodyStatus: String(row.defendant_custody_status),
      notes: row.notes ?? undefined,
      createdBy: String(row.created_by),
      updatedBy: String(row.updated_by),
      submittedBy: row.submitted_by ?? undefined,
      submittedAt: row.submitted_at ?? undefined,
      activatedBy: row.activated_by ?? undefined,
      activatedAt: row.activated_at ?? undefined,
      returnReason: row.return_reason ?? undefined,
      rowVersion: Number(row.row_version),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      defendants: parties.map((party) => ({
        id: String(party.id),
        displayName: this.crypto.decrypt(party.display_name_encrypted) ?? '',
        alias: party.alias ?? undefined,
        protectedIdentity: Boolean(party.protected_identity),
        custodyStatus: String(party.custody_status),
        detentionOrganizationId: party.detention_organization_id ?? undefined
      }))
    };
  }

  private syncMemoryAssignments(hearingId: string, organizationIds: string[]): void {
    this.memory.hearingAssignments.splice(
      0,
      this.memory.hearingAssignments.length,
      ...this.memory.hearingAssignments.filter(
        (item) => item.hearingId !== hearingId || organizationIds.includes(item.organizationId)
      )
    );
    for (const organizationId of organizationIds) {
      if (
        !this.memory.hearingAssignments.some(
          (item) => item.hearingId === hearingId && item.organizationId === organizationId
        )
      ) {
        this.memory.hearingAssignments.push({ hearingId, organizationId });
      }
    }
  }

  private async syncPgAssignments(
    client: import('pg').PoolClient,
    hearingId: string,
    organizationIds: string[]
  ): Promise<void> {
    await client.query(
      `update hearing_assignments set active=false where hearing_id=$1 and not (organization_id=any($2::text[]))`,
      [hearingId, organizationIds]
    );
    for (const organizationId of organizationIds) {
      await client.query(
        `insert into hearing_assignments(hearing_id,organization_id,active) values($1,$2,true)
         on conflict(hearing_id,organization_id) do update set active=true`,
        [hearingId, organizationId]
      );
    }
  }

  private replaceMemoryDefendants(
    hearingId: string,
    input: ManualHearingIntakeInput,
    userId: string,
    at: string
  ): void {
    this.memory.hearingIntakeParties.splice(
      0,
      this.memory.hearingIntakeParties.length,
      ...this.memory.hearingIntakeParties.filter((item) => item.hearingId !== hearingId)
    );
    for (const defendant of input.defendants)
      this.memory.hearingIntakeParties.push({
        id: this.memory.id(),
        hearingId,
        partyType: 'DEFENDANT',
        displayName: defendant.displayName.trim(),
        alias: defendant.alias?.trim() || undefined,
        protectedIdentity: defendant.protectedIdentity,
        custodyStatus: defendant.custodyStatus,
        detentionOrganizationId: defendant.detentionOrganizationId,
        createdBy: userId,
        createdAt: at
      });
  }

  private async replacePgDefendants(
    client: import('pg').PoolClient,
    hearingId: string,
    input: ManualHearingIntakeInput,
    userId: string
  ): Promise<void> {
    for (const defendant of input.defendants)
      await client.query(
        `insert into hearing_intake_parties(hearing_id,party_type,display_name_encrypted,display_name_search_hash,alias,protected_identity,custody_status,detention_organization_id,created_by)
       values($1,'DEFENDANT',$2,$3,$4,$5,$6,$7,$8)`,
        [
          hearingId,
          this.crypto.encrypt(defendant.displayName.trim()),
          this.crypto.searchHash(defendant.displayName),
          defendant.alias?.trim() || null,
          defendant.protectedIdentity,
          defendant.custodyStatus,
          defendant.detentionOrganizationId ?? null,
          userId
        ]
      );

    // Assign Judges
    await client.query('delete from hearing_user_assignments where hearing_id = $1', [hearingId]);
    if (input.judges && input.judges.length > 0) {
      for (const judge of input.judges) {
        await client.query(
          `insert into hearing_user_assignments(hearing_id, user_id, assignment_role)
           values($1, $2, $3)`,
          [hearingId, judge.userId, judge.role]
        );
      }
    }
  }

  private appendMemoryRevision(
    hearingId: string,
    action: string,
    snapshot: unknown,
    actorUserId: string,
    reason: string | undefined,
    at: string
  ): void {
    const revisionNumber =
      this.memory.hearingDataRevisions.filter((item) => item.hearingId === hearingId).length + 1;
    const revision: HearingDataRevisionRecord = {
      id: this.memory.id(),
      hearingId,
      revisionNumber,
      action,
      snapshot: this.sanitizeRevisionSnapshot(snapshot),
      reason,
      actorUserId,
      createdAt: at
    };
    this.memory.hearingDataRevisions.push(revision);
  }

  private async appendPgRevision(
    client: import('pg').PoolClient,
    hearingId: string,
    action: string,
    snapshot: unknown,
    actorUserId: string,
    reason?: string
  ): Promise<void> {
    await client.query(
      `insert into hearing_data_revisions(hearing_id,revision_number,action,snapshot,reason,actor_user_id)
       values($1,(select coalesce(max(revision_number),0)+1 from hearing_data_revisions where hearing_id=$1),$2,$3::jsonb,$4,$5)`,
      [
        hearingId,
        action,
        JSON.stringify(this.sanitizeRevisionSnapshot(snapshot)),
        reason?.trim() || null,
        actorUserId
      ]
    );
  }

  private sanitizeRevisionSnapshot(snapshot: unknown): unknown {
    if (!snapshot || typeof snapshot !== 'object') return snapshot;
    const value = snapshot as Record<string, unknown>;
    const defendantsRaw = Array.isArray(value.defendants) ? value.defendants : [];
    const defendants = defendantsRaw.map((item) => {
      const defendant = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
      const displayName =
        typeof defendant.displayName === 'string'
          ? defendant.displayName
          : typeof defendant.display_name === 'string'
            ? defendant.display_name
            : '';
      return {
        id: defendant.id,
        display_name_hash: displayName ? this.crypto.searchHash(displayName) : undefined,
        alias: defendant.alias,
        protected_identity: defendant.protectedIdentity ?? defendant.protected_identity,
        custody_status: defendant.custodyStatus ?? defendant.custody_status,
        detention_organization_id:
          defendant.detentionOrganizationId ?? defendant.detention_organization_id
      };
    });
    const { defendants: _defendants, ...rest } = value;
    return { ...rest, defendants };
  }

  private async snapshot(hearingId: string, user: CurrentUser): Promise<unknown> {
    return this.get(hearingId, user);
  }
}
