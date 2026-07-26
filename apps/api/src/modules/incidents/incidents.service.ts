import { Injectable } from '@nestjs/common';
import {
  DomainError,
  incidentBlocksHearing,
  incidentNotificationDeadline,
  transitionIncident
} from '@cims/domain';
import { requirePermission } from '../../common/authorization.js';
import type { CurrentUser } from '../../common/current-user.decorator.js';
import { AuditService } from '../../infrastructure/observability/audit.service.js';
import { HearingControlRepository } from '../../infrastructure/persistence/repositories/hearing-control.repository.js';
import { IncidentsRepository } from '../../infrastructure/persistence/repositories/incidents.repository.js';
import type { CreateIncidentDto, IncidentActionDto } from './dto.js';

@Injectable()
export class IncidentsService {
  constructor(
    private readonly repository: IncidentsRepository,
    private readonly hearingControl: HearingControlRepository,
    private readonly audit: AuditService
  ) {}

  async list(hearingId: string, user: CurrentUser) {
    requirePermission(user, 'incident.read', hearingId);
    return this.repository.list(hearingId, user);
  }

  async create(hearingId: string, dto: CreateIncidentDto, user: CurrentUser) {
    requirePermission(user, 'incident.write', hearingId);
    const occurredAt = dto.occurredAt ?? new Date().toISOString();
    const now = new Date().toISOString();
    const incident = await this.repository.create(
      {
        hearingId,
        type: dto.type,
        severity: dto.severity,
        status: 'OPEN',
        title: dto.title,
        description: dto.description,
        occurredAt,
        notificationDeadline: incidentNotificationDeadline(dto.type, occurredAt),
        reportedBy: user.id,
        createdAt: now,
        updatedAt: now
      },
      user
    );
    if (incidentBlocksHearing(dto.type, dto.severity)) {
      const runtime = await this.hearingControl.status(hearingId, user);
      if (runtime.state === 'STARTED') {
        await this.hearingControl.apply(
          hearingId,
          'SUSPEND',
          `Automatic suspension due to ${dto.type} ${dto.severity} incident`,
          this.systemUser(hearingId),
          runtime.runtime?.rowVersion
        );
      }
    }
    await this.audit.record('INCIDENT_CREATED', 'INCIDENT', incident.id, user, {
      hearingId,
      type: dto.type,
      severity: dto.severity,
      notificationDeadline: incident.notificationDeadline
    });
    return incident;
  }

  async action(incidentId: string, dto: IncidentActionDto, user: CurrentUser) {
    const incident = await this.find(incidentId, user);
    requirePermission(user, 'incident.write', incident.hearingId);
    const status = transitionIncident(incident.status as never, dto.action);
    const at = new Date().toISOString();
    await this.repository.transition(incidentId, status, dto.action, dto.notes, at, user);
    await this.audit.record('INCIDENT_STATE_CHANGED', 'INCIDENT', incidentId, user, {
      action: dto.action,
      status
    });
    return {
      ...incident,
      status,
      updatedAt: at,
      resolution: dto.action === 'RESOLVE' ? dto.notes : incident.resolution
    };
  }

  async notify(incidentId: string, reference: string, user: CurrentUser) {
    const incident = await this.find(incidentId, user);
    requirePermission(user, 'incident.write', incident.hearingId);
    const at = new Date().toISOString();
    await this.repository.notify(incidentId, reference, at, user);
    await this.audit.record('INCIDENT_NOTIFICATION_RECORDED', 'INCIDENT', incidentId, user, {
      reference,
      notifiedAt: at
    });
    return { ...incident, notifiedAt: at, notificationReference: reference, updatedAt: at };
  }

  async overdue(user: CurrentUser) {
    requirePermission(user, 'incident.read');
    return this.repository.overdue(user);
  }

  private async find(id: string, user: CurrentUser) {
    const incident = await this.repository.find(id, user);
    if (!incident) throw new DomainError('INCIDENT_NOT_FOUND', 'Incident was not found.', 404);
    return incident;
  }

  private systemUser(hearingId: string): CurrentUser {
    return {
      id: 'cims-incident-automation',
      name: 'CIMS Incident Automation',
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
