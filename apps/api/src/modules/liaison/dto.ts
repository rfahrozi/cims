import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  MinLength
} from 'class-validator';

// ── Organization unit ─────────────────────────────────────────────────────────
export class CreateOrganizationUnitDto {
  @IsString() organization_id!: string;
  @IsString() @MinLength(2) unit_code!: string;
  @IsString() @MinLength(2) unit_name!: string;
  @IsIn(['COURT_DIVISION', 'PROSECUTION_SECTION', 'CORRECTIONS_FACILITY', 'OTHER'])
  unit_type!: 'COURT_DIVISION' | 'PROSECUTION_SECTION' | 'CORRECTIONS_FACILITY' | 'OTHER';
  @IsOptional() @IsString() jurisdiction_area?: string;
}

// ── Liaison officer ───────────────────────────────────────────────────────────
export class CreateLiaisonOfficerDto {
  @IsString() user_id!: string;
  @IsString() @MinLength(2) user_name!: string;
  @IsString() organization_id!: string;
  @IsOptional() @IsString() organization_unit_id?: string;
  @IsISO8601() appointed_from!: string;
  @IsOptional() @IsISO8601() appointed_until?: string;
  @IsString() @MinLength(3) appointment_reference!: string;
  @IsOptional() @IsEmail() contact_email?: string;
  @IsOptional() @IsString() contact_phone?: string;
}

export class DeactivateLiaisonOfficerDto {
  @IsString() @MinLength(5) reason!: string;
}

// ── Delegation ────────────────────────────────────────────────────────────────
export class CreateDelegationDto {
  @IsString() delegate_user_id!: string;
  @IsString() @MinLength(2) delegate_name!: string;
  @IsString() organization_id!: string;
  @IsIn(['LIAISON_COORDINATION', 'NOTICE_FORWARDING', 'ESCALATION_ONLY'])
  scope!: 'LIAISON_COORDINATION' | 'NOTICE_FORWARDING' | 'ESCALATION_ONLY';
  @IsISO8601() valid_from!: string;
  @IsISO8601() valid_until!: string;
  @IsString() @MinLength(10) delegation_reason!: string;
  @IsString() @MinLength(3) official_reference!: string;
}

export class RevokeDelegationDto {
  @IsString() @MinLength(5) reason!: string;
}

// ── Escalation ────────────────────────────────────────────────────────────────
export class CreateEscalationDto {
  @IsOptional() @IsString() hearing_id?: string;
  @IsString() liaison_officer_id!: string;
  @IsIn([
    'NOTICE_NO_ACK',
    'READINESS_DELAYED',
    'INCIDENT_UNRESOLVED',
    'SCHEDULE_CONFLICT',
    'DEFENDANT_TRANSFER',
    'OTHER'
  ])
  escalation_type!: string;
  @IsString() @MinLength(10) description!: string;
  @IsString() escalated_to!: string;
  @IsString() @MinLength(2) escalated_to_name!: string;
}

export class ResolveEscalationDto {
  @IsString() @MinLength(5) resolution_notes!: string;
}
