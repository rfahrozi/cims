import { IsEnum, IsIn, IsISO8601, IsOptional, IsString, MinLength } from 'class-validator';
import type {
  AppealAttendanceMode,
  AppealAttendanceStatus,
  AppealDeliveryMode,
  AppealNoticeStepCode,
  AppealNoticeStepStatus,
  AppealPartyRole,
} from '@cims/domain';

// ── Create reading ──────────────────────────────────────────────────────────
export class CreateAppealReadingDto {
  @IsString() hearing_id!: string;
  @IsISO8601() scheduled_at!: string;
  @IsOptional() @IsString() display_timezone?: string;
  @IsIn(['LANGSUNG', 'ELEKTRONIK', 'HYBRID']) delivery_mode!: AppealDeliveryMode;
  @IsString() @MinLength(3) determination_reference!: string;
  @IsOptional() @IsString() virtual_session_reference?: string;
  @IsOptional() @IsString() open_to_public?: boolean;
}

// ── Reschedule (perubahan tanggal) ──────────────────────────────────────────
export class RescheduleAppealReadingDto {
  @IsISO8601() scheduled_at!: string;
  @IsIn(['LANGSUNG', 'ELEKTRONIK', 'HYBRID']) delivery_mode!: AppealDeliveryMode;
  @IsString() @MinLength(10) reschedule_reason!: string;
  @IsOptional() @IsString() determination_reference?: string;
  @IsOptional() @IsString() virtual_session_reference?: string;
}

// ── Mark as read (pembacaan selesai) ────────────────────────────────────────
export class MarkReadDto {
  @IsISO8601() read_at!: string;
  @IsOptional() @IsISO8601() cassation_deadline_at?: string;
}

// ── Notice step ─────────────────────────────────────────────────────────────
export class CreateNoticeStepDto {
  @IsIn(['PT_TO_PROSECUTION', 'PROSECUTION_TO_CORRECTIONS', 'CORRECTIONS_TO_DEFENDANT', 'PROSECUTION_TO_ADVOCATE'])
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
  @IsIn(['DEFENDANT', 'ADVOCATE', 'PROSECUTOR', 'CORRECTIONS_OFFICER']) party_role!: AppealPartyRole;
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
