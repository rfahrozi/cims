
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
export class CreateIncidentDto {
  @IsEnum(['TECHNICAL','CYBER','FORCE_MAJEURE']) type!: 'TECHNICAL'|'CYBER'|'FORCE_MAJEURE';
  @IsEnum(['LOW','MEDIUM','HIGH','CRITICAL']) severity!: 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL';
  @IsString() @MinLength(3) title!: string;
  @IsString() @MinLength(5) description!: string;
  @IsOptional() @IsString() occurredAt?: string;
}
export class IncidentActionDto { @IsEnum(['START_MITIGATION','RESOLVE','CLOSE','REOPEN']) action!: 'START_MITIGATION'|'RESOLVE'|'CLOSE'|'REOPEN'; @IsOptional() @IsString() notes?: string; }
export class NotifyIncidentDto { @IsString() notificationReference!: string; }
