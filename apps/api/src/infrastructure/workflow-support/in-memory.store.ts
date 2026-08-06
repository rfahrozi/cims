import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  ActiveSchedule,
  Determination,
  HearingRuntimeState,
  NoticeChannel,
  NoticeRecipientStatus,
  NoticeStatus,
  OrganizationType,
  ReadinessStatus,
  ScheduleConflict,
  ScheduleProposal
} from '@cims/domain';

export interface HearingRecord {
  id: string;
  caseNumber: string;
  type: string;
  state: string;
  caseId?: string;
  hearingSequence?: number;
  intakeStatus?: string;
  dataSource?: string;
  caseTitle?: string;
  courtOrganizationId?: string;
  prosecutionOrganizationId?: string;
  correctionsOrganizationId?: string;
  rowVersion?: number;
}

export interface CourtCaseRecord {
  id: string;
  caseNumber: string;
  normalizedCaseNumber: string;
  officialCaseReference?: string;
  caseClassification: string;
  caseTypeCode: string;
  caseTitle: string;
  courtOrganizationId: string;
  prosecutionOrganizationId: string;
  dataSource: string;
  sourceSystem?: string;
  sourceRecordId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  rowVersion: number;
}
export interface HearingIntakePartyRecord {
  id: string;
  hearingId: string;
  partyType: 'DEFENDANT';
  displayName: string;
  alias?: string;
  protectedIdentity: boolean;
  custodyStatus: string;
  detentionOrganizationId?: string;
  createdBy: string;
  createdAt: string;
}
export interface HearingDataRevisionRecord {
  id: string;
  hearingId: string;
  revisionNumber: number;
  action: string;
  snapshot: unknown;
  reason?: string;
  actorUserId: string;
  createdAt: string;
}
export interface HearingUserAssignmentRecord {
  hearingId: string;
  userId: string;
  assignmentRole: string;
  active: boolean;
  createdAt: string;
}
export interface HearingImportSourceRecord {
  [key: string]: unknown;
  id: string;
  code: string;
  name: string;
  sourceType: 'DATABASE';
  enabled: boolean;
  status: 'DISABLED' | 'NOT_CONFIGURED' | 'READY';
  lastCheckedAt?: string;
}
export interface HearingImportJobRecord {
  id: string;
  sourceId: string;
  status: 'REQUESTED' | 'PREVIEW_READY' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  requestedBy: string;
  requestedAt: string;
  sourceQuery: unknown;
  previewCount: number;
  importedCount: number;
  error?: string;
}

export interface OrganizationRecord {
  id: string;
  name: string;
  type: OrganizationType;
  courtCode?: string; // e.g. "PN Tpg"
}
export interface HearingAssignmentRecord {
  hearingId: string;
  organizationId: string;
}
export interface HearingAgendaItemRecord {
  id: string;
  hearingId: string;
  sequenceNumber: number;
  itemType: string;
  itemDescription: string;
  estimatedDurationMinutes: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
}
export interface AuditEventRecord {
  id: string;
  sequence: number;
  eventType: string;
  objectType: string;
  objectId: string;
  actorUserId?: string;
  actorOrganizationId?: string;
  correlationId?: string;
  payload: unknown;
  occurredAt: string;
}
export interface OfficialNoticeRecord {
  id: string;
  hearingId: string;
  scheduleId: string;
  noticeType: string;
  subject: string;
  message: string;
  officialReference: string;
  senderOrganizationId: string;
  createdBy: string;
  status: NoticeStatus;
  createdAt: string;
  sentAt?: string;
}
export interface NoticeRecipientRecord {
  id: string;
  noticeId: string;
  recipientUserId?: string;
  recipientOrganizationId?: string;
  recipientName: string;
  destination: string;
  preferredChannel: NoticeChannel;
  requiredAck: boolean;
  ackDeadline?: string;
  status: NoticeRecipientStatus;
}
export interface DeliveryAttemptRecord {
  id: string;
  recipientId: string;
  attemptNumber: number;
  channel: NoticeChannel;
  status: 'DELIVERED' | 'FAILED';
  providerReference?: string;
  evidence: unknown;
  errorCode?: string;
  attemptedAt: string;
}
export interface AcknowledgmentRecord {
  id: string;
  recipientId: string;
  acknowledgedBy: string;
  method: string;
  receiptReference: string;
  acknowledgedAt: string;
}
export interface IdentityVerificationRecord {
  id: string;
  hearingId: string;
  organizationId: string;
  participantReference: string;
  participantRole?: string;
  locationCode?: string;
  supervisorOfficerId?: string;
  supervisorOfficerName?: string;
  method: string;
  result: 'PASS' | 'FAIL';
  notes?: string;
  verifiedBy: string;
  verifiedAt: string;
}
export interface RoomInspectionRecord {
  id: string;
  hearingId: string;
  organizationId: string;
  locationCode: string;
  cameraFullView: boolean;
  unauthorizedPersonAbsent: boolean;
  confidentialityReady: boolean;
  result: 'PASS' | 'FAIL';
  notes?: string;
  inspectedBy: string;
  inspectedAt: string;
}
export interface ReadinessItemRecord {
  id: string;
  submissionId: string;
  itemCode: string;
  required: boolean;
  result: 'PASS' | 'FAIL' | 'NA';
  notes?: string;
}
export interface TechnicalTestRecord {
  id: string;
  submissionId: string;
  camera: 'PASS' | 'FAIL' | 'NA';
  microphone: 'PASS' | 'FAIL' | 'NA';
  audio: 'PASS' | 'FAIL' | 'NA';
  primaryNetwork: 'PASS' | 'FAIL' | 'NA';
  backupNetwork: 'PASS' | 'FAIL' | 'NA';
  providerAccess: 'PASS' | 'FAIL' | 'NA';
  testedAt: string;
}
export interface ReadinessSubmissionRecord {
  id: string;
  hearingId: string;
  organizationId: string;
  organizationType: OrganizationType;
  version: number;
  locationCode: string;
  status: ReadinessStatus;
  submittedBy: string;
  submittedAt: string;
}
export interface VirtualSessionRecord {
  id: string;
  hearingId: string;
  scheduleId: string;
  providerCode: string;
  providerSessionReference?: string;
  state: 'REQUESTED' | 'READY' | 'FAILED' | 'CANCELLED';
  recordingPolicy: 'DISABLED' | 'COURT_CONTROLLED';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  failureCode?: string;
}
export interface VirtualRoomRecord {
  id: string;
  virtualSessionId: string;
  roomCode: 'MAIN' | 'WAITING' | 'DEFENDANT' | 'WITNESS' | 'CONSULTATION';
  roomType: string;
  providerRoomReference: string;
  recordingAllowed: boolean;
}
export interface HearingRuntimeRecord {
  id: string;
  hearingId: string;
  virtualSessionId: string;
  state: HearingRuntimeState;
  startedBy?: string;
  startedAt?: string;
  suspendedBy?: string;
  suspendedAt?: string;
  suspensionReason?: string;
  endedBy?: string;
  endedAt?: string;
  updatedAt: string;
}
export interface HearingControlEventRecord {
  id: string;
  hearingId: string;
  sequence: number;
  eventType: string;
  reason?: string;
  actorUserId: string;
  occurredAt: string;
}

export interface ParticipantRecord {
  id: string;
  hearingId: string;
  organizationId?: string;
  role: string;
  displayName: string;
  alias?: string;
  protectedIdentity: boolean;
  agendaItemId?: string; // (M-06) Penautan ke urutan kegiatan sidang tertentu
  state: string;
  contactEmailEncrypted?: string;
  createdBy: string;
  createdAt: string;
}
export interface ParticipantTokenRecord {
  id: string;
  participantId: string;
  hearingId: string;
  tokenHash: string;
  fingerprint: string;
  expiresAt: string;
  consumedAt?: string;
  revokedAt?: string;
  createdBy: string;
  createdAt: string;
}
export interface ParticipantSessionRecord {
  id: string;
  participantId: string;
  hearingId: string;
  virtualRoomCode: string;
  state: string;
  joinedWaitingAt?: string;
  admittedAt?: string;
  leftAt?: string;
  admittedBy?: string;
}
export interface AttendanceEventRecord {
  id: string;
  hearingId: string;
  participantId: string;
  eventType: string;
  roomCode?: string;
  occurredAt: string;
  source: string;
}
export interface ConsultationRecord {
  id: string;
  hearingId: string;
  defendantParticipantId: string;
  advocateParticipantId: string;
  state: 'ACTIVE' | 'ENDED';
  startedBy: string;
  startedAt: string;
  endedBy?: string;
  endedAt?: string;
}
export interface IncidentRecord {
  id: string;
  hearingId: string;
  type: string;
  severity: string;
  status: string;
  title: string;
  description: string;
  occurredAt: string;
  notificationDeadline?: string;
  notifiedAt?: string;
  notificationReference?: string;
  resolution?: string;
  reportedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface LegalHoldMemoryRecord {
  id: string;
  hearingId: string;
  holdType: 'LITIGATION' | 'INVESTIGATION' | 'AUDIT' | 'COURT_ORDER' | 'OTHER';
  reason: string;
  officialReference: string;
  status: 'ACTIVE' | 'RELEASED';
  createdBy: string;
  createdAt: string;
  releasedBy?: string;
  releasedAt?: string;
  releaseReason?: string;
}
export interface RetentionPolicyMemoryRecord {
  id: string;
  policyCode: string;
  objectType: string;
  retentionDays?: number;
  dispositionAction: 'REVIEW_ONLY' | 'ARCHIVE' | 'DELETE';
  enabled: boolean;
  requiresApproval: boolean;
  legalBasisReference?: string;
  approvedBy?: string;
  approvedAt?: string;
}
export interface RetentionPreviewMemoryRecord {
  id: string;
  hearingId: string;
  policyCode?: string;
  closureAt?: string;
  dueAt?: string;
  eligibilityStatus:
    | 'NOT_CLOSED'
    | 'POLICY_NOT_CONFIGURED'
    | 'ON_HOLD'
    | 'NOT_DUE'
    | 'DUE_FOR_REVIEW';
  activeLegalHoldCount: number;
  eligibleForReview: boolean;
  requestedBy: string;
  requestedAt: string;
}
export interface EvidenceExportMemoryRecord {
  id: string;
  hearingId: string;
  exportFormat: 'JSON' | 'ZIP_MANIFEST';
  status: 'REQUESTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
  requestedBy: string;
  requestedAt: string;
  startedAt?: string;
  completedAt?: string;
  storageUri?: string;
  objectHash?: string;
  manifestHash?: string;
  itemCount: number;
  expiresAt?: string;
  lastError?: string;
  items: Array<{
    sequence: number;
    category: string;
    recordCount: number;
    contentHash: string;
    metadata: Record<string, unknown>;
  }>;
}
export interface AccessReviewCampaignMemoryRecord {
  id: string;
  campaignName: string;
  scopeOrganizationId?: string;
  hearingId?: string;
  status: 'OPEN' | 'COMPLETED' | 'CANCELLED';
  createdBy: string;
  createdAt: string;
  dueAt: string;
  completedBy?: string;
  completedAt?: string;
  items: Array<{
    id: string;
    hearingId: string;
    subjectUserId: string;
    assignmentRole: string;
    status: 'PENDING' | 'KEPT' | 'REVOKED';
    decisionReason?: string;
    reviewedBy?: string;
    reviewedAt?: string;
  }>;
}
export interface ProductionReadinessSnapshotMemoryRecord {
  id: string;
  releaseVersion: string;
  decision: string;
  checks: unknown;
  generatedBy: string;
  generatedAt: string;
  correlationId?: string;
}
export interface IncidentActionRecord {
  id: string;
  incidentId: string;
  actionType: string;
  notes?: string;
  actorUserId: string;
  occurredAt: string;
}

@Injectable()
export class InMemoryStore {
  readonly courtCases: CourtCaseRecord[] = [
    {
      id: 'case-demo-001',
      caseNumber: '125/Pid.Sus/2026/PN Tpg',
      normalizedCaseNumber: '125/PID.SUS/2026/PN TPG',
      officialCaseReference: 'SIPP-TPI-001',
      caseClassification: 'SPECIAL_CRIMINAL',
      caseTypeCode: 'PID.SUS',
      caseTitle: 'Perkara Narkotika',
      courtOrganizationId: 'pn-tanjungpinang',
      prosecutionOrganizationId: 'kejari-tanjungpinang',
      dataSource: 'MANUAL',
      createdBy: 'clerk-demo',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rowVersion: 1
    },
    {
      id: 'case-demo-002',
      caseNumber: '295/Pid.B/2026/PN Btm',
      normalizedCaseNumber: '295/PID.B/2026/PN BTM',
      officialCaseReference: 'SIPP-BTM-002',
      caseClassification: 'GENERAL_CRIMINAL',
      caseTypeCode: 'PID.B',
      caseTitle: 'Perkara Penipuan',
      courtOrganizationId: 'pn-batam',
      prosecutionOrganizationId: 'kejari-batam',
      dataSource: 'MANUAL',
      createdBy: 'clerk-demo',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rowVersion: 1
    },
    {
      id: 'case-demo-003',
      caseNumber: '5/Pid.Sus-TPK/2026/PN Tpg',
      normalizedCaseNumber: '5/PID.SUS-TPK/2026/PN TPG',
      officialCaseReference: 'SIPP-TPI-003',
      caseClassification: 'SPECIAL_CRIMINAL_TIPIKOR',
      caseTypeCode: 'PID.SUS-TPK',
      caseTitle: 'Perkara Tindak Pidana Korupsi',
      courtOrganizationId: 'pn-tanjungpinang',
      prosecutionOrganizationId: 'kejari-tanjungpinang',
      dataSource: 'MANUAL',
      createdBy: 'clerk-demo',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rowVersion: 1
    }
  ];
  readonly hearings: HearingRecord[] = [
    {
      id: 'hearing-demo-001',
      caseId: 'case-demo-001',
      caseNumber: '125/Pid.Sus/2026/PN Tpg',
      type: 'PEMERIKSAAN_SAKSI',
      state: 'DRAFT',
      hearingSequence: 1,
      intakeStatus: 'ACTIVE',
      dataSource: 'MANUAL',
      caseTitle: 'Perkara Narkotika',
      courtOrganizationId: 'pn-tanjungpinang',
      prosecutionOrganizationId: 'kejari-tanjungpinang',
      correctionsOrganizationId: 'rutan-tanjungpinang',
      rowVersion: 1
    },
    {
      id: 'hearing-demo-002',
      caseId: 'case-demo-002',
      caseNumber: '295/Pid.B/2026/PN Btm',
      type: 'PEMERIKSAAN_SAKSI',
      state: 'DRAFT',
      hearingSequence: 1,
      intakeStatus: 'ACTIVE',
      dataSource: 'MANUAL',
      caseTitle: 'Perkara Penipuan',
      courtOrganizationId: 'pn-batam',
      prosecutionOrganizationId: 'kejari-batam',
      correctionsOrganizationId: 'rutan-batam',
      rowVersion: 1
    },
    {
      id: 'hearing-demo-003',
      caseId: 'case-demo-003',
      caseNumber: '5/Pid.Sus-TPK/2026/PN Tpg',
      type: 'PEMERIKSAAN_SAKSI',
      state: 'DRAFT',
      hearingSequence: 1,
      intakeStatus: 'ACTIVE',
      dataSource: 'MANUAL',
      caseTitle: 'Perkara Tindak Pidana Korupsi',
      courtOrganizationId: 'pn-tanjungpinang',
      prosecutionOrganizationId: 'kejari-tanjungpinang',
      correctionsOrganizationId: 'rutan-tanjungpinang',
      rowVersion: 1
    }
  ];
  readonly organizations: OrganizationRecord[] = [
    {
      id: 'pn-tanjungpinang',
      name: 'Pengadilan Negeri Tanjungpinang',
      type: 'COURT',
      courtCode: 'PN Tpg'
    },
    { id: 'pn-batam', name: 'Pengadilan Negeri Batam', type: 'COURT', courtCode: 'PN Btm' },
    {
      id: 'pn-karimun',
      name: 'Pengadilan Negeri Tanjung Balai Karimun',
      type: 'COURT',
      courtCode: 'PN Tbk'
    },
    { id: 'pn-natuna', name: 'Pengadilan Negeri Natuna', type: 'COURT', courtCode: 'PN Ntn' },
    { id: 'prosecution-demo', name: 'Kejaksaan Negeri Demo', type: 'PROSECUTION' },
    { id: 'corrections-demo', name: 'Rutan Demo', type: 'CORRECTIONS' },
    { id: 'kejati-kepri', name: 'Kejaksaan Tinggi Kepulauan Riau', type: 'PROSECUTION' },
    { id: 'kejari-tanjungpinang', name: 'Kejaksaan Negeri Tanjungpinang', type: 'PROSECUTION' },
    { id: 'kejari-batam', name: 'Kejaksaan Negeri Batam', type: 'PROSECUTION' },
    { id: 'kejari-bintan', name: 'Kejaksaan Negeri Bintan', type: 'PROSECUTION' },
    { id: 'kejari-lingga', name: 'Kejaksaan Negeri Lingga', type: 'PROSECUTION' },
    { id: 'kejari-karimun', name: 'Kejaksaan Negeri Karimun', type: 'PROSECUTION' },
    { id: 'kejari-natuna', name: 'Kejaksaan Negeri Natuna', type: 'PROSECUTION' },
    { id: 'kejari-anambas', name: 'Kejaksaan Negeri Kepulauan Anambas', type: 'PROSECUTION' },
    { id: 'cabjari-moro', name: 'Cabang Kejaksaan Negeri Karimun di Moro', type: 'PROSECUTION' },
    {
      id: 'cabjari-tanjungbatu',
      name: 'Cabang Kejaksaan Negeri Karimun di Tanjungbatu',
      type: 'PROSECUTION'
    },
    { id: 'lapas-batam', name: 'Lapas Kelas IIA Batam', type: 'CORRECTIONS' },
    { id: 'lapas-tanjungpinang', name: 'Lapas Kelas IIA Tanjungpinang', type: 'CORRECTIONS' },
    { id: 'lapas-perempuan-batam', name: 'Lapas Perempuan Kelas IIB Batam', type: 'CORRECTIONS' },
    {
      id: 'lapas-narkotika-tanjungpinang',
      name: 'Lapas Narkotika Kelas IIA Tanjungpinang',
      type: 'CORRECTIONS'
    },
    { id: 'lapas-dabo-singkep', name: 'Lapas Kelas III Dabo Singkep', type: 'CORRECTIONS' },
    { id: 'lpka-batam', name: 'LPKA Kelas II Batam', type: 'CORRECTIONS' },
    { id: 'rutan-tanjungpinang', name: 'Rutan Kelas I Tanjungpinang', type: 'CORRECTIONS' },
    { id: 'rutan-batam', name: 'Rutan Kelas IIA Batam', type: 'CORRECTIONS' },
    { id: 'rutan-karimun', name: 'Rutan Kelas IIB Tanjung Balai Karimun', type: 'CORRECTIONS' }
  ];
  readonly hearingAssignments: HearingAssignmentRecord[] = [
    { hearingId: 'hearing-demo-001', organizationId: 'court-demo' },
    { hearingId: 'hearing-demo-001', organizationId: 'prosecution-demo' },
    { hearingId: 'hearing-demo-001', organizationId: 'corrections-demo' }
  ];
  hearingAgendaItems: HearingAgendaItemRecord[] = [];
  readonly determinations: Determination[] = [];
  readonly proposals: ScheduleProposal[] = [];
  readonly conflicts = new Map<string, ScheduleConflict[]>();
  readonly schedules: ActiveSchedule[] = [];
  readonly requests: Array<Record<string, unknown>> = [];
  readonly auditEvents: AuditEventRecord[] = [];
  readonly notices: OfficialNoticeRecord[] = [];
  readonly noticeRecipients: NoticeRecipientRecord[] = [];
  readonly deliveryAttempts: DeliveryAttemptRecord[] = [];
  readonly acknowledgments: AcknowledgmentRecord[] = [];
  readonly identityVerifications: IdentityVerificationRecord[] = [];
  readonly roomInspections: RoomInspectionRecord[] = [];
  readonly readinessSubmissions: ReadinessSubmissionRecord[] = [];
  readonly readinessItems: ReadinessItemRecord[] = [];
  readonly technicalTests: TechnicalTestRecord[] = [];
  readonly virtualSessions: VirtualSessionRecord[] = [];
  readonly virtualRooms: VirtualRoomRecord[] = [];
  readonly hearingRuntimes: HearingRuntimeRecord[] = [];
  readonly hearingControlEvents: HearingControlEventRecord[] = [];

  readonly participants: ParticipantRecord[] = [];
  readonly participantTokens: ParticipantTokenRecord[] = [];
  readonly participantSessions: ParticipantSessionRecord[] = [];
  readonly attendanceEvents: AttendanceEventRecord[] = [];
  readonly consultations: ConsultationRecord[] = [];
  readonly incidents: IncidentRecord[] = [];
  readonly incidentActions: IncidentActionRecord[] = [];
  readonly hearingIntakeParties: HearingIntakePartyRecord[] = [
    {
      id: 'party-demo-001',
      hearingId: 'hearing-demo-001',
      partyType: 'DEFENDANT',
      displayName: 'Terdakwa Demo',
      protectedIdentity: false,
      custodyStatus: 'DETAINED_RUTAN',
      detentionOrganizationId: 'corrections-demo',
      createdBy: 'clerk-demo',
      createdAt: new Date().toISOString()
    }
  ];
  readonly hearingDataRevisions: HearingDataRevisionRecord[] = [];
  readonly hearingUserAssignments: HearingUserAssignmentRecord[] = [
    {
      hearingId: 'hearing-demo-001',
      userId: 'clerk-demo',
      assignmentRole: 'CREATOR',
      active: true,
      createdAt: new Date().toISOString()
    }
  ];
  readonly hearingImportSources: HearingImportSourceRecord[] = [
    {
      id: 'source-future-official-db',
      code: 'OFFICIAL_CASE_DB',
      name: 'Database Perkara Resmi',
      sourceType: 'DATABASE',
      enabled: false,
      status: 'DISABLED'
    }
  ];
  readonly hearingImportJobs: HearingImportJobRecord[] = [];

  readonly legalHolds: LegalHoldMemoryRecord[] = [];
  readonly retentionPolicies: RetentionPolicyMemoryRecord[] = [
    {
      id: 'retention-policy-review-only',
      policyCode: 'CIMS_HEARING_REVIEW_ONLY',
      objectType: 'HEARING',
      dispositionAction: 'REVIEW_ONLY',
      enabled: false,
      requiresApproval: true
    }
  ];
  readonly retentionPreviews: RetentionPreviewMemoryRecord[] = [];
  readonly evidenceExports: EvidenceExportMemoryRecord[] = [];
  readonly accessReviewCampaigns: AccessReviewCampaignMemoryRecord[] = [];
  readonly productionReadinessSnapshots: ProductionReadinessSnapshotMemoryRecord[] = [];

  id(): string {
    return randomUUID();
  }
}
