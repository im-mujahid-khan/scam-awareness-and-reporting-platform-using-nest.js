import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsString, 
  IsEnum, 
  IsOptional, 
  IsArray, 
  ValidateNested, 
  IsDate,
  IsDecimal,
  IsBoolean,
  IsNumber,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PostType, GroupPostModerationStatus } from '@prisma/client';

// Reuse EvidenceDto from posts module
export class GroupEvidenceDto {
  @ApiProperty({ 
    example: 'IMAGE (Required)',
    enum: ['IMAGE', 'VIDEO', 'PDF', 'WEBSITE', 'PHONE_NUMBER', 'EMAIL_ADDRESS']
  })
  @IsEnum(['IMAGE', 'VIDEO', 'PDF', 'WEBSITE', 'PHONE_NUMBER', 'EMAIL_ADDRESS'])
  evidenceType: string;

  @ApiPropertyOptional({
    example: 'https://example.com/uploads/evidence.jpg (Optional)'
  })
  @IsString()
  @IsOptional()
  fileUrl?: string;

  @ApiPropertyOptional({
    example: 'https://scam-website.com (Optional)'
  })
  @IsString()
  @IsOptional()
  websiteUrl?: string;

  @ApiPropertyOptional({
    example: '+1-***-***-1234 (Optional, must be masked)'
  })
  @IsString()
  @IsOptional()
  @Matches(/^\+?[\d\s\-\(\)\.\*]+$/)
  phoneNumber?: string;

  @ApiPropertyOptional({
    example: 'j***@example.com (Optional, must be masked)'
  })
  @IsString()
  @IsOptional()
  emailAddress?: string;

  @ApiPropertyOptional({
    example: 'Bank account: ****1234 (Optional)'
  })
  @IsString()
  @IsOptional()
  maskedContent?: string;

  @ApiPropertyOptional({
    example: 'false (Optional, default: false)'
  })
  @IsBoolean()
  @IsOptional()
  hasUserConsent?: boolean = false;

  @ApiPropertyOptional({
    example: 'true (Optional, default: true)'
  })
  @IsBoolean()
  @IsOptional()
  isMasked?: boolean = true;

  @ApiPropertyOptional({
    example: 'screenshot.jpg (Optional)'
  })
  @IsString()
  @IsOptional()
  fileName?: string;

  @ApiPropertyOptional({
    example: '1024000 (Optional)'
  })
  @IsNumber()
  @IsOptional()
  fileSize?: number;

  @ApiPropertyOptional({
    example: 'image/jpeg (Optional)'
  })
  @IsString()
  @IsOptional()
  mimeType?: string;
}

// For SCAM_AWARENESS and QUESTION posts
export class CreateGroupAwarenessQuestionDto {
  @ApiProperty({ 
    example: 'SCAM_AWARENESS (Required)'
  })
  @IsEnum(PostType, { 
    message: 'postType must be either SCAM_AWARENESS or QUESTION' 
  })
  postType: PostType;

  @ApiProperty({
    example: 'Beware of New Phishing Scam in Our Group (Required)'
  })
  @IsString()
  title: string;

  @ApiProperty({
    example: 'There\'s a new phishing scam targeting group members... (Required)'
  })
  @IsString()
  description: string;

  @ApiPropertyOptional({
    type: [GroupEvidenceDto],
    example: '[{evidenceType: "IMAGE", fileUrl: "https://..."}] (Optional)'
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GroupEvidenceDto)
  @IsOptional()
  media?: GroupEvidenceDto[];

  @ApiPropertyOptional({
    example: 'false (Optional, default: false)'
  })
  @IsBoolean()
  @IsOptional()
  isCompanyPost?: boolean = false;

  @ApiPropertyOptional({
    example: 'company-123 (Optional)'
  })
  @IsString()
  @IsOptional()
  companyId?: string;
}

// For SCAM_REPORT posts
export class CreateGroupScamReportDto {
  @ApiProperty({
    example: 'Fake Investment Scam Reported in Group (Required)'
  })
  @IsString()
  title: string;

  @ApiProperty({
    example: 'scam-type-123 (Required)'
  })
  @IsString()
  scamTypeId: string;

  @ApiProperty({
    example: 'I was contacted by someone claiming to be from XYZ Investments... (Required)'
  })
  @IsString()
  description: string;

  @ApiProperty({ 
    example: 'SCAM_REPORT (Required)'
  })
  @IsEnum([PostType.SCAM_REPORT], { 
    message: 'postType must be SCAM_REPORT for scam reports' 
  })
  postType: PostType = PostType.SCAM_REPORT;

  @ApiPropertyOptional({
    example: 'company-123 (Optional)'
  })
  @IsString()
  @IsOptional()
  companyId?: string;

  @ApiPropertyOptional({
    example: 'ABC Corporation (Optional)'
  })
  @IsString()
  @IsOptional()
  companyNameManual?: string;

  @ApiPropertyOptional({
    example: '1000.50 (Optional)'
  })
  @IsDecimal({ decimal_digits: '0,2' })
  @IsOptional()
  lostAmount?: string;

  @ApiPropertyOptional({
    example: 'USD (Optional, default: USD)'
  })
  @IsString()
  @IsOptional()
  currency?: string = 'USD';

  @ApiPropertyOptional({
    example: 'United States (Optional)'
  })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({
    example: 'California (Optional)'
  })
  @IsString()
  @IsOptional()
  region?: string;

  @ApiPropertyOptional({
    example: 'Los Angeles (Optional)'
  })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({
    example: '2024-01-15T10:30:00.000Z (Optional)'
  })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  incidentDate?: Date;

  @ApiPropertyOptional({
    type: [GroupEvidenceDto],
    example: '[{evidenceType: "IMAGE", fileUrl: "https://..."}] (Optional)'
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GroupEvidenceDto)
  @IsOptional()
  evidence?: GroupEvidenceDto[];

  @ApiPropertyOptional({
    example: 'false (Optional, default: false)'
  })
  @IsBoolean()
  @IsOptional()
  isCompanyPost?: boolean = false;
}

// Update DTO for group posts
export class UpdateGroupPostDto {
  @ApiPropertyOptional({
    example: 'Updated Scam Alert Title (Optional)'
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    example: 'Updated detailed information... (Optional)'
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: 'scam-type-456 (Optional)'
  })
  @IsString()
  @IsOptional()
  scamTypeId?: string;

  @ApiPropertyOptional({
    example: 'company-456 (Optional)'
  })
  @IsString()
  @IsOptional()
  companyId?: string;

  @ApiPropertyOptional({
    example: 'New Company Name (Optional)'
  })
  @IsString()
  @IsOptional()
  companyNameManual?: string;

  @ApiPropertyOptional({
    example: '2000.00 (Optional)'
  })
  @IsDecimal({ decimal_digits: '0,2' })
  @IsOptional()
  lostAmount?: string;

  @ApiPropertyOptional({
    example: 'EUR (Optional)'
  })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({
    example: 'Canada (Optional)'
  })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({
    example: 'Ontario (Optional)'
  })
  @IsString()
  @IsOptional()
  region?: string;

  @ApiPropertyOptional({
    example: 'Toronto (Optional)'
  })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({
    example: '2024-01-20T10:30:00.000Z (Optional)'
  })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  incidentDate?: Date;
}

// For group admin approval
export class UpdateGroupPostStatusDto {
  @ApiProperty({ 
    enum: ['APPROVED', 'REJECTED'], 
    example: 'APPROVED (Required)'
  })
  @IsString()
  status: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({ 
    example: 'Post meets community guidelines (Optional)'
  })
  @IsString()
  @IsOptional()
  reason?: string;
}

// For pinning/unpinning posts
export class PinGroupPostDto {
  @ApiProperty({ 
    example: 'true (Required)'
  })
  @IsBoolean()
  pinned: boolean;
}

// Response DTO for group posts
export class GroupPostResponseDto {
  @ApiProperty({ description: 'Group post ID' })
  id: string;

  @ApiProperty({ description: 'Group ID' })
  groupId: string;

  @ApiProperty({ description: 'Post ID' })
  postId: string;

  @ApiProperty({ description: 'User ID of post creator in group context' })
  userId: string;

  @ApiProperty({ description: 'Whether post is pinned' })
  pinned: boolean;

  @ApiProperty({ description: 'Whether post requires approval' })
  requiresApproval: boolean;

  @ApiProperty({ 
    enum: GroupPostModerationStatus, 
    description: 'Group moderation status' 
  })
  groupModerationStatus: GroupPostModerationStatus;

  @ApiPropertyOptional({ description: 'When post was reviewed by group admin' })
  groupReviewedAt?: Date;

  @ApiPropertyOptional({ description: 'Group admin who reviewed the post' })
  groupReviewedBy?: string;

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  updatedAt: Date;

  @ApiProperty({ description: 'Post details' })
  post: any;

  @ApiProperty({ description: 'Group details' })
  group: any;

  @ApiProperty({ description: 'User details' })
  user: any;
}