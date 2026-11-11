import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength, IsBoolean } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ 
    example: 'This is a helpful comment about the scam report. (required)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  content: string;

  @ApiProperty({ 
    example: 'post_abc123def456 (required)',
  })
  @IsString()
  @IsNotEmpty()
  postId: string;

  @ApiPropertyOptional({ 
    example: 'cmt_abc123def456 (optional)',
  })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ 
    example: 'grp_post_abc123 (optional)',
  })
  @IsOptional()
  @IsString()
  groupPostId?: string;

  @ApiPropertyOptional({ 
    example: false, // (optional, admin only)
  })
  @IsOptional()
  @IsBoolean()
  skipSafetyCheck?: boolean = false;
}