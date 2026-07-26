import { Injectable } from '@nestjs/common';
import type { CurrentUser } from '../../../common/current-user.decorator.js';
import { PersistenceModeService } from '../database/persistence-mode.service.js';
import { PgPoolService } from '../database/pg-pool.service.js';

export interface NotificationTemplate {
  id: string;
  noticeType: string;
  channel: string;
  subject: string;
  messageBody: string;
  isActive: boolean;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SlaConfig {
  id: string;
  noticeType: string;
  ackDeadlineHours: number;
  reminderHours: number[];
  isActive: boolean;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class AdminConfigRepository {
  constructor(
    private readonly mode: PersistenceModeService,
    private readonly pg: PgPoolService
  ) {}

  // ── Notification Templates ─────────────────────────────────────────────────

  async findTemplate(noticeType: string, channel: string): Promise<NotificationTemplate | null> {
    if (!this.mode.postgres) return null; // in-memory mode: skip template lookup

    const rows = await this.pg.transactionAs(
      {
        id: 'system',
        name: 'system',
        organizationId: 'system',
        organizationIds: [],
        role: 'SYSTEM_ADMIN',
        roles: ['SYSTEM_ADMIN'],
        authSource: 'OIDC',
        hearingAssignments: [],
        permissions: []
      } as any,
      async (client) => {
        const r = await client.query(
          `select id::text, notice_type, channel, subject, message_body,
                  is_active, updated_by::text, created_at::text, updated_at::text
           from notification_templates
           where notice_type = $1 and channel = $2 and is_active = true
           limit 1`,
          [noticeType, channel]
        );
        return (r as any).rows;
      }
    );
    const row = rows[0];
    if (!row) return null;
    return this.mapTemplate(row as Record<string, unknown>);
  }

  async listTemplates(user: CurrentUser): Promise<NotificationTemplate[]> {
    if (!this.mode.postgres) return [];
    return this.pg.transactionAs(user, async (client) => {
      const r = await client.query(
        `select id::text, notice_type, channel, subject, message_body,
                is_active, updated_by::text, created_at::text, updated_at::text
         from notification_templates
         order by notice_type, channel`
      );
      return r.rows.map((row) => this.mapTemplate(row as Record<string, unknown>));
    });
  }

  async updateTemplate(
    id: string,
    input: { subject?: string; messageBody?: string; isActive?: boolean },
    user: CurrentUser
  ): Promise<NotificationTemplate> {
    return this.pg.transactionAs(user, async (client) => {
      const r = await client.query(
        `update notification_templates
            set subject      = coalesce($2, subject),
                message_body = coalesce($3, message_body),
                is_active    = coalesce($4, is_active),
                updated_by   = $5,
                updated_at   = now()
          where id = $1
         returning id::text, notice_type, channel, subject, message_body,
                   is_active, updated_by::text, created_at::text, updated_at::text`,
        [id, input.subject ?? null, input.messageBody ?? null, input.isActive ?? null, user.id]
      );
      const row = r.rows[0];
      if (!row) throw new Error(`Template ${id} not found`);
      return this.mapTemplate(row as Record<string, unknown>);
    });
  }

  // ── SLA Configs ───────────────────────────────────────────────────────────

  async findSlaConfig(noticeType: string): Promise<SlaConfig | null> {
    if (!this.mode.postgres) return null;

    const rows = await this.pg.transactionAs(
      {
        id: 'system',
        name: 'system',
        organizationId: 'system',
        organizationIds: [],
        role: 'SYSTEM_ADMIN',
        roles: ['SYSTEM_ADMIN'],
        authSource: 'OIDC',
        hearingAssignments: [],
        permissions: []
      } as any,
      async (client) => {
        const r = await client.query(
          `select id::text, notice_type, ack_deadline_hours, reminder_hours,
                  is_active, updated_by::text, created_at::text, updated_at::text
           from sla_configs
           where notice_type = $1 and is_active = true
           limit 1`,
          [noticeType]
        );
        return (r as any).rows;
      }
    );
    const row = rows[0];
    if (!row) return null;
    return this.mapSlaConfig(row as Record<string, unknown>);
  }

  async listSlaConfigs(user: CurrentUser): Promise<SlaConfig[]> {
    if (!this.mode.postgres) return [];
    return this.pg.transactionAs(user, async (client) => {
      const r = await client.query(
        `select id::text, notice_type, ack_deadline_hours, reminder_hours,
                is_active, updated_by::text, created_at::text, updated_at::text
         from sla_configs
         order by notice_type`
      );
      return r.rows.map((row) => this.mapSlaConfig(row as Record<string, unknown>));
    });
  }

  async updateSlaConfig(
    id: string,
    input: { ackDeadlineHours?: number; reminderHours?: number[]; isActive?: boolean },
    user: CurrentUser
  ): Promise<SlaConfig> {
    return this.pg.transactionAs(user, async (client) => {
      const r = await client.query(
        `update sla_configs
            set ack_deadline_hours = coalesce($2, ack_deadline_hours),
                reminder_hours     = coalesce($3, reminder_hours),
                is_active          = coalesce($4, is_active),
                updated_by         = $5,
                updated_at         = now()
          where id = $1
         returning id::text, notice_type, ack_deadline_hours, reminder_hours,
                   is_active, updated_by::text, created_at::text, updated_at::text`,
        [
          id,
          input.ackDeadlineHours ?? null,
          input.reminderHours ? JSON.stringify(input.reminderHours) : null,
          input.isActive ?? null,
          user.id
        ]
      );
      const row = r.rows[0];
      if (!row) throw new Error(`SLA config ${id} not found`);
      return this.mapSlaConfig(row as Record<string, unknown>);
    });
  }

  // ── Mappers ───────────────────────────────────────────────────────────────

  private mapTemplate(r: Record<string, unknown>): NotificationTemplate {
    return {
      id: String(r['id']),
      noticeType: String(r['notice_type']),
      channel: String(r['channel']),
      subject: String(r['subject']),
      messageBody: String(r['message_body']),
      isActive: Boolean(r['is_active']),
      updatedBy: r['updated_by'] ? String(r['updated_by']) : undefined,
      createdAt: String(r['created_at']),
      updatedAt: String(r['updated_at'])
    };
  }

  private mapSlaConfig(r: Record<string, unknown>): SlaConfig {
    const raw = r['reminder_hours'];
    const reminderHours: number[] = Array.isArray(raw)
      ? raw.map(Number)
      : typeof raw === 'string'
        ? JSON.parse(raw)
        : [];
    return {
      id: String(r['id']),
      noticeType: String(r['notice_type']),
      ackDeadlineHours: Number(r['ack_deadline_hours']),
      reminderHours,
      isActive: Boolean(r['is_active']),
      updatedBy: r['updated_by'] ? String(r['updated_by']) : undefined,
      createdAt: String(r['created_at']),
      updatedAt: String(r['updated_at'])
    };
  }
}
