import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SocialAuthController } from './social-auth.controller';
import { SocialAuthService } from './social-auth.service';
import { PrismaModule } from '../../database/prisma.module';
import { GoogleStrategy } from '../auth/strategies/google.strategy';
import { FacebookStrategy } from '../auth/strategies/facebook.strategy';
import { AppleStrategy } from '../auth/strategies/apple.strategy';

@Module({
  imports: [
    PassportModule,
    PrismaModule,
  ],
  controllers: [SocialAuthController],
  providers: [SocialAuthService, GoogleStrategy, FacebookStrategy, AppleStrategy],
  exports: [SocialAuthService],
})
export class SocialAuthModule {}
