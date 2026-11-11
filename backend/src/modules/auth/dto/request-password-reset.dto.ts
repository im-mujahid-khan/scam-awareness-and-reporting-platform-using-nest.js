// src/modules/auth/dto/request-password-reset.dto.ts
import { IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class RequestPasswordResetDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    required: true,
  })
  @IsEmail()
  @Transform(({ value }) => value.toLowerCase().trim())
  email: string;
}