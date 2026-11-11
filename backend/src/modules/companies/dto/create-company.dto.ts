// src/modules/companies/dto/create-company.dto.ts
import {
  IsString,
  IsEmail,
  IsOptional,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
  IsNotEmpty,
  ValidateIf,
  IsArray,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateCompanyDto {
  @ApiProperty({ example: 'Tech Solutions Inc. (required)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiProperty({ example: 'contact@techsolutions.com (required)' })
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiPropertyOptional({ example: '+1234567890 (optional)' })
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/)
  @Transform(({ value }) => value?.trim())
  phone?: string;

  @ApiPropertyOptional({ example: 'https://techsolutions.com (optional)' })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @Transform(({ value }) => value?.toLowerCase().trim())
  website?: string;

  @ApiPropertyOptional({ example: 'Technology (optional)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => value?.trim())
  industry?: string;

  @ApiPropertyOptional({ example: 'A leading technology solutions provider... (optional)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/logo.jpg (optional)' })
  @IsOptional()
  @IsUrl()
  @Transform(({ value }) => value?.trim())
  logoUrl?: string;

  @ApiPropertyOptional({ example: 'https://example.com/banner.jpg (optional)' })
  @IsOptional()
  @IsUrl()
  @Transform(({ value }) => value?.trim())
  bannerUrl?: string;

  @ApiPropertyOptional({ 
    example: ['https://example.com/doc1.jpg', 'https://example.com/doc2.jpg'] + ' (optional)',
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @Transform(({ value }) => Array.isArray(value) ? value.map(url => url?.trim()) : value)
  verificationDocs?: string[];

  @ApiPropertyOptional({ example: 'John Smith (optional)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  contactName?: string;

  @ApiPropertyOptional({ example: 'john.smith@techsolutions.com (optional)' })
  @ValidateIf((o) => o.contactEmail !== undefined && o.contactEmail !== null)
  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase().trim())
  contactEmail?: string;

  @ApiPropertyOptional({ example: '+1234567890 (optional)' })
  @ValidateIf((o) => o.contactPhone !== undefined && o.contactPhone !== null)
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/)
  @Transform(({ value }) => value?.trim())
  contactPhone?: string;
}