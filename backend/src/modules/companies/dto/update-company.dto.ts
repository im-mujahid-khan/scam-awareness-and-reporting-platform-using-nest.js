// src/modules/companies/dto/update-company.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateCompanyDto } from './create-company.dto';
import { IsOptional, IsString, MaxLength, IsBoolean, IsArray, ArrayMaxSize, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export enum VerificationStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED'
}

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {
  @ApiPropertyOptional({ example: 'Company registration certificate uploaded (optional)' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }) => value?.trim())
  verificationNotes?: string;

  @ApiPropertyOptional({ example: 'true (optional - admin only)' })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @ApiPropertyOptional({ 
    example: 'VERIFIED (optional - admin only)',
    enum: VerificationStatus
  })
  @IsOptional()
  @IsEnum(VerificationStatus)
  verificationStatus?: VerificationStatus;

  @ApiPropertyOptional({ example: 'true (optional - admin only)' })
  @IsOptional()
  @IsBoolean()
  verifiedBadge?: boolean;

  @ApiPropertyOptional({ 
    example: ['https://example.com/new-doc.jpg'] + ' (optional)',
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @Transform(({ value }) => Array.isArray(value) ? value.map(url => url?.trim()) : value)
  addVerificationDocs?: string[];

  @ApiPropertyOptional({ 
    example: ['https://example.com/old-doc.jpg'] + ' (optional)',
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => Array.isArray(value) ? value.map(url => url?.trim()) : value)
  removeVerificationDocs?: string[];
}