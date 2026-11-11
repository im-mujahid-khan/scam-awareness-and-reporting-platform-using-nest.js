// src/modules/auth/strategies/apple.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(private configService: ConfigService) {
    // Get all required Apple credentials FIRST
    const clientId = configService.get<string>('APPLE_CLIENT_ID');
    const teamId = configService.get<string>('APPLE_TEAM_ID');
    const keyId = configService.get<string>('APPLE_KEY_ID');
    const privateKey = configService.get<string>('APPLE_PRIVATE_KEY');
    
    // Check if Apple OAuth should be enabled (need ALL credentials)
    const shouldEnable = clientId && teamId && keyId && privateKey &&
                         clientId.trim() !== '' && teamId.trim() !== '' && 
                         keyId.trim() !== '' && privateKey.trim() !== '';
    
    // Always use a safe configuration
    const callbackURL = configService.get<string>('APPLE_CALLBACK_URL') || 
                       `${configService.get<string>('API_URL') || 'http://localhost:3000'}/auth/apple/callback`;
    
    // Call super() with safe values
    super({
      clientID: shouldEnable ? clientId : 'com.example.dummy',
      teamID: shouldEnable ? teamId : 'dummy-team-id',
      keyID: shouldEnable ? keyId : 'dummy-key-id',
      privateKeyString: shouldEnable ? privateKey : '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKj\nMzEfYyjiWA4R4/M2bS1GBM+Q\n-----END PRIVATE KEY-----',
      callbackURL: callbackURL,
      scope: ['email', 'name'],
      passReqToCallback: true,
    });
    
    // Log status
    if (shouldEnable) {
      console.log('✅ Apple OAuth strategy initialized');
    } else {
      console.log('⚠️ Apple OAuth disabled - using dummy strategy');
    }
  }

  async validate(
    req: any,
    accessToken: string,
    refreshToken: string,
    idToken: string,
    profile: any,
    done: any,
  ): Promise<any> {
    // Check if credentials are dummy
    const clientId = this.configService.get<string>('APPLE_CLIENT_ID');
    const teamId = this.configService.get<string>('APPLE_TEAM_ID');
    const keyId = this.configService.get<string>('APPLE_KEY_ID');
    const privateKey = this.configService.get<string>('APPLE_PRIVATE_KEY');
    
    const shouldEnable = clientId && teamId && keyId && privateKey &&
                        clientId.trim() !== '' && teamId.trim() !== '' && 
                        keyId.trim() !== '' && privateKey.trim() !== '';
    
    // If not enabled, return error
    if (!shouldEnable) {
      return done(new Error('Apple OAuth is not configured. Please check your environment variables.'), null);
    }

    const user = {
      id: profile.sub,
      email: profile.email,
      displayName: profile.name?.firstName || 'Apple User',
      firstName: profile.name?.firstName,
      lastName: profile.name?.lastName,
      accessToken,
      refreshToken,
    };

    done(null, user);
  }
}