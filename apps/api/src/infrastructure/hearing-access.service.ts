import { Injectable } from '@nestjs/common';
import type { CurrentUser } from '../common/current-user.decorator.js';
import { InMemoryStore } from './in-memory.store.js';
import { PersistenceModeService } from './database/persistence-mode.service.js';
import { PgPoolService } from './database/pg-pool.service.js';

@Injectable()
export class HearingAccessService {
  constructor(
    private readonly mode: PersistenceModeService,
    private readonly memory: InMemoryStore,
    private readonly pg: PgPoolService,
  ) {}

  async canAccess(user: CurrentUser, hearingId: string): Promise<boolean> {
    if (user.roles.includes('SYSTEM_ADMIN') || user.hearingAssignments.includes(hearingId)) return true;
    if (!this.mode.postgres) {
      if (this.memory.hearingUserAssignments.some((item) => item.hearingId === hearingId && item.userId === user.id && item.active)) return true;
      const assignedOrganizations = this.memory.hearingAssignments
        .filter((item) => item.hearingId === hearingId)
        .map((item) => item.organizationId);
      return assignedOrganizations.some((organizationId) => user.organizationIds.includes(organizationId));
    }
    const result = await this.pg.transaction(async (client) => client.query(
      `select exists(
         select 1 from hearing_user_assignments u
          where u.hearing_id=$1 and u.user_id=$2 and u.active=true
         union all
         select 1 from hearing_assignments a
          where a.hearing_id=$1 and a.active=true and a.organization_id = any($3::text[])
       ) as allowed`,
      [hearingId, user.id, user.organizationIds],
    ));
    return Boolean(result.rows[0]?.allowed);
  }
}
