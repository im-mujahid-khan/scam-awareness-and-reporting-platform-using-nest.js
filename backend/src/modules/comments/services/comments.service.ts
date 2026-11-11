import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CommentSafetyService } from './comment-safety.service';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { UpdateCommentDto } from '../dto/update-comment.dto';
import { QueryCommentsDto, CommentSortType } from '../dto/query-comments.dto';
import { CommentResponseDto } from '../dto/comment-response.dto';
import { PaginatedComments } from '../interfaces/comment-sort.interface';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class CommentsService {
  constructor(
    private prisma: PrismaService,
    private safetyService: CommentSafetyService,
  ) {}
  async moderateComment(
    commentId: string,
    moderatorId: string,
    action: string,
    reason: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const updateData: any = {};
    switch (action) {
      case 'verify':
        updateData.isVerified = true;
        break;
      case 'unverify':
        updateData.isVerified = false;
        break;
      case 'flag':
        updateData.isFlagged = true;
        break;
      case 'unflag':
        updateData.isFlagged = false;
        break;
      default:
        throw new BadRequestException('Invalid moderation action');
    }

    const comment = await this.prisma.comment.update({
      where: { id: commentId },
      data: updateData,
    });

    // Log moderation action
    await this.prisma.auditLog.create({
      data: {
        userId: moderatorId,
        action: `COMMENT_${action.toUpperCase()}`,
        entityType: 'COMMENT',
        entityId: commentId,
        changes: { action, reason },
        ipAddress,
        userAgent,
      },
    });

    return comment;
  }
  async createComment(userId: string, createCommentDto: CreateCommentDto) {
    const { content, postId, parentId, groupPostId, skipSafetyCheck } =
      createCommentDto;

    // Validate post exists
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, status: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.status !== 'PUBLISHED') {
      throw new BadRequestException('Cannot comment on unpublished post');
    }

    // Check if commenting on group post
    if (groupPostId) {
      const groupPost = await this.prisma.groupPost.findUnique({
        where: { id: groupPostId },
        include: { group: true },
      });

      if (!groupPost) {
        throw new NotFoundException('Group post not found');
      }

      // Check if user is member of the group
      const isMember = await this.prisma.groupMember.findFirst({
        where: {
          groupId: groupPost.groupId,
          userId,
          status: 'ACTIVE',
          isActive: true,
        },
      });

      if (!isMember) {
        throw new ForbiddenException(
          'You must be a member of the group to comment',
        );
      }
    }

    // Check parent comment if replying
    let depth = 0;
    if (parentId) {
      const parentComment = await this.prisma.comment.findUnique({
        where: { id: parentId },
        select: { depth: true, postId: true },
      });

      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }

      if (parentComment.postId !== postId) {
        throw new BadRequestException(
          'Parent comment does not belong to this post',
        );
      }

      depth = parentComment.depth + 1;

      // Limit nesting depth
      if (depth > 10) {
        throw new BadRequestException('Maximum comment depth exceeded');
      }
    }

    // Apply safety filters
    const safetyResult = await this.safetyService.moderateComment(
      content,
      skipSafetyCheck,
    );

    // Create comment
    const comment = await this.prisma.comment.create({
      data: {
        content: safetyResult.filteredContent,
        postId,
        groupPostId,
        parentId,
        userId,
        depth,
        isSafe: safetyResult.isSafe,
        isFlagged: !safetyResult.isSafe,
        isVerified: false, // Can be set based on user reputation
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            verifiedAt: true,
          },
        },
      },
    });

    // Increment post comment count
    await this.prisma.post.update({
      where: { id: postId },
      data: {
        // Assuming you add commentCount field to Post model
        // commentCount: { increment: 1 }
      },
    });

    // Create notification for post owner (except when commenting on own post)
    const postWithOwner = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true },
    });

    if (postWithOwner && postWithOwner.userId !== userId) {
      await this.prisma.notification.create({
        data: {
          userId: postWithOwner.userId,
          type: 'NEW_COMMENT',
          title: 'New Comment',
          message: `Someone commented on your post`,
          data: { postId, commentId: comment.id },
          postId,
        },
      });
    }

    // Notify parent comment owner if replying
    if (parentId) {
      const parentComment = await this.prisma.comment.findUnique({
        where: { id: parentId },
        select: { userId: true },
      });

      if (parentComment && parentComment.userId !== userId) {
        await this.prisma.notification.create({
          data: {
            userId: parentComment.userId,
            type: 'NEW_REPLY',
            title: 'New Reply',
            message: `Someone replied to your comment`,
            data: { postId, commentId: comment.id, parentId },
            postId,
          },
        });
      }
    }

    return plainToInstance(CommentResponseDto, {
      ...comment,
      replyCount: 0,
      hasLiked: false,
      hasUpvoted: false,
      hasDownvoted: false,
    });
  }

  async getComments(
    postId: string,
    query: QueryCommentsDto,
    userId?: string,
  ): Promise<PaginatedComments> {
    const {
      sortBy,
      page = 1,
      limit = 20,
      includeDeleted,
      parentId,
      maxDepth = 3,
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      postId,
      isDeleted: includeDeleted ? undefined : false,
    };

    if (parentId) {
      where.parentId = parentId;
    } else {
      where.parentId = null; // Top-level comments only
    }

    // Apply depth limit for nested comments
    where.depth = { lte: maxDepth };

    // Build orderBy based on sort type
    let orderBy: any;
    switch (sortBy) {
      case CommentSortType.TOP:
        orderBy = [
          { likes: 'desc' },
          { upvotes: 'desc' },
          { createdAt: 'desc' },
        ];
        break;
      case CommentSortType.NEWEST:
        orderBy = { createdAt: 'desc' };
        break;
      case CommentSortType.OLDEST:
        orderBy = { createdAt: 'asc' };
        break;
      default:
        orderBy = { createdAt: 'desc' };
    }

    // Get comments
    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
              verifiedAt: true,
            },
          },
          // Include reactions for current user
          commentReactions: userId
            ? {
                where: { userId },
                select: { type: true },
              }
            : false,
          _count: {
            select: { replies: true },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.comment.count({ where }),
    ]);

    // Map comments to include user reaction status
    const mappedComments = comments.map((comment) => {
      const userReactions = comment.commentReactions || [];
      return plainToInstance(CommentResponseDto, {
        ...comment,
        replyCount: comment._count?.replies || 0,
        hasLiked: userReactions.some((r) => r.type === 'like'),
        hasUpvoted: userReactions.some((r) => r.type === 'upvote'),
        hasDownvoted: userReactions.some((r) => r.type === 'downvote'),
        replies: [], // Will be populated separately if needed
      });
    });

    // For top-level comments, fetch replies if needed
    if (!parentId && maxDepth > 0) {
      for (const comment of mappedComments) {
        if (comment.replyCount > 0) {
          comment.replies = await this.getCommentReplies(
            comment.id,
            maxDepth - 1,
            userId,
          );
        }
      }
    }

    return {
      comments: mappedComments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrevious: page > 1,
    };
  }

  private async getCommentReplies(
    commentId: string,
    maxDepth: number,
    userId?: string,
  ) {
    if (maxDepth <= 0) return [];

    const replies = await this.prisma.comment.findMany({
      where: {
        parentId: commentId,
        isDeleted: false,
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            verifiedAt: true,
          },
        },
        commentReactions: userId
          ? {
              where: { userId },
              select: { type: true },
            }
          : false,
        _count: {
          select: { replies: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const mappedReplies = replies.map((reply) =>
      plainToInstance(CommentResponseDto, {
        ...reply,
        replyCount: reply._count?.replies || 0,
        hasLiked: (reply.commentReactions || []).some((r) => r.type === 'like'),
        hasUpvoted: (reply.commentReactions || []).some(
          (r) => r.type === 'upvote',
        ),
        hasDownvoted: (reply.commentReactions || []).some(
          (r) => r.type === 'downvote',
        ),
        replies: [], // Will be populated recursively if needed
      }),
    );

    // Recursively fetch nested replies
    for (const reply of mappedReplies) {
      if (reply.replyCount > 0 && maxDepth > 1) {
        reply.replies = await this.getCommentReplies(
          reply.id,
          maxDepth - 1,
          userId,
        );
      }
    }

    return mappedReplies;
  }

  async getCommentById(id: string, userId?: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            verifiedAt: true,
          },
        },
        commentReactions: userId
          ? {
              where: { userId },
              select: { type: true },
            }
          : false,
        _count: {
          select: { replies: true },
        },
        post: {
          select: {
            id: true,
            title: true,
            postType: true,
          },
        },
      },
    });

    if (
      !comment ||
      (comment.isDeleted &&
        !(
          userId && ['ADMIN', 'MODERATOR'].includes((comment as any).user?.role)
        ))
    ) {
      throw new NotFoundException('Comment not found');
    }

    return plainToInstance(CommentResponseDto, {
      ...comment,
      replyCount: comment._count?.replies || 0,
      hasLiked: (comment.commentReactions || []).some((r) => r.type === 'like'),
      hasUpvoted: (comment.commentReactions || []).some(
        (r) => r.type === 'upvote',
      ),
      hasDownvoted: (comment.commentReactions || []).some(
        (r) => r.type === 'downvote',
      ),
    });
  }

  async updateComment(
    id: string,
    userId: string,
    updateCommentDto: UpdateCommentDto,
  ) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      select: { userId: true, isDeleted: true, createdAt: true },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.isDeleted) {
      throw new BadRequestException('Cannot edit deleted comment');
    }

    // Check if user owns the comment or is admin/moderator
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const isOwner = comment.userId === userId;
    const isModerator =
      user?.role && ['ADMIN', 'MODERATOR', 'SUPER_ADMIN'].includes(user.role);

    if (!isOwner && !isModerator) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    // Check edit time window (15-30 minutes for normal users)
    if (isOwner && !isModerator) {
      const editWindow = 30 * 60 * 1000; // 30 minutes in milliseconds
      const commentAge = Date.now() - new Date(comment.createdAt).getTime();

      if (commentAge > editWindow) {
        throw new ForbiddenException('Edit window has expired (30 minutes)');
      }
    }

    // Apply safety filters to updated content
    let filteredContent = updateCommentDto.content;
    if (updateCommentDto.content) {
      const safetyResult = await this.safetyService.moderateComment(
        updateCommentDto.content,
      );
      filteredContent = safetyResult.filteredContent;
    }

    const updatedComment = await this.prisma.comment.update({
      where: { id },
      data: {
        ...(updateCommentDto.content && { content: filteredContent }),
        isEdited: true,
        editedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            verifiedAt: true,
          },
        },
      },
    });

    return plainToInstance(CommentResponseDto, updatedComment);
  }

  async deleteComment(id: string, userId: string, hardDelete = false) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      select: { userId: true, isDeleted: true },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.isDeleted && !hardDelete) {
      throw new BadRequestException('Comment is already deleted');
    }

    // Check if user owns the comment or is admin/moderator
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const isOwner = comment.userId === userId;
    const isModerator =
      user?.role && ['ADMIN', 'MODERATOR', 'SUPER_ADMIN'].includes(user.role);

    if (!isOwner && !isModerator) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    if (hardDelete && !isModerator) {
      throw new ForbiddenException('Only moderators can hard delete comments');
    }

    if (hardDelete) {
      // Permanently delete the comment
      await this.prisma.comment.delete({
        where: { id },
      });
      return { message: 'Comment permanently deleted' };
    } else {
      // Soft delete
      await this.prisma.comment.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          content: '[This comment has been deleted]',
        },
      });
      return { message: 'Comment deleted successfully' };
    }
  }

  async getCommentsByUser(userId: string, query: QueryCommentsDto) {
    const { sortBy, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    let orderBy: any;
    switch (sortBy) {
      case CommentSortType.NEWEST:
        orderBy = { createdAt: 'desc' };
        break;
      case CommentSortType.OLDEST:
        orderBy = { createdAt: 'asc' };
        break;
      case CommentSortType.TOP:
        orderBy = { likes: 'desc' };
        break;
      default:
        orderBy = { createdAt: 'desc' };
    }

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where: {
          userId,
          isDeleted: false,
        },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
              verifiedAt: true,
            },
          },
          post: {
            select: {
              id: true,
              title: true,
              postType: true,
            },
          },
          _count: {
            select: { replies: true },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.comment.count({
        where: {
          userId,
          isDeleted: false,
        },
      }),
    ]);

    const mappedComments = comments.map((comment) =>
      plainToInstance(CommentResponseDto, {
        ...comment,
        replyCount: comment._count?.replies || 0,
        hasLiked: false,
        hasUpvoted: false,
        hasDownvoted: false,
      }),
    );

    return {
      comments: mappedComments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrevious: page > 1,
    };
  }
}
