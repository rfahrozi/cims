import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class HearingActionDto {
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsInt() @Min(1) expected_row_version?: number;
}

export class SuspendHearingDto {
  @IsString() @MinLength(5) reason!: string;
  @IsOptional() @IsInt() @Min(1) expected_row_version?: number;
}
