// src/modules/auth/dto/profile-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProfileResponseDto {
  @ApiProperty({
    description: 'User ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'User email',
    example: 'user@example.com',
  })
  email: string;

  @ApiPropertyOptional({
    description: 'User phone number',
    example: '+1234567890',
  })
  phone?: string;

  @ApiProperty({
    description: 'User display name',
    example: 'John Doe',
  })
  displayName: string;

  @ApiPropertyOptional({
    description: 'User first name',
    example: 'John',
  })
  firstName?: string;

  @ApiPropertyOptional({
    description: 'User last name',
    example: 'Doe',
  })
  lastName?: string;

  @ApiPropertyOptional({
    description: 'URL to user avatar',
    example: 'https://example.com/avatar.jpg',
  })
  avatarUrl?: string;

  @ApiPropertyOptional({
    description: 'User biography',
    example: 'Software developer',
  })
  bio?: string;

  // ==================== NEW LOCATION FIELDS ====================
  
  @ApiPropertyOptional({
    description: 'User country',
    example: 'US',
  })
  country?: string;

  @ApiPropertyOptional({
    description: 'User region/state/province',
    example: 'California',
  })
  region?: string;

  @ApiPropertyOptional({
    description: 'User city',
    example: 'San Francisco',
  })
  city?: string;

  @ApiPropertyOptional({
    description: 'Complete location string (legacy field)',
    example: 'San Francisco, California, US',
    deprecated: true,
  })
  location?: string;

  @ApiProperty({
    description: 'Email verification status',
    example: true,
  })
  emailVerified: boolean;

  @ApiProperty({
    description: 'Phone verification status',
    example: false,
  })
  phoneVerified: boolean;

  @ApiProperty({
    description: 'Account active status',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'User role',
    example: 'USER',
    enum: ['USER', 'ADMIN', 'MODERATOR'],
  })
  role: string;

  @ApiProperty({
    description: 'Authentication provider',
    example: 'EMAIL',
    enum: ['EMAIL', 'GOOGLE', 'FACEBOOK'],
  })
  authProvider: string;

  @ApiProperty({
    description: 'Account creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Last login timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  lastLoginAt?: Date;

  @ApiPropertyOptional({
    description: 'Account verification timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  verifiedAt?: Date;
}