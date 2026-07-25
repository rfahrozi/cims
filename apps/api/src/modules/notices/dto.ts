import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsISO8601, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { NOTICE_TYPES, type NoticeType } from '@cims/domain';

export class NoticeRecipientDto {
  @IsOptional() @IsString() recipient_user_id?: string;
  @IsOptional() @IsString() recipient_organization_id?: string;
  @IsString() @MinLength(2) name!: string;
  @IsString() @MinLength(3) destination!: string;
  @IsEnum(['EMAIL', 'WHATSAPP', 'SMS', 'IN_APP']) channel!: 'EMAIL' | 'WHATSAPP' | 'SMS' | 'IN_APP';
  @IsOptional() @IsBoolean() required_ack?: boolean;
  @IsOptional() @IsISO8601() ack_deadline?: string;
}

export class CreateNoticeDto {
  /**
   * Jenis pemberitahuan resmi sesuai SOP 10.5.
   * Nilai yang diizinkan: AGENDA_SIDANG, PERUBAHAN_JADWAL, PEMBACAAN_PUTUSAN_BANDING,
   * PERMOHONAN_ELEKTRONIK, PEMBERITAHUAN_GANGGUAN, PEMBERITAHUAN_UMUM
   */
  @IsEnum(NOTICE_TYPES) notice_type!: NoticeType;
  @IsString() @MinLength(3) subject!: string;
  @IsString() @MinLength(10) message!: string;
  @IsString() official_reference!: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => NoticeRecipientDto) recipients!: NoticeRecipientDto[];
}

export class AcknowledgeNoticeDto {
  @IsOptional() @IsString() recipient_id?: string;
  @IsOptional() @IsString() method?: string;
  @IsString() receipt_reference!: string;
}
