// src/modules/companies/dto/create-company-post.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsString, 
  IsOptional, 
  IsArray, 
  IsNumber, 
  IsDateString,
  IsEnum,
  MaxLength,
  IsNotEmpty,
  ValidateNested,
  IsUrl
} from 'class-validator';
import { Type } from 'class-transformer';

export enum CompanyPostType {
  AWARENESS = 'AWARENESS',
  WARNING = 'WARNING'
}

export class MediaDto {
  @ApiProperty({ example: 'https://example.com/image.jpg' })
  @IsUrl()
  url: string;

  @ApiPropertyOptional({ example: 'image.jpg' })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional({ example: 1024 })
  @IsOptional()
  @IsNumber()
  fileSize?: number;

  @ApiPropertyOptional({ example: 'image/jpeg' })
  @IsOptional()
  @IsString()
  mimeType?: string;
}

export class EvidenceDto {
  @ApiPropertyOptional({ example: 'IMAGE' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: 'https://example.com/evidence.jpg' })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'scammer@example.com' })
  @IsOptional()
  @IsString()
  emailAddress?: string;

  @ApiPropertyOptional({ example: 'https://scam-website.com' })
  @IsOptional()
  @IsUrl()
  websiteUrl?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  isMasked?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  hasUserConsent?: boolean;
}

export class CreateCompanyPostDto {
  @ApiProperty({ example: 'Beware of Phishing Scams (required)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'We have detected multiple phishing attempts... (required)' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ example: 'scam_type_123' })
  @IsOptional()
  @IsString()
  scamTypeId?: string;

  @ApiPropertyOptional({ example: 5000 })
  @IsOptional()
  @IsNumber()
  lostAmount?: number;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: '2025-02-15' })
  @IsOptional()
  @IsDateString()
  incidentDate?: string;

  @ApiPropertyOptional({ example: 'United States' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 'California' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ example: 'Los Angeles' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ 
    type: [MediaDto],
    example: [{ url: 'https://example.com/image.jpg' }]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MediaDto)
  media?: MediaDto[];

  @ApiPropertyOptional({ 
    type: [EvidenceDto],
    example: [{ type: 'IMAGE', url: 'https://example.com/evidence.jpg' }]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvidenceDto)
  evidence?: EvidenceDto[];
}