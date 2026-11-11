import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsNumber, Min, Max, IsBoolean, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export enum CommentSortType {
  TOP = 'top',
  NEWEST = 'newest',
  OLDEST = 'oldest',
}

export class QueryCommentsDto {
  @ApiPropertyOptional({ 
    example: CommentSortType.TOP, // (optional)
  })
  @IsOptional()
  @IsEnum(CommentSortType)
  sortBy?: CommentSortType = CommentSortType.TOP;

  @ApiPropertyOptional({ 
    example: 1, // (optional)
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ 
    example: 20, // (optional)
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ 
    example: false, // (optional)
  })
  @IsOptional()
  @IsBoolean()
  includeDeleted?: boolean = false;

  @ApiPropertyOptional({ 
    example: false, // (optional)
  })
  @IsOptional()
  @IsBoolean()
  includeReported?: boolean = false;

  @ApiPropertyOptional({ 
    example: 'user_abc123def456', // (optional)
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ 
    example: 'cmt_parent123', // (optional)
  })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ 
    example: 3, // (optional)
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(10)
  maxDepth?: number = 3;
}