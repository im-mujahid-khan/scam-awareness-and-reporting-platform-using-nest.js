// src/modules/auth/dto/reset-password.dto.ts
import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Password reset token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    required: true,
  })
  @IsString()
  token: string;

  @ApiProperty({
    description: 'New password (min 8 characters)',
    example: 'NewSecurePass123',
    minLength: 8,
    required: true,
  })
  @IsString()
  @MinLength(8)
  newPassword: string;

  @ApiProperty({
    description: 'Confirm new password',
    example: 'NewSecurePass123',
    minLength: 8,
    required: true,
  })
  @IsString()
  @MinLength(8)
  confirmPassword: string;
}