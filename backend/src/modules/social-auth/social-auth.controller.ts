import {
  Controller,
  Get,
  Post,
  Delete,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  Body,
  Param,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { SocialAuthService, SocialProfile } from './social-auth.service';
import { PrismaService } from '../../database/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LinkSocialAccountDto, UnlinkSocialAccountDto } from '../auth/dto/social-auth.dto';
import * as jwt from 'jsonwebtoken';

@Controller('auth/social')
export class SocialAuthController {
  constructor(
    private socialAuthService: SocialAuthService,
    private prisma: PrismaService,
  ) {}

  /**
   * Google OAuth Login
   * GET /auth/social/google
   */
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleLogin() {
    // This is handled by Passport
  }

  /**
   * Google OAuth Callback
   * GET /auth/social/google/callback
   */
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    try {
      const googleUser = (req as any).user;

      const profile: SocialProfile = {
        id: googleUser.profile.id,
        email: googleUser.profile.email,
        displayName: googleUser.profile.displayName,
        photos: googleUser.profile.picture ? [{ value: googleUser.profile.picture }] : undefined,
        provider: 'google',
      };

      const user = await this.socialAuthService.findOrCreateUser(profile);

      // Log the login
      await this.prisma.loginHistory.create({
        data: {
          userId: user.id,
          loginMethod: 'GOOGLE',
        },
      });

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '365d' },
      );

      // Redirect to frontend with token
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/auth/callback?token=${token}&provider=google&userId=${user.id}`;

      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Google callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth/error?message=${encodeURIComponent(error.message)}`);
    }
  }

  /**
   * Facebook OAuth Login
   * GET /auth/social/facebook
   */
  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  async facebookLogin() {
    // This is handled by Passport
  }

  /**
   * Facebook OAuth Callback
   * GET /auth/social/facebook/callback
   */
  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  async facebookCallback(@Req() req: Request, @Res() res: Response) {
    try {
      const facebookUser = (req as any).user;

      const profile: SocialProfile = {
        id: facebookUser.id,
        email: facebookUser.emails?.[0]?.value,
        displayName: facebookUser.displayName,
        photos: facebookUser.photos ? [{ value: facebookUser.photos[0].value }] : undefined,
        provider: 'facebook',
      };

      const user = await this.socialAuthService.findOrCreateUser(profile);

      // Log the login
      await this.prisma.loginHistory.create({
        data: {
          userId: user.id,
          loginMethod: 'FACEBOOK',
        },
      });

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '365d' },
      );

      // Redirect to frontend with token
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/auth/callback?token=${token}&provider=facebook&userId=${user.id}`;

      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Facebook callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth/error?message=${encodeURIComponent(error.message)}`);
    }
  }

  /**
   * Apple OAuth Login
   * GET /auth/social/apple
   */
  @Get('apple')
  @UseGuards(AuthGuard('apple'))
  async appleLogin() {
    // This is handled by Passport
  }

  /**
   * Apple OAuth Callback
   * GET /auth/social/apple/callback
   */
  @Get('apple/callback')
  @UseGuards(AuthGuard('apple'))
  async appleCallback(@Req() req: Request, @Res() res: Response) {
    try {
      const appleUser = (req as any).user;

      const profile: SocialProfile = {
        id: appleUser.id,
        email: appleUser.email,
        displayName: appleUser.displayName || 'Apple User',
        provider: 'apple',
      };

      const user = await this.socialAuthService.findOrCreateUser(profile);

      // Log the login
      await this.prisma.loginHistory.create({
        data: {
          userId: user.id,
          loginMethod: 'APPLE',
        },
      });

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '365d' },
      );

      // Redirect to frontend with token
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/auth/callback?token=${token}&provider=apple&userId=${user.id}`;

      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Apple callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth/error?message=${encodeURIComponent(error.message)}`);
    }
  }

  /**
   * Link social account to existing user
   * POST /auth/social/link
   */
  @Post('link/:provider')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async linkSocialAccount(
    @Req() req: any,
    @Param('provider') provider: string,
    @Body() dto: LinkSocialAccountDto,
  ) {
    try {
      const userId = req.user.userId;

      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      // This would typically be called after social OAuth process
      // For now, we return a message to complete social auth flow
      return {
        success: true,
        data: {
          message: `Complete ${provider} authentication to link account`,
          provider,
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Unlink social account from user
   * DELETE /auth/social/unlink/:provider
   */
  @Delete('unlink/:provider')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async unlinkSocialAccount(
    @Req() req: any,
    @Param('provider') provider: string,
  ) {
    try {
      const userId = req.user.userId;

      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      const user = await this.socialAuthService.unlinkSocialAccount(userId, provider);

      return {
        success: true,
        data: {
          message: `${provider} account unlinked successfully`,
          authMethods: user.authMethods,
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get user's linked social accounts
   * GET /auth/social/accounts
   */
  @Get('accounts')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getLinkedAccounts(@Req() req: any) {
    try {
      const userId = req.user.userId;

      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      const accounts = await this.socialAuthService.getUserSocialAccounts(userId);

      return {
        success: true,
        data: {
          accounts,
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get available auth methods for user
   * GET /auth/methods
   */
  @Get('/methods')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getAuthMethods(@Req() req: any) {
    try {
      const userId = req.user.userId;

      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { 
          authProvider: true,
          email: true,
          phone: true,
          socialAccounts: true,
        },
      });

      // Add null check
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return {
        success: true,
        data: {
          currentAuthProvider: user.authProvider,
          availableMethods: ['OTP_EMAIL', 'OTP_SMS', 'GOOGLE', 'FACEBOOK', 'APPLE'],
          linkedSocialAccounts: user.socialAccounts?.map(sa => sa.provider) || [],
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
