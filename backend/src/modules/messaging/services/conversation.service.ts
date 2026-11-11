import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  ConversationType,
  MessageRequestStatus,
  BlockStatus,
} from '@prisma/client';

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Find or create a conversation between two users
   */
  async findOrCreateUserConversation(
    user1Id: string,
    user2Id: string,
  ) {
    // Check if conversation already exists
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        OR: [
          { user1Id, user2Id },
          { user1Id: user2Id, user2Id: user1Id },
        ],
        type: ConversationType.USER_TO_USER,
      },
      include: this.getConversationInclude(),
    });

    // If conversation exists, return it
    if (conversation) {
      if (conversation.isBlocked) {
        throw new ForbiddenException('This conversation is blocked');
      }

      const block = await this.prisma.messageBlock.findFirst({
        where: {
          OR: [
            { blockerId: user1Id, blockedUserId: user2Id },
            { blockerId: user2Id, blockedUserId: user1Id },
          ],
          status: BlockStatus.ACTIVE,
        },
      });

      if (block) {
        throw new ForbiddenException('User is blocked');
      }

      return conversation;
    }

    // Create new conversation
    conversation = await this.prisma.conversation.create({
      data: {
        type: ConversationType.USER_TO_USER,
        user1Id,
        user2Id,
      },
      include: this.getConversationInclude(),
    });

    return conversation;
  }

  /**
   * Find or create a conversation between company and user
   */
  async findOrCreateCompanyConversation(
    companyId: string,
    userId: string,
    companyUserId?: string,
  ) {
    // Check if conversation already exists
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        companyId,
        otherUserId: userId,
        type: ConversationType.COMPANY_TO_USER,
      },
      include: this.getConversationInclude(),
    });

    // If conversation exists, return it
    if (conversation) {
      if (conversation.isBlocked) {
        throw new ForbiddenException('This conversation is blocked');
      }

      // Update company user if provided
      if (companyUserId && !conversation.companyUserId) {
        conversation = await this.prisma.conversation.update({
          where: { id: conversation.id },
          data: { companyUserId },
          include: this.getConversationInclude(),
        });
      }

      return conversation;
    }

    // Create new conversation
    conversation = await this.prisma.conversation.create({
      data: {
        type: ConversationType.COMPANY_TO_USER,
        companyId,
        companyUserId,
        otherUserId: userId,
      },
      include: this.getConversationInclude(),
    });

    return conversation;
  }

  /**
   * Get conversation by ID with authorization check
   */
  async getConversation(
    conversationId: string,
    userId: string,
    companyId?: string,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: this.getConversationInclude(),
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Check authorization
    const isAuthorized = this.checkConversationAccess(conversation, userId, companyId);
    if (!isAuthorized) {
      throw new ForbiddenException('Access denied to conversation');
    }

    return conversation;
  }

  /**
   * Get user's conversations
   */
  async getUserConversations(
    userId: string,
    page: number = 1,
    limit: number = 20,
    type?: ConversationType,
  ) {
    const skip = (page - 1) * limit;

    const where = {
      ...(type && { type }),
      OR: [
        { user1Id: userId },
        { user2Id: userId },
        { otherUserId: userId },
        { companyUserId: userId },
      ],
      AND: [
        {
          OR: [
            { type: ConversationType.USER_TO_USER, deletedByUser1: false, deletedByUser2: false },
            { 
              type: ConversationType.COMPANY_TO_USER, 
              OR: [
                { otherUserId: userId, deletedByUser2: false },
                { companyUserId: userId, deletedByCompany: false }
              ]
            },
          ],
        },
      ],
      isBlocked: false,
    };

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        include: this.getConversationInclude(),
        orderBy: { lastMessageAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.conversation.count({ where }),
    ]);

    // Calculate unread counts for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conversation) => {
        const unreadCount = await this.getUnreadCount(conversation, userId);
        return {
          ...conversation,
          unreadCount,
        };
      })
    );

    return {
      data: conversationsWithUnread,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Delete conversation (soft delete for user)
   */
  async deleteConversationForUser(
    conversationId: string,
    userId: string,
  ) {
    const conversation = await this.getConversation(conversationId, userId);

    let updateData: any = {};

    if (conversation.type === ConversationType.USER_TO_USER) {
      if (conversation.user1Id === userId) {
        updateData.deletedByUser1 = true;
      } else if (conversation.user2Id === userId) {
        updateData.deletedByUser2 = true;
      }
    } else if (conversation.type === ConversationType.COMPANY_TO_USER) {
      if (conversation.otherUserId === userId) {
        updateData.deletedByUser2 = true;
      } else if (conversation.companyUserId === userId) {
        updateData.deletedByCompany = true;
      }
    }

    if (Object.keys(updateData).length === 0) {
      throw new ForbiddenException('Cannot delete conversation');
    }

    // Check if all parties have deleted the conversation
    const allDeleted = 
      (conversation.deletedByUser1 || updateData.deletedByUser1) &&
      (conversation.deletedByUser2 || updateData.deletedByUser2) ||
      (conversation.deletedByCompany || updateData.deletedByCompany) &&
      (conversation.deletedByUser2 || updateData.deletedByUser2);

    if (allDeleted) {
      // Actually delete the conversation and all messages
      await this.prisma.conversation.delete({
        where: { id: conversationId },
      });
      return { deleted: true };
    } else {
      // Soft delete only for this user
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: updateData,
      });
      return { deleted: false, message: 'Removed from your inbox' };
    }
  }

  /**
   * Get unread message count for a conversation
   */
  private async getUnreadCount(conversation: any, userId: string): Promise<number> {
    if (conversation.type === ConversationType.USER_TO_USER) {
      if (conversation.user1Id === userId) {
        return conversation.unreadCount1;
      } else if (conversation.user2Id === userId) {
        return conversation.unreadCount2;
      }
    } else if (conversation.type === ConversationType.COMPANY_TO_USER) {
      if (conversation.otherUserId === userId) {
        return conversation.unreadCount2;
      } else if (conversation.companyUserId === userId) {
        return conversation.unreadCount1;
      }
    }
    return 0;
  }

  /**
   * Check if user has access to conversation
   */
  private checkConversationAccess(
    conversation: any,
    userId: string,
    companyId?: string,
  ): boolean {
    switch (conversation.type) {
      case ConversationType.USER_TO_USER:
        return conversation.user1Id === userId || conversation.user2Id === userId;
      
      case ConversationType.COMPANY_TO_USER:
        if (companyId) {
          return conversation.companyId === companyId;
        }
        return conversation.otherUserId === userId || 
               conversation.companyUserId === userId;
      
      default:
        return false;
    }
  }

  /**
   * Get conversation include object
   */
  private getConversationInclude() {
    return {
      user1: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          email: true,
          isActive: true,
        },
      },
      user2: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          email: true,
          isActive: true,
        },
      },
      company: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          isVerified: true,
        },
      },
      companyUser: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          email: true,
          isActive: true,
        },
      },
      otherUser: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          email: true,
          isActive: true,
        },
      },
      lastMessage: {
        include: {
          sender: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
              email: true,
              isActive: true,
            },
          },
        },
      },
    };
  }
}