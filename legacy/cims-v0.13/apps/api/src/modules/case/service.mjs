import { DomainError } from '../../common/domain-error.mjs';
import { requirePermission } from '../iam/authorization.mjs';

export class CaseService {
  constructor(db) { this.db = db; }

  listCases(context) {
    requirePermission(context, 'case.read');
    return this.db.all(`select c.*, o.name as owning_organization_name from case_references c
      join organizations o on o.id=c.owning_organization_id order by c.created_at desc`);
  }

  listHearings(context) {
    requirePermission(context, 'hearing.read');
    if (context.isSystemAdmin) return this.db.all(`select h.*, c.case_number, c.case_type from hearings h join case_references c on c.id=h.case_reference_id order by h.created_at desc`);
    return this.db.all(`select h.*, c.case_number, c.case_type from hearings h
      join case_references c on c.id=h.case_reference_id
      join hearing_assignments a on a.hearing_id=h.id
      where a.user_id=? and (a.valid_until is null or a.valid_until>?)
      group by h.id order by h.created_at desc`, context.id, new Date().toISOString());
  }

  getHearing(hearingId) {
    const hearing = this.db.get(`select h.*, c.case_number, c.case_type from hearings h
      join case_references c on c.id=h.case_reference_id where h.id=?`, hearingId);
    if (!hearing) throw new DomainError('HEARING_NOT_FOUND', 'Hearing was not found.', 404);
    return hearing;
  }
}
