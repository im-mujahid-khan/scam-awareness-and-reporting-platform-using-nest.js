// src/modules/notifications/controllers/notifications.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { 
  NotificationsService, 
  NotificationType,
  NotificationData 
} from '../services/notifications.service';
import { NotificationsGateway } from '../gateways/notifications.gateway';
class MarkMultipleAsReadDto {
  notificationIds: string[];
}

class CreateNotificationDto implements Omit<NotificationData, 'entityType' | 'entityId'> {
  type: NotificationType;
  title: string;
  message: string;
  entityType: 'POST' | 'COMMENT' | 'MESSAGE' | 'GROUP' | 'COMPANY' | 'USER' | 'SYSTEM';
  entityId: string;
  metadata?: Record<string, any>;
  imageUrl?: string;
  deepLink?: string;
  senderId?: string;
}

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number, default: 1' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page, default: 20' })
  @ApiQuery({ name: 'includeRead', required: false, type: Boolean, description: 'Include read notifications, default: false' })
  async getNotifications(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('includeRead') includeRead: boolean = false,
  ) {
    return this.notificationsService.getUserNotifications(
      req.user.id,
      page,
      limit,
      includeRead,
    );
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get notification statistics' })
  async getNotificationStats(@Request() req) {
    return this.notificationsService.getNotificationStats(req.user.id);
  }

  @Put('read-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@Request() req) {
    const result = await this.notificationsService.markAllAsRead(req.user.id);
    return {
      message: 'All notifications marked as read',
      count: result.count,
    };
  }

  @Put('read-multiple')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark multiple notifications as read' })
  @ApiBody({ type: MarkMultipleAsReadDto })
  async markMultipleAsRead(
    @Request() req,
    @Body() dto: MarkMultipleAsReadDto,
  ) {
    const result = await this.notificationsService.markMultipleAsRead(
      req.user.id,
      dto.notificationIds,
    );
    return {
      message: 'Notifications marked as read',
      count: result.count,
    };
  }

  @Put(':id/read')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(@Request() req, @Param('id') id: string) {
    const notification = await this.notificationsService.markAsRead(req.user.id, id);
    return {
      message: 'Notification marked as read',
      notification,
    };
  }

  @Delete('clear-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Clear all notifications' })
  @ApiQuery({ name: 'includeRead', required: false, type: Boolean, description: 'Include read notifications, default: true' })
  async clearAllNotifications(
    @Request() req,
    @Query('includeRead') includeRead: boolean = true,
  ) {
    const result = await this.notificationsService.clearAllNotifications(
      req.user.id,
      includeRead,
    );
    return {
      message: 'Notifications cleared',
      count: result.count,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete notification' })
  async deleteNotification(@Request() req, @Param('id') id: string) {
    await this.notificationsService.deleteNotification(req.user.id, id);
  }

  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@Request() req) {
    const count = await this.notificationsService.getUnreadCount(req.user.id);
    return { count };
  }

  @Post('test')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send test notification' })
  async testNotification(@Request() req) {
    const notification = await this.notificationsService.sendTestNotification(req.user.id);
    return {
      message: 'Test notification sent',
      notification,
    };
  }

  @Post('test-post/:postId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send test post notification' })
  async testPostNotification(
    @Request() req,
    @Param('postId') postId: string,
  ) {
    const notification = await this.notificationsService.sendNewPostNotification(
      postId,
      req.user.id,
    );
    return {
      message: 'Test post notification sent',
      notification,
    };
  }

  @Post('test-comment/:commentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send test comment notification' })
  async testCommentNotification(
    @Request() req,
    @Param('commentId') commentId: string,
    @Query('postAuthorId') postAuthorId: string,
  ) {
    const notification = await this.notificationsService.sendNewCommentNotification(
      commentId,
      postAuthorId,
      req.user.id,
    );
    return {
      message: 'Test comment notification sent',
      notification,
    };
  }

  @Post('broadcast')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiOperation({ summary: 'Send broadcast notification (Admin only)' })
@ApiBody({ type: CreateNotificationDto })
async broadcastNotification(
  @Request() req,
  @Body() dto: CreateNotificationDto,
) {
  // Check if user is admin
  if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
    throw new Error('Only admins can send broadcast notifications');
  }

  const result = await this.notificationsService.broadcastNotification({
    ...dto,
    entityType: 'SYSTEM' as const,
    entityId: `broadcast-${Date.now()}`,
  });

  return {
    message: 'Broadcast notification sent successfully',
    usersCount: result.usersCount,
    success: result.success,
    timestamp: new Date().toISOString(),
  };
}

  @Get('ws-connections')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get WebSocket connection stats' })
  async getWebSocketConnections() {
    return this.notificationsGateway.getConnectionStats();
  }
}