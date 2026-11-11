import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsString, 
  IsEnum, 
  IsOptional, 
  IsArray, 
  ValidateNested, 
  IsDate,
  IsDecimal,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PostType } from '@prisma/client';
import { EvidenceDto } from './create-post.dto';

export class CreateScamReportDto {
  @ApiProperty({
    example: 'Fake Investment Scam (Required)'
  })
  @IsString()
  title: string;

  @ApiProperty({
    example: 'scam-type-123 (Required)'
  })
  @IsString()
  scamTypeId: string;

  @ApiProperty({
    example: 'I was contacted by someone claiming to be from XYZ Investments... (Required)'
  })
  @IsString()
  description: string;

  @ApiProperty({ 
    example: 'SCAM_REPORT (Required)'
  })
  @IsEnum([PostType.SCAM_REPORT], { 
    message: 'postType must be SCAM_REPORT for scam reports' 
  })
  postType: PostType = PostType.SCAM_REPORT;

  @ApiPropertyOptional({
    example: 'company-123 (Optional)'
  })
  @IsString()
  @IsOptional()
  companyId?: string;

  @ApiPropertyOptional({
    example: 'ABC Corporation (Optional)'
  })
  @IsString()
  @IsOptional()
  companyNameManual?: string;

  @ApiPropertyOptional({
    example: '1000.50 (Optional)'
  })
  @IsDecimal({ decimal_digits: '0,2' })
  @IsOptional()
  lostAmount?: string;

  @ApiPropertyOptional({
    example: 'USD (Optional, default: USD)'
  })
  @IsString()
  @IsOptional()
  currency?: string = 'USD';

  @ApiPropertyOptional({
    example: 'United States (Optional)'
  })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({
    example: 'California (Optional)'
  })
  @IsString()
  @IsOptional()
  region?: string;

  @ApiPropertyOptional({
    example: 'Los Angeles (Optional)'
  })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({
    example: '2024-01-15T10:30:00.000Z (Optional)'
  })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  incidentDate?: Date;

  @ApiPropertyOptional({
    type: [EvidenceDto],
    example: '[{evidenceType: "IMAGE", fileUrl: "https://..."}] (Optional)'
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvidenceDto)
  @IsOptional()
  evidence?: EvidenceDto[];

  @ApiPropertyOptional({
    example: 'false (Optional, default: false)'
  })
  @IsBoolean()
  @IsOptional()
  isCompanyPost?: boolean = false;
}