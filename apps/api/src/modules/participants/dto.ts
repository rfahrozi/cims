import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength
} from 'class-validator';

const roles = [
  'JUDGE',
  'COURT_CLERK',
  'PROSECUTOR',
  'DEFENDANT',
  'ADVOCATE',
  'WITNESS',
  'EXPERT',
  'INTERPRETER',
  'CORRECTIONS_OFFICER',
  'IT_OPERATOR'
] as const;

export class RegisterParticipantDto {
  @IsEnum(roles) role!: (typeof roles)[number];
  @IsString() @MinLength(2) displayName!: string;
  @IsOptional() @IsString() alias?: string;
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsEmail() contactEmail?: string;
  @IsBoolean() protectedIdentity = false;
  @IsOptional() @IsString() agendaItemId?: string; // M-06: Penautan opsional ke item agenda
}

export class IssueJoinTokenDto {
  @IsOptional() @IsInt() @Min(60) @Max(3600) ttlSeconds = 900;
}
export class ExchangeJoinTokenDto {
  @IsString() token!: string;
}
export class AdmitParticipantDto {
  @IsEnum(['MAIN', 'DEFENDANT', 'WITNESS']) roomCode!: 'MAIN' | 'DEFENDANT' | 'WITNESS';
}
export class ParticipantLeaveDto {
  @IsOptional() @IsString() reason?: string;
}
export class StartConsultationDto {
  @IsString() defendantParticipantId!: string;
  @IsString() advocateParticipantId!: string;
}

export class RecordLocationDto {
  @IsIn(['COURT', 'PROSECUTION', 'CORRECTIONS', 'OTHER_COURT', 'EMBASSY', 'REMOTE'])
  location_type!: 'COURT' | 'PROSECUTION' | 'CORRECTIONS' | 'OTHER_COURT' | 'EMBASSY' | 'REMOTE';
  @IsString() @MinLength(3) location_name!: string;
  @IsOptional() @IsString() determination_reference?: string;
}
