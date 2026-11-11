import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { MessageSafetyService } from './message-safety.service';
import { ConversationService } from './conversation.service';
import { NotificationsGateway } from '../../notifications/gateways/notifications.gateway';
import { S3Service } from '../../s3/s3.service';
import {
  MessageType,
  MessageStatus,
  MessageRequestStatus,
  ReportStatus,
  ReportReason,
  BlockStatus,
  ConversationType,
} from '@prisma/client';
import { CreateMessageDto } from '../dtos/requests/create-message.dto';
import { SendMessageRequestDto } from '../dtos/requests/create-conversation.dto';
import {
  ReportMessageDto,
  UpdateMessageStatusDto,
  BlockCompanyUserDto,
} from '../dtos/requests/manage-message-request.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    private prisma: PrismaService,
    private messageSafetyService: MessageSafetyService,
    private conversationService: ConversationService,
    private notificationsGateway: NotificationsGateway,
    private s3Service: S3Service,
  ) {}

  /**
   * Send a message
   */
  async sendMessage(senderId: string, dto: CreateMessageDto) {
    // Validate message
    this.validateMessageDto(dto);

    // Get conversation with authorization check
    const conversation = await this.conversationService.getConversation(
      dto.conversationId,
      senderId,
    );

    // Check if conversation is blocked
    if (conversation.isBlocked) {
      throw new ForbiddenException('This conversation is blocked');
    }

    // Check if sender is blocked
    const block = await this.prisma.messageBlock.findFirst({
      where: {
        conversationId: conversation.id,
        blockedUserId: senderId,
        status: BlockStatus.ACTIVE,
      },
    });

    if (block) {
      throw new ForbiddenException('You are blocked from sending messages');
    }

    // Prepare message data
    const messageData: any = {
      conversationId: conversation.id,
      senderId,
      type: dto.type,
      status: MessageStatus.SENT,
    };

    // Handle different message types
    if (dto.type === MessageType.TEXT && dto.content) {
      const scanResult = dto.skipSafetyScan
        ? {
            isSafe: true,
            maskedContent: dto.content,
            safetyScore: 100,
            scanResult: { skipped: true },
          }
        : await this.messageSafetyService.scanAndMaskContent(dto.content);

      messageData.content = scanResult.maskedContent;
      messageData.originalContent = scanResult.originalContent;
      messageData.isSafe = scanResult.isSafe;
      messageData.safetyScore = scanResult.safetyScore;
      messageData.scannedAt = new Date();
      messageData.scanResult = scanResult.scanResult;

      if (!scanResult.isSafe) {
        this.logger.warn(`Unsafe message detected from user ${senderId}`);
      }
    } else if (
      (dto.type === MessageType.IMAGE || dto.type === MessageType.FILE) &&
      dto.mediaUrl
    ) {
      messageData.mediaUrl = dto.mediaUrl;
      messageData.thumbnailUrl = dto.thumbnailUrl;
      messageData.fileName = dto.fileName;
      messageData.fileSize = dto.fileSize;
      messageData.mimeType = dto.mimeType;
      messageData.width = dto.width;
      messageData.height = dto.height;
      messageData.duration = dto.duration;

      if (dto.type === MessageType.IMAGE && !dto.skipSafetyScan) {
        // In production, implement image scanning
        messageData.isSafe = true;
        messageData.safetyScore = 85;
        messageData.scannedAt = new Date();
      }
    }

    // Add reply reference if exists
    if (dto.replyToId) {
      const replyTo = await this.prisma.message.findUnique({
        where: { id: dto.replyToId },
      });

      if (!replyTo || replyTo.conversationId !== conversation.id) {
        throw new BadRequestException('Invalid reply reference');
      }

      messageData.replyToId = dto.replyToId;
    }

    // Create message
    const message = await this.prisma.$transaction(async (tx) => {
      // Create message
      const createdMessage = await tx.message.create({
        data: messageData,
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
          repliesTo: {
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
        },
      });

      // Update conversation last message
      await tx.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageId: createdMessage.id,
          lastMessageAt: createdMessage.createdAt,
          ...this.getUnreadUpdateData(conversation, senderId, 1),
        },
      });

      return createdMessage;
    });

    // Send real-time notification
    await this.sendMessageNotification(message, conversation, senderId);

    return message;
  }

  /**
   * Send a message request (user-to-user)
   */
  async sendMessageRequest(requesterId: string, dto: SendMessageRequestDto) {
    if (requesterId === dto.receiverId) {
      throw new BadRequestException('Cannot send message request to yourself');
    }

    // Check if receiver exists and is active
    const receiver = await this.prisma.user.findUnique({
      where: { id: dto.receiverId, isActive: true },
    });

    if (!receiver) {
      throw new NotFoundException('User not found or inactive');
    }

    // Check if conversation already exists
    const existingConversation = await this.prisma.conversation.findFirst({
      where: {
        OR: [
          { user1Id: requesterId, user2Id: dto.receiverId },
          { user1Id: dto.receiverId, user2Id: requesterId },
        ],
      },
    });

    if (existingConversation) {
      throw new BadRequestException('Conversation already exists');
    }

    // Check if there's a pending request
    const pendingRequest = await this.prisma.messageRequest.findFirst({
      where: {
        OR: [
          { requesterId, receiverId: dto.receiverId },
          { requesterId: dto.receiverId, receiverId: requesterId },
        ],
        status: MessageRequestStatus.PENDING,
      },
    });

    if (pendingRequest) {
      throw new BadRequestException('Message request already pending');
    }

    // Check if user is blocked
    const block = await this.prisma.messageBlock.findFirst({
      where: {
        OR: [
          { blockerId: requesterId, blockedUserId: dto.receiverId },
          { blockerId: dto.receiverId, blockedUserId: requesterId },
        ],
        status: BlockStatus.ACTIVE,
      },
    });

    if (block) {
      throw new ForbiddenException('User is blocked');
    }

    // Create conversation and request in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create conversation
      const conversation = await tx.conversation.create({
        data: {
          type: ConversationType.USER_TO_USER,
          user1Id: requesterId,
          user2Id: dto.receiverId,
          isBlocked: true, // Blocked until request is accepted
        },
      });

      // Create message request
      const messageRequest = await tx.messageRequest.create({
        data: {
          conversationId: conversation.id,
          requesterId,
          receiverId: dto.receiverId,
          message: dto.message,
          status: MessageRequestStatus.PENDING,
        },
        include: {
          requester: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
              email: true,
              isActive: true,
            },
          },
          receiver: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
              email: true,
              isActive: true,
            },
          },
        },
      });

      return { conversation, messageRequest };
    });

    // Send notification to receiver
    this.notificationsGateway.sendToUser(
      dto.receiverId,
      'message_request_received',
      {
        requestId: result.messageRequest.id,
        requester: {
          id: result.messageRequest.requester.id,
          displayName: result.messageRequest.requester.displayName,
          avatarUrl: result.messageRequest.requester.avatarUrl,
        },
        message: dto.message,
        createdAt: new Date().toISOString(),
      },
    );

    return result.messageRequest;
  }

  /**
   * Accept or decline a message request
   */
  async manageMessageRequest(
    userId: string,
    requestId: string,
    action: MessageRequestStatus,
    reason?: string,
  ) {
    const messageRequest = await this.prisma.messageRequest.findUnique({
      where: { id: requestId },
      include: {
        conversation: true,
        requester: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            email: true,
            isActive: true,
          },
        },
        receiver: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            email: true,
            isActive: true,
          },
        },
      },
    });

    if (!messageRequest) {
      throw new NotFoundException('Message request not found');
    }

    if (messageRequest.receiverId !== userId) {
      throw new ForbiddenException('Not authorized to manage this request');
    }

    if (messageRequest.status !== MessageRequestStatus.PENDING) {
      throw new BadRequestException('Request already processed');
    }

    // Update request in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Update request
      const updatedRequest = await tx.messageRequest.update({
        where: { id: requestId },
        data: {
          status: action,
          declineReason:
            action === MessageRequestStatus.DECLINED ? reason : null,
          respondedAt: new Date(),
        },
      });

      // Update conversation based on action
      if (action === MessageRequestStatus.ACCEPTED) {
        await tx.conversation.update({
          where: { id: messageRequest.conversationId },
          data: {
            isBlocked: false,
          },
        });
      } else if (action === MessageRequestStatus.DECLINED) {
        // Delete conversation if declined
        await tx.conversation.delete({
          where: { id: messageRequest.conversationId },
        });
      } else if (action === MessageRequestStatus.BLOCKED) {
        // Create block record
        await tx.messageBlock.create({
          data: {
            conversationId: messageRequest.conversationId,
            blockerId: userId,
            blockedUserId: messageRequest.requesterId,
            reason,
            status: BlockStatus.ACTIVE,
          },
        });

        // Update conversation as blocked
        await tx.conversation.update({
          where: { id: messageRequest.conversationId },
          data: {
            isBlocked: true,
            blockedBy: userId,
            blockedAt: new Date(),
            blockReason: reason,
          },
        });
      }

      return updatedRequest;
    });

    // Send notifications
    if (action === MessageRequestStatus.ACCEPTED) {
      this.notificationsGateway.sendToUser(
        messageRequest.requesterId,
        'message_request_accepted',
        {
          requestId: messageRequest.id,
          receiver: {
            id: messageRequest.receiver.id,
            displayName: messageRequest.receiver.displayName,
          },
          conversationId: messageRequest.conversationId,
          acceptedAt: new Date().toISOString(),
        },
      );
    } else if (action === MessageRequestStatus.DECLINED) {
      this.notificationsGateway.sendToUser(
        messageRequest.requesterId,
        'message_request_declined',
        {
          requestId: messageRequest.id,
          receiver: {
            id: messageRequest.receiver.id,
            displayName: messageRequest.receiver.displayName,
          },
          reason,
          declinedAt: new Date().toISOString(),
        },
      );
    }

    return result;
  }

  /**
   * Get messages in a conversation
   */
  async getConversationMessages(
    conversationId: string,
    userId: string,
    page: number = 1,
    limit: number = 50,
  ) {
    const conversation = await this.conversationService.getConversation(
      conversationId,
      userId,
    );

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: {
          conversationId,
          isDeleted: false,
        },
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
          repliesTo: {
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
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.message.count({
        where: {
          conversationId,
          isDeleted: false,
        },
      }),
    ]);

    // Mark messages as read
    await this.markMessagesAsRead(
      conversation,
      userId,
      messages.map((m) => m.id),
    );

    return {
      data: messages.reverse(), // Return in chronological order
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Update message status
   */
  async updateMessageStatus(
    messageId: string,
    userId: string,
    dto: UpdateMessageStatusDto,
  ) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { conversation: true },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Check authorization
    await this.conversationService.getConversation(
      message.conversationId,
      userId,
    );

    if (dto.status === 'DELETED') {
      // Check if sender can delete (within 15 minutes)
      if (message.senderId !== userId) {
        throw new ForbiddenException('Cannot delete message sent by others');
      }

      const deleteWindow = 15 * 60 * 1000;
      const timeSinceCreation = Date.now() - message.createdAt.getTime();

      if (timeSinceCreation > deleteWindow) {
        throw new BadRequestException('Cannot delete message after 15 minutes');
      }

      const updatedMessage = await this.prisma.message.update({
        where: { id: messageId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          status: MessageStatus.DELETED,
        },
      });

      // Send notification
      this.notificationsGateway.sendToRoom(
        `conversation:${message.conversationId}`,
        'message_deleted',
        {
          messageId,
          deletedBy: userId,
          deletedAt: new Date().toISOString(),
        },
      );

      return updatedMessage;
    } else if (dto.status === 'READ') {
      if (dto.markAll) {
        // Mark all messages in conversation as read
        await this.markAllMessagesAsRead(message.conversationId, userId);
      } else {
        // Mark single message as read
        const updatedMessage = await this.prisma.message.update({
          where: { id: messageId },
          data: {
            status: MessageStatus.READ,
            readAt: new Date(),
          },
        });

        // Update conversation unread count
        await this.updateConversationUnreadCount(message.conversation, userId);
        return updatedMessage;
      }
    }

    return message;
  }

  /**
   * Report a message
   */
  async reportMessage(reporterId: string, dto: ReportMessageDto) {
    const message = await this.prisma.message.findUnique({
      where: { id: dto.messageId },
      include: { conversation: true },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Check authorization
    await this.conversationService.getConversation(
      message.conversationId,
      reporterId,
    );

    // Check if already reported by this user
    const existingReport = await this.prisma.messageReport.findUnique({
      where: {
        messageId_reporterId: {
          messageId: dto.messageId,
          reporterId,
        },
      },
    });

    if (existingReport) {
      throw new BadRequestException('Message already reported');
    }

    // Create report in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create report
      const report = await tx.messageReport.create({
        data: {
          messageId: dto.messageId,
          conversationId: message.conversationId,
          reporterId,
          reason: dto.reason,
          description: dto.description,
          status: ReportStatus.PENDING,
        },
      });

      // Mark message as reported
      await tx.message.update({
        where: { id: dto.messageId },
        data: { isReported: true },
      });

      return report;
    });

    // Notify admins
    this.logger.log(`Message ${dto.messageId} reported by user ${reporterId}`);

    return result;
  }

  /**
   * Block a user
   */
  async blockUser(
    blockerId: string,
    userId: string,
    reason?: string,
    expiresInDays?: number,
  ) {
    if (blockerId === userId) {
      throw new BadRequestException('Cannot block yourself');
    }

    // Check if user exists
    const userToBlock = await this.prisma.user.findUnique({
      where: { id: userId, isActive: true },
    });

    if (!userToBlock) {
      throw new NotFoundException('User not found');
    }

    // Check if already blocked
    const existingBlock = await this.prisma.messageBlock.findFirst({
      where: {
        blockerId,
        blockedUserId: userId,
        status: BlockStatus.ACTIVE,
      },
    });

    if (existingBlock) {
      throw new BadRequestException('User already blocked');
    }

    // Find all conversations between users
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [
          { user1Id: blockerId, user2Id: userId },
          { user1Id: userId, user2Id: blockerId },
        ],
      },
    });

    // Create block records and update conversations in transaction
    await this.prisma.$transaction(async (tx) => {
      // Create block records for each conversation
      const blockPromises = conversations.map((conversation) =>
        tx.messageBlock.create({
          data: {
            conversationId: conversation.id,
            blockerId,
            blockedUserId: userId,
            reason,
            status: BlockStatus.ACTIVE,
            expiresAt: expiresInDays
              ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
              : null,
          },
        }),
      );

      // Block all conversations
      const updatePromises = conversations.map((conversation) =>
        tx.conversation.update({
          where: { id: conversation.id },
          data: {
            isBlocked: true,
            blockedBy: blockerId,
            blockedAt: new Date(),
            blockReason: reason,
          },
        }),
      );

      await Promise.all([...blockPromises, ...updatePromises]);
    });

    return { success: true, message: 'User blocked successfully' };
  }

  async blockUserAsCompany(staffId: string, dto: BlockCompanyUserDto) {
    // Verify staff has permission to block for this company
    const companyStaff = await this.prisma.companyStaff.findFirst({
      where: {
        userId: staffId,
        companyId: dto.companyId,
        isActive: true,
      },
    });

    if (!companyStaff) {
      throw new ForbiddenException(
        'Not authorized to block users for this company',
      );
    }

    // Check if user exists
    const userToBlock = await this.prisma.user.findUnique({
      where: { id: dto.userId, isActive: true },
    });

    if (!userToBlock) {
      throw new NotFoundException('User not found');
    }

    // Check if already blocked by company
    const existingBlock = await this.prisma.messageBlock.findFirst({
      where: {
        companyId: dto.companyId,
        blockedUserId: dto.userId,
        status: BlockStatus.ACTIVE,
      },
    });

    if (existingBlock) {
      throw new BadRequestException('User already blocked by company');
    }

    // Find all company conversations with this user
    const conversations = await this.prisma.conversation.findMany({
      where: {
        companyId: dto.companyId,
        otherUserId: dto.userId,
        type: ConversationType.COMPANY_TO_USER,
      },
    });

    // Create block records and update conversations in transaction
    await this.prisma.$transaction(async (tx) => {
      // Create block record with company reference
      const blockPromises = conversations.map((conversation) =>
        tx.messageBlock.create({
          data: {
            conversationId: conversation.id,
            blockerId: staffId,
            blockedUserId: dto.userId,
            companyId: dto.companyId,
            reason: dto.reason,
            status: BlockStatus.ACTIVE,
            expiresAt: dto.expiresInDays
              ? new Date(Date.now() + dto.expiresInDays * 24 * 60 * 60 * 1000)
              : null,
          },
        }),
      );

      // Block all company conversations with this user
      const updatePromises = conversations.map((conversation) =>
        tx.conversation.update({
          where: { id: conversation.id },
          data: {
            isBlocked: true,
            blockedBy: staffId,
            blockedAt: new Date(),
            blockReason: dto.reason,
          },
        }),
      );

      await Promise.all([...blockPromises, ...updatePromises]);
    });

    return { success: true, message: 'User blocked from company successfully' };
  }

  /**
   * Unblock a user
   */
  async unblockUser(userId: string, targetUserId: string, companyId?: string) {
    // Find active blocks
    const where: any = {
      blockerId: userId,
      blockedUserId: targetUserId,
      status: BlockStatus.ACTIVE,
    };

    if (companyId) {
      where.companyId = companyId;
    }

    const activeBlocks = await this.prisma.messageBlock.findMany({
      where,
    });

    if (activeBlocks.length === 0) {
      throw new NotFoundException('No active block found');
    }

    // Unblock in transaction
    await this.prisma.$transaction(async (tx) => {
      // Update blocks to REVOKED
      await tx.messageBlock.updateMany({
        where: {
          id: { in: activeBlocks.map((block) => block.id) },
        },
        data: {
          status: BlockStatus.REVOKED,
          updatedAt: new Date(),
        },
      });

      // Find conversations to unblock
      const conversationIds = activeBlocks.map((block) => block.conversationId);

      // Unblock conversations
      await tx.conversation.updateMany({
        where: {
          id: { in: conversationIds },
          isBlocked: true,
          blockedBy: userId,
        },
        data: {
          isBlocked: false,
          blockedBy: null,
          blockedAt: null,
          blockReason: null,
        },
      });
    });

    return { success: true, message: 'User unblocked successfully' };
  }

  /**
   * Delete a specific message (permanent delete)
   */
  async deleteMessage(
    userId: string,
    messageId: string,
    force: boolean = false,
  ) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { conversation: true },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Check authorization
    const isAuthorized =
      // User can delete their own messages
      message.senderId === userId ||
      // Admin can force delete
      (force && (await this.isAdmin(userId)));

    if (!isAuthorized) {
      throw new ForbiddenException('Not authorized to delete this message');
    }

    // Check if within delete window (unless force delete)
    if (!force && message.senderId === userId) {
      const deleteWindow = 15 * 60 * 1000; // 15 minutes
      const timeSinceCreation = Date.now() - message.createdAt.getTime();

      if (timeSinceCreation > deleteWindow) {
        throw new BadRequestException('Cannot delete message after 15 minutes');
      }
    }

    // Delete the message
    await this.prisma.message.delete({
      where: { id: messageId },
    });

    // Update conversation last message if needed
    if (message.conversation.lastMessageId === messageId) {
      const lastMessage = await this.prisma.message.findFirst({
        where: {
          conversationId: message.conversationId,
          id: { not: messageId },
        },
        orderBy: { createdAt: 'desc' },
      });

      await this.prisma.conversation.update({
        where: { id: message.conversationId },
        data: {
          lastMessageId: lastMessage?.id || null,
          lastMessageAt: lastMessage?.createdAt || null,
        },
      });
    }

    // Send notification
    this.notificationsGateway.sendToRoom(
      `conversation:${message.conversationId}`,
      'message_permanently_deleted',
      {
        messageId,
        deletedBy: userId,
        deletedAt: new Date().toISOString(),
      },
    );

    return { success: true, message: 'Message deleted successfully' };
  }

  /**
   * Get suggested users for messaging
   */
  async getSuggestedUsers(currentUserId: string, limit: number = 10) {
    // Get active users excluding current user
    const users = await this.prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        isActive: true,
        isDeleted: false,
      },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        email: true,
        verifiedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }, // Newest users first
      take: limit,
    });

    // Check if there are conversations with these users
    const usersWithStatus = await Promise.all(
      users.map(async (user) => {
        // Check if conversation exists
        const existingConversation = await this.prisma.conversation.findFirst({
          where: {
            OR: [
              { user1Id: currentUserId, user2Id: user.id },
              { user1Id: user.id, user2Id: currentUserId },
            ],
          },
          select: {
            id: true,
            isBlocked: true,
            lastMessageAt: true,
          },
        });

        // Check if blocked
        const isBlocked = await this.prisma.messageBlock.findFirst({
          where: {
            OR: [
              { blockerId: currentUserId, blockedUserId: user.id },
              { blockerId: user.id, blockedUserId: currentUserId },
            ],
            status: BlockStatus.ACTIVE,
          },
        });

        return {
          ...user,
          canMessage: !isBlocked,
          existingConversation: existingConversation
            ? {
                id: existingConversation.id,
                isBlocked: existingConversation.isBlocked,
                lastMessageAt: existingConversation.lastMessageAt,
              }
            : null,
          isBlocked: !!isBlocked,
          isNewUser: !existingConversation, // Suggested because no conversation exists
        };
      }),
    );

    // Sort: users without conversations first, then by newest
    return usersWithStatus.sort((a, b) => {
      if (a.isNewUser && !b.isNewUser) return -1;
      if (!a.isNewUser && b.isNewUser) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  /**
   * Helper: Check if user is admin
   */
  private async isAdmin(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    return user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  }

  /**
   * Get user's inbox
   */
  async getUserInbox(userId: string) {
    const [conversations, pendingRequests, companyConversations] =
      await Promise.all([
        // Get user conversations
        this.conversationService.getUserConversations(
          userId,
          1,
          20,
          'USER_TO_USER',
        ),

        // Get pending message requests
        this.prisma.messageRequest.findMany({
          where: {
            receiverId: userId,
            status: MessageRequestStatus.PENDING,
          },
          include: {
            requester: {
              select: {
                id: true,
                displayName: true,
                avatarUrl: true,
                email: true,
                isActive: true,
              },
            },
            receiver: {
              select: {
                id: true,
                displayName: true,
                avatarUrl: true,
                email: true,
                isActive: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),

        // Get company conversations
        this.conversationService.getUserConversations(
          userId,
          1,
          10,
          'COMPANY_TO_USER',
        ),
      ]);

    // Calculate total unread
    const totalUnread = conversations.data.reduce(
      (sum, conv) => sum + conv.unreadCount,
      0,
    );

    return {
      conversations: conversations.data,
      pendingRequests,
      companyConversations: companyConversations.data,
      totalUnread,
    };
  }

  /**
   * Get message requests
   */
  async getMessageRequests(
    userId: string,
    type: 'sent' | 'received' = 'received',
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;

    const where =
      type === 'received' ? { receiverId: userId } : { requesterId: userId };

    const [requests, total] = await Promise.all([
      this.prisma.messageRequest.findMany({
        where,
        include: {
          requester: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
              email: true,
              isActive: true,
            },
          },
          receiver: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
              email: true,
              isActive: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.messageRequest.count({ where }),
    ]);

    return {
      data: requests,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Helper: Send message notification
   */
  private async sendMessageNotification(
    message: any,
    conversation: any,
    senderId: string,
  ) {
    let recipientId: string | undefined = undefined;
    let senderName: string | undefined = undefined;

    if (conversation.type === 'USER_TO_USER') {
      recipientId =
        conversation.user1Id === senderId
          ? conversation.user2Id
          : conversation.user1Id;
      senderName = message.sender.displayName;
    } else if (conversation.type === 'COMPANY_TO_USER') {
      if (senderId === conversation.otherUserId) {
        // User sent message to company
        recipientId = conversation.companyUserId || conversation.companyId;
        senderName = message.sender.displayName;
      } else {
        // Company sent message to user
        recipientId = conversation.otherUserId;
        senderName = conversation.company?.name || 'Company';
      }
    }

    if (recipientId && senderName) {
      this.notificationsGateway.sendToUser(recipientId, 'new_message', {
        messageId: message.id,
        conversationId: conversation.id,
        sender: {
          id: message.sender.id,
          name: senderName,
          avatarUrl: message.sender.avatarUrl,
        },
        content:
          message.type === 'TEXT'
            ? message.content?.substring(0, 100) +
              (message.content?.length > 100 ? '...' : '')
            : `Sent a ${message.type.toLowerCase()}`,
        type: message.type,
        createdAt: message.createdAt.toISOString(),
      });
    }

    // Send to conversation room for real-time updates
    this.notificationsGateway.sendToRoom(
      `conversation:${conversation.id}`,
      'message_received',
      {
        message: {
          id: message.id,
          senderId: message.sender.id,
          type: message.type,
          content: message.content,
          mediaUrl: message.mediaUrl,
          createdAt: message.createdAt.toISOString(),
        },
      },
    );
  }

  /**
   * Helper: Mark messages as read
   */
  private async markMessagesAsRead(
    conversation: any,
    userId: string,
    messageIds: string[],
  ) {
    // Update message status
    await this.prisma.message.updateMany({
      where: {
        id: { in: messageIds },
        senderId: { not: userId },
        status: { not: MessageStatus.READ },
      },
      data: {
        status: MessageStatus.READ,
        readAt: new Date(),
      },
    });

    // Update conversation unread count
    await this.updateConversationUnreadCount(conversation, userId);
  }

  /**
   * Helper: Mark all messages in conversation as read
   */
  private async markAllMessagesAsRead(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) return;

    // Update all messages
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        status: { not: MessageStatus.READ },
      },
      data: {
        status: MessageStatus.READ,
        readAt: new Date(),
      },
    });

    // Reset unread count
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: this.getUnreadUpdateData(conversation, userId, -Infinity),
    });
  }

  /**
   * Helper: Update conversation unread count
   */
  private async updateConversationUnreadCount(
    conversation: any,
    userId: string,
  ) {
    const updateData = this.getUnreadUpdateData(
      conversation,
      userId,
      -Infinity,
    );
    if (Object.keys(updateData).length > 0) {
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: updateData,
      });
    }
  }

  /**
   * Helper: Get unread count update data
   */
  private getUnreadUpdateData(
    conversation: any,
    senderId: string,
    delta: number,
  ): any {
    const data: any = {};

    if (conversation.type === 'USER_TO_USER') {
      if (conversation.user1Id === senderId) {
        data.unreadCount2 = Math.max(0, conversation.unreadCount2 + delta);
      } else if (conversation.user2Id === senderId) {
        data.unreadCount1 = Math.max(0, conversation.unreadCount1 + delta);
      }
    } else if (conversation.type === 'COMPANY_TO_USER') {
      if (senderId === conversation.otherUserId) {
        data.unreadCount1 = Math.max(0, conversation.unreadCount1 + delta);
      } else {
        data.unreadCount2 = Math.max(0, conversation.unreadCount2 + delta);
      }
    }

    return data;
  }

  /**
   * Helper: Validate message DTO
   */
  private validateMessageDto(dto: CreateMessageDto) {
    switch (dto.type) {
      case MessageType.TEXT:
        if (!dto.content?.trim()) {
          throw new BadRequestException(
            'Message content is required for text messages',
          );
        }
        if (dto.content.length > 5000) {
          throw new BadRequestException(
            'Message content too long (max 5000 characters)',
          );
        }
        break;

      case MessageType.IMAGE:
      case MessageType.FILE:
        if (!dto.mediaUrl) {
          throw new BadRequestException(
            'Media URL is required for media messages',
          );
        }
        break;

      default:
        throw new BadRequestException('Invalid message type');
    }

    if (dto.fileSize && dto.fileSize > 100 * 1024 * 1024) {
      throw new BadRequestException('File size too large (max 100MB)');
    }
  }

  /**
   * Upload media for messaging
   */
  async uploadMedia(
    userId: string,
    file: Express.Multer.File,
    type: 'image' | 'file',
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const maxSize = type === 'image' ? 10 * 1024 * 1024 : 100 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException(
        `File too large. Max size: ${maxSize / (1024 * 1024)}MB`,
      );
    }

    if (type === 'image') {
      const allowedImageTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
      ];
      if (!allowedImageTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          'Invalid image type. Allowed: JPEG, PNG, GIF, WebP',
        );
      }
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const extension = file.originalname.split('.').pop();
    const fileName = `messages/${userId}/${timestamp}-${randomString}.${extension}`;

    // Use the correct method from your S3Service
    const uploadResult = await this.s3Service.uploadFileForFrontend(
      file,
      'post-media', // or create a new type like 'message-media'
      {
        userId,
        type: type === 'image' ? 'message-image' : 'message-file',
        originalName: file.originalname,
      },
    );

    return {
      url: uploadResult.url,
      thumbnailUrl: uploadResult.url, // For now, use same URL as thumbnail
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      key: uploadResult.key,
    };
  }

  /**
   * Search users for messaging
   */
  async searchUsersForMessaging(
    currentUserId: string,
    search: string = '',
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;

    // Create proper Prisma where clause
    const where: Prisma.UserWhereInput = {
      id: { not: currentUserId }, // Don't include current user
      isActive: true,
      isDeleted: false,
    };

    // Add search conditions if search term provided
    if (search) {
      where.OR = [
        {
          displayName: {
            contains: search,
            mode: Prisma.QueryMode.insensitive,
          },
        },
        {
          email: {
            contains: search,
            mode: Prisma.QueryMode.insensitive,
          },
        },
        {
          phone: {
            contains: search,
            mode: Prisma.QueryMode.insensitive,
          },
        },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          email: true,
          phone: true,
          isActive: true,
          verifiedAt: true,
          createdAt: true,
          // Don't return sensitive info
        },
        orderBy: { displayName: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    // Check existing conversations to show status
    const usersWithStatus = await Promise.all(
      users.map(async (user) => {
        // Check if conversation exists
        const existingConversation = await this.prisma.conversation.findFirst({
          where: {
            OR: [
              { user1Id: currentUserId, user2Id: user.id },
              { user1Id: user.id, user2Id: currentUserId },
            ],
          },
          select: {
            id: true,
            isBlocked: true,
            lastMessageAt: true,
          },
        });

        // Check if blocked
        const isBlocked = await this.prisma.messageBlock.findFirst({
          where: {
            OR: [
              { blockerId: currentUserId, blockedUserId: user.id },
              { blockerId: user.id, blockedUserId: currentUserId },
            ],
            status: BlockStatus.ACTIVE,
          },
        });

        return {
          ...user,
          canMessage: !isBlocked,
          existingConversation: existingConversation
            ? {
                id: existingConversation.id,
                isBlocked: existingConversation.isBlocked,
                lastMessageAt: existingConversation.lastMessageAt,
              }
            : null,
          isBlocked: !!isBlocked,
        };
      }),
    );

    return {
      data: usersWithStatus,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get all blocked users for current user
   */
  async getBlockedUsers(
    userId: string,
    page: number = 1,
    limit: number = 20,
    type?: 'personal' | 'company',
  ) {
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      blockerId: userId,
      status: BlockStatus.ACTIVE,
    };

    // Filter by type
    if (type === 'personal') {
      where.companyId = null;
    } else if (type === 'company') {
      where.companyId = { not: null };
    }

    const [blocks, total] = await Promise.all([
      this.prisma.messageBlock.findMany({
        where,
        include: {
          blockedUser: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
              email: true,
              phone: true,
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
          conversation: {
            select: {
              id: true,
              lastMessageAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.messageBlock.count({ where }),
    ]);

    return {
      data: blocks,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get blocked users for company (company staff only)
   */
  async getCompanyBlockedUsers(
    staffId: string,
    companyId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    // Verify staff has permission
    const companyStaff = await this.prisma.companyStaff.findFirst({
      where: {
        userId: staffId,
        companyId,
        isActive: true,
      },
    });

    if (!companyStaff) {
      throw new ForbiddenException(
        'Not authorized to view blocked users for this company',
      );
    }

    const skip = (page - 1) * limit;

    const where = {
      companyId,
      status: BlockStatus.ACTIVE,
    };

    const [blocks, total] = await Promise.all([
      this.prisma.messageBlock.findMany({
        where,
        include: {
          blockedUser: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
              email: true,
              phone: true,
              isActive: true,
            },
          },
          blocker: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          conversation: {
            select: {
              id: true,
              lastMessageAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.messageBlock.count({ where }),
    ]);

    return {
      data: blocks,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    };
  }
}
