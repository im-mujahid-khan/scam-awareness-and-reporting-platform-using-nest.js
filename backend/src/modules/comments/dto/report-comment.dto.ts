import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, MaxLength } from 'class-validator';

export enum ReportReason {
  ABUSIVE = 'ABUSIVE',
  SPAM = 'SPAM',
  SENSITIVE_INFO = 'SENSITIVE_INFO',
  HARASSMENT = 'HARASSMENT',
  OTHER = 'OTHER',
}

export class ReportCommentDto {
  @ApiProperty({ 
    enum: ReportReason, 
    example: ReportReason.ABUSIVE, // (required)
  })
  @IsEnum(ReportReason)
  reason: ReportReason;

  @ApiPropertyOptional({ 
    example: 'This comment contains personal attacks. (optional)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}