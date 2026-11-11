import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export enum IdentityType {
  PHONE = 'PHONE',
  EMAIL = 'EMAIL',
  WEBSITE = 'WEBSITE',
  SOCIAL_MEDIA = 'SOCIAL_MEDIA',
  CRYPTO_WALLET = 'CRYPTO_WALLET',
  KEYWORD = 'KEYWORD'
}

export class SearchQueryDto {
  @ApiProperty({
    description: 'Search query (phone, email, website, social media, crypto wallet, or keyword)',
    example: '+1234567890',
    required: true
  })
  @IsString()
  query: string;

  @ApiPropertyOptional({
    description: 'Type of identity to search for',
    enum: IdentityType,
    example: IdentityType.PHONE
  })
  @IsEnum(IdentityType)
  @IsOptional()
  type?: IdentityType;

  @ApiPropertyOptional({
    description: 'Country filter (ISO code)',
    example: 'US',
    required: false
  })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({
    description: 'Region/State filter',
    example: 'California',
    required: false
  })
  @IsString()
  @IsOptional()
  region?: string;

  @ApiPropertyOptional({
    description: 'City filter',
    example: 'Los Angeles',
    required: false
  })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({
    description: 'Page number (pagination)',
    example: 1,
    default: 1,
    required: false
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 20,
    default: 20,
    required: false
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}

export class FollowIdentityDto {
  @ApiProperty({
    description: 'Identity to follow (phone, email, website, etc.)',
    example: '+1234567890',
    required: true
  })
  @IsString()
  identity: string;

  @ApiProperty({
    description: 'Type of identity',
    enum: IdentityType,
    example: IdentityType.PHONE,
    required: true
  })
  @IsEnum(IdentityType)
  type: IdentityType;

  @ApiPropertyOptional({
    description: 'Display name for the identity',
    example: 'Suspicious Tech Support',
    required: false
  })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiPropertyOptional({
    description: 'Enable alerts for this identity',
    example: true,
    default: true,
    required: false
  })
  @IsBoolean()
  @IsOptional()
  alertsEnabled?: boolean = true;
}

export class SearchHistoryResponseDto {
  @ApiProperty({ example: 'clx9abcde123456' })
  id: string;

  @ApiProperty({ example: '+1234567890' })
  query: string;

  @ApiProperty({ enum: IdentityType, example: IdentityType.PHONE })
  identityType?: IdentityType;

  @ApiProperty({ example: 5 })
  resultsCount: number;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt: Date;
}

export class RiskScoreResponseDto {
  @ApiProperty({ example: 75 })
  score: number;

  @ApiProperty({ enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], example: 'HIGH' })
  level: string;

  @ApiProperty({ example: 'High risk - Multiple reports detected' })
  description: string;
}

export class ScamTypeSummaryDto {
  @ApiProperty({ example: 'TECH_SUPPORT' })
  type: string;

  @ApiProperty({ example: 'Tech Support Scam' })
  name: string;

  @ApiProperty({ example: 3 })
  count: number;
}

export class EvidencePreviewDto {
  @ApiProperty({ example: 'clx9abcde123456' })
  id: string;

  @ApiProperty({ enum: ['IMAGE', 'VIDEO', 'PDF', 'WEBSITE'], example: 'IMAGE' })
  type: string;

  @ApiProperty({ example: 'https://example.com/evidence.jpg' })
  previewUrl?: string;

  @ApiProperty({ example: 'Screenshot of conversation' })
  description?: string;

  @ApiProperty({ example: '2024-01-10T14:30:00Z' })
  createdAt: Date;
}

export class RelatedReportDto {
  @ApiProperty({ example: 'clx9abcde123456' })
  id: string;

  @ApiProperty({ example: 'Tech Support Scam Attempt' })
  title: string;

  @ApiProperty({ enum: ['SCAM_REPORT', 'SCAM_AWARENESS'], example: 'SCAM_REPORT' })
  postType: string;

  @ApiProperty({ example: 'TECH_SUPPORT' })
  scamType?: string;

  @ApiProperty({ example: '2024-01-10T14:30:00Z' })
  incidentDate?: Date;

  @ApiProperty({ example: 'US' })
  country?: string;

  @ApiProperty({ example: 150.50 })
  lostAmount?: number;
}

export class ConnectedIdentityDto {
  @ApiProperty({ example: '+1987654321' })
  identity: string;

  @ApiProperty({ enum: IdentityType, example: IdentityType.PHONE })
  type: IdentityType;

  @ApiProperty({ example: 2 })
  connectionStrength: number; // Number of reports connecting these identities

  @ApiProperty({ example: 'Often appears together in reports' })
  relationship: string;
}

export class IdentityProfileResponseDto {
  @ApiProperty({ example: '+44 7XXX XXX123' })
  maskedIdentity: string;

  @ApiProperty({ enum: IdentityType, example: IdentityType.PHONE })
  type: IdentityType;

  @ApiProperty({ example: 'phone' })
  icon: string;

  @ApiProperty({ type: RiskScoreResponseDto })
  riskScore: RiskScoreResponseDto;

  @ApiProperty({ example: 5 })
  totalReports: number;

  @ApiProperty({ example: 3 })
  uniqueReporters: number;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  firstReportDate: Date;

  @ApiProperty({ example: '2024-01-20T14:45:00Z' })
  lastReportDate: Date;

  @ApiProperty({ type: [ScamTypeSummaryDto] })
  scamTypes: ScamTypeSummaryDto[];

  @ApiProperty({ type: [RelatedReportDto] })
  recentReports: RelatedReportDto[];

  @ApiProperty({ type: [EvidencePreviewDto] })
  evidencePreviews: EvidencePreviewDto[];

  @ApiProperty({ type: [ConnectedIdentityDto] })
  connectedIdentities: ConnectedIdentityDto[];

  @ApiProperty({ example: false })
  isFollowing: boolean;

  @ApiProperty({ example: 'This identity has been reported by multiple users. Exercise caution before engaging.' })
  safetyWarning: string;
}

export class SearchResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 15 })
  total: number;

  @ApiProperty({ type: [IdentityProfileResponseDto] })
  results: IdentityProfileResponseDto[];

  @ApiProperty({ example: ['+1234...', 'example@...'] })
  suggestions: string[];
}

export class AutocompleteResponseDto {
  @ApiProperty({ example: ['+1234567890', '+1987654321'] })
  identities: string[];

  @ApiProperty({ example: ['tech support scam', 'investment fraud'] })
  keywords: string[];
}

export class NoResultsResponseDto {
  @ApiProperty({ example: 'No reports found yet.' })
  message: string;

  @ApiProperty({ example: '+1234567890' })
  identity: string;

  @ApiProperty({ enum: IdentityType, example: IdentityType.PHONE })
  type: IdentityType;

  @ApiProperty({ example: false })
  isFollowing: boolean;
}