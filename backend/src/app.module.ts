import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { CacheModule } from './modules/cache/cache.module';
import { OtpModule } from './modules/otp/otp.module';
import { SocialAuthModule } from './modules/social-auth/social-auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './database/prisma.module';
import appConfig from './config/app.config';
import { validate } from './config/env.validation';
import { apiRateLimiter } from './common/middleware/rate-limit.middleware';
import { S3Module } from './modules/s3/s3.module';
import { PostsModule } from './modules/posts/posts.module';
import { GroupModule } from './modules/group/group.module';
import { EmailModule } from './modules/email/email.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CommentsModule } from './modules/comments/comments.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { SearchModule } from './modules/search/search.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    PrismaModule,
    
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: '.env',
      validate,
    }),
    
    // Core modules
    AuthModule,
    EmailModule,
    UsersModule,
    CompaniesModule,
    S3Module,
    PostsModule,
    GroupModule,
    NotificationsModule,
    CommentsModule,
    MessagingModule,
    SearchModule,
    AdminModule,
    
    // New auth modules
    CacheModule,
    OtpModule,
    SocialAuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply API rate limiter to all routes except health check
    consumer
      .apply(apiRateLimiter)
      .forRoutes('*');
  }
}