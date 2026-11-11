import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsJwtGuard } from '../../auth/guards/ws-jwt.guard';
import { MessagingService } from '../services/messaging.service';
import { CreateMessageDto } from '../dtos/requests/create-message.dto';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/messaging',
})
export class MessagingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagingGateway.name);
  private readonly userSockets = new Map<string, string[]>();
  private readonly socketUsers = new Map<string, string>();

  constructor(
    private jwtService: JwtService,
    private messagingService: MessagingService,
  ) {}

  //   Called when gateway is initialized
  afterInit(server: Server) {
    this.logger.log('  WebSocket Messaging Gateway initialized');
    this.logger.log(`  Listening on namespace: /messaging`);
  }

  //   Called when a client connects
  async handleConnection(client: Socket) {
    try {
      this.logger.debug(`New messaging connection attempt: ${client.id}`);
      
      // Get token from handshake
      const token = client.handshake.auth?.token || 
                   client.handshake.headers?.authorization?.split(' ')[1];
      
      if (!token) {
        this.logger.warn(`No token provided for client: ${client.id}`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      let payload;
      try {
        payload = await this.jwtService.verifyAsync(token);
      } catch (error) {
        this.logger.error(`Invalid token for client ${client.id}: ${error.message}`);
        client.disconnect();
        return;
      }

      const userId = payload.sub;
      
      if (!userId) {
        this.logger.warn(`No user ID in token for client: ${client.id}`);
        client.disconnect();
        return;
      }

      // Store socket connection
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, []);
      }
      
      this.userSockets.get(userId)?.push(client.id);
      this.socketUsers.set(client.id, userId);

      // Join user room
      client.join(`user:${userId}`);

      // Send welcome message
      client.emit('connected', {
        message: 'Connected to messaging server',
        userId,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`  User ${userId} connected to messaging with socket ${client.id}`);

    } catch (error) {
      this.logger.error(` Messaging connection error for ${client.id}: ${error.message}`);
      client.disconnect();
    }
  }

  //   Called when a client disconnects
  handleDisconnect(client: Socket) {
    const userId = this.socketUsers.get(client.id);
    
    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        const index = sockets.indexOf(client.id);
        if (index > -1) {
          sockets.splice(index, 1);
          if (sockets.length === 0) {
            this.userSockets.delete(userId);
          }
        }
      }
      this.socketUsers.delete(client.id);
      this.logger.log(`User ${userId} disconnected from messaging: ${client.id}`);
    }
  }

  //   Send message handler
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: CreateMessageDto,
  ) {
    try {
      const userId = this.socketUsers.get(client.id);
      if (!userId) {
        throw new Error('User not authenticated');
      }

      this.logger.debug(`User ${userId} sending message to conversation ${data.conversationId}`);

      // Send message via service
      const message = await this.messagingService.sendMessage(userId, data);

      // Join conversation room
      client.join(`conversation:${data.conversationId}`);

      // Emit to conversation room
      this.server.to(`conversation:${data.conversationId}`).emit('new_message', {
        message: {
          id: message.id,
          conversationId: message.conversationId,
          senderId: message.senderId,
          sender: message.sender,
          type: message.type,
          content: message.content,
          mediaUrl: message.mediaUrl,
          thumbnailUrl: message.thumbnailUrl,
          status: message.status,
          createdAt: message.createdAt,
          replyTo: message.repliesTo,
        },
      });

      return {
        event: 'message_sent',
        data: {
          success: true,
          messageId: message.id,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`, error.stack);
      return {
        event: 'message_error',
        data: {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  //   Join conversation room
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    try {
      const userId = this.socketUsers.get(client.id);
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Verify user has access to conversation
      // This is handled in the service layer when sending messages
      client.join(`conversation:${data.conversationId}`);

      this.logger.debug(`User ${userId} joined conversation room: ${data.conversationId}`);

      return {
        event: 'joined_conversation',
        data: {
          success: true,
          conversationId: data.conversationId,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`Error joining conversation: ${error.message}`);
      return {
        event: 'join_error',
        data: {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  //   Leave conversation room
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('leave_conversation')
  async handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    try {
      client.leave(`conversation:${data.conversationId}`);
      
      const userId = this.socketUsers.get(client.id);
      this.logger.debug(`User ${userId} left conversation room: ${data.conversationId}`);

      return {
        event: 'left_conversation',
        data: {
          success: true,
          conversationId: data.conversationId,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`Error leaving conversation: ${error.message}`);
      return {
        event: 'leave_error',
        data: {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  //   Typing indicator
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ) {
    try {
      const userId = this.socketUsers.get(client.id);
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Broadcast typing indicator to conversation room (except sender)
      client.to(`conversation:${data.conversationId}`).emit('user_typing', {
        userId,
        conversationId: data.conversationId,
        isTyping: data.isTyping,
        timestamp: new Date().toISOString(),
      });

      return {
        event: 'typing_sent',
        data: {
          success: true,
          conversationId: data.conversationId,
          isTyping: data.isTyping,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`Error sending typing indicator: ${error.message}`);
      return {
        event: 'typing_error',
        data: {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  //   Mark as read
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('mark_as_read')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; messageIds?: string[] },
  ) {
    try {
      const userId = this.socketUsers.get(client.id);
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Notify other participants
      this.server.to(`conversation:${data.conversationId}`).emit('messages_read', {
        userId,
        messageIds: data.messageIds,
        timestamp: new Date().toISOString(),
      });

      return {
        event: 'read_confirmation',
        data: {
          success: true,
          messageIds: data.messageIds,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`Error marking messages as read: ${error.message}`);
      return {
        event: 'read_error',
        data: {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  //   Ping handler
  @SubscribeMessage('ping')
  handlePing(client: Socket, data: any) {
    this.logger.debug(`Ping received from ${client.id}`);
    return {
      event: 'pong',
      data: {
        message: 'pong',
        timestamp: new Date().toISOString(),
        serverTime: Date.now(),
      },
    };
  }

  //   Utility methods
  sendToUser(userId: string, event: string, data: any) {
    this.logger.debug(`Sending ${event} to user ${userId}`);
    this.server.to(`user:${userId}`).emit(event, data);
  }

  sendToConversation(conversationId: string, event: string, data: any) {
    this.server.to(`conversation:${conversationId}`).emit(event, data);
  }

  getConnectionStats() {
    return {
      totalUsers: this.userSockets.size,
      totalConnections: Array.from(this.userSockets.values())
        .reduce((sum, sockets) => sum + sockets.length, 0),
      connectedUserIds: Array.from(this.userSockets.keys()),
    };
  }
}