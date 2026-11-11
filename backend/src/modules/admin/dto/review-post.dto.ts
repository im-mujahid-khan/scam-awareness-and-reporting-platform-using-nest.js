import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsBoolean } from 'class-validator';
import { PostStatus } from '@prisma/client';

export class ReviewPostDto {
  @ApiProperty({ enum: PostStatus, description: 'New status for the post' })
  @IsEnum(PostStatus)
  status: PostStatus;

  @ApiPropertyOptional({ description: 'Review notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Rejection reason' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}