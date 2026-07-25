import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsISO8601, IsOptional, IsString, Min, MinLength, ValidateNested } from 'class-validator';

class ResourceDto {
  @IsIn(['JUDGE', 'ROOM', 'PROSECUTOR', 'CORRECTIONS']) resource_type!: 'JUDGE' | 'ROOM' | 'PROSECUTOR' | 'CORRECTIONS';
  @IsString() resource_id!: string;
  @IsIn(['REQUIRED', 'PREFERRED']) requirement!: 'REQUIRED' | 'PREFERRED';
}

export class CreateProposalDto {
  @IsISO8601() start_at!: string;
  @IsISO8601() end_at!: string;
  @IsString() display_timezone!: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => ResourceDto) resources!: ResourceDto[];
}

export class CheckProposalDto {
  @IsOptional() @IsInt() @Min(1) expected_row_version?: number;
}

export class ApproveProposalDto {
  @IsString() @MinLength(3) reason!: string;
  /**
   * Alasan perubahan jadwal (wajib jika ini adalah jadwal pengganti / supersede).
   * SOP 10.3: perubahan jadwal wajib memuat alasan dan memicu pemberitahuan ulang.
   */
  @IsOptional() @IsString() @MinLength(5) change_reason?: string;
  @IsOptional() @IsInt() @Min(1) expected_row_version?: number;
}

