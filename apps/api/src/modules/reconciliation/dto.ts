import { IsOptional, IsString } from 'class-validator';

export class RequestReconciliationDto {
  @IsOptional() @IsString() source_system?: string;
}
