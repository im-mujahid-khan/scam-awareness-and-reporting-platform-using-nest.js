import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      // CUSTOM EXTRACTOR - Swagger ke liye
      jwtFromRequest: (req) => {
        // 1. Swagger ka special case
        const swaggerToken = req.headers['authorization'] || req.headers['Authorization'];
        
        // 2. Standard Bearer token
        if (swaggerToken && swaggerToken.startsWith('Bearer ')) {
          console.log('✅ Token extracted from Swagger:', swaggerToken.substring(0, 30) + '...');
          return swaggerToken.substring(7);
        }
        
        // 3. Try from cookies or other sources
        return null;
      },
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'your-secret-key',
    });

    console.log('✅ JWT Strategy initialized with custom extractor');
  }

  async validate(payload: any) {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role || 'USER',
      displayName: payload.displayName || payload.email?.split('@')[0] || 'User',
    };
  }
}