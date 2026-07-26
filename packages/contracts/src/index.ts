export interface ApiError {
  error: { code: string; message: string; details?: unknown };
}
export interface GateStatus {
  hearing_id: string;
  hearing_data: boolean;
  determination: boolean;
  schedule: boolean;
  notice: {
    noticeCount: number;
    requiredAcknowledgmentCount: number;
    acknowledgedCount: number;
    ready: boolean;
  };
  readiness: { ready: boolean; organizations: Array<{ organizationType: string; status: string }> };
  virtual_session: boolean;
  hearing_ended: boolean;
  next_gate: string;
}
export interface ZoomStatus {
  mode: string;
  connected: boolean;
  provider_url: string;
  detail: unknown;
}
export interface HearingSummary {
  id: string;
  caseId?: string;
  caseNumber: string;
  caseTitle?: string;
  type: string;
  state: string;
  hearingSequence?: number;
  intakeStatus?: HearingIntakeStatus;
  dataSource?: HearingDataSource;
}
export interface OfficialNoticeSummary {
  id: string;
  hearingId: string;
  status: string;
  subject: string;
  officialReference: string;
}
export interface ReadinessGateSummary {
  ready: boolean;
  organizations: Array<{ organizationType: string; status: string }>;
}
export interface VirtualSessionSummary {
  id: string;
  state: string;
  providerCode: string;
  rooms: Array<{ roomCode: string; recordingAllowed: boolean }>;
}
export interface HearingRuntimeSummary {
  hearing_id: string;
  state: string;
  events: Array<{ eventType: string; occurredAt: string }>;
}

export type HearingIntakeStatus = 'DRAFT' | 'SUBMITTED' | 'ACTIVE' | 'RETURNED' | 'ARCHIVED';
export type HearingDataSource = 'MANUAL' | 'EXTERNAL_DATABASE';
export interface InitialDefendantInput {
  display_name: string;
  alias?: string;
  protected_identity: boolean;
  custody_status: 'DETAINED' | 'NOT_DETAINED' | 'UNKNOWN';
  detention_organization_id?: string;
}
export interface ManualHearingIntakeRequest {
  case_number: string;
  official_case_reference?: string;
  case_classification: 'GENERAL_CRIMINAL' | 'SPECIAL_CRIMINAL';
  case_type_code: string;
  case_title: string;
  hearing_type: string;
  hearing_sequence: number;
  court_organization_id: string;
  prosecution_organization_id: string;
  corrections_organization_id?: string;
  defendant_custody_status: 'DETAINED' | 'NOT_DETAINED' | 'MIXED' | 'UNKNOWN';
  defendants: InitialDefendantInput[];
  notes?: string;
}
export interface ManualHearingIntakeSummary {
  id: string;
  caseId: string;
  caseNumber: string;
  caseTitle: string;
  hearingSequence: number;
  intakeStatus: HearingIntakeStatus;
  dataSource: HearingDataSource;
  rowVersion: number;
}
export interface HearingImportCapability {
  phase: 'FUTURE_DATABASE_IMPORT';
  enabled: boolean;
  adapter: string;
  readOnly: true;
  stages: string[];
}
