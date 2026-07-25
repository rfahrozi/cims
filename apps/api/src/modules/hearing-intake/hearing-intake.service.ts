import { Injectable } from '@nestjs/common';
import { DomainError, validateManualHearingIntake, type ManualHearingIntakeInput } from '@cims/domain';
import { requireRoles } from '../../common/authorization.js';
import type { CurrentUser } from '../../common/current-user.decorator.js';
import { AuditService } from '../../infrastructure/audit.service.js';
import { HearingIntakeRepository } from '../../infrastructure/repositories/hearing-intake.repository.js';
import { HearingImportGateway } from './hearing-import.gateway.js';
import type { ImportJobRequestDto, ManualHearingDto, ReturnManualHearingDto, UpdateManualHearingDto } from './dto.js';

@Injectable()
export class HearingIntakeService {
  constructor(
    private readonly repository: HearingIntakeRepository,
    private readonly audit: AuditService,
    private readonly importGateway: HearingImportGateway,
  ) {}

  list(user: CurrentUser, status?: string, query?: string) { return this.repository.list(user, { status, query }); }
  get(user: CurrentUser, hearingId: string) { return this.repository.get(hearingId, user); }
  referenceData(user: CurrentUser) { return this.repository.referenceData(user); }

  async create(user: CurrentUser, dto: ManualHearingDto, correlationId?: string) {
    requireRoles(user, ['SUBSTITUTE_CLERK']);
    const input = this.map(dto);
    this.assertCourtScope(user, input.courtOrganizationId);
    validateManualHearingIntake(input);
    const item = await this.repository.create(input, user);
    await this.audit.append({
      eventType: 'MANUAL_HEARING_INTAKE_CREATED', objectType: 'HEARING', objectId: item.id,
      actorUserId: user.id, actorOrganizationId: user.organizationId, correlationId,
      payload: { data_source: 'MANUAL', case_number: item.caseNumber, hearing_sequence: item.hearingSequence, intake_status: item.intakeStatus },
    }, user);
    return item;
  }

  async update(user: CurrentUser, hearingId: string, dto: UpdateManualHearingDto, correlationId?: string) {
    requireRoles(user, ['SUBSTITUTE_CLERK']);
    const input = this.map(dto);
    this.assertCourtScope(user, input.courtOrganizationId);
    validateManualHearingIntake(input);
    const item = await this.repository.update(hearingId, input, dto.expected_row_version, user);
    await this.audit.append({
      eventType: 'MANUAL_HEARING_INTAKE_UPDATED', objectType: 'HEARING', objectId: hearingId,
      actorUserId: user.id, actorOrganizationId: user.organizationId, correlationId,
      payload: { row_version: item.rowVersion, intake_status: item.intakeStatus },
    }, user);
    return item;
  }

  async submit(user: CurrentUser, hearingId: string, correlationId?: string) {
    requireRoles(user, ['SUBSTITUTE_CLERK']);
    const item = await this.repository.transition(hearingId, 'SUBMIT', undefined, user);
    await this.audit.append({ eventType: 'MANUAL_HEARING_INTAKE_SUBMITTED', objectType: 'HEARING', objectId: hearingId, actorUserId: user.id, actorOrganizationId: user.organizationId, correlationId, payload: { intake_status: item.intakeStatus } }, user);
    return item;
  }

  async activate(user: CurrentUser, hearingId: string, correlationId?: string) {
    requireRoles(user, ['COURT_CLERK']);
    const before = await this.repository.get(hearingId, user);
    if (before.createdBy === user.id) throw new DomainError('MAKER_CHECKER_REQUIRED', 'Pengguna yang membuat data tidak boleh mengaktifkan data yang sama.', 409, { hearingId });
    const item = await this.repository.transition(hearingId, 'ACTIVATE', undefined, user);
    await this.audit.append({ eventType: 'MANUAL_HEARING_INTAKE_ACTIVATED', objectType: 'HEARING', objectId: hearingId, actorUserId: user.id, actorOrganizationId: user.organizationId, correlationId, payload: { intake_status: item.intakeStatus } }, user);
    return item;
  }

  async returnForCorrection(user: CurrentUser, hearingId: string, dto: ReturnManualHearingDto, correlationId?: string) {
    requireRoles(user, ['COURT_CLERK']);
    const item = await this.repository.transition(hearingId, 'RETURN', dto.reason, user);
    await this.audit.append({ eventType: 'MANUAL_HEARING_INTAKE_RETURNED', objectType: 'HEARING', objectId: hearingId, actorUserId: user.id, actorOrganizationId: user.organizationId, correlationId, payload: { reason: dto.reason, intake_status: item.intakeStatus } }, user);
    return item;
  }

  async reopen(user: CurrentUser, hearingId: string, correlationId?: string) {
    requireRoles(user, ['SUBSTITUTE_CLERK']);
    const item = await this.repository.transition(hearingId, 'REOPEN', undefined, user);
    await this.audit.append({ eventType: 'MANUAL_HEARING_INTAKE_REOPENED', objectType: 'HEARING', objectId: hearingId, actorUserId: user.id, actorOrganizationId: user.organizationId, correlationId, payload: { intake_status: item.intakeStatus } }, user);
    return item;
  }

  async importSources(user: CurrentUser) {
    requireRoles(user, ['SUBSTITUTE_CLERK', 'COURT_CLERK']);
    return { ...this.importGateway.capability(), items: await this.repository.importSources() };
  }

  async requestImport(user: CurrentUser, dto: ImportJobRequestDto): Promise<never> {
    requireRoles(user, ['COURT_CLERK']);
    return this.importGateway.requestPreview({ sourceCode: dto.source_code, caseNumber: dto.case_number });
  }

  private assertCourtScope(user: CurrentUser, courtOrganizationId: string): void {
    if (user.roles.includes('SYSTEM_ADMIN')) return;
    if (!user.organizationIds.includes(courtOrganizationId)) {
      throw new DomainError('FORBIDDEN_COURT_SCOPE', 'Panitera Pengganti hanya dapat membuat atau mengubah data persidangan pada pengadilan yang menjadi ruang lingkupnya.', 403, { courtOrganizationId });
    }
  }

  private map(dto: ManualHearingDto): ManualHearingIntakeInput {
    return {
      caseNumber: dto.case_number, officialCaseReference: dto.official_case_reference,
      caseClassification: dto.case_classification, caseTypeCode: dto.case_type_code, caseTitle: dto.case_title,
      hearingType: dto.hearing_type, hearingSequence: dto.hearing_sequence,
      courtOrganizationId: dto.court_organization_id, prosecutionOrganizationId: dto.prosecution_organization_id,
      correctionsOrganizationId: dto.corrections_organization_id, defendantCustodyStatus: dto.defendant_custody_status,
      defendants: dto.defendants.map((item) => ({ displayName: item.display_name, alias: item.alias, protectedIdentity: item.protected_identity, custodyStatus: item.custody_status, detentionOrganizationId: item.detention_organization_id })),
      notes: dto.notes,
    };
  }
}
