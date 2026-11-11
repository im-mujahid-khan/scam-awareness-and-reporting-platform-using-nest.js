import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ConversationType } from '@prisma/client';

export class CreateConversationDto {
  @ApiProperty({
    description: 'Conversation type',
    enum: ConversationType,
    example: ConversationType.USER_TO_USER,
  })
  @IsEnum(ConversationType)
  type: ConversationType;

  @ApiPropertyOptional({
    description: 'Other user ID (for user-to-user conversations)',
    example: 'clk7w9x1p0000jw6xq1q2q3q4',
  })
  @IsString()
  @IsOptional()
  @ValidateIf(o => o.type === ConversationType.USER_TO_USER)
  otherUserId?: string;

  @ApiPropertyOptional({
    description: 'Company ID (for company conversations)',
    example: 'clk7w9x1p0000jw6xq1q2q3q4',
  })
  @IsString()
  @IsOptional()
  @ValidateIf(o => o.type === ConversationType.COMPANY_TO_USER || o.type === ConversationType.USER_TO_COMPANY)
  companyId?: string;

  @ApiPropertyOptional({
    description: 'Initial message',
    example: 'Hello, I would like to connect with you.',
  })
  @IsString()
  @IsOptional()
  initialMessage?: string;
}

export class SendMessageRequestDto {
  @ApiProperty({
    description: 'Receiver user ID',
    example: 'clk7w9x1p0000jw6xq1q2q3q4',
  })
  @IsString()
  @IsNotEmpty()
  receiverId: string;

  @ApiProperty({
    description: 'Message content',
    example: 'Hello, I would like to connect with you.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  message: string;
}