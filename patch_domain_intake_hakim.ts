import fs from 'fs';

const filePath = 'packages/domain/src/hearing-intake.ts';
let content = fs.readFileSync(filePath, 'utf8');

const interfacesOld = `export interface InitialDefendantInput {
  displayName: string;
  alias?: string;
  protectedIdentity: boolean;
  custodyStatus: Exclude<DefendantCustodyStatus, 'MIXED'>;
  detentionOrganizationId?: string;
}

export interface ManualHearingIntakeInput {
  caseNumber: string;
  officialCaseReference?: string;
  caseClassification: CaseClassification;
  caseTypeCode: string;
  caseTitle: string;
  hearingType: string;
  hearingSequence: number;
  courtOrganizationId: string;
  prosecutionOrganizationId: string;
  correctionsOrganizationId?: string;
  defendantCustodyStatus: DefendantCustodyStatus;
  defendants: InitialDefendantInput[];
  notes?: string;
}`;

const interfacesNew = `export interface InitialDefendantInput {
  displayName: string;
  alias?: string;
  protectedIdentity: boolean;
  custodyStatus: Exclude<DefendantCustodyStatus, 'MIXED'>;
  detentionOrganizationId?: string;
}

export interface JudgeAssignmentInput {
  userId: string;
  role: 'HAKIM_KETUA' | 'HAKIM_ANGGOTA';
}

export interface ManualHearingIntakeInput {
  caseNumber: string;
  officialCaseReference?: string;
  caseClassification: CaseClassification;
  caseTypeCode: string;
  caseTitle: string;
  hearingType: string;
  hearingSequence: number;
  courtOrganizationId: string;
  prosecutionOrganizationId: string;
  correctionsOrganizationId?: string;
  defendantCustodyStatus: DefendantCustodyStatus;
  defendants: InitialDefendantInput[];
  judges?: JudgeAssignmentInput[];
  notes?: string;
}`;

content = content.replace(interfacesOld, interfacesNew);

const validationOld = `  if (input.defendantCustodyStatus === 'DETAINED' && !input.correctionsOrganizationId?.trim()) {
    errors.push({
      field: 'corrections_organization_id',
      message: 'Rutan atau Lapas wajib dipilih ketika status terdakwa ditahan.'
    });
  }
  if (errors.length > 0)`;

const validationNew = `  if (input.defendantCustodyStatus === 'DETAINED' && !input.correctionsOrganizationId?.trim()) {
    errors.push({
      field: 'corrections_organization_id',
      message: 'Rutan atau Lapas wajib dipilih ketika status terdakwa ditahan.'
    });
  }
  
  // Validasi Multi-Hakim (Minimal ada Hakim Ketua jika array judges diberikan)
  if (input.judges && input.judges.length > 0) {
    const hasKetua = input.judges.some(j => j.role === 'HAKIM_KETUA');
    if (!hasKetua) {
      errors.push({
        field: 'judges',
        message: 'Susunan Majelis Hakim harus memiliki 1 Hakim Ketua.'
      });
    }
    const ketuaCount = input.judges.filter(j => j.role === 'HAKIM_KETUA').length;
    if (ketuaCount > 1) {
      errors.push({
        field: 'judges',
        message: 'Susunan Majelis Hakim tidak boleh memiliki lebih dari 1 Hakim Ketua.'
      });
    }
  }

  if (errors.length > 0)`;

content = content.replace(validationOld, validationNew);

fs.writeFileSync(filePath, content);
