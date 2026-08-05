import fs from 'fs';

const filePath = 'apps/api/src/modules/hearing-intake/hearing-intake.service.ts';
let content = fs.readFileSync(filePath, 'utf8');

const mapOld = `  private map(dto: ManualHearingDto): ManualHearingIntakeInput {
    return {
      caseNumber: dto.case_number,
      officialCaseReference: dto.official_case_reference,
      caseClassification: dto.case_classification,
      caseTypeCode: dto.case_type_code,
      caseTitle: dto.case_title,
      hearingType: dto.hearing_type,
      hearingSequence: dto.hearing_sequence,
      courtOrganizationId: dto.court_organization_id,
      prosecutionOrganizationId: dto.prosecution_organization_id,
      correctionsOrganizationId: dto.corrections_organization_id,
      defendantCustodyStatus: dto.defendant_custody_status,
      defendants: dto.defendants.map((item) => ({
        displayName: item.display_name,
        alias: item.alias,
        protectedIdentity: item.protected_identity,
        custodyStatus: item.custody_status,
        detentionOrganizationId: item.detention_organization_id
      })),
      notes: dto.notes`;

const mapNew = `  private map(dto: ManualHearingDto): ManualHearingIntakeInput {
    return {
      caseNumber: dto.case_number,
      officialCaseReference: dto.official_case_reference,
      caseClassification: dto.case_classification,
      caseTypeCode: dto.case_type_code,
      caseTitle: dto.case_title,
      hearingType: dto.hearing_type,
      hearingSequence: dto.hearing_sequence,
      courtOrganizationId: dto.court_organization_id,
      prosecutionOrganizationId: dto.prosecution_organization_id,
      correctionsOrganizationId: dto.corrections_organization_id,
      defendantCustodyStatus: dto.defendant_custody_status,
      defendants: dto.defendants.map((item) => ({
        displayName: item.display_name,
        alias: item.alias,
        protectedIdentity: item.protected_identity,
        custodyStatus: item.custody_status,
        detentionOrganizationId: item.detention_organization_id
      })),
      judges: dto.judges?.map((j) => ({
        userId: j.user_id,
        role: j.role
      })),
      notes: dto.notes`;

content = content.replace(mapOld, mapNew);
fs.writeFileSync(filePath, content);
