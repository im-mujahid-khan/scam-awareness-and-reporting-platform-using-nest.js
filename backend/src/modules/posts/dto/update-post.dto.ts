import { ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsString, 
  IsOptional, 
  IsArray, 
  ValidateNested, 
  IsDate,
  IsDecimal,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EvidenceDto } from './create-post.dto';

export class UpdatePostDto {
  @ApiPropertyOptional({
    example: 'Updated Scam Alert Title (Optional)'
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    example: 'Updated detailed information... (Optional)'
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: 'scam-type-456 (Optional)'
  })
  @IsString()
  @IsOptional()
  scamTypeId?: string;

  @ApiPropertyOptional({
    example: 'company-456 (Optional)'
  })
  @IsString()
  @IsOptional()
  companyId?: string;

  @ApiPropertyOptional({
    example: 'New Company Name (Optional)'
  })
  @IsString()
  @IsOptional()
  companyNameManual?: string;

  @ApiPropertyOptional({
    example: '2000.00 (Optional)'
  })
  @IsDecimal({ decimal_digits: '0,2' })
  @IsOptional()
  lostAmount?: string;

  @ApiPropertyOptional({
    example: 'EUR (Optional)'
  })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({
    example: 'Canada (Optional)'
  })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({
    example: 'Ontario (Optional)'
  })
  @IsString()
  @IsOptional()
  region?: string;

  @ApiPropertyOptional({
    example: 'Toronto (Optional)'
  })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({
    example: '2024-01-20T10:30:00.000Z (Optional)'
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
}