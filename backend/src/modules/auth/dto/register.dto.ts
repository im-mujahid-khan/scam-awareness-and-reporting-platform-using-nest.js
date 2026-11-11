// src/modules/auth/dto/register.dto.ts
import { IsEmail, IsString, MinLength, IsOptional, IsEnum, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    required: true,
  })
  @IsEmail()
  @Transform(({ value }) => value.toLowerCase().trim())
  email: string;

  @ApiProperty({
    description: 'User password (min 8 characters)',
    example: 'SecurePass123',
    minLength: 8,
    required: true,
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    description: 'Display name for the user',
    example: 'John Doe',
    minLength: 2,
    required: true,
  })
  @IsString()
  @MinLength(2)
  displayName: string;

  @ApiPropertyOptional({
    description: 'User first name',
    example: 'John',
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'User last name',
    example: 'Doe',
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'User phone number in E.164 format',
    example: '+1234567890',
    pattern: '^\\+[1-9]\\d{1,14}$'
  })
  @IsOptional()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone must be in E.164 format (e.g., +1234567890)'
  })
  @Transform(({ value }) => value ? value.trim() : value)
  phone?: string;

  @ApiPropertyOptional({
    description: 'URL to user avatar image',
    example: 'https://example.com/avatar.jpg',
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({
    description: 'User biography',
    example: 'Software developer passionate about cybersecurity',
  })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({
    description: 'User role',
    example: 'USER',
    enum: ['USER', 'ADMIN', 'MODERATOR'],
    default: 'USER',
  })
  @IsOptional()
  @IsEnum(['USER', 'ADMIN', 'MODERATOR'])
  role?: string;

  // ==================== NEW LOCATION FIELDS ====================
  
  @ApiPropertyOptional({
    description: 'User country (ISO 3166-1 alpha-2 code or full name)',
    example: 'US',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value ? value.trim() : value)
  country?: string;

  @ApiPropertyOptional({
    description: 'User region/state/province',
    example: 'California',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value ? value.trim() : value)
  region?: string;

  @ApiPropertyOptional({
    description: 'User city',
    example: 'San Francisco',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value ? value.trim() : value)
  city?: string;
}