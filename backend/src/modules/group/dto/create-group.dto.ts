import { IsString, IsOptional, IsEnum, MaxLength, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GroupType, PostApprovalSetting, GroupTopic } from '@prisma/client';

export class CreateGroupDto {
  @ApiProperty({ 
    example: 'Scam Alert Pakistan (required)',
    maxLength: 60 
  })
  @IsString()
  @MaxLength(60)
  name: string;

  @ApiPropertyOptional({ 
    example: 'Group for Pakistani scam victims (optional)',
    maxLength: 700 
  })
  @IsString()
  @MaxLength(700)
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ 
    example: 'PHISHING (optional)',
    enum: GroupTopic
  })
  @IsEnum(GroupTopic)
  @IsOptional()
  topic?: GroupTopic;

  @ApiProperty({ 
    example: 'PUBLIC (required)',
    enum: GroupType
  })
  @IsEnum(GroupType)
  visibility: GroupType = GroupType.PUBLIC;

  @ApiProperty({ 
    example: 'INSTANT (required)',
    enum: PostApprovalSetting
  })
  @IsEnum(PostApprovalSetting)
  postApproval: PostApprovalSetting = PostApprovalSetting.INSTANT;

  @ApiPropertyOptional({ 
    example: '1. Be respectful (optional)',
    maxLength: 1000 
  })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  rules?: string;

  @ApiPropertyOptional({ 
    example: 'Pakistan (optional)'
  })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ 
    example: 'Punjab (optional)'
  })
  @IsString()
  @IsOptional()
  region?: string;

  @ApiPropertyOptional({ 
    example: 'Lahore (optional)'
  })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ 
    example: 'cmp_123456789 (required for OFFICIAL groups)'
  })
  @IsString()
  @IsOptional()
  companyId?: string;

  @ApiPropertyOptional({ 
    example: 'https://example.com/cover.jpg (optional)'
  })
  @IsUrl()
  @IsOptional()
  coverImageUrl?: string;
}