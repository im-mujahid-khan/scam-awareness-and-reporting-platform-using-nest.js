import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { MessageRequestStatus, ReportReason } from '@prisma/client';

export class ManageMessageRequestDto {
  @ApiProperty({
    description: 'Message request ID',
    example: 'clk7w9x1p0000jw6xq1q2q3q4',
  })
  @IsString()
  @IsNotEmpty()
  requestId: string;

  @ApiProperty({
    description: 'Action to take',
    enum: MessageRequestStatus,
    example: MessageRequestStatus.ACCEPTED,
  })
  @IsEnum(MessageRequestStatus)
  action: MessageRequestStatus;

  @ApiPropertyOptional({
    description: 'Reason for declining',
    example: 'I prefer not to connect.',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class BlockUserDto {
  @ApiProperty({
    description: 'User ID to block',
    example: 'clk7w9x1p0000jw6xq1q2q3q4',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiPropertyOptional({
    description: 'Reason for blocking',
    example: 'Inappropriate messages',
  })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Block expiration in days (null for permanent)',
    example: 30,
  })
  @IsNumber()
  @IsOptional()
  expiresInDays?: number;
}

export class ReportMessageDto {
  @ApiProperty({
    description: 'Message ID to report',
    example: 'clk7w9x1p0000jw6xq1q2q3q4',
  })
  @IsString()
  @IsNotEmpty()
  messageId: string;

  @ApiProperty({
    description: 'Report reason',
    enum: ReportReason,
    example: ReportReason.ABUSIVE,
  })
  @IsEnum(ReportReason)
  reason: ReportReason;

  @ApiPropertyOptional({
    description: 'Additional details',
    example: 'This message contains offensive language.',
  })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateMessageStatusDto {
  @ApiProperty({
    description: 'Message status',
    enum: ['DELETED', 'READ'],
    example: 'READ',
  })
  @IsString()
  @IsNotEmpty()
  status: 'DELETED' | 'READ';

  @ApiPropertyOptional({
    description: 'Mark all messages in conversation as read',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  markAll?: boolean = false;
}

export class BlockCompanyUserDto {
  @ApiProperty({
    description: 'User ID to block',
    example: 'clk7w9x1p0000jw6xq1q2q3q4',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Company ID',
    example: 'clk7w9x1p0000jw6xq1q2q3q4',
  })
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @ApiPropertyOptional({
    description: 'Reason for blocking',
    example: 'Inappropriate messages to company',
  })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Block expiration in days (null for permanent)',
    example: 30,
  })
  @IsOptional()
  expiresInDays?: number;
}

export class UnblockUserDto {
  @ApiProperty({
    description: 'User ID to unblock',
    example: 'clk7w9x1p0000jw6xq1q2q3q4',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiPropertyOptional({
    description: 'Company ID (for company unblock)',
    example: 'clk7w9x1p0000jw6xq1q2q3q4',
  })
  @IsString()
  @IsOptional()
  companyId?: string;
}

export class DeleteMessageDto {
  @ApiProperty({
    description: 'Message ID to delete',
    example: 'clk7w9x1p0000jw6xq1q2q3q4',
  })
  @IsString()
  @IsNotEmpty()
  messageId: string;

  @ApiPropertyOptional({
    description: 'Force delete (admin only)',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  force?: boolean = false;
}