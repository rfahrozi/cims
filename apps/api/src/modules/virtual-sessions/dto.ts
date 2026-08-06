import { IsEnum, IsOptional, IsBoolean } from 'class-validator';
export class ProvisionVirtualSessionDto {
  @IsOptional() @IsEnum(['DISABLED', 'COURT_CONTROLLED']) recording_policy?:
    | 'DISABLED'
    | 'COURT_CONTROLLED';

  @IsOptional() @IsBoolean() bypass_readiness?: boolean;
}
