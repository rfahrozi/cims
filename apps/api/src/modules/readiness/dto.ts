import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';

export class IdentityVerificationDto {
  @IsString() participant_reference!: string;
  @IsOptional() @IsString() participant_role?: string;
  @IsString() method!: string;
  @IsEnum(['PASS', 'FAIL']) result!: 'PASS' | 'FAIL';
  @IsOptional() @IsString() location_code?: string;
  @IsOptional() @IsString() supervisor_officer_id?: string;
  @IsOptional() @IsString() supervisor_officer_name?: string;
  @IsOptional() @IsString() notes?: string;
}

export class RoomInspectionDto {
  @IsString() location_code!: string;
  @IsBoolean() camera_full_view!: boolean;
  @IsBoolean() unauthorized_person_absent!: boolean;
  @IsBoolean() confidentiality_ready!: boolean;
  @IsOptional() @IsString() notes?: string;
}

export class ReadinessItemDto {
  @IsString() item_code!: string;
  @IsOptional() @IsBoolean() required?: boolean;
  @IsEnum(['PASS', 'FAIL', 'NA']) result!: 'PASS' | 'FAIL' | 'NA';
  @IsOptional() @IsString() notes?: string;
}

export class TechnicalTestDto {
  @IsEnum(['PASS', 'FAIL', 'NA']) camera!: 'PASS' | 'FAIL' | 'NA';
  @IsEnum(['PASS', 'FAIL', 'NA']) microphone!: 'PASS' | 'FAIL' | 'NA';
  @IsEnum(['PASS', 'FAIL', 'NA']) audio!: 'PASS' | 'FAIL' | 'NA';
  @IsEnum(['PASS', 'FAIL', 'NA']) primary_network!: 'PASS' | 'FAIL' | 'NA';
  @IsEnum(['PASS', 'FAIL', 'NA']) backup_network!: 'PASS' | 'FAIL' | 'NA';
  @IsEnum(['PASS', 'FAIL', 'NA']) provider_access!: 'PASS' | 'FAIL' | 'NA';
}

export class SubmitReadinessDto {
  @IsString() location_code!: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => ReadinessItemDto) items!: ReadinessItemDto[];
  @ValidateNested() @Type(() => TechnicalTestDto) technical_test!: TechnicalTestDto;
}
