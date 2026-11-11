// src/modules/auth/dto/token-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class TokenResponseDto {
  @ApiProperty({
    description: 'Access token valid for 365 days',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  accessToken: string;

  @ApiProperty({
    description: 'Refresh token valid for 365 days',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Access token expiry in seconds (31536000 = 365 days)',
    example: 31536000
  })
  expiresIn: number;

  @ApiProperty({
    description: 'Refresh token expiry in seconds (31536000 = 365 days)',
    example: 31536000,
    required: false
  })
  refreshExpiresIn?: number; // Make sure this property exists

  @ApiProperty({
    description: 'User information',
    type: Object,
    required: false
  })
  user?: {
    id: string;
    email: string;
    displayName: string;
    role: string;
  };

  constructor(partial: Partial<TokenResponseDto>) {
    Object.assign(this, partial);
  }
}