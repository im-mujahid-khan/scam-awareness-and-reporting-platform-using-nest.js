// src/modules/notifications/services/notifications.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { NotificationsGateway } from '../gateways/notifications.gateway';

export enum NotificationType {
  NEW_POST = 'NEW_POST',
  POST_APPROVED = 'POST_APPROVED',
  POST_REJECTED = 'POST_REJECTED',
  NEW_COMMENT = 'NEW_COMMENT',
  COMMENT_REPLY = 'COMMENT_REPLY',
  NEW_MESSAGE = 'NEW_MESSAGE',
  GROUP_INVITE = 'GROUP_INVITE',
  GROUP_UPDATE = 'GROUP_UPDATE',
  SCAM_ALERT = 'SCAM_ALERT',
  COMPANY_ANNOUNCEMENT = 'COMPANY_ANNOUNCEMENT',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
  TEST = 'TEST',
}

export interface NotificationData {
  type: NotificationType;
  title: string;
  message: string;
  entityType:
    | 'POST'
    | 'COMMENT'
    | 'MESSAGE'
    | 'GROUP'
    | 'COMPANY'
    | 'USER'
    | 'SYSTEM';
  entityId: string;
  metadata?: Record<string, any>;
  imageUrl?: string;
  deepLink?: string;
  senderId?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsGateway: NotificationsGateway,
  ) {}

  // ✅ CREATE NOTIFICATION
  async createNotification(
    userId: string,
    data: NotificationData,
    realTime: boolean = true,
  ) {
    try {
      // Check if user exists
      const userExists = await this.prisma.user.findUnique({
        where: { id: userId, isActive: true, isDeleted: false },
        select: { id: true },
      });

      if (!userExists) {
        throw new Error(`User ${userId} not found or inactive`);
      }

      // Prepare notification data
      const notificationData: any = {
        userId,
        type: data.type,
        title: data.title,
        message: data.message,
        data: {
          entityType: data.entityType,
          entityId: data.entityId,
          metadata: data.metadata || {},
          imageUrl: data.imageUrl,
          deepLink: data.deepLink,
          senderId: data.senderId,
        },
      };

      // Only set postId if entityType is POST and post exists
      if (data.entityType === 'POST') {
        const postExists = await this.prisma.post.findUnique({
          where: { id: data.entityId },
          select: { id: true },
        });

        if (postExists) {
          notificationData.postId = data.entityId;
        }
      }

      // Save to database
      const notification = await this.prisma.notification.create({
        data: notificationData,
      });

      // Prepare response
      const notificationResponse = {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        isRead: notification.isRead,
        createdAt: notification.createdAt.toISOString(),
        readAt: notification.readAt?.toISOString(),
      };

      // Send real-time notification if enabled
      if (realTime) {
        this.notificationsGateway.sendToUser(
          userId,
          'notification',
          notificationResponse,
        );
      }

      this.logger.log(
        `✅ Notification created for user ${userId}: ${data.type}`,
      );
      return notificationResponse;
    } catch (error) {
      this.logger.error(`❌ Failed to create notification: ${error.message}`);
      throw error;
    }
  }

  // ✅ GET USER NOTIFICATIONS
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    includeRead: boolean = false,
  ) {
    const skip = (page - 1) * limit;

    const whereClause: any = { userId };
    if (!includeRead) {
      whereClause.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          post: {
            select: {
              id: true,
              title: true,
              postType: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.notification.count({ where: whereClause }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    // Format for frontend
    const formattedNotifications = notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      data: n.data,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
      readAt: n.readAt?.toISOString(),
      post: n.post
        ? {
            id: n.post.id,
            title: n.post.title,
            postType: n.post.postType,
            status: n.post.status,
          }
        : null,
    }));

    return {
      notifications: formattedNotifications,
      meta: {
        total,
        unreadCount,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total,
      },
    };
  }

  // ✅ MARK AS READ
  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.update({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });

    // Notify client - only if readAt exists
    if (notification.readAt) {
      this.notificationsGateway.sendToUser(userId, 'notification_read', {
        notificationId,
        readAt: notification.readAt.toISOString(),
      });
    }

    return notification;
  }

  // ✅ MARK ALL AS READ
  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    // Notify client
    this.notificationsGateway.sendToUser(userId, 'notifications_read_all', {
      count: result.count,
      timestamp: new Date().toISOString(),
    });

    return result;
  }

  // ✅ MARK MULTIPLE AS READ
  async markMultipleAsRead(userId: string, notificationIds: string[]) {
    const result = await this.prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    // Notify client
    this.notificationsGateway.sendToUser(
      userId,
      'notifications_read_multiple',
      {
        count: result.count,
        notificationIds,
        timestamp: new Date().toISOString(),
      },
    );

    return result;
  }

  // ✅ DELETE NOTIFICATION
  async deleteNotification(userId: string, notificationId: string) {
    await this.prisma.notification.delete({
      where: { id: notificationId, userId },
    });

    // Notify client
    this.notificationsGateway.sendToUser(userId, 'notification_deleted', {
      notificationId,
      timestamp: new Date().toISOString(),
    });
  }

  // ✅ CLEAR ALL NOTIFICATIONS
  async clearAllNotifications(userId: string, includeRead: boolean = true) {
    const whereClause: any = { userId };
    if (!includeRead) {
      whereClause.isRead = false;
    }

    const result = await this.prisma.notification.deleteMany({
      where: whereClause,
    });

    // Notify client
    this.notificationsGateway.sendToUser(userId, 'notifications_cleared', {
      count: result.count,
      includeRead,
      timestamp: new Date().toISOString(),
    });

    return result;
  }

  // ✅ GET UNREAD COUNT
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  // ✅ TEST METHOD
  async sendTestNotification(userId: string) {
    return this.createNotification(userId, {
      type: NotificationType.TEST,
      title: 'Test Notification',
      message: 'This is a test notification from the server',
      entityType: 'SYSTEM',
      entityId: 'test-' + Date.now(),
      metadata: { test: true, timestamp: new Date().toISOString() },
    });
  }

  // ✅ HELPER: Send new post notification
  async sendNewPostNotification(postId: string, authorId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        title: true,
        postType: true,
        userId: true,
      },
    });

    if (!post) {
      throw new Error(`Post ${postId} not found`);
    }

    const postTypeLabels = {
      SCAM_REPORT: 'Scam Report',
      SCAM_AWARENESS: 'Scam Awareness',
      QUESTION: 'Question',
    };

    const title = `New ${postTypeLabels[post.postType] || 'Post'}`;
    const message =
      post.title.length > 100
        ? post.title.substring(0, 100) + '...'
        : post.title;

    return this.createNotification(post.userId, {
      type: NotificationType.NEW_POST,
      title,
      message,
      entityType: 'POST',
      entityId: postId,
      metadata: {
        postType: post.postType,
        authorId,
        postTitle: post.title,
      },
      senderId: authorId,
    });
  }

  // ✅ HELPER: Send new comment notification
  async sendNewCommentNotification(
    commentId: string,
    postAuthorId: string,
    commenterId: string,
  ) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        post: {
          select: {
            id: true,
            title: true,
          },
        },
        user: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });

    if (!comment) {
      throw new Error(`Comment ${commentId} not found`);
    }

    // Don't send notification if user is commenting on their own post
    if (comment.userId === postAuthorId) {
      return null;
    }

    const message =
      comment.content.length > 100
        ? comment.content.substring(0, 100) + '...'
        : comment.content;

    return this.createNotification(postAuthorId, {
      type: NotificationType.NEW_COMMENT,
      title: 'New Comment',
      message: `${comment.user.displayName}: ${message}`,
      entityType: 'COMMENT',
      entityId: commentId,
      metadata: {
        postId: comment.post.id,
        postTitle: comment.post.title,
        commenterId: comment.userId,
        commenterName: comment.user.displayName,
        commentContent: comment.content,
      },
      senderId: commenterId,
    });
  }

  // ✅ BROADCAST NOTIFICATION TO ALL USERS
  async broadcastNotification(
    data: Omit<NotificationData, 'entityType' | 'entityId'> & {
      entityType: 'SYSTEM';
      entityId: string;
    },
  ) {
    try {
      // Get all active users
      const users = await this.prisma.user.findMany({
        where: { isActive: true, isDeleted: false },
        select: { id: true },
      });

      const userIds = users.map((user) => user.id);

      // Send WebSocket broadcast
      this.notificationsGateway.broadcast('broadcast_notification', {
        ...data,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `📢 Broadcast notification sent: ${data.type} to ${userIds.length} users`,
      );

      // Return without creating DB entries for performance
      return {
        success: true,
        usersCount: userIds.length,
        message: 'Broadcast notification sent',
      };
    } catch (error) {
      this.logger.error(
        `❌ Failed to broadcast notification: ${error.message}`,
      );
      throw error;
    }
  }

  // ✅ GET NOTIFICATION STATS
  async getNotificationStats(userId: string) {
    const [total, unread, todayCount, weekCount] = await Promise.all([
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
      this.prisma.notification.count({
        where: {
          userId,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      this.prisma.notification.count({
        where: {
          userId,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return {
      total,
      unread,
      todayCount,
      weekCount,
      readPercentage:
        total > 0 ? (((total - unread) / total) * 100).toFixed(1) : '0',
    };
  }
}
