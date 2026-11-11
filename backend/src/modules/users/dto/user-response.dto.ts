import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';

export class UserResponseDto {
  @ApiProperty({ description: 'User ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'User email', example: 'user@example.com' })
  @Expose()
  @Transform(({ value }) => value ?? null)  // Convert null to null
  email: string | null;  // Change to string | null

  @ApiPropertyOptional({ description: 'User phone number', example: '+1234567890' })
  @Expose()
  @Transform(({ value }) => value ?? null)
  phone: string | null;  // Change to string | null

  @ApiProperty({ description: 'User display name', example: 'John Doe' })
  @Expose()
  displayName: string;

  @ApiPropertyOptional({ description: 'First name', example: 'John' })
  @Expose()
  @Transform(({ value }) => value ?? null)
  firstName: string | null;

  @ApiPropertyOptional({ description: 'Last name', example: 'Doe' })
  @Expose()
  @Transform(({ value }) => value ?? null)
  lastName: string | null;

  @ApiPropertyOptional({ description: 'Avatar URL', example: 'https://example.com/avatar.jpg' })
  @Expose()
  @Transform(({ value }) => value ?? null)
  avatarUrl: string | null;

  @ApiPropertyOptional({ description: 'User biography', example: 'Software developer' })
  @Expose()
  @Transform(({ value }) => value ?? null)
  bio: string | null;

  @ApiPropertyOptional({ description: 'Location', example: 'New York, USA' })
  @Expose()
  @Transform(({ value }) => value ?? null)
  location: string | null;

  @ApiPropertyOptional({ description: 'Gender', example: 'MALE' })
  @Expose()
  @Transform(({ value }) => value ?? null)
  gender: string | null;

  @ApiPropertyOptional({ description: 'Date of birth', example: '1990-01-15' })
  @Expose()
  @Transform(({ value }) => {
    if (!value) return null;
    return new Date(value).toISOString().split('T')[0];
  })
  dateOfBirth: string | null;  // Change to string | null

  @ApiProperty({ description: 'Email verification status', example: true })
  @Expose()
  emailVerified: boolean;

  @ApiProperty({ description: 'Phone verification status', example: false })
  @Expose()
  phoneVerified: boolean;

  @ApiProperty({ description: 'Account active status', example: true })
  @Expose()
  isActive: boolean;

  @ApiProperty({ description: 'Soft delete status', example: false })
  @Expose()
  isDeleted: boolean;

  @ApiPropertyOptional({ description: 'When user was soft deleted', example: null })
  @Expose()
  @Transform(({ value }) => value ?? null)
  deletedAt: Date | null;

  @ApiProperty({ description: 'User role', example: 'USER' })
  @Expose()
  role: string;

  @ApiProperty({ description: 'Authentication provider', example: 'EMAIL' })
  @Expose()
  authProvider: string;

  @ApiPropertyOptional({ description: 'Privacy settings', example: {} })
  @Expose()
  @Transform(({ value }) => {
    if (!value) return {};
    return typeof value === 'string' ? JSON.parse(value) : value;
  })
  privacySettings?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Notification settings', example: {} })
  @Expose()
  @Transform(({ value }) => {
    if (!value) return {};
    return typeof value === 'string' ? JSON.parse(value) : value;
  })
  notificationSettings?: Record<string, any>;

  @ApiProperty({ description: 'Account creation timestamp', example: '2024-01-15T10:30:00.000Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp', example: '2024-01-15T10:30:00.000Z' })
  @Expose()
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Last login timestamp', example: '2024-01-15T10:30:00.000Z' })
  @Expose()
  @Transform(({ value }) => value ?? null)
  lastLoginAt?: Date;

  @ApiPropertyOptional({ description: 'Last profile update', example: '2024-01-15T10:30:00.000Z' })
  @Expose()
  @Transform(({ value }) => value ?? null)
  lastProfileUpdateAt?: Date;

  @ApiPropertyOptional({ description: 'Language preference', example: 'en' })
  @Expose()
  @Transform(({ value }) => value ?? null)
  language: string | null;

  @ApiPropertyOptional({ description: 'Theme preference', example: 'dark' })
  @Expose()
  @Transform(({ value }) => value ?? null)
  themePreference: string | null;
}