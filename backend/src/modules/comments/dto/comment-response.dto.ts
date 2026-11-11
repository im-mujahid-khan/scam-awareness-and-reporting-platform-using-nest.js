import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class UserResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  displayName: string;

  @ApiPropertyOptional()
  @Expose()
  avatarUrl?: string;

  @ApiProperty()
  @Expose()
  isVerified?: boolean;
}

export class CommentResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  content: string;

  @ApiProperty()
  @Expose()
  postId: string;

  @ApiPropertyOptional()
  @Expose()
  groupPostId?: string;

  @ApiPropertyOptional()
  @Expose()
  parentId?: string;

  @ApiProperty()
  @Expose()
  depth: number;

  @ApiProperty()
  @Expose()
  likes: number;

  @ApiProperty()
  @Expose()
  upvotes: number;

  @ApiProperty()
  @Expose()
  downvotes: number;

  @ApiProperty()
  @Expose()
  isDeleted: boolean;

  @ApiProperty()
  @Expose()
  isEdited: boolean;

  @ApiProperty()
  @Expose()
  isVerified: boolean;

  @ApiProperty()
  @Expose()
  isReported: boolean;

  @ApiProperty()
  @Expose()
  isSafe: boolean;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiPropertyOptional()
  @Expose()
  editedAt?: Date;

  @ApiProperty()
  @Type(() => UserResponseDto)
  @Expose()
  user: UserResponseDto;

  @ApiPropertyOptional()
  @Expose()
  hasLiked?: boolean;

  @ApiPropertyOptional()
  @Expose()
  hasUpvoted?: boolean;

  @ApiPropertyOptional()
  @Expose()
  hasDownvoted?: boolean;

  @ApiPropertyOptional({ type: [CommentResponseDto] })
  @Expose()
  replies?: CommentResponseDto[];

  @ApiProperty()
  @Expose()
  replyCount: number;
}