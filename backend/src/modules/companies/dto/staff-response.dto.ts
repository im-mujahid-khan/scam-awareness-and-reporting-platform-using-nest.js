// src/modules/companies/dto/staff-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { StaffRole } from './add-staff.dto';

export class StaffResponseDto {
  @ApiProperty({ example: 'staff_12345' })
  id: string;

  @ApiProperty({ example: 'company_12345' })
  companyId: string;

  @ApiProperty({ example: 'user_12345' })
  userId: string;

  @ApiProperty({ example: 'john@example.com' })
  userEmail: string;

  @ApiProperty({ example: 'John Doe' })
  userDisplayName: string;

  @ApiProperty({ 
    example: 'EDITOR',
    enum: StaffRole
  })
  role: StaffRole;

  @ApiProperty({ example: 'true' })
  isActive: boolean;

  @ApiProperty({ 
    example: ['post.create', 'post.edit'],
    type: [String]
  })
  permissions: string[];

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  joinedAt: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  updatedAt: Date;

  constructor(data: Partial<StaffResponseDto>) {
    Object.assign(this, data);
  }
}