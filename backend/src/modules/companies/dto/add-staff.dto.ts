// src/modules/companies/dto/add-staff.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum StaffRole {
  ADMIN = 'ADMIN',
  EDITOR = 'EDITOR', 
  STAFF = 'STAFF',
  VIEWER = 'VIEWER'
}

export class AddStaffDto {
  @ApiProperty({ example: 'user@example.com (required)' })
  @IsEmail()
  @IsNotEmpty()
  userEmail: string;

  @ApiProperty({ 
    example: 'EDITOR (required)',
    enum: StaffRole,
  })
  @IsEnum(StaffRole)
  @IsNotEmpty()
  role: StaffRole;

  @ApiProperty({ 
    example: ['company.read', 'company.update'] + ' (optional)',
    type: [String]
  })
  @IsOptional()
  permissions?: string[];
}