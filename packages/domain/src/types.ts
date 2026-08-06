export type Decision = 'APPROVED' | 'REJECTED';
export type ProposalStatus = 'DRAFT' | 'CHECKED' | 'APPROVED';
export type ScheduleStatus = 'ACTIVE' | 'SUPERSEDED';
export type SessionMode = 'ONLINE' | 'OFFLINE' | 'HYBRID';
export type GateCode =
  | 'HEARING_DATA'
  | 'JUDICIAL_DETERMINATION'
  | 'SCHEDULING'
  | 'OFFICIAL_NOTICE'
  | 'READINESS'
  | 'VIRTUAL_SESSION'
  | 'HEARING_CONTROL'
  | 'AUDIT_AND_CLOSURE';

export interface Determination {
  id: string;
  hearingId: string;
  decision: Decision;
  /** Mode persidangan yang ditetapkan hakim — wajib eksplisit per SOP 10.2 */
  hearingMode?: HearingMode;
  officialReference: string;
  reason: string;
  createdAt: string;
}

export interface ScheduleResource {
  resourceType: 'JUDGE' | 'ROOM' | 'PROSECUTOR' | 'CORRECTIONS';
  resourceId: string;
  requirement: 'REQUIRED' | 'PREFERRED';
}

export interface ScheduleProposal {
  id: string;
  hearingId: string;
  startAt: string;
  endAt: string;
  displayTimezone: string;
  resources: ScheduleResource[];
  status: ProposalStatus;
}

export interface ActiveSchedule {
  id: string;
  hearingId: string;
  startAt: string;
  endAt: string;
  version: number;
  status: ScheduleStatus;
  resources: ScheduleResource[];
}

export interface ScheduleConflict {
  code: string;
  severity: 'REQUIRED' | 'WARNING';
  message: string;
  resourceType?: string;
  resourceId?: string;
}

export type NoticeStatus = 'DRAFT' | 'SENT' | 'PARTIAL' | 'FAILED' | 'ACKNOWLEDGED' | 'CANCELLED';
export type NoticeRecipientStatus = 'PENDING' | 'DELIVERED' | 'FAILED' | 'ACKNOWLEDGED';
export type NoticeChannel = 'EMAIL' | 'WHATSAPP' | 'SMS' | 'IN_APP';

/**
 * Jenis pemberitahuan resmi sesuai SOP/CIMS/PPE/001/2026 Bagian 10.5.
 * Digunakan untuk membedakan rantai pemberitahuan dan kewajiban acknowledgment.
 */
export type NoticeType =
  | 'AGENDA_SIDANG' // Pemberitahuan jadwal dan agenda sidang
  | 'PERUBAHAN_JADWAL' // Perubahan jadwal setelah jadwal aktif di-supersede
  | 'PEMBACAAN_PUTUSAN_BANDING' // Pemberitahuan pembacaan putusan tingkat banding (wajib mulai 1 Agu 2026)
  | 'PERMOHONAN_ELEKTRONIK' // Pemberitahuan permohonan persidangan elektronik
  | 'PEMBERITAHUAN_GANGGUAN' // Notifikasi gangguan teknis atau insiden
  | 'PEMBERITAHUAN_UMUM'; // Pemberitahuan umum lainnya

export const NOTICE_TYPES: readonly NoticeType[] = [
  'AGENDA_SIDANG',
  'PERUBAHAN_JADWAL',
  'PEMBACAAN_PUTUSAN_BANDING',
  'PERMOHONAN_ELEKTRONIK',
  'PEMBERITAHUAN_GANGGUAN',
  'PEMBERITAHUAN_UMUM'
] as const;

/**
 * Mode persidangan sesuai SOP/CIMS/PPE/001/2026 Bagian 10.2.
 * Wajib dicatat secara eksplisit dalam penetapan hakim.
 */
export type HearingMode = 'LANGSUNG' | 'ELEKTRONIK' | 'HYBRID';

export interface NoticeGateInput {
  scheduleStartAt: string;
  notices: Array<{ id: string; status: NoticeStatus; type?: NoticeType }>;
  recipients: Array<{
    noticeId: string;
    organizationType?: OrganizationType;
    requiredAck: boolean;
    status: NoticeRecipientStatus;
    deliveredAt?: string;
  }>;
}

export interface NoticeGateResult {
  noticeCount: number;
  requiredAcknowledgmentCount: number;
  acknowledgedCount: number;
  ready: boolean;
}

export type OrganizationType = 'COURT' | 'PROSECUTION' | 'CORRECTIONS';
export type ReadinessStatus = 'READY' | 'NOT_READY';

export interface ReadinessGateInput {
  scheduleStartAt: string;
  requiredOrganizationTypes: OrganizationType[];
  submissions: Array<{
    organizationType: OrganizationType;
    version: number;
    status: ReadinessStatus;
  }>;
}

export interface ReadinessGateResult {
  requiredOrganizationTypes: OrganizationType[];
  organizations: Array<{
    organizationType: OrganizationType;
    status: ReadinessStatus | 'MISSING' | 'AUTO_FORCED';
    version?: number;
    warningMessage?: string;
  }>;
  ready: boolean;
}

export type HearingRuntimeState =
  | 'NOT_READY'
  | 'READY'
  | 'STARTED'
  | 'SUSPENDED'
  | 'ENDED'
  | 'POSTPONED'
  | 'DOCUMENTATION_PENDING';
export type HearingAction =
  | 'START'
  | 'SUSPEND'
  | 'RESUME'
  | 'END'
  | 'POSTPONE'
  | 'FLAG_DOCUMENTATION'
  | 'COMPLETE_DOCUMENTATION';

export type AgendaItemStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';

export interface HearingAgendaItem {
  id: string;
  hearingId: string;
  sequenceNumber: number;
  itemType: string;
  itemDescription: string;
  estimatedDurationMinutes: number;
  status: AgendaItemStatus;
}

// =============================================================================
// Appeal Decision Reading — SOP 10.15 (berlaku 1 Agustus 2026)
// =============================================================================

export type AppealReadingStatus = 'SCHEDULED' | 'SUPERSEDED' | 'READ' | 'POSTPONED' | 'CANCELLED';
export type AppealDeliveryMode = 'LANGSUNG' | 'ELEKTRONIK' | 'HYBRID';
export type AppealNoticeStepCode =
  | 'PT_TO_PROSECUTION'
  | 'PROSECUTION_TO_CORRECTIONS'
  | 'CORRECTIONS_TO_DEFENDANT'
  | 'PROSECUTION_TO_ADVOCATE';
export type AppealNoticeStepStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'ACKNOWLEDGED' | 'FAILED';
export type AppealPartyRole = 'DEFENDANT' | 'ADVOCATE' | 'PROSECUTOR' | 'CORRECTIONS_OFFICER';
export type AppealAttendanceStatus = 'PRESENT' | 'ABSENT' | 'EXCUSED';
export type AppealAttendanceMode = 'LANGSUNG' | 'ELEKTRONIK' | 'NOT_APPLICABLE';

export interface AppealDecisionReading {
  id: string;
  hearingId: string;
  version: number;
  scheduledAt: string;
  displayTimezone: string;
  deliveryMode: AppealDeliveryMode;
  determinationReference: string;
  virtualSessionReference?: string;
  status: AppealReadingStatus;
  rescheduleReason?: string;
  readAt?: string;
  openToPublic: boolean;
  cassationDeadlineAt?: string;
  cassationDeadlineNote?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  rowVersion: number;
  // Kolom tambahan untuk generate Surat Penetapan (SEMA No. 2/2026)
  zoomJoinUrl?: string;
  zoomPassword?: string;
  courtName?: string;
  penetapanCity?: string;
  penetapanNumber?: string;
  hakimKetua?: string;
  hakimAnggota?: string[];
  paniterapengganti?: string;
  penuntutUmum?: string;
  deliberationDate?: string;
}

export interface AppealNoticeStep {
  id: string;
  readingId: string;
  stepCode: AppealNoticeStepCode;
  senderOrganizationId: string;
  recipientReference: string;
  recipientName: string;
  channel: string;
  officialReference: string;
  status: AppealNoticeStepStatus;
  sentAt?: string;
  deliveredAt?: string;
  acknowledgedAt?: string;
  receiptReference?: string;
  createdBy: string;
  createdAt: string;
  // Kolom tambahan untuk upload PDF Penetapan Bertanda Tangan
  documentStorageKey?: string;
  documentHash?: string;
  documentFilename?: string;
  documentSizeBytes?: number;
  documentContentType?: string;
  documentUploadedAt?: string;
  documentUploadedBy?: string;
}

export interface AppealPresenceRecord {
  id: string;
  readingId: string;
  partyRole: AppealPartyRole;
  partyReference: string;
  partyName: string;
  attendanceStatus: AppealAttendanceStatus;
  attendanceMode: AppealAttendanceMode;
  notes?: string;
  verifiedBy: string;
  verifiedAt: string;
}

export interface AppealPublication {
  id: string;
  readingId: string;
  excerptReference: string;
  sourceSystemCode: string;
  documentHash?: string;
  publishedAt: string;
  sameDayCompliant: boolean;
  publishedBy: string;
  notes?: string;
  createdAt: string;
}

export interface AppealTransmission {
  id: string;
  readingId: string;
  destinationCourtId?: string;
  destinationCourtName: string;
  transmissionReference: string;
  transmittedAt: string;
  sevenDayCompliant: boolean;
  documentHash?: string;
  transmittedBy: string;
  notes?: string;
  createdAt: string;
}

/**
 * Hitung kepatuhan "hari yang sama" untuk petikan putusan (SOP 10.15 poin 8).
 * readAt dan publishedAt harus pada tanggal kalender yang sama di timezone lokal.
 */
export function isAppealSameDayCompliant(
  readAt: string,
  publishedAt: string,
  timezone = 'Asia/Jakarta'
): boolean {
  const fmt = new Intl.DateTimeFormat('id-ID', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return fmt.format(new Date(readAt)) === fmt.format(new Date(publishedAt));
}

/**
 * Hitung kepatuhan "7 hari" untuk transmisi berkas ke PT1 (SOP 10.15 poin 9).
 * transmittedAt harus dalam 7 hari kalender setelah readAt.
 */
export function isAppealSevenDayCompliant(readAt: string, transmittedAt: string): boolean {
  const diffMs = new Date(transmittedAt).getTime() - new Date(readAt).getTime();
  return diffMs >= 0 && diffMs <= 7 * 24 * 60 * 60 * 1000;
}

/**
 * Hitung tanggal tenggat kasasi 14 hari (SOP 10.15 poin 10).
 * Dikembalikan sebagai referensi — panitera tetap yang menghitung secara resmi.
 */
export function cassationDeadline(readAt: string): string {
  return new Date(new Date(readAt).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
}
