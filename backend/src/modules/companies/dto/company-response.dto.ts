// src/modules/companies/dto/company-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CompanyResponseDto {
  @ApiProperty({ example: 'clx2b3c4d5e6f7g8h9i0j1k' })
  id: string;

  @ApiProperty({ example: 'Tech Solutions Inc.' })
  name: string;

  @ApiProperty({ example: 'contact@techsolutions.com' })
  email: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  phone?: string;

  @ApiPropertyOptional({ example: 'https://techsolutions.com' })
  website?: string;

  @ApiPropertyOptional({ example: 'Technology' })
  industry?: string;

  @ApiPropertyOptional({ example: 'A leading technology solutions provider...' })
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/logo.jpg' })
  logoUrl?: string;

  @ApiPropertyOptional({ example: 'https://example.com/banner.jpg' })
  bannerUrl?: string;

  @ApiProperty({ example: 'false' })
  isVerified: boolean;

  @ApiProperty({ 
    example: 'PENDING',
    enum: ['PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED']
  })
  verificationStatus: string;

  @ApiPropertyOptional({ 
    example: ['https://example.com/doc1.jpg', 'https://example.com/doc2.jpg'],
    type: [String]
  })
  verificationDocs?: string[];

  @ApiPropertyOptional({ example: 'false' })
  verifiedBadge?: boolean;

  @ApiPropertyOptional({ example: 'Verification pending review' })
  verificationNotes?: string;

  @ApiPropertyOptional({ example: '2025-01-15T10:30:00.000Z' })
  verifiedAt?: Date;

  @ApiPropertyOptional({ example: 'John Smith' })
  contactName?: string;

  @ApiPropertyOptional({ example: 'john.smith@techsolutions.com' })
  contactEmail?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  contactPhone?: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  updatedAt: Date;

  @ApiProperty({ example: '5' })
  staffCount?: number;

  @ApiProperty({ example: '150' })
  followerCount?: number;

  @ApiProperty({ example: 'true' })
  isOwner?: boolean;

  @ApiProperty({ 
    example: 'OWNER',
    enum: ['NONE', 'VIEWER', 'STAFF', 'EDITOR', 'ADMIN', 'OWNER']
  })
  userRole?: string;

  // Analytics fields
  @ApiPropertyOptional({ example: '2500' })
  postReach?: number;

  @ApiPropertyOptional({ example: '4.5' })
  engagementRate?: number;

  @ApiPropertyOptional({ example: '12' })
  scamMentionCount?: number;
}