import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn } from 'class-validator';

export class AdminReviewDto {
  @ApiProperty({ 
    example: 'PUBLISHED',
    description: 'New status: PUBLISHED or REJECTED',
    enum: ['PUBLISHED', 'REJECTED']
  })
  @IsString()
  @IsIn(['PUBLISHED', 'REJECTED'])
  status: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reviewNotes?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  rejectionReason?: string;
}