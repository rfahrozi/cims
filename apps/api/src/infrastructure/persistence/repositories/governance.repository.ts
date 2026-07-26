import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';
import {
  accessReviewStatus,
  assertAccessReviewDecisionAllowed,
  assertLegalHoldReleaseAllowed,
  canonicalJson,
  retentionEligibility,
  type AccessReviewDecision,
  type ReadinessCheck
} from '@cims/domain';
import type { CurrentUser } from '../../../common/current-user.decorator.js';
import { InMemoryStore } from '../../workflow-support/in-memory.store.js';
import { PersistenceModeService } from '../database/persistence-mode.service.js';
import { PgPoolService } from '../database/pg-pool.service.js';
import { OutboxService } from '../database/outbox.service.js';
import { EvidenceStorageGateway } from '../../integration/evidence-storage.gateway.js';

export interface LegalHoldRecord {
  id: string;
  hearingId: string;
  holdType: 'LITIGATION' | 'INVESTIGATION' | 'AUDIT' | 'COURT_ORDER' | 'OTHER';
  reason: string;
  officialReference: string;
  status: 'ACTIVE' | 'RELEASED';
  createdBy: string;
  createdAt: string;
  releasedBy?: string;
  releasedAt?: string;
  releaseReason?: string;
}

export interface RetentionPolicyRecord {
  id: string;
  policyCode: string;
  objectType: string;
  retentionDays?: number;
  dispositionAction: 'REVIEW_ONLY' | 'ARCHIVE' | 'DELETE';
  enabled: boolean;
  requiresApproval: boolean;
  legalBasisReference?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface RetentionPreviewRecord {
  id: string;
  hearingId: string;
  policyCode?: string;
  closureAt?: string;
  dueAt?: string;
  eligibilityStatus:
    | 'NOT_CLOSED'
    | 'POLICY_NOT_CONFIGURED'
    | 'ON_HOLD'
    | 'NOT_DUE'
    | 'DUE_FOR_REVIEW';
  activeLegalHoldCount: number;
  eligibleForReview: boolean;
  requestedBy: string;
  requestedAt: string;
}

export interface EvidenceExportRecord {
  id: string;
  hearingId: string;
  exportFormat: 'JSON' | 'ZIP_MANIFEST';
  status: 'REQUESTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
  requestedBy: string;
  requestedAt: string;
  startedAt?: string;
  completedAt?: string;
  storageUri?: string;
  objectHash?: string;
  manifestHash?: string;
  itemCount: number;
  expiresAt?: string;
  lastError?: string;
  items: Array<{
    sequence: number;
    category: string;
    recordCount: number;
    contentHash: string;
    metadata: Record<string, unknown>;
  }>;
}

export interface AccessReviewCampaignRecord {
  id: string;
  campaignName: string;
  scopeOrganizationId?: string;
  hearingId?: string;
  status: 'OPEN' | 'COMPLETED' | 'CANCELLED';
  createdBy: string;
  createdAt: string;
  dueAt: string;
  completedBy?: string;
  completedAt?: string;
  items: Array<{
    id: string;
    hearingId: string;
    subjectUserId: string;
    assignmentRole: string;
    status: 'PENDING' | 'KEPT' | 'REVOKED';
    decisionReason?: string;
    reviewedBy?: string;
    reviewedAt?: string;
  }>;
}

@Injectable()
export class GovernanceRepository {
  private readonly makerChecker: boolean;

  constructor(
    config: ConfigService,
    private readonly mode: PersistenceModeService,
    private readonly memory: InMemoryStore,
    private readonly pg: PgPoolService,
    private readonly outbox: OutboxService,
    private readonly evidenceStorage: EvidenceStorageGateway
  ) {
    this.makerChecker =
      config && config.get ? config.get<string>('LEGAL_HOLD_MAKER_CHECKER') !== 'false' : true;
  }

  async listLegalHolds(hearingId: string, user: CurrentUser): Promise<LegalHoldRecord[]> {
    if (!this.mode.postgres)
      return this.memory.legalHolds.filter((item) => item.hearingId === hearingId);
    return this.pg.transactionAs(user, async (client) => {
      const result = await client.query(
        `select id::text,hearing_id,hold_type,reason,official_reference,status,created_by,created_at::text,
                released_by,released_at::text,release_reason
           from legal_holds where hearing_id=$1 order by created_at desc,id`,
        [hearingId]
      );
      return result.rows.map((row) => this.mapLegalHold(row));
    });
  }

  async createLegalHold(
    hearingId: string,
    input: { holdType: LegalHoldRecord['holdType']; reason: string; officialReference: string },
    user: CurrentUser
  ): Promise<LegalHoldRecord> {
    if (!this.mode.postgres) {
      const record: LegalHoldRecord = {
        id: randomUUID(),
        hearingId,
        holdType: input.holdType,
        reason: input.reason,
        officialReference: input.officialReference,
        status: 'ACTIVE',
        createdBy: user.id,
        createdAt: new Date().toISOString()
      };
      this.memory.legalHolds.push(record);
      return record;
    }
    return this.pg.transactionAs(user, async (client) => {
      const result = await client.query(
        `insert into legal_holds(hearing_id,hold_type,reason,official_reference,created_by)
         values($1,$2,$3,$4,$5)
         returning id::text,hearing_id,hold_type,reason,official_reference,status,created_by,created_at::text,
                   released_by,released_at::text,release_reason`,
        [hearingId, input.holdType, input.reason, input.officialReference, user.id]
      );
      return this.mapLegalHold(result.rows[0]);
    });
  }

  async releaseLegalHold(id: string, reason: string, user: CurrentUser): Promise<LegalHoldRecord> {
    if (!this.mode.postgres) {
      const item = this.memory.legalHolds.find((record) => record.id === id);
      if (!item) throw new NotFoundException('Legal hold not found');
      assertLegalHoldReleaseAllowed(item.createdBy, user.id, this.makerChecker);
      item.status = 'RELEASED';
      item.releasedBy = user.id;
      item.releasedAt = new Date().toISOString();
      item.releaseReason = reason;
      return item;
    }
    return this.pg.transactionAs(user, async (client) => {
      const current = await client.query(
        'select created_by,status from legal_holds where id=$1 for update',
        [id]
      );
      const row = current.rows[0];
      if (!row) throw new NotFoundException('Legal hold not found');
      if (String(row.status) !== 'ACTIVE')
        throw new NotFoundException('Active legal hold not found');
      assertLegalHoldReleaseAllowed(String(row.created_by), user.id, this.makerChecker);
      const result = await client.query(
        `update legal_holds set status='RELEASED',released_by=$2,released_at=now(),release_reason=$3
          where id=$1
          returning id::text,hearing_id,hold_type,reason,official_reference,status,created_by,created_at::text,
                    released_by,released_at::text,release_reason`,
        [id, user.id, reason]
      );
      return this.mapLegalHold(result.rows[0]);
    });
  }

  async retentionPolicies(): Promise<RetentionPolicyRecord[]> {
    if (!this.mode.postgres) return this.memory.retentionPolicies;
    const rows = await this.pg.query(
      `select id::text,policy_code,object_type,retention_days,disposition_action,enabled,requires_approval,
              legal_basis_reference,approved_by,approved_at::text
         from retention_policies order by policy_code`
    );
    return rows.map((row) => ({
      id: String(row.id),
      policyCode: String(row.policy_code),
      objectType: String(row.object_type),
      retentionDays: row.retention_days === null ? undefined : Number(row.retention_days),
      dispositionAction: String(
        row.disposition_action
      ) as RetentionPolicyRecord['dispositionAction'],
      enabled: Boolean(row.enabled),
      requiresApproval: Boolean(row.requires_approval),
      legalBasisReference: row.legal_basis_reference
        ? String(row.legal_basis_reference)
        : undefined,
      approvedBy: row.approved_by ? String(row.approved_by) : undefined,
      approvedAt: row.approved_at ? String(row.approved_at) : undefined
    }));
  }

  async retentionPreview(
    hearingId: string,
    policyCode: string | undefined,
    user: CurrentUser
  ): Promise<RetentionPreviewRecord> {
    if (!this.mode.postgres) {
      const policy =
        this.memory.retentionPolicies.find((item) => item.policyCode === policyCode) ??
        this.memory.retentionPolicies[0];
      const runtime = this.memory.hearingRuntimes.find(
        (item) => item.hearingId === hearingId && item.state === 'ENDED'
      );
      const activeLegalHoldCount = this.memory.legalHolds.filter(
        (item) => item.hearingId === hearingId && item.status === 'ACTIVE'
      ).length;
      const eligibility = retentionEligibility({
        closedAt: runtime?.endedAt,
        retentionDays: policy?.retentionDays,
        activeLegalHoldCount
      });
      const record: RetentionPreviewRecord = {
        id: randomUUID(),
        hearingId,
        policyCode: policy?.policyCode,
        closureAt: runtime?.endedAt,
        dueAt: eligibility.dueAt,
        eligibilityStatus: eligibility.status,
        activeLegalHoldCount,
        eligibleForReview: eligibility.eligibleForReview,
        requestedBy: user.id,
        requestedAt: new Date().toISOString()
      };
      this.memory.retentionPreviews.push(record);
      return record;
    }
    return this.pg.transactionAs(user, async (client) => {
      const hearing = await client.query(
        `select h.id,case when hr.state='ENDED' then hr.ended_at else null end as closure_at
           from hearings h left join hearing_runtime hr on hr.hearing_id=h.id where h.id=$1`,
        [hearingId]
      );
      if (!hearing.rows[0]) throw new NotFoundException('Hearing not found');
      const policyResult = policyCode
        ? await client.query('select * from retention_policies where policy_code=$1', [policyCode])
        : await client.query(
            "select * from retention_policies where object_type='HEARING' order by enabled desc,created_at limit 1"
          );
      const policy = policyResult.rows[0];
      const holds = await client.query(
        "select count(*)::int as count from legal_holds where hearing_id=$1 and status='ACTIVE'",
        [hearingId]
      );
      const activeLegalHoldCount = Number(holds.rows[0]?.count ?? 0);
      const closureAt = hearing.rows[0].closure_at ? String(hearing.rows[0].closure_at) : undefined;
      const eligibility = retentionEligibility({
        closedAt: closureAt,
        retentionDays:
          policy?.retention_days === null || policy?.retention_days === undefined
            ? undefined
            : Number(policy.retention_days),
        activeLegalHoldCount
      });
      const result = await client.query(
        `insert into retention_previews(hearing_id,policy_id,closure_at,due_at,eligibility_status,active_legal_hold_count,eligible_for_review,requested_by,snapshot)
         values($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
         returning id::text,requested_at::text`,
        [
          hearingId,
          policy?.id ?? null,
          closureAt ?? null,
          eligibility.dueAt ?? null,
          eligibility.status,
          activeLegalHoldCount,
          eligibility.eligibleForReview,
          user.id,
          JSON.stringify({
            policy_code: policy?.policy_code ?? null,
            disposition_action: policy?.disposition_action ?? null
          })
        ]
      );
      return {
        id: String(result.rows[0].id),
        hearingId,
        policyCode: policy?.policy_code ? String(policy.policy_code) : undefined,
        closureAt,
        dueAt: eligibility.dueAt,
        eligibilityStatus: eligibility.status,
        activeLegalHoldCount,
        eligibleForReview: eligibility.eligibleForReview,
        requestedBy: user.id,
        requestedAt: String(result.rows[0].requested_at)
      };
    });
  }

  async createEvidenceExport(
    hearingId: string,
    exportFormat: EvidenceExportRecord['exportFormat'],
    user: CurrentUser,
    metadata: { correlationId?: string; traceparent?: string } = {}
  ): Promise<EvidenceExportRecord> {
    if (!this.mode.postgres) {
      const record: EvidenceExportRecord = {
        id: randomUUID(),
        hearingId,
        exportFormat,
        status: 'REQUESTED',
        requestedBy: user.id,
        requestedAt: new Date().toISOString(),
        itemCount: 0,
        items: []
      };
      this.memory.evidenceExports.push(record);
      await this.processEvidenceExport(record.id, hearingId, metadata.correlationId);
      return record;
    }
    return this.pg.transactionAs(user, async (client) => {
      const result = await client.query(
        `insert into evidence_exports(hearing_id,export_format,status,requested_by,correlation_id)
         values($1,$2,'REQUESTED',$3,$4)
         returning id::text`,
        [hearingId, exportFormat, user.id, metadata.correlationId ?? null]
      );
      const id = String(result.rows[0].id);
      await this.outbox.enqueueWithClient(
        client,
        'EVIDENCE_EXPORT_REQUESTED',
        'EVIDENCE_EXPORT',
        id,
        { export_id: id, hearing_id: hearingId },
        metadata
      );
      return this.getEvidenceExportWithClient(id, client);
    });
  }

  async getEvidenceExport(id: string, user: CurrentUser): Promise<EvidenceExportRecord> {
    if (!this.mode.postgres) {
      const item = this.memory.evidenceExports.find((record) => record.id === id);
      if (!item) throw new NotFoundException('Evidence export not found');
      return item;
    }
    return this.pg.transactionAs(user, (client) => this.getEvidenceExportWithClient(id, client));
  }

  async listEvidenceExports(hearingId: string, user: CurrentUser): Promise<EvidenceExportRecord[]> {
    if (!this.mode.postgres)
      return this.memory.evidenceExports.filter((item) => item.hearingId === hearingId);
    return this.pg.transactionAs(user, async (client) => {
      const result = await client.query(
        'select id::text from evidence_exports where hearing_id=$1 order by requested_at desc',
        [hearingId]
      );
      const items: EvidenceExportRecord[] = [];
      for (const row of result.rows)
        items.push(await this.getEvidenceExportWithClient(String(row.id), client));
      return items;
    });
  }

  async processEvidenceExport(
    id: string,
    hearingId: string,
    correlationId?: string
  ): Promise<void> {
    if (!this.mode.postgres) {
      const record = this.memory.evidenceExports.find((item) => item.id === id);
      if (!record || record.status === 'COMPLETED') return;
      record.status = 'PROCESSING';
      record.startedAt = new Date().toISOString();
      try {
        const bundle = this.memoryEvidenceBundle(record);
        const stored = await this.evidenceStorage.putJson(
          `evidence-${record.id}.json`,
          bundle,
          correlationId
        );
        record.storageUri = stored.storageUri;
        record.objectHash = stored.objectHash;
        record.manifestHash = String((bundle as Record<string, unknown>).manifest_hash);
        record.itemCount = record.items.length;
        record.status = 'COMPLETED';
        record.completedAt = new Date().toISOString();
      } catch (error) {
        record.status = 'FAILED';
        record.lastError = error instanceof Error ? error.message : String(error);
        throw error;
      }
      return;
    }
    const user = this.systemUser(hearingId);
    const claimed = await this.pg.transactionAs(user, async (client) => {
      const result = await client.query(
        `update evidence_exports set status='PROCESSING',started_at=coalesce(started_at,now()),last_error=null
          where id=$1 and hearing_id=$2 and status in ('REQUESTED','FAILED')
          returning id::text,hearing_id,export_format,requested_by,requested_at::text`,
        [id, hearingId]
      );
      return result.rows[0];
    });
    if (!claimed) return;
    try {
      const built = await this.pg.transactionAs(user, (client) =>
        this.pgEvidenceBundle(id, hearingId, client)
      );
      const stored = await this.evidenceStorage.putJson(
        `evidence-${id}.json`,
        built.bundle,
        correlationId
      );
      await this.pg.transactionAs(user, async (client) => {
        await client.query('delete from evidence_export_items where export_id=$1', [id]);
        for (const item of built.items) {
          await client.query(
            `insert into evidence_export_items(export_id,sequence,category,record_count,content_hash,metadata)
             values($1,$2,$3,$4,$5,$6::jsonb)`,
            [
              id,
              item.sequence,
              item.category,
              item.recordCount,
              item.contentHash,
              JSON.stringify(item.metadata)
            ]
          );
        }
        await client.query(
          `update evidence_exports set status='COMPLETED',completed_at=now(),storage_uri=$2,object_hash=$3,manifest_hash=$4,item_count=$5,last_error=null
            where id=$1`,
          [id, stored.storageUri, stored.objectHash, built.manifestHash, built.items.length]
        );
      });
    } catch (error) {
      await this.pg.transactionAs(user, async (client) => {
        await client.query(
          "update evidence_exports set status='FAILED',last_error=$2 where id=$1",
          [id, (error instanceof Error ? error.message : String(error)).slice(0, 2000)]
        );
      });
      throw error;
    }
  }

  async createAccessReview(
    input: {
      campaignName: string;
      hearingId?: string;
      scopeOrganizationId?: string;
      dueAt: string;
    },
    user: CurrentUser
  ): Promise<AccessReviewCampaignRecord> {
    if (!this.mode.postgres) {
      const candidates = this.memory.hearingUserAssignments.filter(
        (item) => item.active && (!input.hearingId || item.hearingId === input.hearingId)
      );
      const campaign: AccessReviewCampaignRecord = {
        id: randomUUID(),
        campaignName: input.campaignName,
        hearingId: input.hearingId,
        scopeOrganizationId: input.scopeOrganizationId,
        status: 'OPEN',
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        dueAt: input.dueAt,
        items: candidates.map((item) => ({
          id: randomUUID(),
          hearingId: item.hearingId,
          subjectUserId: item.userId,
          assignmentRole: item.assignmentRole,
          status: 'PENDING'
        }))
      };
      this.memory.accessReviewCampaigns.push(campaign);
      return campaign;
    }
    return this.pg.transactionAs(user, async (client) => {
      const result = await client.query(
        `insert into access_review_campaigns(campaign_name,scope_organization_id,hearing_id,created_by,due_at)
         values($1,$2,$3,$4,$5) returning id::text`,
        [
          input.campaignName,
          input.scopeOrganizationId ?? null,
          input.hearingId ?? null,
          user.id,
          input.dueAt
        ]
      );
      const id = String(result.rows[0].id);
      await client.query(
        `insert into access_review_items(campaign_id,hearing_id,subject_user_id,assignment_role,snapshot)
         select $1,u.hearing_id,u.user_id,u.assignment_role,
                jsonb_build_object('active',u.active,'created_at',u.created_at,'court_organization_id',h.court_organization_id)
           from hearing_user_assignments u join hearings h on h.id=u.hearing_id
          where u.active
            and ($2::text is null or u.hearing_id=$2)
            and ($3::text is null or h.court_organization_id=$3)
         on conflict(campaign_id,hearing_id,subject_user_id) do nothing`,
        [id, input.hearingId ?? null, input.scopeOrganizationId ?? null]
      );
      return this.getAccessReviewWithClient(id, client);
    });
  }

  async getAccessReview(id: string, user: CurrentUser): Promise<AccessReviewCampaignRecord> {
    if (!this.mode.postgres) {
      const item = this.memory.accessReviewCampaigns.find((record) => record.id === id);
      if (!item) throw new NotFoundException('Access review campaign not found');
      return item;
    }
    return this.pg.transactionAs(user, (client) => this.getAccessReviewWithClient(id, client));
  }

  async decideAccessReviewItem(
    campaignId: string,
    itemId: string,
    decision: AccessReviewDecision,
    reason: string,
    user: CurrentUser
  ): Promise<AccessReviewCampaignRecord> {
    if (!this.mode.postgres) {
      const campaign = this.memory.accessReviewCampaigns.find((record) => record.id === campaignId);
      const item = campaign?.items.find((record) => record.id === itemId);
      if (!campaign || !item) throw new NotFoundException('Access review item not found');
      assertAccessReviewDecisionAllowed(item.subjectUserId, user.id);
      item.status = accessReviewStatus(decision);
      item.decisionReason = reason;
      item.reviewedBy = user.id;
      item.reviewedAt = new Date().toISOString();
      if (decision === 'REVOKE') {
        const assignment = this.memory.hearingUserAssignments.find(
          (record) => record.hearingId === item.hearingId && record.userId === item.subjectUserId
        );
        if (assignment) assignment.active = false;
      }
      if (campaign.items.every((record) => record.status !== 'PENDING')) {
        campaign.status = 'COMPLETED';
        campaign.completedBy = user.id;
        campaign.completedAt = new Date().toISOString();
      }
      return campaign;
    }
    return this.pg.transactionAs(user, async (client) => {
      const current = await client.query(
        `select i.subject_user_id,i.hearing_id,c.status
           from access_review_items i join access_review_campaigns c on c.id=i.campaign_id
          where i.id=$1 and i.campaign_id=$2 for update`,
        [itemId, campaignId]
      );
      const row = current.rows[0];
      if (!row) throw new NotFoundException('Access review item not found');
      if (String(row.status) !== 'OPEN')
        throw new NotFoundException('Open access review campaign not found');
      assertAccessReviewDecisionAllowed(String(row.subject_user_id), user.id);
      const status = accessReviewStatus(decision);
      await client.query(
        `update access_review_items set status=$3,decision_reason=$4,reviewed_by=$5,reviewed_at=now()
          where id=$1 and campaign_id=$2`,
        [itemId, campaignId, status, reason, user.id]
      );
      if (decision === 'REVOKE') {
        await client.query(
          'update hearing_user_assignments set active=false where hearing_id=$1 and user_id=$2',
          [row.hearing_id, row.subject_user_id]
        );
      }
      const pending = await client.query(
        "select count(*)::int as count from access_review_items where campaign_id=$1 and status='PENDING'",
        [campaignId]
      );
      if (Number(pending.rows[0]?.count ?? 0) === 0) {
        await client.query(
          "update access_review_campaigns set status='COMPLETED',completed_by=$2,completed_at=now() where id=$1",
          [campaignId, user.id]
        );
      }
      return this.getAccessReviewWithClient(campaignId, client);
    });
  }

  async recordReadinessSnapshot(
    releaseVersion: string,
    decision: string,
    checks: ReadinessCheck[],
    user: CurrentUser,
    correlationId?: string
  ): Promise<string> {
    if (!this.mode.postgres) {
      const id = randomUUID();
      this.memory.productionReadinessSnapshots.push({
        id,
        releaseVersion,
        decision,
        checks,
        generatedBy: user.id,
        generatedAt: new Date().toISOString(),
        correlationId
      });
      return id;
    }
    return this.pg.transactionAs(user, async (client) => {
      const result = await client.query(
        `insert into production_readiness_snapshots(release_version,decision,checks,generated_by,correlation_id)
         values($1,$2,$3::jsonb,$4,$5) returning id::text`,
        [releaseVersion, decision, JSON.stringify(checks), user.id, correlationId ?? null]
      );
      return String(result.rows[0].id);
    });
  }

  private mapLegalHold(row: Record<string, unknown>): LegalHoldRecord {
    return {
      id: String(row.id),
      hearingId: String(row.hearing_id),
      holdType: String(row.hold_type) as LegalHoldRecord['holdType'],
      reason: String(row.reason),
      officialReference: String(row.official_reference),
      status: String(row.status) as LegalHoldRecord['status'],
      createdBy: String(row.created_by),
      createdAt: String(row.created_at),
      releasedBy: row.released_by ? String(row.released_by) : undefined,
      releasedAt: row.released_at ? String(row.released_at) : undefined,
      releaseReason: row.release_reason ? String(row.release_reason) : undefined
    };
  }

  private async getEvidenceExportWithClient(
    id: string,
    client: import('pg').PoolClient
  ): Promise<EvidenceExportRecord> {
    const result = await client.query(
      `select id::text,hearing_id,export_format,status,requested_by,requested_at::text,started_at::text,completed_at::text,
              storage_uri,object_hash,manifest_hash,item_count,expires_at::text,last_error
         from evidence_exports where id=$1`,
      [id]
    );
    const row = result.rows[0];
    if (!row) throw new NotFoundException('Evidence export not found');
    const itemResult = await client.query(
      `select sequence,category,record_count,content_hash,metadata from evidence_export_items where export_id=$1 order by sequence`,
      [id]
    );
    return {
      id: String(row.id),
      hearingId: String(row.hearing_id),
      exportFormat: String(row.export_format) as EvidenceExportRecord['exportFormat'],
      status: String(row.status) as EvidenceExportRecord['status'],
      requestedBy: String(row.requested_by),
      requestedAt: String(row.requested_at),
      startedAt: row.started_at ? String(row.started_at) : undefined,
      completedAt: row.completed_at ? String(row.completed_at) : undefined,
      storageUri: row.storage_uri ? String(row.storage_uri) : undefined,
      objectHash: row.object_hash ? String(row.object_hash) : undefined,
      manifestHash: row.manifest_hash ? String(row.manifest_hash) : undefined,
      itemCount: Number(row.item_count),
      expiresAt: row.expires_at ? String(row.expires_at) : undefined,
      lastError: row.last_error ? String(row.last_error) : undefined,
      items: itemResult.rows.map((item) => ({
        sequence: Number(item.sequence),
        category: String(item.category),
        recordCount: Number(item.record_count),
        contentHash: String(item.content_hash),
        metadata: (item.metadata ?? {}) as Record<string, unknown>
      }))
    };
  }

  private memoryEvidenceBundle(record: EvidenceExportRecord): Record<string, unknown> {
    const sections = [
      {
        category: 'HEARING',
        data: this.memory.hearings.find((item) => item.id === record.hearingId) ?? null
      },
      {
        category: 'DETERMINATION',
        data: this.memory.determinations.filter((item) => item.hearingId === record.hearingId)
      },
      {
        category: 'SCHEDULE',
        data: this.memory.schedules.filter((item) => item.hearingId === record.hearingId)
      },
      {
        category: 'NOTICES',
        data: this.memory.notices.filter((item) => item.hearingId === record.hearingId)
      },
      {
        category: 'READINESS',
        data: this.memory.readinessSubmissions.filter((item) => item.hearingId === record.hearingId)
      },
      {
        category: 'AUDIT',
        data: this.memory.auditEvents.filter(
          (item) => item.objectType === 'HEARING' && item.objectId === record.hearingId
        )
      },
      {
        category: 'LEGAL_HOLDS',
        data: this.memory.legalHolds.filter((item) => item.hearingId === record.hearingId)
      }
    ];
    record.items = sections.map((section, index) => ({
      sequence: index + 1,
      category: section.category,
      recordCount: Array.isArray(section.data) ? section.data.length : section.data ? 1 : 0,
      contentHash: this.hash(section.data),
      metadata: {}
    }));
    const manifest = {
      export_id: record.id,
      hearing_id: record.hearingId,
      generated_at: new Date().toISOString(),
      items: record.items
    };
    const manifestHash = this.hash(manifest);
    return { manifest_hash: manifestHash, manifest, sections };
  }

  private async pgEvidenceBundle(
    id: string,
    hearingId: string,
    client: import('pg').PoolClient
  ): Promise<{
    bundle: Record<string, unknown>;
    manifestHash: string;
    items: EvidenceExportRecord['items'];
  }> {
    const queries: Array<{ category: string; sql: string; values: unknown[] }> = [
      {
        category: 'HEARING',
        sql: `select h.*,c.case_title,c.case_classification,c.official_case_reference from hearings h join court_cases c on c.id=h.case_id where h.id=$1`,
        values: [hearingId]
      },
      {
        category: 'DETERMINATION',
        sql: `select id::text,decision,official_reference,reason,version,is_current,created_at::text from judicial_determinations where hearing_id=$1 order by version`,
        values: [hearingId]
      },
      {
        category: 'SCHEDULE',
        sql: `select id::text,start_at::text,end_at::text,version,status,created_at::text from hearing_schedules where hearing_id=$1 order by version`,
        values: [hearingId]
      },
      {
        category: 'NOTICES',
        sql: `select id::text,notice_type,official_reference,status,created_at::text,sent_at::text from official_notices where hearing_id=$1 order by created_at`,
        values: [hearingId]
      },
      {
        category: 'READINESS',
        sql: `select id::text,organization_id,organization_type,version,status,submitted_at::text from readiness_submissions where hearing_id=$1 order by organization_type,version`,
        values: [hearingId]
      },
      {
        category: 'AUDIT',
        sql: `select sequence,event_type,actor_user_id,actor_organization_id,correlation_id,payload,previous_hash,event_hash,occurred_at::text from audit_events where object_type='HEARING' and object_id=$1 order by sequence`,
        values: [hearingId]
      },
      {
        category: 'LEGAL_HOLDS',
        sql: `select id::text,hold_type,official_reference,status,created_by,created_at::text,released_by,released_at::text from legal_holds where hearing_id=$1 order by created_at`,
        values: [hearingId]
      },
      {
        category: 'REVISIONS',
        sql: `select revision_number,action,snapshot,reason,actor_user_id,created_at::text from hearing_data_revisions where hearing_id=$1 order by revision_number`,
        values: [hearingId]
      }
    ];
    const sections: Array<{ category: string; data: unknown[] }> = [];
    for (const query of queries) {
      const result = await client.query(query.sql, query.values);
      sections.push({ category: query.category, data: result.rows });
    }
    const items = sections.map((section, index) => ({
      sequence: index + 1,
      category: section.category,
      recordCount: section.data.length,
      contentHash: this.hash(section.data),
      metadata: { generated_from: 'POSTGRES', schema_version: '0.19.0' }
    }));
    const manifest = {
      export_id: id,
      hearing_id: hearingId,
      generated_at: new Date().toISOString(),
      items
    };
    const manifestHash = this.hash(manifest);
    return { bundle: { manifest_hash: manifestHash, manifest, sections }, manifestHash, items };
  }

  private async getAccessReviewWithClient(
    id: string,
    client: import('pg').PoolClient
  ): Promise<AccessReviewCampaignRecord> {
    const result = await client.query(
      `select id::text,campaign_name,scope_organization_id,hearing_id,status,created_by,created_at::text,due_at::text,
              completed_by,completed_at::text from access_review_campaigns where id=$1`,
      [id]
    );
    const row = result.rows[0];
    if (!row) throw new NotFoundException('Access review campaign not found');
    const itemResult = await client.query(
      `select id::text,hearing_id,subject_user_id,assignment_role,status,decision_reason,reviewed_by,reviewed_at::text
         from access_review_items where campaign_id=$1 order by hearing_id,subject_user_id`,
      [id]
    );
    return {
      id: String(row.id),
      campaignName: String(row.campaign_name),
      scopeOrganizationId: row.scope_organization_id
        ? String(row.scope_organization_id)
        : undefined,
      hearingId: row.hearing_id ? String(row.hearing_id) : undefined,
      status: String(row.status) as AccessReviewCampaignRecord['status'],
      createdBy: String(row.created_by),
      createdAt: String(row.created_at),
      dueAt: String(row.due_at),
      completedBy: row.completed_by ? String(row.completed_by) : undefined,
      completedAt: row.completed_at ? String(row.completed_at) : undefined,
      items: itemResult.rows.map((item) => ({
        id: String(item.id),
        hearingId: String(item.hearing_id),
        subjectUserId: String(item.subject_user_id),
        assignmentRole: String(item.assignment_role),
        status: String(item.status) as AccessReviewCampaignRecord['items'][number]['status'],
        decisionReason: item.decision_reason ? String(item.decision_reason) : undefined,
        reviewedBy: item.reviewed_by ? String(item.reviewed_by) : undefined,
        reviewedAt: item.reviewed_at ? String(item.reviewed_at) : undefined
      }))
    };
  }

  private hash(value: unknown): string {
    return createHash('sha256').update(canonicalJson(value)).digest('hex');
  }

  private systemUser(hearingId: string): CurrentUser {
    return {
      id: 'cims-governance-worker',
      name: 'CIMS Governance Worker',
      role: 'SYSTEM_ADMIN',
      roles: ['SYSTEM_ADMIN'],
      organizationId: 'system',
      organizationIds: [],
      permissions: ['*'],
      hearingAssignments: [hearingId],
      authSource: 'DEV'
    };
  }
}
