import { DomainError } from './errors.js';

export type HearingDataSource = 'MANUAL' | 'EXTERNAL_DATABASE';
export type HearingIntakeStatus = 'DRAFT' | 'SUBMITTED' | 'ACTIVE' | 'RETURNED' | 'ARCHIVED';
export type HearingIntakeAction = 'SUBMIT' | 'ACTIVATE' | 'RETURN' | 'REOPEN' | 'ARCHIVE';
export type CaseClassification = 'GENERAL_CRIMINAL' | 'SPECIAL_CRIMINAL';
export type DefendantCustodyStatus = 'DETAINED' | 'NOT_DETAINED' | 'MIXED' | 'UNKNOWN';

export interface InitialDefendantInput {
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
}

export function normalizeCaseNumber(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toUpperCase();
}

export function normalizedDuplicateKey(input: Pick<ManualHearingIntakeInput, 'courtOrganizationId' | 'caseNumber' | 'hearingSequence'>): string {
  return `${input.courtOrganizationId.trim()}::${normalizeCaseNumber(input.caseNumber)}::${input.hearingSequence}`;
}

export function validateManualHearingIntake(input: ManualHearingIntakeInput): void {
  const errors: Array<{ field: string; message: string }> = [];
  if (normalizeCaseNumber(input.caseNumber).length < 5) errors.push({ field: 'case_number', message: 'Nomor perkara wajib diisi secara lengkap.' });
  if (input.caseTypeCode.trim().length < 2) errors.push({ field: 'case_type_code', message: 'Kode jenis perkara wajib diisi.' });
  if (input.caseTitle.trim().length < 3) errors.push({ field: 'case_title', message: 'Judul singkat perkara wajib diisi.' });
  if (input.hearingType.trim().length < 3) errors.push({ field: 'hearing_type', message: 'Agenda atau jenis persidangan wajib diisi.' });
  if (!Number.isInteger(input.hearingSequence) || input.hearingSequence < 1 || input.hearingSequence > 999) errors.push({ field: 'hearing_sequence', message: 'Urutan persidangan harus berupa bilangan 1 sampai 999.' });
  if (!input.courtOrganizationId.trim()) errors.push({ field: 'court_organization_id', message: 'Pengadilan wajib dipilih.' });
  if (!input.prosecutionOrganizationId.trim()) errors.push({ field: 'prosecution_organization_id', message: 'Kejaksaan wajib dipilih.' });
  if (input.defendants.length === 0) errors.push({ field: 'defendants', message: 'Minimal satu terdakwa wajib dicatat.' });
  input.defendants.forEach((defendant, index) => {
    if (defendant.displayName.trim().length < 2) errors.push({ field: `defendants.${index}.display_name`, message: 'Nama terdakwa wajib diisi.' });
    if (defendant.custodyStatus === 'DETAINED' && !defendant.detentionOrganizationId?.trim()) {
      errors.push({ field: `defendants.${index}.detention_organization_id`, message: 'Lokasi penahanan wajib dipilih untuk terdakwa yang ditahan.' });
    }
  });
  if (input.defendantCustodyStatus === 'DETAINED' && !input.correctionsOrganizationId?.trim()) {
    errors.push({ field: 'corrections_organization_id', message: 'Rutan atau Lapas wajib dipilih ketika status terdakwa ditahan.' });
  }
  if (errors.length > 0) throw new DomainError('HEARING_INTAKE_VALIDATION_FAILED', 'Data awal persidangan belum lengkap atau tidak valid.', 422, errors);
}

export function transitionHearingIntake(current: HearingIntakeStatus, action: HearingIntakeAction): HearingIntakeStatus {
  const transitions: Record<HearingIntakeStatus, Partial<Record<HearingIntakeAction, HearingIntakeStatus>>> = {
    DRAFT: { SUBMIT: 'SUBMITTED', ARCHIVE: 'ARCHIVED' },
    SUBMITTED: { ACTIVATE: 'ACTIVE', RETURN: 'RETURNED', ARCHIVE: 'ARCHIVED' },
    ACTIVE: { ARCHIVE: 'ARCHIVED' },
    RETURNED: { REOPEN: 'DRAFT', SUBMIT: 'SUBMITTED', ARCHIVE: 'ARCHIVED' },
    ARCHIVED: {},
  };
  const next = transitions[current][action];
  if (!next) {
    throw new DomainError('INVALID_HEARING_INTAKE_TRANSITION', `Data persidangan tidak dapat menjalankan aksi ${action} dari status ${current}.`, 409, { current, action });
  }
  return next;
}

export function assertManualIntakeEditable(status: HearingIntakeStatus): void {
  if (!['DRAFT', 'RETURNED'].includes(status)) {
    throw new DomainError('HEARING_INTAKE_NOT_EDITABLE', 'Data persidangan hanya dapat diubah pada status DRAFT atau RETURNED.', 409, { status });
  }
}
