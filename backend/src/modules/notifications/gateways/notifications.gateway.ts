// src/modules/notifications/gateways/notifications.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  namespace: '/notifications',
})
@Injectable()
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private readonly userSockets = new Map<string, string[]>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // Called when gateway is initialized
  afterInit(server: Server) {
    this.logger.log('✅ WebSocket Notifications Gateway initialized');
    this.logger.log(`   Listening on namespace: /notifications`);
  }

  // Simple token verification function
  private async verifyToken(token: string): Promise<any> {
    try {
      // Try to verify as access token
      const payload = this.jwtService.verify(token);
      return payload;
    } catch (error) {
      // If access token fails, try as refresh token
      try {
        const refreshSecret =
          this.configService.get<string>('JWT_REFRESH_SECRET');
        if (refreshSecret) {
          const payload = this.jwtService.verify(token, {
            secret: refreshSecret,
          });
          return payload;
        }
      } catch (refreshError) {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  // Called when a client connects
  async handleConnection(client: Socket) {
    try {
      console.log('🔌 New connection attempt, socket ID:', client.id);

      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];

      console.log('🔐 Token received:', token ? 'Yes' : 'No');
      console.log('🔐 Token length:', token?.length || 0);

      if (!token) {
        this.logger.warn('❌ No token provided');
        client.emit('error', { message: 'Authentication token required' });
        client.disconnect();
        return;
      }

      const payload = await this.verifyToken(token);
      const userId = payload.sub || payload.userId;

      console.log('✅ User authenticated:', userId);

      if (!userId) {
        this.logger.warn('❌ No userId in token');
        client.emit('error', { message: 'Invalid token payload' });
        client.disconnect();
        return;
      }

      // Join user room
      client.join(`user:${userId}`);

      this.logger.log(`✅ User ${userId} connected with socket ${client.id}`);

      // Send welcome message
      client.emit('connected', {
        message: 'Connected to notification service',
        userId: userId,
        socketId: client.id,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      this.logger.error('❌ Socket auth failed:', err);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  // Called when a client disconnects
  handleDisconnect(client: Socket) {
    for (const [userId, sockets] of this.userSockets.entries()) {
      const index = sockets.indexOf(client.id);
      if (index > -1) {
        sockets.splice(index, 1);
        if (sockets.length === 0) {
          this.userSockets.delete(userId);
        }
        this.logger.log(`🔌 User ${userId} disconnected: ${client.id}`);
        break;
      }
    }
    this.logger.debug(
      `Total connected users after disconnect: ${this.userSockets.size}`,
    );
  }

  // Send to specific user
  sendToUser(userId: string, event: string, data: any) {
    if (this.userSockets.has(userId)) {
      this.logger.debug(`📤 Sending ${event} to user ${userId}`);
      this.server.to(`user:${userId}`).emit(event, data);
      return true;
    }
    this.logger.debug(`User ${userId} not connected for ${event}`);
    return false;
  }

  // Send to multiple users
  sendToUsers(userIds: string[], event: string, data: any) {
    const results = userIds.map((userId) => ({
      userId,
      sent: this.sendToUser(userId, event, data),
    }));
    return results;
  }

  // Broadcast to all connected users
  broadcast(event: string, data: any) {
    this.logger.debug(`📢 Broadcasting ${event} to all users`);
    this.server.to('broadcast').emit(event, data);
  }

  // Send to room
  sendToRoom(room: string, event: string, data: any) {
    this.server.to(room).emit(event, data);
  }

  // Get connection stats
  getConnectionStats() {
    const userConnections = {};
    this.userSockets.forEach((sockets, userId) => {
      userConnections[userId] = sockets.length;
    });

    return {
      totalUsers: this.userSockets.size,
      totalConnections: Array.from(this.userSockets.values()).reduce(
        (sum, sockets) => sum + sockets.length,
        0,
      ),
      userConnections,
      timestamp: new Date().toISOString(),
    };
  }

  // Handle ping from client
  @SubscribeMessage('ping')
  handlePing(client: Socket, data: any) {
    this.logger.debug(`🏓 Ping received from ${client.id}`);
    client.emit('pong', {
      message: 'pong',
      timestamp: new Date().toISOString(),
      serverTime: Date.now(),
      clientId: client.id,
    });
  }

  // Subscribe to specific events
  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, data: { userId: string }) {
    const { userId } = data;
    if (userId) {
      client.join(`user:${userId}`);
      client.emit('subscribed', {
        message: `Subscribed to notifications for user ${userId}`,
        userId,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get user's connection status
  @SubscribeMessage('get-status')
  handleGetStatus(client: Socket) {
    let userId = '';
    for (const [uid, sockets] of this.userSockets.entries()) {
      if (sockets.includes(client.id)) {
        userId = uid;
        break;
      }
    }

    client.emit('status', {
      clientId: client.id,
      userId,
      connected: !!userId,
      timestamp: new Date().toISOString(),
    });
  }
}
