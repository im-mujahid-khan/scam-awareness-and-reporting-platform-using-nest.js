import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsString, 
  IsEnum, 
  IsOptional, 
  IsArray, 
  ValidateNested, 
  IsNumber,
  IsDate,
  IsBoolean,
  IsDecimal,
  IsUrl,
  IsEmail,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PostType } from '@prisma/client';

export class EvidenceDto {
  @ApiProperty({ 
    example: 'IMAGE (Required)',
    enum: ['IMAGE', 'VIDEO', 'PDF', 'WEBSITE', 'PHONE_NUMBER', 'EMAIL_ADDRESS']
  })
  @IsEnum(['IMAGE', 'VIDEO', 'PDF', 'WEBSITE', 'PHONE_NUMBER', 'EMAIL_ADDRESS'], {
    message: 'evidenceType must be one of: IMAGE, VIDEO, PDF, WEBSITE, PHONE_NUMBER, EMAIL_ADDRESS'
  })
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
  @Matches(/^\+?[\d\s\-\(\)\.\*]+$/, {
    message: 'Phone number must be valid and masked with asterisks (*) for sensitive parts'
  })
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

  @ApiPropertyOptional({
    example: 'Screenshot of the scam website (Optional)'
  })
  @IsString()
  @IsOptional()
  description?: string;
}

export class CreatePostDto {
  @ApiProperty({
    example: 'New Scam Alert (Required)'
  })
  @IsString()
  title: string;

  @ApiProperty({
    example: 'Detailed information about the scam... (Required)'
  })
  @IsString()
  description: string;

  @ApiProperty({ 
    example: 'SCAM_REPORT (Required)',
    enum: PostType
  })
  @IsEnum(PostType)
  postType: PostType;

  @ApiPropertyOptional({
    example: 'scam-type-123 (Optional)'
  })
  @IsString()
  @IsOptional()
  scamTypeId?: string;

  @ApiPropertyOptional({
    example: 'company-123 (Optional)'
  })
  @IsString()
  @IsOptional()
  companyId?: string;

  @ApiPropertyOptional({
    example: 'XYZ Corporation (Optional)'
  })
  @IsString()
  @IsOptional()
  companyNameManual?: string;

  @ApiPropertyOptional({
    example: '1500.75 (Optional)'
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
    type: [EvidenceDto],
    example: '[{evidenceType: "IMAGE", fileUrl: "https://..."}] (Optional)'
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvidenceDto)
  @IsOptional()
  evidence?: EvidenceDto[];

  @ApiPropertyOptional({
    example: 'false (Optional, default: false)'
  })
  @IsBoolean()
  @IsOptional()
  isCompanyPost?: boolean = false;
}