import { Injectable } from '@nestjs/common';
import { DomainError } from '@cims/domain';
import { requireRoles } from '../../common/authorization.js';
import type { CurrentUser } from '../../common/current-user.decorator.js';
import { AuditService } from '../../infrastructure/observability/audit.service.js';
import { PersistenceModeService } from '../../infrastructure/persistence/database/persistence-mode.service.js';
import { PgPoolService } from '../../infrastructure/persistence/database/pg-pool.service.js';
import { InMemoryStore } from '../../infrastructure/workflow-support/in-memory.store.js';
import type {
  AcknowledgeTransferNotificationDto,
  RecordCustodyTransferDto,
  SendTransferNotificationDto,
  TransferAccessDto,
  UpdateChecklistStatusDto
} from './dto.js';

export interface CustodyTransfer {
  id: string;
  hearingId: string;
  defendantReference: string;
  defendantName: string;
  fromOrganizationId: string;
  fromOrganizationName: string;
  fromLocationCode?: string;
  toOrganizationId: string;
  toOrganizationName: string;
  toLocationCode?: string;
  transferReason: string;
  transferReasonDetail?: string;
  officialReference: string;
  transferredAt: string;
  status: string;
  accessTransferred: boolean;
  accessTransferredAt?: string;
  accessTransferredBy?: string;
  newChecklistRequired: boolean;
  newChecklistSubmitted: boolean;
  newIdentityVerified: boolean;
  notes?: string;
  recordedBy: string;
  createdAt: string;
  updatedAt: string;
  rowVersion: number;
}

export interface CustodyTransferNotification {
  id: string;
  transferId: string;
  notifiedParty: string;
  notifiedOrgId?: string;
  notifiedOrgName: string;
  channel: string;
  officialReference: string;
  status: string;
  sentAt?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  notes?: string;
  createdAt: string;
}

@Injectable()
export class CustodyService {
  constructor(
    private readonly mode: PersistenceModeService,
    private readonly pg: PgPoolService,
    private readonly memory: InMemoryStore,
    private readonly audit: AuditService
  ) {}

  // ── Record transfer ───────────────────────────────────────────────────────

  async record(
    user: CurrentUser,
    dto: RecordCustodyTransferDto,
    correlationId?: string
  ): Promise<CustodyTransfer> {
    requireRoles(user, ['CORRECTIONS', 'COURT_CLERK', 'SYSTEM_ADMIN']);
    const now = new Date().toISOString();
    if (!this.mode.postgres) {
      const item: CustodyTransfer = {
        id: this.memory.id(),
        hearingId: dto.hearing_id,
        defendantReference: dto.defendant_reference,
        defendantName: dto.defendant_name,
        fromOrganizationId: dto.from_organization_id,
        fromOrganizationName: dto.from_organization_name,
        fromLocationCode: dto.from_location_code,
        toOrganizationId: dto.to_organization_id,
        toOrganizationName: dto.to_organization_name,
        toLocationCode: dto.to_location_code,
        transferReason: dto.transfer_reason,
        transferReasonDetail: dto.transfer_reason_detail,
        officialReference: dto.official_reference,
        transferredAt: dto.transferred_at,
        status: 'RECORDED',
        accessTransferred: false,
        newChecklistRequired: true,
        newChecklistSubmitted: false,
        newIdentityVerified: false,
        notes: dto.notes,
        recordedBy: user.id,
        createdAt: now,
        updatedAt: now,
        rowVersion: 1
      };
      this.mem().transfers.push(item);
      await this.audit.append(
        {
          eventType: 'CUSTODY_TRANSFER_RECORDED',
          objectType: 'HEARING',
          objectId: dto.hearing_id,
          actorUserId: user.id,
          actorOrganizationId: user.organizationId,
          correlationId,
          payload: {
            transfer_id: item.id,
            from: dto.from_organization_name,
            to: dto.to_organization_name,
            official_reference: dto.official_reference
          }
        },
        user
      );
      return item;
    }
    return this.pg.transactionAs(user, async (c) => {
      const row = (
        await c.query(
          `insert into custody_transfers(hearing_id,defendant_reference,defendant_name,from_organization_id,from_organization_name,from_location_code,to_organization_id,to_organization_name,to_location_code,transfer_reason,transfer_reason_detail,official_reference,transferred_at,notes,recorded_by)
         values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         returning id,hearing_id,defendant_reference,defendant_name,from_organization_id,from_organization_name,from_location_code,to_organization_id,to_organization_name,to_location_code,transfer_reason,transfer_reason_detail,official_reference,transferred_at::text,status,access_transferred,access_transferred_at::text,access_transferred_by,new_checklist_required,new_checklist_submitted,new_identity_verified,notes,recorded_by,created_at::text,updated_at::text,row_version`,
          [
            dto.hearing_id,
            dto.defendant_reference,
            dto.defendant_name,
            dto.from_organization_id,
            dto.from_organization_name,
            dto.from_location_code ?? null,
            dto.to_organization_id,
            dto.to_organization_name,
            dto.to_location_code ?? null,
            dto.transfer_reason,
            dto.transfer_reason_detail ?? null,
            dto.official_reference,
            dto.transferred_at,
            dto.notes ?? null,
            user.id
          ]
        )
      ).rows[0];
      await this.audit.append(
        {
          eventType: 'CUSTODY_TRANSFER_RECORDED',
          objectType: 'HEARING',
          objectId: dto.hearing_id,
          actorUserId: user.id,
          actorOrganizationId: user.organizationId,
          correlationId,
          payload: {
            transfer_id: row.id,
            from: dto.from_organization_name,
            to: dto.to_organization_name
          }
        },
        user
      );
      return this.mapTransfer(row);
    });
  }

  async list(hearingId: string, user: CurrentUser): Promise<CustodyTransfer[]> {
    requireRoles(user, ['COURT_CLERK', 'CORRECTIONS', 'PROSECUTOR', 'SYSTEM_ADMIN', 'AUDITOR']);
    if (!this.mode.postgres) return this.mem().transfers.filter((t) => t.hearingId === hearingId);
    return this.pg.transactionAs(user, async (c) => {
      const rows = (
        await c.query(
          `select id,hearing_id,defendant_reference,defendant_name,from_organization_id,from_organization_name,from_location_code,to_organization_id,to_organization_name,to_location_code,transfer_reason,transfer_reason_detail,official_reference,transferred_at::text,status,access_transferred,access_transferred_at::text,access_transferred_by,new_checklist_required,new_checklist_submitted,new_identity_verified,notes,recorded_by,created_at::text,updated_at::text,row_version from custody_transfers where hearing_id=$1 order by transferred_at desc`,
          [hearingId]
        )
      ).rows;
      return rows.map((r) => this.mapTransfer(r));
    });
  }

  // ── Send notifications (SOP 10.14 poin 2) ────────────────────────────────

  async sendNotification(
    user: CurrentUser,
    transferId: string,
    dto: SendTransferNotificationDto,
    correlationId?: string
  ): Promise<CustodyTransferNotification> {
    requireRoles(user, ['CORRECTIONS', 'COURT_CLERK', 'SYSTEM_ADMIN']);
    const now = new Date().toISOString();
    const transfer = await this.getTransfer(transferId, user);
    if (!this.mode.postgres) {
      const item: CustodyTransferNotification = {
        id: this.memory.id(),
        transferId,
        notifiedParty: dto.notified_party,
        notifiedOrgId: dto.notified_org_id,
        notifiedOrgName: dto.notified_org_name,
        channel: dto.channel,
        officialReference: dto.official_reference,
        status: 'SENT',
        sentAt: now,
        notes: dto.notes,
        createdAt: now
      };
      this.mem().notifications.push(item);
      // Update status ke NOTIFIED jika semua 3 pihak sudah dinotifikasi
      const allNotified = ['COURT', 'PROSECUTION', 'CORRECTIONS_DEST'].every((party) =>
        this.mem().notifications.some(
          (n) => n.transferId === transferId && n.notifiedParty === party && n.status !== 'FAILED'
        )
      );
      if (allNotified) {
        const t = this.mem().transfers.find((x) => x.id === transferId);
        if (t) {
          t.status = 'NOTIFIED';
          t.updatedAt = now;
        }
      }
      await this.audit.append(
        {
          eventType: 'CUSTODY_TRANSFER_NOTIFICATION_SENT',
          objectType: 'HEARING',
          objectId: transfer.hearingId,
          actorUserId: user.id,
          actorOrganizationId: user.organizationId,
          correlationId,
          payload: {
            transfer_id: transferId,
            notified_party: dto.notified_party,
            org: dto.notified_org_name
          }
        },
        user
      );
      return item;
    }
    return this.pg.transactionAs(user, async (c) => {
      const row = (
        await c.query(
          `insert into custody_transfer_notifications(transfer_id,notified_party,notified_org_id,notified_org_name,channel,official_reference,status,sent_at,notes) values($1,$2,$3,$4,$5,$6,'SENT',now(),$7) returning id,transfer_id,notified_party,notified_org_id,notified_org_name,channel,official_reference,status,sent_at::text,acknowledged_at::text,acknowledged_by,notes,created_at::text`,
          [
            transferId,
            dto.notified_party,
            dto.notified_org_id ?? null,
            dto.notified_org_name,
            dto.channel,
            dto.official_reference,
            dto.notes ?? null
          ]
        )
      ).rows[0];
      // Check if all 3 parties notified and update status
      const countRes = await c.query(
        `select count(distinct notified_party) as cnt from custody_transfer_notifications where transfer_id=$1 and status!='FAILED'`,
        [transferId]
      );
      if (Number(countRes.rows[0]?.cnt) >= 3)
        await c.query(
          `update custody_transfers set status='NOTIFIED',row_version=row_version+1,updated_at=now() where id=$1 and status='RECORDED'`,
          [transferId]
        );
      await this.audit.append(
        {
          eventType: 'CUSTODY_TRANSFER_NOTIFICATION_SENT',
          objectType: 'HEARING',
          objectId: transfer.hearingId,
          actorUserId: user.id,
          actorOrganizationId: user.organizationId,
          correlationId,
          payload: { transfer_id: transferId, notified_party: dto.notified_party }
        },
        user
      );
      return this.mapNotification(row);
    });
  }

  async listNotifications(
    transferId: string,
    user: CurrentUser
  ): Promise<CustodyTransferNotification[]> {
    if (!this.mode.postgres)
      return this.mem().notifications.filter((n) => n.transferId === transferId);
    return this.pg.transactionAs(user, async (c) => {
      const rows = (
        await c.query(
          `select id,transfer_id,notified_party,notified_org_id,notified_org_name,channel,official_reference,status,sent_at::text,acknowledged_at::text,acknowledged_by,notes,created_at::text from custody_transfer_notifications where transfer_id=$1 order by created_at`,
          [transferId]
        )
      ).rows;
      return rows.map((r) => this.mapNotification(r));
    });
  }

  async acknowledgeNotification(
    notifId: string,
    dto: AcknowledgeTransferNotificationDto,
    user: CurrentUser,
    correlationId?: string
  ): Promise<CustodyTransferNotification> {
    if (!this.mode.postgres) {
      const n = this.mem().notifications.find((x) => x.id === notifId);
      if (!n) throw new DomainError('CUSTODY_NOTIF_NOT_FOUND', 'Notification not found.', 404);
      n.status = 'ACKNOWLEDGED';
      n.acknowledgedAt = new Date().toISOString();
      n.acknowledgedBy = dto.acknowledged_by;
      return n;
    }
    return this.pg.transactionAs(user, async (c) => {
      const row = (
        await c.query(
          `update custody_transfer_notifications set status='ACKNOWLEDGED',acknowledged_at=now(),acknowledged_by=$2 where id=$1 returning id,transfer_id,notified_party,notified_org_id,notified_org_name,channel,official_reference,status,sent_at::text,acknowledged_at::text,acknowledged_by,notes,created_at::text`,
          [notifId, dto.acknowledged_by]
        )
      ).rows[0];
      if (!row) throw new DomainError('CUSTODY_NOTIF_NOT_FOUND', 'Notification not found.', 404);
      return this.mapNotification(row);
    });
  }

  // ── Access transfer (SOP 10.14 poin 3) ────────────────────────────────────

  async transferAccess(
    user: CurrentUser,
    transferId: string,
    dto: TransferAccessDto,
    correlationId?: string
  ): Promise<CustodyTransfer> {
    requireRoles(user, ['SYSTEM_ADMIN', 'COURT_CLERK']);
    const now = new Date().toISOString();
    const transfer = await this.getTransfer(transferId, user);
    if (!this.mode.postgres) {
      transfer.accessTransferred = true;
      transfer.accessTransferredAt = now;
      transfer.accessTransferredBy = user.id;
      transfer.status = 'ACCESS_TRANSFERRED';
      transfer.updatedAt = now;
      transfer.rowVersion++;
      await this.audit.append(
        {
          eventType: 'CUSTODY_ACCESS_TRANSFERRED',
          objectType: 'HEARING',
          objectId: transfer.hearingId,
          actorUserId: user.id,
          actorOrganizationId: user.organizationId,
          correlationId,
          payload: {
            transfer_id: transferId,
            to_org: transfer.toOrganizationName,
            note: dto.confirmation_note
          }
        },
        user
      );
      return transfer;
    }
    return this.pg.transactionAs(user, async (c) => {
      const row = (
        await c.query(
          `update custody_transfers set access_transferred=true,access_transferred_at=now(),access_transferred_by=$2,status='ACCESS_TRANSFERRED',row_version=row_version+1,updated_at=now() where id=$1 returning id,hearing_id,defendant_reference,defendant_name,from_organization_id,from_organization_name,from_location_code,to_organization_id,to_organization_name,to_location_code,transfer_reason,transfer_reason_detail,official_reference,transferred_at::text,status,access_transferred,access_transferred_at::text,access_transferred_by,new_checklist_required,new_checklist_submitted,new_identity_verified,notes,recorded_by,created_at::text,updated_at::text,row_version`,
          [transferId, user.id]
        )
      ).rows[0];
      if (!row) throw new DomainError('CUSTODY_TRANSFER_NOT_FOUND', 'Transfer not found.', 404);
      await this.audit.append(
        {
          eventType: 'CUSTODY_ACCESS_TRANSFERRED',
          objectType: 'HEARING',
          objectId: row.hearing_id,
          actorUserId: user.id,
          actorOrganizationId: user.organizationId,
          correlationId,
          payload: { transfer_id: transferId, note: dto.confirmation_note }
        },
        user
      );
      return this.mapTransfer(row);
    });
  }

  // ── Update checklist status (SOP 10.14 poin 4) ────────────────────────────

  async updateChecklistStatus(
    user: CurrentUser,
    transferId: string,
    dto: UpdateChecklistStatusDto,
    correlationId?: string
  ): Promise<CustodyTransfer> {
    requireRoles(user, ['CORRECTIONS', 'COURT_CLERK', 'SYSTEM_ADMIN']);
    const transfer = await this.getTransfer(transferId, user);
    const now = new Date().toISOString();
    const completed = dto.new_checklist_submitted && dto.new_identity_verified;
    if (!this.mode.postgres) {
      transfer.newChecklistSubmitted = dto.new_checklist_submitted;
      transfer.newIdentityVerified = dto.new_identity_verified;
      if (completed) transfer.status = 'COMPLETED';
      transfer.updatedAt = now;
      transfer.rowVersion++;
      await this.audit.append(
        {
          eventType: completed
            ? 'CUSTODY_TRANSFER_COMPLETED'
            : 'CUSTODY_TRANSFER_CHECKLIST_UPDATED',
          objectType: 'HEARING',
          objectId: transfer.hearingId,
          actorUserId: user.id,
          actorOrganizationId: user.organizationId,
          correlationId,
          payload: {
            transfer_id: transferId,
            checklist: dto.new_checklist_submitted,
            identity: dto.new_identity_verified
          }
        },
        user
      );
      return transfer;
    }
    return this.pg.transactionAs(user, async (c) => {
      const row = (
        await c.query(
          `update custody_transfers set new_checklist_submitted=$2,new_identity_verified=$3,status=case when $2 and $3 then 'COMPLETED' else 'CHECKLIST_PENDING' end,row_version=row_version+1,updated_at=now() where id=$1 returning id,hearing_id,defendant_reference,defendant_name,from_organization_id,from_organization_name,from_location_code,to_organization_id,to_organization_name,to_location_code,transfer_reason,transfer_reason_detail,official_reference,transferred_at::text,status,access_transferred,access_transferred_at::text,access_transferred_by,new_checklist_required,new_checklist_submitted,new_identity_verified,notes,recorded_by,created_at::text,updated_at::text,row_version`,
          [transferId, dto.new_checklist_submitted, dto.new_identity_verified]
        )
      ).rows[0];
      if (!row) throw new DomainError('CUSTODY_TRANSFER_NOT_FOUND', 'Transfer not found.', 404);
      await this.audit.append(
        {
          eventType: completed
            ? 'CUSTODY_TRANSFER_COMPLETED'
            : 'CUSTODY_TRANSFER_CHECKLIST_UPDATED',
          objectType: 'HEARING',
          objectId: row.hearing_id,
          actorUserId: user.id,
          actorOrganizationId: user.organizationId,
          correlationId,
          payload: { transfer_id: transferId }
        },
        user
      );
      return this.mapTransfer(row);
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async getTransfer(id: string, user: CurrentUser): Promise<CustodyTransfer> {
    if (!this.mode.postgres) {
      const t = this.mem().transfers.find((x) => x.id === id);
      if (!t)
        throw new DomainError('CUSTODY_TRANSFER_NOT_FOUND', 'Custody transfer not found.', 404);
      return t;
    }
    const rows = await this.pg.transactionAs(
      user,
      async (c) =>
        (
          await c.query(
            `select id,hearing_id,defendant_reference,defendant_name,from_organization_id,from_organization_name,from_location_code,to_organization_id,to_organization_name,to_location_code,transfer_reason,transfer_reason_detail,official_reference,transferred_at::text,status,access_transferred,access_transferred_at::text,access_transferred_by,new_checklist_required,new_checklist_submitted,new_identity_verified,notes,recorded_by,created_at::text,updated_at::text,row_version from custody_transfers where id=$1`,
            [id]
          )
        ).rows
    );
    if (!rows[0])
      throw new DomainError('CUSTODY_TRANSFER_NOT_FOUND', 'Custody transfer not found.', 404);
    return this.mapTransfer(rows[0]);
  }

  private mem() {
    const s = this.memory as unknown as {
      custodyTransfers?: CustodyTransfer[];
      custodyNotifications?: CustodyTransferNotification[];
    };
    s.custodyTransfers ??= [];
    s.custodyNotifications ??= [];
    return { transfers: s.custodyTransfers, notifications: s.custodyNotifications };
  }

  private mapTransfer(r: Record<string, unknown>): CustodyTransfer {
    return {
      id: String(r.id),
      hearingId: String(r.hearing_id),
      defendantReference: String(r.defendant_reference),
      defendantName: String(r.defendant_name),
      fromOrganizationId: String(r.from_organization_id),
      fromOrganizationName: String(r.from_organization_name),
      fromLocationCode: r.from_location_code ? String(r.from_location_code) : undefined,
      toOrganizationId: String(r.to_organization_id),
      toOrganizationName: String(r.to_organization_name),
      toLocationCode: r.to_location_code ? String(r.to_location_code) : undefined,
      transferReason: String(r.transfer_reason),
      transferReasonDetail: r.transfer_reason_detail ? String(r.transfer_reason_detail) : undefined,
      officialReference: String(r.official_reference),
      transferredAt: String(r.transferred_at),
      status: String(r.status),
      accessTransferred: Boolean(r.access_transferred),
      accessTransferredAt: r.access_transferred_at ? String(r.access_transferred_at) : undefined,
      accessTransferredBy: r.access_transferred_by ? String(r.access_transferred_by) : undefined,
      newChecklistRequired: Boolean(r.new_checklist_required),
      newChecklistSubmitted: Boolean(r.new_checklist_submitted),
      newIdentityVerified: Boolean(r.new_identity_verified),
      notes: r.notes ? String(r.notes) : undefined,
      recordedBy: String(r.recorded_by),
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
      rowVersion: Number(r.row_version)
    };
  }

  private mapNotification(r: Record<string, unknown>): CustodyTransferNotification {
    return {
      id: String(r.id),
      transferId: String(r.transfer_id),
      notifiedParty: String(r.notified_party),
      notifiedOrgId: r.notified_org_id ? String(r.notified_org_id) : undefined,
      notifiedOrgName: String(r.notified_org_name),
      channel: String(r.channel),
      officialReference: String(r.official_reference),
      status: String(r.status),
      sentAt: r.sent_at ? String(r.sent_at) : undefined,
      acknowledgedAt: r.acknowledged_at ? String(r.acknowledged_at) : undefined,
      acknowledgedBy: r.acknowledged_by ? String(r.acknowledged_by) : undefined,
      notes: r.notes ? String(r.notes) : undefined,
      createdAt: String(r.created_at)
    };
  }
}
