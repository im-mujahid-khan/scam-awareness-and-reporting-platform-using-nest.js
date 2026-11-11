import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from './../../../database/prisma.service';
import { ReactionType } from '../dto/reaction.dto';

@Injectable()
export class CommentReactionsService {
  constructor(private prisma: PrismaService) {}

  async addReaction(commentId: string, userId: string, type: ReactionType) {
    // Check if comment exists
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId }
    });

    if (!comment || comment.isDeleted) {
      throw new NotFoundException('Comment not found');
    }

    // Check if user already has this reaction
    const existingReaction = await this.prisma.commentReaction.findUnique({
      where: {
        commentId_userId_type: {
          commentId,
          userId,
          type
        }
      }
    });

    if (existingReaction) {
      throw new BadRequestException('You have already reacted with this type');
    }

    // Remove opposite reactions if applicable
    let removedOpposite = false;
    if (type === ReactionType.UPVOTE) {
      const downvote = await this.prisma.commentReaction.findUnique({
        where: {
          commentId_userId_type: {
            commentId,
            userId,
            type: ReactionType.DOWNVOTE
          }
        }
      });

      if (downvote) {
        await this.prisma.commentReaction.delete({
          where: {
            commentId_userId_type: {
              commentId,
              userId,
              type: ReactionType.DOWNVOTE
            }
          }
        });
        await this.prisma.comment.update({
          where: { id: commentId },
          data: { downvotes: { decrement: 1 } }
        });
        removedOpposite = true;
      }
    } else if (type === ReactionType.DOWNVOTE) {
      const upvote = await this.prisma.commentReaction.findUnique({
        where: {
          commentId_userId_type: {
            commentId,
            userId,
            type: ReactionType.UPVOTE
          }
        }
      });

      if (upvote) {
        await this.prisma.commentReaction.delete({
          where: {
            commentId_userId_type: {
              commentId,
              userId,
              type: ReactionType.UPVOTE
            }
          }
        });
        await this.prisma.comment.update({
          where: { id: commentId },
          data: { upvotes: { decrement: 1 } }
        });
        removedOpposite = true;
      }
    }

    // Add new reaction
    await this.prisma.commentReaction.create({
      data: {
        commentId,
        userId,
        type
      }
    });

    // Update comment counts
    const updateData: any = {};
    switch (type) {
      case ReactionType.LIKE:
        updateData.likes = { increment: 1 };
        break;
      case ReactionType.UPVOTE:
        updateData.upvotes = { increment: 1 };
        // If we removed a downvote, we already decremented it above
        if (!removedOpposite) {
          // Ensure downvotes aren't negative
          updateData.downvotes = comment.downvotes > 0 ? { decrement: 0 } : undefined;
        }
        break;
      case ReactionType.DOWNVOTE:
        updateData.downvotes = { increment: 1 };
        // If we removed an upvote, we already decremented it above
        if (!removedOpposite) {
          // Ensure upvotes aren't negative
          updateData.upvotes = comment.upvotes > 0 ? { decrement: 0 } : undefined;
        }
        break;
    }

    await this.prisma.comment.update({
      where: { id: commentId },
      data: updateData
    });

    // Create notification for comment owner (except when reacting to own comment)
    if (comment.userId !== userId) {
      await this.prisma.notification.create({
        data: {
          userId: comment.userId,
          type: 'NEW_REACTION',
          title: 'New Reaction',
          message: `Someone reacted to your comment`,
          data: { commentId, reactionType: type }
        }
      });
    }

    return { success: true, message: 'Reaction added successfully' };
  }

  async removeReaction(commentId: string, userId: string, type: ReactionType) {
    // Check if reaction exists
    const reaction = await this.prisma.commentReaction.findUnique({
      where: {
        commentId_userId_type: {
          commentId,
          userId,
          type
        }
      }
    });

    if (!reaction) {
      throw new NotFoundException('Reaction not found');
    }

    // Delete the reaction
    await this.prisma.commentReaction.delete({
      where: {
        commentId_userId_type: {
          commentId,
          userId,
          type
        }
      }
    });

    // Update comment counts
    const updateData: any = {};
    switch (type) {
      case ReactionType.LIKE:
        updateData.likes = { decrement: 1 };
        break;
      case ReactionType.UPVOTE:
        updateData.upvotes = { decrement: 1 };
        break;
      case ReactionType.DOWNVOTE:
        updateData.downvotes = { decrement: 1 };
        break;
    }

    // Ensure counts don't go below zero
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { likes: true, upvotes: true, downvotes: true }
    });

    if (comment) {
      if (type === ReactionType.LIKE && comment.likes <= 0) {
        updateData.likes = 0;
      } else if (type === ReactionType.UPVOTE && comment.upvotes <= 0) {
        updateData.upvotes = 0;
      } else if (type === ReactionType.DOWNVOTE && comment.downvotes <= 0) {
        updateData.downvotes = 0;
      }
    }

    await this.prisma.comment.update({
      where: { id: commentId },
      data: updateData
    });

    return { success: true, message: 'Reaction removed successfully' };
  }

  async getUserReactions(commentId: string, userId: string) {
    const reactions = await this.prisma.commentReaction.findMany({
      where: {
        commentId,
        userId
      },
      select: { type: true }
    });

    return reactions.map(r => r.type);
  }

  async getReactionStats(commentId: string) {
    const reactions = await this.prisma.commentReaction.groupBy({
      by: ['type'],
      where: { commentId },
      _count: true
    });

    return reactions.reduce((acc, curr) => {
      acc[curr.type] = curr._count;
      return acc;
    }, {});
  }
}