import { IsArray, IsEnum, IsIn, IsISO8601, IsOptional, IsString, MinLength } from 'class-validator';
import type {
  AppealAttendanceMode,
  AppealAttendanceStatus,
  AppealDeliveryMode,
  AppealNoticeStepCode,
  AppealNoticeStepStatus,
  AppealPartyRole
} from '@cims/domain';

// ── Shared fields for Surat Penetapan (SEMA No. 2/2026) ─────────────────────
// These fields are used to generate the official court document (HTML renderable).
// All are optional — the endpoint will use placeholder text if not provided.
class PenetapanMajelisDto {
  /** Nama resmi Pengadilan Tinggi, contoh: "Pengadilan Tinggi Jakarta" */
  @IsOptional() @IsString() court_name?: string;

  /** Kota penetapan untuk blok "Ditetapkan di ...", default dari court_name */
  @IsOptional() @IsString() penetapan_city?: string;

  /** Nomor penetapan resmi sesuai tata naskah dinas */
  @IsOptional() @IsString() penetapan_number?: string;

  /** Nama Hakim Ketua Majelis */
  @IsOptional() @IsString() hakim_ketua?: string;

  /** Nama Hakim Anggota Majelis (biasanya 2 orang) */
  @IsOptional() @IsArray() @IsString({ each: true }) hakim_anggota?: string[];

  /** Nama Panitera Pengganti */
  @IsOptional() @IsString() panitera_pengganti?: string;

  /** Nama Penuntut Umum (Jaksa) untuk paragraf penutup */
  @IsOptional() @IsString() penuntut_umum?: string;

  /**
   * Tautan undangan persidangan elektronik (Link Zoom) — input manual.
   * Diisi jika virtual_session_reference belum ada atau tidak terhubung ke virtual session.
   * Jika virtual_session_reference ada dan sesi READY, sistem akan otomatis mengambil
   * Zoom Meeting ID dari DB dan menggunakannya.
   */
  @IsOptional() @IsString() zoom_join_url?: string;

  /** Password Zoom meeting — opsional, dimuat di amar penetapan jika diisi */
  @IsOptional() @IsString() zoom_password?: string;

  /**
   * Tanggal musyawarah Majelis (ISO 8601) — hanya untuk Template III.2.
   * Diisi jika tanggal musyawarah berbeda dari tanggal pembacaan putusan.
   */
  @IsOptional() @IsISO8601() deliberation_date?: string;
}

// ── Create reading ──────────────────────────────────────────────────────────
export class CreateAppealReadingDto extends PenetapanMajelisDto {
  @IsString() hearing_id!: string;
  @IsISO8601() scheduled_at!: string;
  @IsOptional() @IsString() display_timezone?: string;
  @IsIn(['LANGSUNG', 'ELEKTRONIK', 'HYBRID']) delivery_mode!: AppealDeliveryMode;
  @IsString() @MinLength(3) determination_reference!: string;
  @IsOptional() @IsString() virtual_session_reference?: string;
  @IsOptional() @IsString() open_to_public?: boolean;
}

// ── Reschedule (perubahan tanggal) ──────────────────────────────────────────
export class RescheduleAppealReadingDto extends PenetapanMajelisDto {
  @IsISO8601() scheduled_at!: string;
  @IsIn(['LANGSUNG', 'ELEKTRONIK', 'HYBRID']) delivery_mode!: AppealDeliveryMode;
  @IsString() @MinLength(10) reschedule_reason!: string;
  @IsOptional() @IsString() determination_reference?: string;
  @IsOptional() @IsString() virtual_session_reference?: string;
}

// ── Generate Penetapan document ─────────────────────────────────────────────
export class GeneratePenetapanDto {
  /**
   * Jenis dokumen yang akan di-generate sesuai Lampiran SEMA No. 2/2026:
   * - PEMBERITAHUAN        → Template I  (Pasal 298 ayat (1) KUHAP)
   * - PERUBAHAN_TANGGAL    → Template II (Pasal 298 ayat (3) KUHAP)
   * - PARAGRAF_PENUTUP_SAMA     → Template III.1 (musyawarah = ucapan)
   * - PARAGRAF_PENUTUP_BERBEDA  → Template III.2 (musyawarah ≠ ucapan)
   */
  @IsIn(['PEMBERITAHUAN', 'PERUBAHAN_TANGGAL', 'PARAGRAF_PENUTUP_SAMA', 'PARAGRAF_PENUTUP_BERBEDA'])
  document_type!: string;
}

// ── Mark as read (pembacaan selesai) ────────────────────────────────────────
export class MarkReadDto {
  @IsISO8601() read_at!: string;
  @IsOptional() @IsISO8601() cassation_deadline_at?: string;
}

// ── Notice step ─────────────────────────────────────────────────────────────
export class CreateNoticeStepDto {
  @IsIn([
    'PT_TO_PROSECUTION',
    'PROSECUTION_TO_CORRECTIONS',
    'CORRECTIONS_TO_DEFENDANT',
    'PROSECUTION_TO_ADVOCATE'
  ])
  step_code!: AppealNoticeStepCode;
  @IsString() sender_organization_id!: string;
  @IsString() recipient_reference!: string;
  @IsString() @MinLength(2) recipient_name!: string;
  @IsIn(['EMAIL', 'WHATSAPP', 'SMS', 'IN_APP', 'OFFICIAL']) channel!: string;
  @IsString() @MinLength(3) official_reference!: string;
}

export class AcknowledgeNoticeStepDto {
  @IsIn(['SENT', 'DELIVERED', 'ACKNOWLEDGED', 'FAILED']) status!: AppealNoticeStepStatus;
  @IsOptional() @IsString() receipt_reference?: string;
}

// ── Presence record (kehadiran) ──────────────────────────────────────────────
export class RecordPresenceDto {
  @IsIn(['DEFENDANT', 'ADVOCATE', 'PROSECUTOR', 'CORRECTIONS_OFFICER'])
  party_role!: AppealPartyRole;
  @IsString() party_reference!: string;
  @IsString() @MinLength(2) party_name!: string;
  @IsIn(['PRESENT', 'ABSENT', 'EXCUSED']) attendance_status!: AppealAttendanceStatus;
  @IsIn(['LANGSUNG', 'ELEKTRONIK', 'NOT_APPLICABLE']) attendance_mode!: AppealAttendanceMode;
  @IsOptional() @IsString() notes?: string;
}

// ── Publication (petikan hari yang sama, SOP 10.15 poin 8) ──────────────────
export class PublishExcerptDto {
  @IsString() @MinLength(3) excerpt_reference!: string;
  @IsOptional() @IsString() source_system_code?: string;
  @IsISO8601() published_at!: string;
  @IsOptional() @IsString() document_hash?: string;
  @IsOptional() @IsString() notes?: string;
}

// ── Transmission (berkas ke PT1, SOP 10.15 poin 9) ──────────────────────────
export class TransmitDto {
  @IsOptional() @IsString() destination_court_id?: string;
  @IsString() @MinLength(2) destination_court_name!: string;
  @IsString() @MinLength(3) transmission_reference!: string;
  @IsISO8601() transmitted_at!: string;
  @IsOptional() @IsString() document_hash?: string;
  @IsOptional() @IsString() notes?: string;
}
