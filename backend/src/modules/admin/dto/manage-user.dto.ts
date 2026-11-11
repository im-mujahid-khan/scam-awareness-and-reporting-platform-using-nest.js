import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsBoolean, IsDateString } from 'class-validator';
import { UserRole } from '@prisma/client';

export class ManageUserDto {
  @ApiPropertyOptional({ enum: UserRole, description: 'Update user role' })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ description: 'Ban user' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Mark as deleted' })
  @IsOptional()
  @IsBoolean()
  isDeleted?: boolean;

  @ApiPropertyOptional({ description: 'Verification status notes' })
  @IsOptional()
  @IsString()
  verificationNotes?: string;

  @ApiPropertyOptional({ description: 'Date when user was verified' })
  @IsOptional()
  @IsDateString()
  verifiedAt?: string;

  @ApiPropertyOptional({ description: 'Warning message for user' })
  @IsOptional()
  @IsString()
  warningMessage?: string;
}