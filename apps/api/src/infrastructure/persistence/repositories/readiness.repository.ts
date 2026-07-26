import { Injectable } from '@nestjs/common';
import {
  DomainError,
  evaluateReadinessGate,
  type OrganizationType,
  type ReadinessGateResult
} from '@cims/domain';
import type { CurrentUser } from '../../../common/current-user.decorator.js';
import {
  InMemoryStore,
  type IdentityVerificationRecord,
  type ReadinessItemRecord,
  type ReadinessSubmissionRecord,
  type RoomInspectionRecord,
  type TechnicalTestRecord
} from '../../workflow-support/in-memory.store.js';
import { PersistenceModeService } from '../database/persistence-mode.service.js';
import { PgPoolService } from '../database/pg-pool.service.js';
import { CoreWorkflowRepository } from './core-workflow.repository.js';

export interface HydratedReadiness extends ReadinessSubmissionRecord {
  rowVersion: number;
  items: ReadinessItemRecord[];
  technical_test: TechnicalTestRecord | null;
}

@Injectable()
export class ReadinessRepository {
  constructor(
    private readonly mode: PersistenceModeService,
    private readonly memory: InMemoryStore,
    private readonly pg: PgPoolService,
    private readonly core: CoreWorkflowRepository
  ) {}

  async createIdentityVerification(
    input: Omit<IdentityVerificationRecord, 'id'>,
    user: CurrentUser
  ): Promise<IdentityVerificationRecord> {
    if (!this.mode.postgres) {
      const record: IdentityVerificationRecord = { id: this.memory.id(), ...input };
      this.memory.identityVerifications.push(record);
      return record;
    }
    return this.pg.transactionAs(user, async (client) => {
      const result = await client.query(
        `insert into identity_verifications(
           hearing_id,organization_id,participant_reference,participant_role,location_code,
           supervisor_officer_id,supervisor_officer_name,method,result,notes,verified_by,verified_at
         ) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         returning id::text,hearing_id,organization_id,participant_reference,participant_role,
                   location_code,supervisor_officer_id,supervisor_officer_name,
                   method,result,notes,verified_by,verified_at::text`,
        [
          input.hearingId,
          input.organizationId,
          input.participantReference,
          input.participantRole ?? null,
          input.locationCode ?? null,
          input.supervisorOfficerId ?? null,
          input.supervisorOfficerName ?? null,
          input.method,
          input.result,
          input.notes ?? null,
          input.verifiedBy,
          input.verifiedAt
        ]
      );
      return this.mapIdentity(result.rows[0]);
    });
  }

  async createRoomInspection(
    input: Omit<RoomInspectionRecord, 'id'>,
    user: CurrentUser
  ): Promise<RoomInspectionRecord> {
    if (!this.mode.postgres) {
      const record: RoomInspectionRecord = { id: this.memory.id(), ...input };
      this.memory.roomInspections.push(record);
      return record;
    }
    return this.pg.transactionAs(user, async (client) => {
      const result = await client.query(
        `insert into room_inspections(
           hearing_id,organization_id,location_code,camera_full_view,unauthorized_person_absent,
           confidentiality_ready,result,notes,inspected_by,inspected_at
         ) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         returning id::text,hearing_id,organization_id,location_code,camera_full_view,unauthorized_person_absent,
                   confidentiality_ready,result,notes,inspected_by,inspected_at::text`,
        [
          input.hearingId,
          input.organizationId,
          input.locationCode,
          input.cameraFullView,
          input.unauthorizedPersonAbsent,
          input.confidentialityReady,
          input.result,
          input.notes ?? null,
          input.inspectedBy,
          input.inspectedAt
        ]
      );
      return this.mapRoom(result.rows[0]);
    });
  }

  async latestVerificationStatus(
    hearingId: string,
    organizationId: string,
    user: CurrentUser
  ): Promise<{ identity: boolean; room: boolean }> {
    if (!this.mode.postgres) {
      return {
        identity: [...this.memory.identityVerifications]
          .reverse()
          .some(
            (item) =>
              item.hearingId === hearingId &&
              item.organizationId === organizationId &&
              item.result === 'PASS'
          ),
        room: [...this.memory.roomInspections]
          .reverse()
          .some(
            (item) =>
              item.hearingId === hearingId &&
              item.organizationId === organizationId &&
              item.result === 'PASS'
          )
      };
    }
    return this.pg.transactionAs(user, async (client) => {
      const result = await client.query(
        `select
           exists(select 1 from identity_verifications where hearing_id=$1 and organization_id=$2 and result='PASS') as identity,
           exists(select 1 from room_inspections where hearing_id=$1 and organization_id=$2 and result='PASS') as room`,
        [hearingId, organizationId]
      );
      return { identity: Boolean(result.rows[0]?.identity), room: Boolean(result.rows[0]?.room) };
    });
  }

  async submit(
    input: {
      hearingId: string;
      organizationId: string;
      organizationType: OrganizationType;
      locationCode: string;
      status: 'READY' | 'NOT_READY';
      submittedBy: string;
      submittedAt: string;
      items: Array<Omit<ReadinessItemRecord, 'id' | 'submissionId'>>;
      technicalTest: Omit<TechnicalTestRecord, 'id' | 'submissionId'>;
    },
    user: CurrentUser
  ): Promise<HydratedReadiness> {
    if (!this.mode.postgres) {
      const version =
        this.memory.readinessSubmissions.filter(
          (item) =>
            item.hearingId === input.hearingId && item.organizationId === input.organizationId
        ).length + 1;
      const submission: ReadinessSubmissionRecord = {
        id: this.memory.id(),
        hearingId: input.hearingId,
        organizationId: input.organizationId,
        organizationType: input.organizationType,
        version,
        locationCode: input.locationCode,
        status: input.status,
        submittedBy: input.submittedBy,
        submittedAt: input.submittedAt
      };
      this.memory.readinessSubmissions.push(submission);
      for (const item of input.items)
        this.memory.readinessItems.push({
          id: this.memory.id(),
          submissionId: submission.id,
          ...item
        });
      this.memory.technicalTests.push({
        id: this.memory.id(),
        submissionId: submission.id,
        ...input.technicalTest
      });
      return this.hydrate(submission.id, user);
    }

    return this.pg.transactionAs(user, async (client) => {
      await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))', [
        `readiness:${input.hearingId}:${input.organizationId}`
      ]);
      const versionResult = await client.query(
        `select coalesce(max(version),0)+1 as version
           from readiness_submissions
          where hearing_id=$1 and organization_id=$2`,
        [input.hearingId, input.organizationId]
      );
      const version = Number(versionResult.rows[0]?.version ?? 1);
      const result = await client.query(
        `insert into readiness_submissions(
           hearing_id,organization_id,organization_type,version,location_code,status,submitted_by,submitted_at
         ) values($1,$2,$3,$4,$5,$6,$7,$8)
         returning id::text`,
        [
          input.hearingId,
          input.organizationId,
          input.organizationType,
          version,
          input.locationCode,
          input.status,
          input.submittedBy,
          input.submittedAt
        ]
      );
      const submissionId = String(result.rows[0].id);
      for (const item of input.items) {
        await client.query(
          `insert into readiness_items(submission_id,item_code,required,result,notes)
           values($1,$2,$3,$4,$5)`,
          [submissionId, item.itemCode, item.required, item.result, item.notes ?? null]
        );
      }
      await client.query(
        `insert into technical_tests(
           submission_id,camera,microphone,audio,primary_network,backup_network,provider_access,tested_at
         ) values($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          submissionId,
          input.technicalTest.camera,
          input.technicalTest.microphone,
          input.technicalTest.audio,
          input.technicalTest.primaryNetwork,
          input.technicalTest.backupNetwork,
          input.technicalTest.providerAccess,
          input.technicalTest.testedAt
        ]
      );
      return this.hydrateWithClient(submissionId, client);
    });
  }

  async list(hearingId: string, user: CurrentUser): Promise<HydratedReadiness[]> {
    if (!this.mode.postgres) {
      return Promise.all(
        this.memory.readinessSubmissions
          .filter((item) => item.hearingId === hearingId)
          .map((item) => this.hydrate(item.id, user))
      );
    }
    return this.pg.transactionAs(user, async (client) => {
      const result = await client.query(
        `select id::text from readiness_submissions where hearing_id=$1 order by submitted_at desc,id`,
        [hearingId]
      );
      const items: HydratedReadiness[] = [];
      for (const row of result.rows)
        items.push(await this.hydrateWithClient(String(row.id), client));
      return items;
    });
  }

  async gate(hearingId: string, user: CurrentUser): Promise<ReadinessGateResult> {
    const requiredOrganizationTypes = await this.core.requiredOrganizationTypes(hearingId, user);
    const submissions = await this.list(hearingId, user);
    return evaluateReadinessGate({ requiredOrganizationTypes, submissions });
  }

  async hydrate(id: string, user: CurrentUser): Promise<HydratedReadiness> {
    if (!this.mode.postgres) {
      const submission = this.memory.readinessSubmissions.find((item) => item.id === id);
      if (!submission)
        throw new DomainError('READINESS_NOT_FOUND', 'Readiness submission was not found.', 404);
      return {
        ...submission,
        rowVersion: 1,
        items: this.memory.readinessItems.filter((item) => item.submissionId === id),
        technical_test: this.memory.technicalTests.find((item) => item.submissionId === id) ?? null
      };
    }
    return this.pg.transactionAs(user, (client) => this.hydrateWithClient(id, client));
  }

  private async hydrateWithClient(
    id: string,
    client: import('pg').PoolClient
  ): Promise<HydratedReadiness> {
    const result = await client.query(
      `select id::text,hearing_id,organization_id,organization_type,version,location_code,status,
              submitted_by,submitted_at::text,row_version
         from readiness_submissions where id=$1`,
      [id]
    );
    const row = result.rows[0];
    if (!row)
      throw new DomainError('READINESS_NOT_FOUND', 'Readiness submission was not found.', 404);
    const items = await client.query(
      `select id::text,submission_id::text,item_code,required,result,notes
         from readiness_items where submission_id=$1 order by item_code`,
      [id]
    );
    const tests = await client.query(
      `select id::text,submission_id::text,camera,microphone,audio,primary_network,backup_network,provider_access,tested_at::text
         from technical_tests where submission_id=$1`,
      [id]
    );
    return {
      id: String(row.id),
      hearingId: String(row.hearing_id),
      organizationId: String(row.organization_id),
      organizationType: String(row.organization_type) as OrganizationType,
      version: Number(row.version),
      locationCode: String(row.location_code),
      status: String(row.status) as HydratedReadiness['status'],
      submittedBy: String(row.submitted_by),
      submittedAt: String(row.submitted_at),
      rowVersion: Number(row.row_version),
      items: items.rows.map((item) => ({
        id: String(item.id),
        submissionId: String(item.submission_id),
        itemCode: String(item.item_code),
        required: Boolean(item.required),
        result: String(item.result) as ReadinessItemRecord['result'],
        notes: item.notes ? String(item.notes) : undefined
      })),
      technical_test: tests.rows[0]
        ? {
            id: String(tests.rows[0].id),
            submissionId: String(tests.rows[0].submission_id),
            camera: String(tests.rows[0].camera) as TechnicalTestRecord['camera'],
            microphone: String(tests.rows[0].microphone) as TechnicalTestRecord['microphone'],
            audio: String(tests.rows[0].audio) as TechnicalTestRecord['audio'],
            primaryNetwork: String(
              tests.rows[0].primary_network
            ) as TechnicalTestRecord['primaryNetwork'],
            backupNetwork: String(
              tests.rows[0].backup_network
            ) as TechnicalTestRecord['backupNetwork'],
            providerAccess: String(
              tests.rows[0].provider_access
            ) as TechnicalTestRecord['providerAccess'],
            testedAt: String(tests.rows[0].tested_at)
          }
        : null
    };
  }

  private mapIdentity(row: Record<string, unknown>): IdentityVerificationRecord {
    return {
      id: String(row.id),
      hearingId: String(row.hearing_id),
      organizationId: String(row.organization_id),
      participantReference: String(row.participant_reference),
      participantRole: row.participant_role ? String(row.participant_role) : undefined,
      locationCode: row.location_code ? String(row.location_code) : undefined,
      supervisorOfficerId: row.supervisor_officer_id
        ? String(row.supervisor_officer_id)
        : undefined,
      supervisorOfficerName: row.supervisor_officer_name
        ? String(row.supervisor_officer_name)
        : undefined,
      method: String(row.method),
      result: String(row.result) as IdentityVerificationRecord['result'],
      notes: row.notes ? String(row.notes) : undefined,
      verifiedBy: String(row.verified_by),
      verifiedAt: String(row.verified_at)
    };
  }

  private mapRoom(row: Record<string, unknown>): RoomInspectionRecord {
    return {
      id: String(row.id),
      hearingId: String(row.hearing_id),
      organizationId: String(row.organization_id),
      locationCode: String(row.location_code),
      cameraFullView: Boolean(row.camera_full_view),
      unauthorizedPersonAbsent: Boolean(row.unauthorized_person_absent),
      confidentialityReady: Boolean(row.confidentiality_ready),
      result: String(row.result) as RoomInspectionRecord['result'],
      notes: row.notes ? String(row.notes) : undefined,
      inspectedBy: String(row.inspected_by),
      inspectedAt: String(row.inspected_at)
    };
  }
}
