import { Injectable } from '@nestjs/common';
import { requireRoles } from '../../common/authorization.js';
import type { CurrentUser } from '../../common/current-user.decorator.js';
import { AdminConfigRepository } from '../../infrastructure/persistence/repositories/admin-config.repository.js';
import type { UpdateSlaConfigDto, UpdateTemplateDto } from './dto.js';

@Injectable()
export class AdminConfigService {
  constructor(private readonly repository: AdminConfigRepository) {}

  listTemplates(user: CurrentUser) {
    requireRoles(user, ['SYSTEM_ADMIN']);
    return this.repository.listTemplates(user);
  }

  updateTemplate(user: CurrentUser, id: string, dto: UpdateTemplateDto) {
    requireRoles(user, ['SYSTEM_ADMIN']);
    return this.repository.updateTemplate(
      id,
      {
        subject: dto.subject,
        messageBody: dto.message_body,
        isActive: dto.is_active
      },
      user
    );
  }

  listSlaConfigs(user: CurrentUser) {
    requireRoles(user, ['SYSTEM_ADMIN', 'AUDITOR', 'COURT_CLERK']);
    return this.repository.listSlaConfigs(user);
  }

  updateSlaConfig(user: CurrentUser, id: string, dto: UpdateSlaConfigDto) {
    requireRoles(user, ['SYSTEM_ADMIN']);
    return this.repository.updateSlaConfig(
      id,
      {
        ackDeadlineHours: dto.ack_deadline_hours,
        reminderHours: dto.reminder_hours,
        isActive: dto.is_active
      },
      user
    );
  }
}
