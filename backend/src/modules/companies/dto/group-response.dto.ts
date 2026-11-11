// src/modules/companies/dto/group-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GroupTopic, PostApprovalSetting } from './create-company-group.dto';

export class GroupResponseDto {
  @ApiProperty({ example: 'group_12345' })
  id: string;

  @ApiProperty({ example: 'Tech Solutions Support Group' })
  name: string;

  @ApiProperty({ example: 'tech-solutions-support-group-12345' })
  slug: string;

  @ApiPropertyOptional({ example: 'Official support group for Tech Solutions customers' })
  description?: string;

  @ApiPropertyOptional({ 
    example: 'PHISHING',
    enum: GroupTopic
  })
  topic?: GroupTopic;

  @ApiProperty({ example: 'PUBLIC' })
  visibility: string;

  @ApiPropertyOptional({ example: 'https://example.com/cover.jpg' })
  coverImageUrl?: string;

  @ApiPropertyOptional({ example: '1. Be respectful\n2. No spam' })
  rules?: string;

  @ApiProperty({ example: 150 })
  memberCount: number;

  @ApiProperty({ example: 45 })
  postCount: number;

  @ApiProperty({ example: 23 })
  followerCount: number;

  @ApiProperty({ example: true })
  isOfficial: boolean;

  @ApiProperty({ example: 'company_12345' })
  companyId: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  updatedAt: Date;
}