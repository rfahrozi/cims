import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateLegalHoldDto {
  @IsIn(['LITIGATION', 'INVESTIGATION', 'AUDIT', 'COURT_ORDER', 'OTHER']) hold_type!:
    | 'LITIGATION'
    | 'INVESTIGATION'
    | 'AUDIT'
    | 'COURT_ORDER'
    | 'OTHER';
  @IsString() @MinLength(5) reason!: string;
  @IsString() @IsNotEmpty() official_reference!: string;
}

export class ReleaseLegalHoldDto {
  @IsString() @MinLength(5) reason!: string;
}
export class RetentionPreviewDto {
  @IsOptional() @IsString() policy_code?: string;
}
export class CreateEvidenceExportDto {
  @IsIn(['JSON', 'ZIP_MANIFEST']) export_format!: 'JSON' | 'ZIP_MANIFEST';
}

export class CreateAccessReviewDto {
  @IsString() @MinLength(4) campaign_name!: string;
  @IsOptional() @IsString() hearing_id?: string;
  @IsOptional() @IsString() scope_organization_id?: string;
  @IsDateString() due_at!: string;
}

export class DecideAccessReviewDto {
  @IsIn(['KEEP', 'REVOKE']) decision!: 'KEEP' | 'REVOKE';
  @IsString() @MinLength(3) reason!: string;
}
