// src/modules/companies/dto/post-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CompanyInfoDto {
  @ApiProperty({ example: 'company_123' })
  id: string;

  @ApiProperty({ example: 'Tech Solutions Inc.' })
  name: string;

  @ApiPropertyOptional({ example: 'https://example.com/logo.jpg' })
  logoUrl?: string;

  @ApiProperty({ example: true })
  isVerified: boolean;

  @ApiProperty({ example: true })
  verifiedBadge: boolean;
}

class ScamTypeDto {
  @ApiProperty({ example: 'scam_type_123' })
  id: string;

  @ApiProperty({ example: 'Phishing' })
  name: string;
}

class BadgeDto {
  @ApiProperty({ example: 'badge_123' })
  id: string;

  @ApiProperty({ example: 'SCAM_AWARENESS' })
  badgeType: string;

  @ApiProperty({ example: '#F59E0B' })
  color: string;

  @ApiProperty({ example: 'Official Awareness' })
  label: string;
}

class EvidenceDto {
  @ApiProperty({ example: 'evidence_123' })
  id: string;

  @ApiProperty({ example: 'IMAGE' })
  evidenceType: string;

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
  fileUrl?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'scammer@example.com' })
  emailAddress?: string;

  @ApiPropertyOptional({ example: 'https://scam-site.com' })
  websiteUrl?: string;
}

export class PostResponseDto {
  @ApiProperty({ example: 'post_12345' })
  id: string;

  @ApiProperty({ example: 'Beware of Phishing Scams' })
  title: string;

  @ApiProperty({ example: 'We have detected multiple phishing attempts...' })
  description: string;

  @ApiProperty({ example: 'SCAM_AWARENESS' })
  postType: string;

  @ApiProperty({ example: 'PUBLISHED' })
  status: string;

  @ApiPropertyOptional({ type: CompanyInfoDto })
  company?: CompanyInfoDto | null;

  @ApiPropertyOptional({ type: ScamTypeDto })
  scamType?: ScamTypeDto;

  @ApiProperty({ type: [BadgeDto] })
  badges: BadgeDto[];

  @ApiProperty({ type: [EvidenceDto] })
  evidences: EvidenceDto[];

  @ApiProperty({ example: { like: 45, upvote: 23 } })
  reactionCounts: Record<string, number>;

  @ApiProperty({ example: 12 })
  bookmarkCount: number;

  @ApiProperty({ example: false })
  hasLiked: boolean;

  @ApiProperty({ example: false })
  hasUpvoted: boolean;

  @ApiProperty({ example: false })
  hasDownvoted: boolean;

  @ApiProperty({ example: false })
  hasBookmarked: boolean;

  @ApiPropertyOptional({ example: 'United States' })
  country?: string;

  @ApiPropertyOptional({ example: 'California' })
  region?: string;

  @ApiPropertyOptional({ example: 'Los Angeles' })
  city?: string;

  @ApiPropertyOptional({ example: '2025-02-15T10:30:00.000Z' })
  publishedAt?: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  updatedAt: Date;
}