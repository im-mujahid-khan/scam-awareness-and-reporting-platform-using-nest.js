// src/modules/companies/dto/create-company-group.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUrl, IsEnum, MaxLength, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export enum GroupTopic {
  PHISHING = 'PHISHING',
  FAKE_SUPPORT = 'FAKE_SUPPORT',
  IMPERSONATION = 'IMPERSONATION',
  INVESTMENT = 'INVESTMENT',
  JOB_SCAM = 'JOB_SCAM',
  ROMANCE = 'ROMANCE',
  PAYMENT_REQUEST = 'PAYMENT_REQUEST',
  FAKE_WEBSITE = 'FAKE_WEBSITE',
  SOCIAL_MEDIA = 'SOCIAL_MEDIA',
  MARKETPLACE = 'MARKETPLACE',
  SUBSCRIPTION = 'SUBSCRIPTION',
  PHONE_CALL = 'PHONE_CALL',
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
  CRYPTO = 'CRYPTO',
  LOAN = 'LOAN',
  CHARITY = 'CHARITY',
  INVOICE = 'INVOICE',
  IDENTITY_THEFT = 'IDENTITY_THEFT',
  ACCOUNT_TAKEOVER = 'ACCOUNT_TAKEOVER',
  GIVEAWAY = 'GIVEAWAY',
  OTHER = 'OTHER'
}

export enum PostApprovalSetting {
  INSTANT = 'INSTANT',
  APPROVAL_REQUIRED = 'APPROVAL_REQUIRED'
}

export class CreateCompanyGroupDto {
  @ApiProperty({ example: 'Tech Solutions Support Group (required)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional({ example: 'Official support group for Tech Solutions customers (optional)' })
  @IsOptional()
  @IsString()
  @MaxLength(700)
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiPropertyOptional({ 
    example: 'PHISHING (optional)',
    enum: GroupTopic
  })
  @IsOptional()
  @IsEnum(GroupTopic)
  topic?: GroupTopic;

  @ApiPropertyOptional({ 
    example: 'INSTANT (optional)',
    enum: PostApprovalSetting,
    default: 'INSTANT'
  })
  @IsOptional()
  @IsEnum(PostApprovalSetting)
  postApproval?: PostApprovalSetting;

  @ApiPropertyOptional({ example: 'https://example.com/cover.jpg (optional)' })
  @IsOptional()
  @IsUrl()
  @Transform(({ value }) => value?.trim())
  coverImageUrl?: string;

  @ApiPropertyOptional({ example: '1. Be respectful\n2. No spam\n3. Stay on topic (optional)' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }) => value?.trim())
  rules?: string;
}