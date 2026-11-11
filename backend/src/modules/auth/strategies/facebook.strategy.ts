// src/modules/auth/strategies/facebook.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(private configService: ConfigService) {
    // Get configuration FIRST
    const clientId = configService.get<string>('FACEBOOK_CLIENT_ID');
    const clientSecret = configService.get<string>('FACEBOOK_CLIENT_SECRET');
    
    // Check if Facebook OAuth should be enabled
    const shouldEnable = clientId && clientSecret && 
                         clientId.trim() !== '' && clientSecret.trim() !== '';
    
    // Always use a safe configuration
    const callbackURL = configService.get<string>('FACEBOOK_CALLBACK_URL') || 
                       `${configService.get<string>('API_URL') || 'http://localhost:3000'}/auth/facebook/callback`;
    
    // Call super() with safe values
    super({
      clientID: shouldEnable ? clientId : 'dummy-facebook-client-id',
      clientSecret: shouldEnable ? clientSecret : 'dummy-facebook-client-secret',
      callbackURL: callbackURL,
      profileFields: ['id', 'emails', 'name', 'displayName', 'photos'],
      scope: ['email'],
      passReqToCallback: true,
    });
    
    // Log status
    if (shouldEnable) {
      console.log('✅ Facebook OAuth strategy initialized');
    } else {
      console.log('⚠️ Facebook OAuth disabled - using dummy strategy');
    }
  }

  async validate(
    req: any,
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: any,
  ): Promise<any> {
    // Check if credentials are dummy
    const clientId = this.configService.get<string>('FACEBOOK_CLIENT_ID');
    const clientSecret = this.configService.get<string>('FACEBOOK_CLIENT_SECRET');
    
    const shouldEnable = clientId && clientSecret && 
                        clientId.trim() !== '' && clientSecret.trim() !== '';
    
    // If not enabled, return error
    if (!shouldEnable) {
      return done(new Error('Facebook OAuth is not configured. Please check your environment variables.'), null);
    }

    const user = {
      id: profile.id,
      displayName: profile.displayName,
      emails: profile.emails,
      photos: profile.photos,
      accessToken,
      refreshToken,
    };

    done(null, user);
  }
}