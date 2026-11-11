import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsBoolean,
  MaxLength,
  IsUrl,
  ValidateIf,
} from 'class-validator';
import { MessageType } from '@prisma/client';

export class CreateMessageDto {
  @ApiProperty({
    description: 'Conversation ID',
    example: 'clk7w9x1p0000jw6xq1q2q3q4',
  })
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @ApiProperty({
    description: 'Message type',
    enum: MessageType,
    example: MessageType.TEXT,
  })
  @IsEnum(MessageType)
  type: MessageType;

  @ApiPropertyOptional({
    description: 'Message content (required for TEXT type)',
    example: 'Hello, how are you?',
  })
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  @ValidateIf(o => o.type === 'TEXT')
  content?: string;

  @ApiPropertyOptional({
    description: 'Reply to message ID',
    example: 'clk7w9x1p0000jw6xq1q2q3q4',
  })
  @IsString()
  @IsOptional()
  replyToId?: string;

  @ApiPropertyOptional({
    description: 'File URL for media messages',
    example: 'https://example.com/image.jpg',
  })
  @IsUrl()
  @IsOptional()
  @ValidateIf(o => o.type === 'IMAGE' || o.type === 'FILE')
  mediaUrl?: string;

  @ApiPropertyOptional({
    description: 'Thumbnail URL for images/videos',
    example: 'https://example.com/thumb.jpg',
  })
  @IsUrl()
  @IsOptional()
  @ValidateIf(o => o.type === 'IMAGE' || o.type === 'FILE')
  thumbnailUrl?: string;

  @ApiPropertyOptional({
    description: 'File name',
    example: 'image.jpg',
  })
  @IsString()
  @IsOptional()
  @ValidateIf(o => o.type === 'IMAGE' || o.type === 'FILE')
  fileName?: string;

  @ApiPropertyOptional({
    description: 'File size in bytes',
    example: 1024000,
  })
  @IsNumber()
  @IsOptional()
  @ValidateIf(o => o.type === 'IMAGE' || o.type === 'FILE')
  fileSize?: number;

  @ApiPropertyOptional({
    description: 'MIME type',
    example: 'image/jpeg',
  })
  @IsString()
  @IsOptional()
  @ValidateIf(o => o.type === 'IMAGE' || o.type === 'FILE')
  mimeType?: string;

  @ApiPropertyOptional({
    description: 'Media width (for images/videos)',
    example: 1920,
  })
  @IsNumber()
  @IsOptional()
  @ValidateIf(o => o.type === 'IMAGE')
  width?: number;

  @ApiPropertyOptional({
    description: 'Media height (for images/videos)',
    example: 1080,
  })
  @IsNumber()
  @IsOptional()
  @ValidateIf(o => o.type === 'IMAGE')
  height?: number;

  @ApiPropertyOptional({
    description: 'Duration in seconds (for videos/audio)',
    example: 120,
  })
  @IsNumber()
  @IsOptional()
  @ValidateIf(o => o.type === 'FILE')
  duration?: number;

  @ApiPropertyOptional({
    description: 'Skip safety scan (for trusted users)',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  skipSafetyScan?: boolean = false;
}