import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested
} from 'class-validator';

const caseClassifications = ['GENERAL_CRIMINAL', 'SPECIAL_CRIMINAL'] as const;
const judgeRoles = ['HAKIM_KETUA', 'HAKIM_ANGGOTA'] as const;
const custodyStatuses = ['DETAINED', 'NOT_DETAINED', 'MIXED', 'UNKNOWN'] as const;
const defendantCustodyStatuses = ['DETAINED', 'NOT_DETAINED', 'UNKNOWN'] as const;

export class InitialDefendantDto {
  @IsString() @MinLength(2) @MaxLength(200) display_name!: string;
  @IsOptional() @IsString() @MaxLength(100) alias?: string;
  @IsBoolean() protected_identity = false;
  @IsEnum(defendantCustodyStatuses) custody_status!: (typeof defendantCustodyStatuses)[number];
  @IsOptional() @IsString() detention_organization_id?: string;
}

export class JudgeAssignmentDto {
  @IsString() @MinLength(1) user_id!: string;
  @IsEnum(judgeRoles) role!: (typeof judgeRoles)[number];
}

export class ManualHearingDto {
  @IsString() @MinLength(5) @MaxLength(150) case_number!: string;
  @IsOptional() @IsString() @MaxLength(150) official_case_reference?: string;
  @IsEnum(caseClassifications) case_classification!: (typeof caseClassifications)[number];
  @IsString() @MinLength(2) @MaxLength(50) case_type_code!: string;
  @IsString() @MinLength(3) @MaxLength(300) case_title!: string;
  @IsString() @MinLength(3) @MaxLength(100) hearing_type!: string;
  @IsInt() @Min(1) @Max(999) hearing_sequence!: number;
  @IsString() court_organization_id!: string;
  @IsString() prosecution_organization_id!: string;
  @IsOptional() @IsString() corrections_organization_id?: string;
  @IsEnum(custodyStatuses) defendant_custody_status!: (typeof custodyStatuses)[number];
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InitialDefendantDto)
  defendants!: InitialDefendantDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JudgeAssignmentDto)
  judges?: JudgeAssignmentDto[];

  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class UpdateManualHearingDto extends ManualHearingDto {
  @IsInt() @Min(1) expected_row_version!: number;
}

export class ReturnManualHearingDto {
  @IsString() @MinLength(5) @MaxLength(1000) reason!: string;
}

export class ImportJobRequestDto {
  @IsString() source_code!: string;
  @IsString() @MinLength(3) case_number!: string;
}
