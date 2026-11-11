import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateCommentDto {
  @ApiPropertyOptional({ 
    example: 'Updated comment with corrected information. (optional)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  content?: string;

  @ApiPropertyOptional({ 
    example: 'Fixed typo in the response. (optional)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  editReason?: string;
}