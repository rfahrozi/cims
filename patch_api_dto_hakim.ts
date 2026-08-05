import fs from 'fs';

const filePath = 'apps/api/src/modules/hearing-intake/dto.ts';
let content = fs.readFileSync(filePath, 'utf8');

const importOld = `const caseClassifications = ['GENERAL_CRIMINAL', 'SPECIAL_CRIMINAL'] as const;`;
const importNew = `const caseClassifications = ['GENERAL_CRIMINAL', 'SPECIAL_CRIMINAL'] as const;
const judgeRoles = ['HAKIM_KETUA', 'HAKIM_ANGGOTA'] as const;`;

content = content.replace(importOld, importNew);

const initialDefDto = `export class InitialDefendantDto {
  @IsString() @MinLength(2) @MaxLength(200) display_name!: string;
  @IsOptional() @IsString() @MaxLength(100) alias?: string;
  @IsBoolean() protected_identity = false;
  @IsEnum(defendantCustodyStatuses) custody_status!: (typeof defendantCustodyStatuses)[number];
  @IsOptional() @IsString() detention_organization_id?: string;
}`;

const judgeAssignmentDto = `export class JudgeAssignmentDto {
  @IsString() @MinLength(1) user_id!: string;
  @IsEnum(judgeRoles) role!: typeof judgeRoles[number];
}`;

content = content.replace(initialDefDto, initialDefDto + '\n\n' + judgeAssignmentDto);

const defendantsOld = `  @Type(() => InitialDefendantDto)
  defendants!: InitialDefendantDto[];
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;`;

const defendantsNew = `  @Type(() => InitialDefendantDto)
  defendants!: InitialDefendantDto[];
  
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JudgeAssignmentDto)
  judges?: JudgeAssignmentDto[];
  
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;`;

content = content.replace(defendantsOld, defendantsNew);

fs.writeFileSync(filePath, content);
