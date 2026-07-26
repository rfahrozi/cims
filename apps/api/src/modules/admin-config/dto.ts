import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateTemplateDto {
  @IsOptional() @IsString() @MinLength(3) subject?: string;
  @IsOptional() @IsString() @MinLength(10) message_body?: string;
  @IsOptional() @IsBoolean() is_active?: boolean;
}

export class UpdateSlaConfigDto {
  @IsOptional() @IsInt() @Min(1) ack_deadline_hours?: number;
  @IsOptional() @IsArray() @IsInt({ each: true }) @Min(1, { each: true }) reminder_hours?: number[];
  @IsOptional() @IsBoolean() is_active?: boolean;
}
