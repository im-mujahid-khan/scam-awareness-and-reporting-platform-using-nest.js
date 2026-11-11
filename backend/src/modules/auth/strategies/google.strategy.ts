// src/modules/auth/strategies/google.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

interface GoogleProfile {
  id: string;
  displayName?: string;
  name?: {
    givenName?: string;
    familyName?: string;
  };
  emails?: Array<{ value: string; verified?: boolean }>;
  photos?: Array<{ value: string }>;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private configService: ConfigService) {
    // ALWAYS use real values from environment - let passport handle validation
    const clientId = configService.get<string>('GOOGLE_CLIENT_ID') || '';
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET') || '';
    
    // IMPORTANT: Use the exact callback URL from Google Cloud Console
    const callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL') || 
                       'http://localhost:3001/api/v1/auth/google/callback';
    
    console.log('Google OAuth Configuration:', {
      clientId: clientId ? `${clientId.substring(0, 10)}...` : 'NOT SET',
      clientSecret: clientSecret ? 'SET' : 'NOT SET',
      callbackURL: callbackURL,
      apiUrl: configService.get<string>('API_URL'),
    });
    
    // Always pass real values (even if empty)
    super({
      clientID: clientId,
      clientSecret: clientSecret,
      callbackURL: callbackURL,
      scope: ['email', 'profile'],
      passReqToCallback: false,
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: GoogleProfile,
    done: any,
  ): Promise<any> {
    console.log('Google OAuth user validated:', profile.emails?.[0]?.value);
    
    const { name, emails, photos } = profile;
    
    const user = {
      accessToken,
      refreshToken,
      profile: {
        id: profile.id,
        email: emails?.[0]?.value,
        displayName: profile.displayName || `${name?.givenName} ${name?.familyName}`,
        firstName: name?.givenName,
        lastName: name?.familyName,
        picture: photos?.[0]?.value,
      },
    };
    
    done(null, user);
  }
}