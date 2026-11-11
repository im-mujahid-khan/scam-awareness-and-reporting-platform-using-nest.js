import { ConfigService } from '@nestjs/config';

// This file is kept for backward compatibility
// Actual strategies are in src/modules/auth/strategies/

export function getGooglePassportConfig(configService: ConfigService) {
  return {
    clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
    clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
    callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') || `${configService.get<string>('API_URL')}/auth/google/callback`,
  };
}

export function getFacebookPassportConfig(configService: ConfigService) {
  return {
    clientID: configService.get<string>('FACEBOOK_CLIENT_ID'),
    clientSecret: configService.get<string>('FACEBOOK_CLIENT_SECRET'),
    callbackURL: configService.get<string>('FACEBOOK_CALLBACK_URL') || `${configService.get<string>('API_URL')}/auth/social/facebook/callback`,
  };
}

export function getApplePassportConfig(configService: ConfigService) {
  return {
    clientID: configService.get<string>('APPLE_CLIENT_ID'),
    teamID: configService.get<string>('APPLE_TEAM_ID'),
    keyID: configService.get<string>('APPLE_KEY_ID'),
    privateKeyString: configService.get<string>('APPLE_PRIVATE_KEY'),
    callbackURL: configService.get<string>('APPLE_CALLBACK_URL') || `${configService.get<string>('API_URL')}/auth/social/apple/callback`,
  };
}
