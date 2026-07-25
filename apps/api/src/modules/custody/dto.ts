import { IsBoolean, IsIn, IsISO8601, IsOptional, IsString, MinLength } from 'class-validator';

export class RecordCustodyTransferDto {
  @IsString() hearing_id!: string;
  @IsString() defendant_reference!: string;
  @IsString() @MinLength(2) defendant_name!: string;
  @IsString() from_organization_id!: string;
  @IsString() @MinLength(2) from_organization_name!: string;
  @IsOptional() @IsString() from_location_code?: string;
  @IsString() to_organization_id!: string;
  @IsString() @MinLength(2) to_organization_name!: string;
  @IsOptional() @IsString() to_location_code?: string;
  @IsIn(['SIDANG', 'ADMINISTRATIF', 'KEAMANAN', 'KESEHATAN', 'KAHAR', 'LAINNYA'])
  transfer_reason!: string;
  @IsOptional() @IsString() transfer_reason_detail?: string;
  @IsString() @MinLength(3) official_reference!: string;
  @IsISO8601() transferred_at!: string;
  @IsOptional() @IsString() notes?: string;
}

export class SendTransferNotificationDto {
  @IsIn(['COURT', 'PROSECUTION', 'CORRECTIONS_DEST']) notified_party!: string;
  @IsOptional() @IsString() notified_org_id?: string;
  @IsString() @MinLength(2) notified_org_name!: string;
  @IsIn(['EMAIL', 'WHATSAPP', 'SMS', 'IN_APP', 'OFFICIAL']) channel!: string;
  @IsString() @MinLength(3) official_reference!: string;
  @IsOptional() @IsString() notes?: string;
}

export class AcknowledgeTransferNotificationDto {
  @IsString() @MinLength(2) acknowledged_by!: string;
}

export class TransferAccessDto {
  // Konfirmasi bahwa akses CIMS telah dialihkan ke organisasi tujuan
  @IsString() @MinLength(5) confirmation_note!: string;
}

export class UpdateChecklistStatusDto {
  @IsBoolean() new_checklist_submitted!: boolean;
  @IsBoolean() new_identity_verified!: boolean;
}
