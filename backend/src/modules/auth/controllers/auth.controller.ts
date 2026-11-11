// src/modules/auth/controllers/auth.controller.ts (Fixed version)
import { 
  Controller, 
  Post, 
  Body, 
  Get, 
  UseGuards, 
  Request, 
  HttpCode, 
  HttpStatus,
  UseInterceptors,
  Res,
  Param,
  BadRequestException,
  UnauthorizedException
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiConflictResponse,
  ApiExcludeEndpoint
} from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { TokenResponseDto } from '../dto/token-response.dto';
import { ProfileResponseDto } from '../dto/profile-response.dto';
import { AuthGuard } from '@nestjs/passport';
import express from 'express';
import { ConfigService } from '@nestjs/config';
import { SafeSerializeInterceptor } from '../../../interceptors/safe-serialize.interceptor';
import { RequestPasswordResetDto } from '../dto/request-password-reset.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { EmailService } from '../../../modules/email/services/email.service'; // Fixed path

@ApiTags('Authentication')
@Controller('auth')
@UseInterceptors(SafeSerializeInterceptor)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  // ==================== CORE AUTH ENDPOINTS ====================
  
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Register a new user',
    description: 'Creates a new user account with email validation, phone validation (E.164 format), and returns authentication tokens'
  })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({ 
    description: 'User successfully registered',
    type: TokenResponseDto 
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid input data or validation failed' 
  })
  @ApiConflictResponse({ 
    description: 'User with this email or phone already exists' 
  })
  async register(@Body() registerDto: RegisterDto): Promise<TokenResponseDto> {
    const result = await this.authService.register(registerDto);
    
    // Send welcome email with verification
    await this.emailService.sendWelcomeEmail(
      registerDto.email,
      registerDto.displayName,
      result.verificationToken
    );
    
    return result.tokens;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Login user',
    description: 'Authenticate user with email and password, return JWT tokens'
  })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ 
    description: 'Login successful',
    type: TokenResponseDto 
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid request body' 
  })
  @ApiUnauthorizedResponse({ 
    description: 'Invalid credentials or account disabled' 
  })
  async login(@Body() loginDto: LoginDto): Promise<TokenResponseDto> {
    return this.authService.login(loginDto);
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Refresh access token with rotation',
    description: 'Get new access token using refresh token. Implements token rotation for security.'
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiOkResponse({ 
    description: 'Token refreshed successfully',
    type: TokenResponseDto 
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid refresh token format' 
  })
  @ApiUnauthorizedResponse({ 
    description: 'Invalid, expired, or reused refresh token' 
  })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto): Promise<TokenResponseDto> {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Logout user',
    description: 'Invalidate refresh token server-side. Client should also remove tokens from storage.'
  })
  @ApiOkResponse({ 
    description: 'Logged out successfully',
    schema: {
      example: { message: 'Logged out successfully' }
    }
  })
  @ApiUnauthorizedResponse({ 
    description: 'Missing or invalid authentication token' 
  })
  async logout(@Request() req): Promise<{ message: string }> {
    return this.authService.logout(req.user.id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Get current user profile',
    description: 'Returns the profile of the currently authenticated user. Requires valid JWT token.'
  })
  @ApiOkResponse({ 
    description: 'User profile retrieved successfully',
    type: ProfileResponseDto 
  })
  @ApiUnauthorizedResponse({ 
    description: 'Missing or invalid authentication token' 
  })
  async getProfile(@Request() req): Promise<ProfileResponseDto> {
    const user = await this.authService.getProfile(req.user.id);
    return user as ProfileResponseDto;
  }

  // ==================== PASSWORD RESET ENDPOINTS ====================

  @Post('request-password-reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Request password reset',
    description: 'Send password reset instructions to email.'
  })
  @ApiBody({ type: RequestPasswordResetDto })
  @ApiOkResponse({ 
    description: 'Password reset instructions sent',
    schema: {
      example: { message: 'Password reset instructions have been sent to your email.' }
    }
  })
  async requestPasswordReset(@Body() requestPasswordResetDto: RequestPasswordResetDto): Promise<{ message: string }> {
    const result = await this.authService.requestPasswordReset(requestPasswordResetDto.email);
    
    // Send password reset email
    if (result.resetToken && result.userName) {
      await this.emailService.sendPasswordResetEmail(
        requestPasswordResetDto.email,
        result.resetToken,
        result.userName
      );
    }
    
    return { message: 'If an account exists with this email, you will receive a password reset link.' };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Reset password with token',
    description: 'Reset password using valid reset token. Invalidates all existing sessions.'
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiOkResponse({ 
    description: 'Password reset successful',
    schema: {
      example: { message: 'Password reset successfully' }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid token or passwords do not match' 
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    // Validate passwords match
    if (resetPasswordDto.newPassword !== resetPasswordDto.confirmPassword) {
      throw new BadRequestException('New password and confirmation do not match');
    }
    
    return this.authService.resetPassword(resetPasswordDto.token, resetPasswordDto.newPassword);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Change password (authenticated)',
    description: 'Change password for logged-in user. Requires current password.'
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiOkResponse({ 
    description: 'Password changed successfully',
    schema: {
      example: { message: 'Password changed successfully' }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Current password incorrect or new passwords do not match' 
  })
  @ApiUnauthorizedResponse({ 
    description: 'Not authenticated' 
  })
  async changePassword(@Request() req, @Body() changePasswordDto: ChangePasswordDto): Promise<{ message: string }> {
    return this.authService.changePassword(
      req.user.id,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
      changePasswordDto.confirmPassword
    );
  }

  // ==================== EMAIL VERIFICATION ENDPOINTS ====================

  @Post('send-verification-email')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Send verification email',
    description: 'Send email verification link.'
  })
  @ApiOkResponse({ 
    description: 'Verification email sent',
    schema: {
      example: { message: 'Verification email has been sent.' }
    }
  })
  async sendVerificationEmail(@Request() req): Promise<{ message: string }> {
    // Get user email from request
    const email = req.user.email;
    
    // Send verification request
    const result = await this.authService.sendVerificationEmail(email);
    
    // Send verification email
    await this.emailService.sendVerificationEmail(
      email,
      req.user.displayName,
      result.verificationToken
    );
    
    return { message: 'Verification email has been sent to your email address.' };
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Verify email with token',
    description: 'Verify email address using verification token from email'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        token: { 
          type: 'string', 
          example: 'verification-token-here',
          description: 'Email verification token received via email'
        }
      }
    }
  })
  @ApiOkResponse({ 
    description: 'Email verified successfully',
    schema: {
      example: { message: 'Email verified successfully' }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid or expired verification token' 
  })
  async verifyEmail(@Body('token') token: string): Promise<{ message: string }> {
    return this.authService.verifyEmailWithToken(token);
  }

  // ==================== OAUTH ENDPOINTS ====================
  
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ 
    summary: 'Initiate Google OAuth flow',
    description: 'Redirects to Google OAuth consent screen.'
  })
  @ApiExcludeEndpoint()
  async googleAuth() {
    // Guard redirects automatically
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiExcludeEndpoint()
  async googleAuthCallback(@Request() req, @Res() res: express.Response) {
    try {
      const googleUser = req.user;
      
      // Extract Google profile data
      const profile = googleUser.profile;
      
      // Use your existing oauthLogin method
      const tokens = await this.authService.oauthLogin(
        'GOOGLE',
        profile.id,
        profile.email,
        profile.displayName || `${profile.firstName} ${profile.lastName}`.trim(),
        profile.avatarUrl
      );
      
      // Redirect to frontend with your JWT token
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/auth/callback?token=${tokens.accessToken}&refreshToken=${tokens.refreshToken}&provider=google`;
      
      return res.redirect(redirectUrl);
      
    } catch (error) {
      console.error('❌ Google OAuth callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/auth/login?error=${encodeURIComponent(error.message)}`);
    }
  }

  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  @ApiOperation({ 
    summary: 'Initiate Facebook OAuth flow',
    description: 'Redirects to Facebook OAuth consent screen.'
  })
  @ApiExcludeEndpoint()
  async facebookAuth() {
    // Guard redirects automatically
  }

  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  @ApiExcludeEndpoint()
  async facebookAuthCallback(@Request() req, @Res() res: express.Response) {
    try {
      const facebookUser = req.user;
      
      // Extract Facebook profile data
      const profile = facebookUser.profile;
      
      // Use your existing oauthLogin method
      const tokens = await this.authService.oauthLogin(
        'FACEBOOK',
        profile.id,
        profile.email,
        profile.displayName,
        profile.avatarUrl
      );
      
      // Redirect to frontend with your JWT token
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/auth/callback?token=${tokens.accessToken}&refreshToken=${tokens.refreshToken}&provider=facebook`;
      
      return res.redirect(redirectUrl);
      
    } catch (error) {
      console.error('❌ Facebook OAuth callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/auth/login?error=${encodeURIComponent(error.message)}`);
    }
  }

  @Get('apple')
  @UseGuards(AuthGuard('apple'))
  @ApiOperation({ 
    summary: 'Initiate Apple OAuth flow',
    description: 'Redirects to Apple OAuth consent screen.'
  })
  @ApiExcludeEndpoint()
  async appleAuth() {
    // Guard redirects automatically
  }

  @Get('apple/callback')
  @UseGuards(AuthGuard('apple'))
  @ApiExcludeEndpoint()
  async appleAuthCallback(@Request() req, @Res() res: express.Response) {
    try {
      const appleUser = req.user;
      
      // Extract Apple profile data
      const profile = appleUser.profile;
      
      // Use your existing oauthLogin method
      const tokens = await this.authService.oauthLogin(
        'APPLE',
        profile.id,
        profile.email,
        profile.displayName || profile.name,
        undefined // Apple doesn't provide avatar URL
      );
      
      // Redirect to frontend with your JWT token
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/auth/callback?token=${tokens.accessToken}&refreshToken=${tokens.refreshToken}&provider=apple`;
      
      return res.redirect(redirectUrl);
      
    } catch (error) {
      console.error('❌ Apple OAuth callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/auth/login?error=${encodeURIComponent(error.message)}`);
    }
  }
}