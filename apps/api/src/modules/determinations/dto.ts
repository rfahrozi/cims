import { IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateRequestDto {
  @IsString() @IsNotEmpty() hearing_id!: string;
  @IsIn(['ELECTRONIC', 'HYBRID']) requested_mode!: 'ELECTRONIC' | 'HYBRID';
  @IsString() @MinLength(10) reason!: string;
}

export class CreateDeterminationDto {
  @IsString() hearing_id!: string;
  @IsIn(['APPROVED', 'REJECTED']) decision!: 'APPROVED' | 'REJECTED';
  /**
   * Mode persidangan yang ditetapkan hakim — wajib eksplisit per SOP 10.2.
   * Nilai: LANGSUNG | ELEKTRONIK | HYBRID
   */
  @IsOptional() @IsIn(['LANGSUNG', 'ELEKTRONIK', 'HYBRID']) hearing_mode?:
    'LANGSUNG' | 'ELEKTRONIK' | 'HYBRID';
  @IsString() @MinLength(3) official_reference!: string;
  @IsString() @MinLength(10) reason!: string;
}
