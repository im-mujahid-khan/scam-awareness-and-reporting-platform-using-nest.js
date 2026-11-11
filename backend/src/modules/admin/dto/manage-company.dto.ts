import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsBoolean, IsDateString } from 'class-validator';

export class ManageCompanyDto {
  @ApiPropertyOptional({ description: 'Verification status' })
  @IsOptional()
  @IsString()
  verificationStatus?: string;

  @ApiPropertyOptional({ description: 'Is company verified' })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @ApiPropertyOptional({ description: 'Show verified badge' })
  @IsOptional()
  @IsBoolean()
  verifiedBadge?: boolean;

  @ApiPropertyOptional({ description: 'Verification notes' })
  @IsOptional()
  @IsString()
  verificationNotes?: string;

  @ApiPropertyOptional({ description: 'Date when company was verified' })
  @IsOptional()
  @IsDateString()
  verifiedAt?: string;

  // @ApiPropertyOptional({ description: 'Is company active' })
  // @IsOptional()
  // @IsBoolean()
  // isActive?: boolean;
}