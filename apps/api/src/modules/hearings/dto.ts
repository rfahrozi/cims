import { IsArray, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AgendaItemDto {
  @IsString() itemType!: string;
  @IsString() itemDescription!: string;
  @IsOptional() @IsInt() @Min(1) estimatedDurationMinutes?: number;
}

export class SaveAgendaDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AgendaItemDto)
  items!: AgendaItemDto[];
}
