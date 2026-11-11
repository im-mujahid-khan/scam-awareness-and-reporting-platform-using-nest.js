// src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { FacebookStrategy } from './strategies/facebook.strategy';
import { AppleStrategy } from './strategies/apple.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { DeviceTrustGuard } from './guards/device-trust.guard';
import { EmailModule } from '../email/email.module'; // Add this import

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => {
        const jwtExpiry = configService.get<string>('JWT_EXPIRY') || '365d';
        
        // Parse expiry string to seconds
        const parseExpiryToSeconds = (expiry: string): number => {
          const unit = expiry.slice(-1).toLowerCase();
          const value = parseInt(expiry.slice(0, -1), 10);
          
          if (unit === 's') return value;
          if (unit === 'm') return value * 60;
          if (unit === 'h') return value * 60 * 60;
          if (unit === 'd') return value * 24 * 60 * 60;
          return value * 24 * 60 * 60; // Default to days
        };
        
        return {
          secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
          signOptions: {
            expiresIn: parseExpiryToSeconds(jwtExpiry),
          },
        };
      },
      inject: [ConfigService],
    }),
    EmailModule, // Add this line
  ],
  controllers: [AuthController],
  providers: [
    AuthService, 
    JwtStrategy, 
    GoogleStrategy,
    FacebookStrategy,
    AppleStrategy,
    JwtAuthGuard,
    DeviceTrustGuard,
  ],
  exports: [
    AuthService, 
    JwtStrategy, 
    PassportModule,
    JwtAuthGuard,
    DeviceTrustGuard,
  ],
})
export class AuthModule {}