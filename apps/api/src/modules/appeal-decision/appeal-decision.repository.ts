import { Injectable } from '@nestjs/common';
import { DomainError } from '@cims/domain';
import type {
  AppealAttendanceMode,
  AppealAttendanceStatus,
  AppealDeliveryMode,
  AppealDecisionReading,
  AppealNoticeStep,
  AppealNoticeStepCode,
  AppealNoticeStepStatus,
  AppealPartyRole,
  AppealPresenceRecord,
  AppealPublication,
  AppealTransmission
} from '@cims/domain';
import type { CurrentUser } from '../../common/current-user.decorator.js';
import { PersistenceModeService } from '../../infrastructure/persistence/database/persistence-mode.service.js';
import { PgPoolService } from '../../infrastructure/persistence/database/pg-pool.service.js';
import { InMemoryStore } from '../../infrastructure/workflow-support/in-memory.store.js';

@Injectable()
export class AppealDecisionRepository {
  constructor(
    private readonly mode: PersistenceModeService,
    private readonly pg: PgPoolService,
    private readonly memory: InMemoryStore
  ) {}

  // ── Readings ──────────────────────────────────────────────────────────────

  async create(
    input: {
      hearingId: string;
      scheduledAt: string;
      displayTimezone: string;
      deliveryMode: AppealDeliveryMode;
      determinationReference: string;
      virtualSessionReference?: string;
      openToPublic: boolean;
      createdBy: string;
    },
    user: CurrentUser
  ): Promise<AppealDecisionReading> {
    if (!this.mode.postgres) {
      const store = this.memStore();
      const version = store.readings.filter((r) => r.hearingId === input.hearingId).length + 1;
      // Supersede any previous SCHEDULED reading first
      store.readings.forEach((r) => {
        if (r.hearingId === input.hearingId && r.status === 'SCHEDULED') r.status = 'SUPERSEDED';
      });
      const item: AppealDecisionReading = {
        ...input,
        id: this.memory.id(),
        version,
        status: 'SCHEDULED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        rowVersion: 1
      };
      store.readings.push(item);
      return item;
    }
    return this.pg.transactionAs(user, async (client) => {
      await client.query(
        `update appeal_decision_readings set status='SUPERSEDED', row_version=row_version+1, updated_at=now()
          where hearing_id=$1 and status='SCHEDULED'`,
        [input.hearingId]
      );
      const vRes = await client.query(
        'select coalesce(max(version),0)+1 as v from appeal_decision_readings where hearing_id=$1',
        [input.hearingId]
      );
      const version = Number(vRes.rows[0]?.v ?? 1);
      const row = (
        await client.query(
          `insert into appeal_decision_readings
           (hearing_id,version,scheduled_at,display_timezone,delivery_mode,
            determination_reference,virtual_session_reference,open_to_public,created_by)
         values($1,$2,$3,$4,$5,$6,$7,$8,$9)
         returning id,hearing_id,version,scheduled_at::text,display_timezone,delivery_mode,
                   determination_reference,virtual_session_reference,open_to_public,status,
                   read_at::text,cassation_deadline_at::text,cassation_deadline_note,
                   reschedule_reason,created_by,created_at::text,updated_at::text,row_version`,
          [
            input.hearingId,
            version,
            input.scheduledAt,
            input.displayTimezone,
            input.deliveryMode,
            input.determinationReference,
            input.virtualSessionReference ?? null,
            input.openToPublic,
            input.createdBy
          ]
        )
      ).rows[0];
      return this.mapReading(row);
    });
  }

  async reschedule(
    id: string,
    input: {
      scheduledAt: string;
      deliveryMode: AppealDeliveryMode;
      rescheduleReason: string;
      determinationReference?: string;
      virtualSessionReference?: string;
      updatedBy: string;
    },
    user: CurrentUser
  ): Promise<AppealDecisionReading> {
    if (!this.mode.postgres) {
      const store = this.memStore();
      const r = store.readings.find((x) => x.id === id);
      if (!r) throw new DomainError('APPEAL_READING_NOT_FOUND', 'Appeal reading not found.', 404);
      if (r.status !== 'SCHEDULED')
        throw new DomainError(
          'APPEAL_READING_NOT_SCHEDULED',
          'Only SCHEDULED readings can be rescheduled.',
          409
        );
      Object.assign(r, {
        scheduledAt: input.scheduledAt,
        deliveryMode: input.deliveryMode,
        rescheduleReason: input.rescheduleReason,
        determinationReference: input.determinationReference ?? r.determinationReference,
        virtualSessionReference: input.virtualSessionReference ?? r.virtualSessionReference,
        updatedAt: new Date().toISOString(),
        rowVersion: r.rowVersion + 1
      });
      return r;
    }
    return this.pg.transactionAs(user, async (client) => {
      const row = (
        await client.query(
          `update appeal_decision_readings
            set scheduled_at=$2, delivery_mode=$3, reschedule_reason=$4,
                determination_reference=coalesce($5,determination_reference),
                virtual_session_reference=coalesce($6,virtual_session_reference),
                row_version=row_version+1, updated_at=now()
          where id=$1 and status='SCHEDULED'
         returning id,hearing_id,version,scheduled_at::text,display_timezone,delivery_mode,
                   determination_reference,virtual_session_reference,open_to_public,status,
                   read_at::text,cassation_deadline_at::text,cassation_deadline_note,
                   reschedule_reason,created_by,created_at::text,updated_at::text,row_version`,
          [
            id,
            input.scheduledAt,
            input.deliveryMode,
            input.rescheduleReason,
            input.determinationReference ?? null,
            input.virtualSessionReference ?? null
          ]
        )
      ).rows[0];
      if (!row)
        throw new DomainError(
          'APPEAL_READING_NOT_FOUND',
          'Appeal reading not found or not SCHEDULED.',
          404
        );
      return this.mapReading(row);
    });
  }

  async markRead(
    id: string,
    readAt: string,
    cassationDeadlineAt: string | undefined,
    user: CurrentUser
  ): Promise<AppealDecisionReading> {
    if (!this.mode.postgres) {
      const store = this.memStore();
      const r = store.readings.find((x) => x.id === id);
      if (!r) throw new DomainError('APPEAL_READING_NOT_FOUND', 'Appeal reading not found.', 404);
      r.status = 'READ';
      r.readAt = readAt;
      if (cassationDeadlineAt) r.cassationDeadlineAt = cassationDeadlineAt;
      r.updatedAt = new Date().toISOString();
      r.rowVersion++;
      return r;
    }
    return this.pg.transactionAs(user, async (client) => {
      const row = (
        await client.query(
          `update appeal_decision_readings
            set status='READ', read_at=$2, cassation_deadline_at=coalesce($3,cassation_deadline_at),
                row_version=row_version+1, updated_at=now()
          where id=$1 and status='SCHEDULED'
         returning id,hearing_id,version,scheduled_at::text,display_timezone,delivery_mode,
                   determination_reference,virtual_session_reference,open_to_public,status,
                   read_at::text,cassation_deadline_at::text,cassation_deadline_note,
                   reschedule_reason,created_by,created_at::text,updated_at::text,row_version`,
          [id, readAt, cassationDeadlineAt ?? null]
        )
      ).rows[0];
      if (!row)
        throw new DomainError(
          'APPEAL_READING_NOT_FOUND',
          'Appeal reading not found or not SCHEDULED.',
          404
        );
      return this.mapReading(row);
    });
  }

  async list(hearingId: string, user: CurrentUser): Promise<AppealDecisionReading[]> {
    if (!this.mode.postgres)
      return this.memStore().readings.filter((r) => r.hearingId === hearingId);
    return this.pg.transactionAs(user, async (client) => {
      const rows = (
        await client.query(
          `select id,hearing_id,version,scheduled_at::text,display_timezone,delivery_mode,
                determination_reference,virtual_session_reference,open_to_public,status,
                read_at::text,cassation_deadline_at::text,cassation_deadline_note,
                reschedule_reason,created_by,created_at::text,updated_at::text,row_version
           from appeal_decision_readings where hearing_id=$1 order by version desc`,
          [hearingId]
        )
      ).rows;
      return rows.map((r) => this.mapReading(r));
    });
  }

  async getById(id: string, user: CurrentUser): Promise<AppealDecisionReading> {
    if (!this.mode.postgres) {
      const r = this.memStore().readings.find((x) => x.id === id);
      if (!r) throw new DomainError('APPEAL_READING_NOT_FOUND', 'Appeal reading not found.', 404);
      return r;
    }
    return this.pg.transactionAs(user, async (client) => {
      const row = (
        await client.query(
          `select id,hearing_id,version,scheduled_at::text,display_timezone,delivery_mode,
                determination_reference,virtual_session_reference,open_to_public,status,
                read_at::text,cassation_deadline_at::text,cassation_deadline_note,
                reschedule_reason,created_by,created_at::text,updated_at::text,row_version
           from appeal_decision_readings where id=$1`,
          [id]
        )
      ).rows[0];
      if (!row) throw new DomainError('APPEAL_READING_NOT_FOUND', 'Appeal reading not found.', 404);
      return this.mapReading(row);
    });
  }

  // ── Notice steps ──────────────────────────────────────────────────────────

  async createNoticeStep(
    input: {
      readingId: string;
      stepCode: AppealNoticeStepCode;
      senderOrganizationId: string;
      recipientReference: string;
      recipientName: string;
      channel: string;
      officialReference: string;
      createdBy: string;
    },
    user: CurrentUser
  ): Promise<AppealNoticeStep> {
    if (!this.mode.postgres) {
      const item: AppealNoticeStep = {
        id: this.memory.id(),
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        ...input
      };
      this.memStore().noticeSteps.push(item);
      return item;
    }
    return this.pg.transactionAs(user, async (client) => {
      const row = (
        await client.query(
          `insert into appeal_notice_steps
           (reading_id,step_code,sender_organization_id,recipient_reference,recipient_name,
            channel,official_reference,created_by)
         values($1,$2,$3,$4,$5,$6,$7,$8)
         returning id,reading_id,step_code,sender_organization_id,recipient_reference,recipient_name,
                   channel,official_reference,status,sent_at::text,delivered_at::text,
                   acknowledged_at::text,receipt_reference,created_by,created_at::text`,
          [
            input.readingId,
            input.stepCode,
            input.senderOrganizationId,
            input.recipientReference,
            input.recipientName,
            input.channel,
            input.officialReference,
            input.createdBy
          ]
        )
      ).rows[0];
      return this.mapNoticeStep(row);
    });
  }

  async updateNoticeStep(
    id: string,
    status: AppealNoticeStepStatus,
    receiptReference: string | undefined,
    user: CurrentUser
  ): Promise<AppealNoticeStep> {
    const now = new Date().toISOString();
    if (!this.mode.postgres) {
      const s = this.memStore().noticeSteps.find((x) => x.id === id);
      if (!s) throw new DomainError('APPEAL_NOTICE_STEP_NOT_FOUND', 'Notice step not found.', 404);
      s.status = status;
      if (status === 'SENT') s.sentAt = now;
      if (status === 'DELIVERED') s.deliveredAt = now;
      if (status === 'ACKNOWLEDGED') {
        s.acknowledgedAt = now;
        s.receiptReference = receiptReference;
      }
      return s;
    }
    return this.pg.transactionAs(user, async (client) => {
      const row = (
        await client.query(
          `update appeal_notice_steps
            set status=$2,
                sent_at=case when $2='SENT' then now() else sent_at end,
                delivered_at=case when $2='DELIVERED' then now() else delivered_at end,
                acknowledged_at=case when $2='ACKNOWLEDGED' then now() else acknowledged_at end,
                receipt_reference=coalesce($3,receipt_reference),
                updated_at=now()
          where id=$1
         returning id,reading_id,step_code,sender_organization_id,recipient_reference,recipient_name,
                   channel,official_reference,status,sent_at::text,delivered_at::text,
                   acknowledged_at::text,receipt_reference,created_by,created_at::text`,
          [id, status, receiptReference ?? null]
        )
      ).rows[0];
      if (!row)
        throw new DomainError('APPEAL_NOTICE_STEP_NOT_FOUND', 'Notice step not found.', 404);
      return this.mapNoticeStep(row);
    });
  }

  async listNoticeSteps(readingId: string, user: CurrentUser): Promise<AppealNoticeStep[]> {
    if (!this.mode.postgres)
      return this.memStore().noticeSteps.filter((s) => s.readingId === readingId);
    return this.pg.transactionAs(user, async (client) => {
      const rows = (
        await client.query(
          `select id,reading_id,step_code,sender_organization_id,recipient_reference,recipient_name,
                channel,official_reference,status,sent_at::text,delivered_at::text,
                acknowledged_at::text,receipt_reference,created_by,created_at::text
           from appeal_notice_steps where reading_id=$1 order by created_at`,
          [readingId]
        )
      ).rows;
      return rows.map((r) => this.mapNoticeStep(r));
    });
  }

  // ── Presence ──────────────────────────────────────────────────────────────

  async recordPresence(
    input: {
      readingId: string;
      partyRole: AppealPartyRole;
      partyReference: string;
      partyName: string;
      attendanceStatus: AppealAttendanceStatus;
      attendanceMode: AppealAttendanceMode;
      notes?: string;
      verifiedBy: string;
    },
    user: CurrentUser
  ): Promise<AppealPresenceRecord> {
    const now = new Date().toISOString();
    if (!this.mode.postgres) {
      const existing = this.memStore().presenceRecords.findIndex(
        (p) =>
          p.readingId === input.readingId &&
          p.partyRole === input.partyRole &&
          p.partyReference === input.partyReference
      );
      const item: AppealPresenceRecord = { id: this.memory.id(), verifiedAt: now, ...input };
      if (existing >= 0) this.memStore().presenceRecords[existing] = item;
      else this.memStore().presenceRecords.push(item);
      return item;
    }
    return this.pg.transactionAs(user, async (client) => {
      const row = (
        await client.query(
          `insert into appeal_presence_records
           (reading_id,party_role,party_reference,party_name,attendance_status,attendance_mode,notes,verified_by,verified_at)
         values($1,$2,$3,$4,$5,$6,$7,$8,$9)
         on conflict(reading_id,party_role,party_reference) do update
            set attendance_status=$5,attendance_mode=$6,notes=$7,verified_by=$8,verified_at=$9
         returning id,reading_id,party_role,party_reference,party_name,attendance_status,
                   attendance_mode,notes,verified_by,verified_at::text`,
          [
            input.readingId,
            input.partyRole,
            input.partyReference,
            input.partyName,
            input.attendanceStatus,
            input.attendanceMode,
            input.notes ?? null,
            input.verifiedBy,
            now
          ]
        )
      ).rows[0];
      return this.mapPresence(row);
    });
  }

  async listPresence(readingId: string, user: CurrentUser): Promise<AppealPresenceRecord[]> {
    if (!this.mode.postgres)
      return this.memStore().presenceRecords.filter((p) => p.readingId === readingId);
    return this.pg.transactionAs(user, async (client) => {
      const rows = (
        await client.query(
          `select id,reading_id,party_role,party_reference,party_name,attendance_status,
                attendance_mode,notes,verified_by,verified_at::text
           from appeal_presence_records where reading_id=$1 order by party_role,party_reference`,
          [readingId]
        )
      ).rows;
      return rows.map((r) => this.mapPresence(r));
    });
  }

  // ── Publication ───────────────────────────────────────────────────────────

  async publishExcerpt(
    input: {
      readingId: string;
      excerptReference: string;
      sourceSystemCode: string;
      documentHash?: string;
      publishedAt: string;
      sameDayCompliant: boolean;
      publishedBy: string;
      notes?: string;
    },
    user: CurrentUser
  ): Promise<AppealPublication> {
    if (!this.mode.postgres) {
      const existing = this.memStore().publications.find((p) => p.readingId === input.readingId);
      if (existing)
        throw new DomainError(
          'APPEAL_EXCERPT_ALREADY_PUBLISHED',
          'Petikan putusan sudah dipublikasikan.',
          409
        );
      const item: AppealPublication = {
        id: this.memory.id(),
        createdAt: new Date().toISOString(),
        ...input
      };
      this.memStore().publications.push(item);
      return item;
    }
    return this.pg.transactionAs(user, async (client) => {
      const row = (
        await client.query(
          `insert into appeal_publications
           (reading_id,excerpt_reference,source_system_code,document_hash,published_at,same_day_compliant,published_by,notes)
         values($1,$2,$3,$4,$5,$6,$7,$8)
         returning id,reading_id,excerpt_reference,source_system_code,document_hash,
                   published_at::text,same_day_compliant,published_by,notes,created_at::text`,
          [
            input.readingId,
            input.excerptReference,
            input.sourceSystemCode,
            input.documentHash ?? null,
            input.publishedAt,
            input.sameDayCompliant,
            input.publishedBy,
            input.notes ?? null
          ]
        )
      ).rows[0];
      return this.mapPublication(row);
    });
  }

  // ── Transmission ──────────────────────────────────────────────────────────

  async transmit(
    input: {
      readingId: string;
      destinationCourtId?: string;
      destinationCourtName: string;
      transmissionReference: string;
      transmittedAt: string;
      sevenDayCompliant: boolean;
      documentHash?: string;
      transmittedBy: string;
      notes?: string;
    },
    user: CurrentUser
  ): Promise<AppealTransmission> {
    if (!this.mode.postgres) {
      const existing = this.memStore().transmissions.find((t) => t.readingId === input.readingId);
      if (existing)
        throw new DomainError(
          'APPEAL_ALREADY_TRANSMITTED',
          'Berkas sudah dikirim ke pengadilan tingkat pertama.',
          409
        );
      const item: AppealTransmission = {
        id: this.memory.id(),
        createdAt: new Date().toISOString(),
        ...input
      };
      this.memStore().transmissions.push(item);
      return item;
    }
    return this.pg.transactionAs(user, async (client) => {
      const row = (
        await client.query(
          `insert into appeal_transmissions
           (reading_id,destination_court_id,destination_court_name,transmission_reference,
            transmitted_at,seven_day_compliant,document_hash,transmitted_by,notes)
         values($1,$2,$3,$4,$5,$6,$7,$8,$9)
         returning id,reading_id,destination_court_id,destination_court_name,transmission_reference,
                   transmitted_at::text,seven_day_compliant,document_hash,transmitted_by,notes,created_at::text`,
          [
            input.readingId,
            input.destinationCourtId ?? null,
            input.destinationCourtName,
            input.transmissionReference,
            input.transmittedAt,
            input.sevenDayCompliant,
            input.documentHash ?? null,
            input.transmittedBy,
            input.notes ?? null
          ]
        )
      ).rows[0];
      return this.mapTransmission(row);
    });
  }

  // ── In-memory store helpers ───────────────────────────────────────────────

  private memStore() {
    const s = this.memory as unknown as {
      appealReadings?: AppealDecisionReading[];
      appealNoticeSteps?: AppealNoticeStep[];
      appealPresenceRecords?: AppealPresenceRecord[];
      appealPublications?: AppealPublication[];
      appealTransmissions?: AppealTransmission[];
    };
    s.appealReadings ??= [];
    s.appealNoticeSteps ??= [];
    s.appealPresenceRecords ??= [];
    s.appealPublications ??= [];
    s.appealTransmissions ??= [];
    return {
      readings: s.appealReadings,
      noticeSteps: s.appealNoticeSteps,
      presenceRecords: s.appealPresenceRecords,
      publications: s.appealPublications,
      transmissions: s.appealTransmissions
    };
  }

  // ── Row mappers ───────────────────────────────────────────────────────────

  private mapReading(r: Record<string, unknown>): AppealDecisionReading {
    return {
      id: String(r.id),
      hearingId: String(r.hearing_id),
      version: Number(r.version),
      scheduledAt: String(r.scheduled_at),
      displayTimezone: String(r.display_timezone),
      deliveryMode: String(r.delivery_mode) as AppealDeliveryMode,
      determinationReference: String(r.determination_reference),
      virtualSessionReference: r.virtual_session_reference
        ? String(r.virtual_session_reference)
        : undefined,
      openToPublic: Boolean(r.open_to_public),
      status: String(r.status) as AppealDecisionReading['status'],
      readAt: r.read_at ? String(r.read_at) : undefined,
      cassationDeadlineAt: r.cassation_deadline_at ? String(r.cassation_deadline_at) : undefined,
      cassationDeadlineNote: r.cassation_deadline_note
        ? String(r.cassation_deadline_note)
        : undefined,
      rescheduleReason: r.reschedule_reason ? String(r.reschedule_reason) : undefined,
      createdBy: String(r.created_by),
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
      rowVersion: Number(r.row_version)
    };
  }

  private mapNoticeStep(r: Record<string, unknown>): AppealNoticeStep {
    return {
      id: String(r.id),
      readingId: String(r.reading_id),
      stepCode: String(r.step_code) as AppealNoticeStepCode,
      senderOrganizationId: String(r.sender_organization_id),
      recipientReference: String(r.recipient_reference),
      recipientName: String(r.recipient_name),
      channel: String(r.channel),
      officialReference: String(r.official_reference),
      status: String(r.status) as AppealNoticeStepStatus,
      sentAt: r.sent_at ? String(r.sent_at) : undefined,
      deliveredAt: r.delivered_at ? String(r.delivered_at) : undefined,
      acknowledgedAt: r.acknowledged_at ? String(r.acknowledged_at) : undefined,
      receiptReference: r.receipt_reference ? String(r.receipt_reference) : undefined,
      createdBy: String(r.created_by),
      createdAt: String(r.created_at)
    };
  }

  private mapPresence(r: Record<string, unknown>): AppealPresenceRecord {
    return {
      id: String(r.id),
      readingId: String(r.reading_id),
      partyRole: String(r.party_role) as AppealPartyRole,
      partyReference: String(r.party_reference),
      partyName: String(r.party_name),
      attendanceStatus: String(r.attendance_status) as AppealAttendanceStatus,
      attendanceMode: String(r.attendance_mode) as AppealAttendanceMode,
      notes: r.notes ? String(r.notes) : undefined,
      verifiedBy: String(r.verified_by),
      verifiedAt: String(r.verified_at)
    };
  }

  private mapPublication(r: Record<string, unknown>): AppealPublication {
    return {
      id: String(r.id),
      readingId: String(r.reading_id),
      excerptReference: String(r.excerpt_reference),
      sourceSystemCode: String(r.source_system_code),
      documentHash: r.document_hash ? String(r.document_hash) : undefined,
      publishedAt: String(r.published_at),
      sameDayCompliant: Boolean(r.same_day_compliant),
      publishedBy: String(r.published_by),
      notes: r.notes ? String(r.notes) : undefined,
      createdAt: String(r.created_at)
    };
  }

  private mapTransmission(r: Record<string, unknown>): AppealTransmission {
    return {
      id: String(r.id),
      readingId: String(r.reading_id),
      destinationCourtId: r.destination_court_id ? String(r.destination_court_id) : undefined,
      destinationCourtName: String(r.destination_court_name),
      transmissionReference: String(r.transmission_reference),
      transmittedAt: String(r.transmitted_at),
      sevenDayCompliant: Boolean(r.seven_day_compliant),
      documentHash: r.document_hash ? String(r.document_hash) : undefined,
      transmittedBy: String(r.transmitted_by),
      notes: r.notes ? String(r.notes) : undefined,
      createdAt: String(r.created_at)
    };
  }
}
