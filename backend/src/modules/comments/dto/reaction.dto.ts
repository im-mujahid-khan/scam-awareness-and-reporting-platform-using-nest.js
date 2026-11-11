import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum } from 'class-validator';

export enum ReactionType {
  LIKE = 'like',
  UPVOTE = 'upvote',
  DOWNVOTE = 'downvote',
}

export class ReactionDto {
  @ApiProperty({ 
    enum: ReactionType, 
    example: ReactionType.LIKE, // (required)
  })
  @IsEnum(ReactionType)
  type: ReactionType;
}