import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../database/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { S3Module } from '../s3/s3.module';
import { MessagingController } from './controllers/messaging.controller';
import { MessagingService } from './services/messaging.service';
import { MessagingGateway } from './gateways/messaging.gateway';
import { MessageSafetyService } from './services/message-safety.service';
import { ConversationService } from './services/conversation.service';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    UsersModule,
    S3Module,
    ConfigModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '365d' },
    }),
  ],
  controllers: [MessagingController],
  providers: [
    MessagingService,
    MessagingGateway,
    MessageSafetyService,
    ConversationService,
  ],
  exports: [MessagingService, MessageSafetyService],
})
export class MessagingModule {}