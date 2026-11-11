// src/modules/auth/services/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaClient, UserRole, AuthProvider } from '@prisma/client';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { TokenResponseDto } from '../dto/token-response.dto';
import { ProfileResponseDto } from '../dto/profile-response.dto';

@Injectable()
export class AuthService {
  private prisma: PrismaClient;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.prisma = new PrismaClient();
  }

  async findUserById(userId: string): Promise<any> {
    try {
      return await this.prisma.user.findUnique({
        where: {
          id: userId,
          isDeleted: false,
        },
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          isActive: true,
          isDeleted: true,
          country: true,
          region: true,
          city: true,
          emailVerified: true,
          verifiedAt: true,
        },
      });
    } catch (error) {
      console.error('Error finding user by ID:', error);
      return null;
    }
  }

  async register(registerDto: RegisterDto): Promise<{
    tokens: TokenResponseDto;
    user: { id: string; email: string; displayName: string };
    verificationToken: string;
  }> {
    console.log('📝 Register DTO received:', {
      email: registerDto.email,
      displayName: registerDto.displayName,
      country: registerDto.country,
      region: registerDto.region,
      city: registerDto.city,
    });

    // Check if email already exists
    const existingEmailUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingEmailUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Check if phone already exists (only if phone is provided)
    if (registerDto.phone && registerDto.phone.trim() !== '') {
      const existingPhoneUser = await this.prisma.user.findUnique({
        where: { phone: registerDto.phone },
      });

      if (existingPhoneUser) {
        throw new ConflictException(
          'User with this phone number already exists',
        );
      }
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(registerDto.password, saltRounds);

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenHash = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const country = registerDto.country ?? null;
    const region = registerDto.region ?? null;
    const city = registerDto.city ?? null;

    try {
      const user = await this.prisma.user.create({
        data: {
          email: registerDto.email,
          passwordHash: hashedPassword,
          displayName: registerDto.displayName,
          firstName: registerDto.firstName,
          lastName: registerDto.lastName,
          phone: registerDto.phone,
          avatarUrl: registerDto.avatarUrl,
          bio: registerDto.bio,
          role: (registerDto.role as UserRole) || UserRole.USER,

          // Location fields
          country: country,
          region: region,
          city: city,
          location:
            city && region && country ? `${city}, ${region}, ${country}` : null,

          // Verification fields
          emailVerified: false,
          phoneVerified: false,
          verifiedAt: null,

          // Store verification token in privacySettings
          privacySettings: {
            emailVerificationToken: verificationTokenHash,
            emailVerificationTokenExpiry: verificationTokenExpiry.toISOString(),
          } as any,

          // Required fields
          isActive: true,
          authProvider: AuthProvider.EMAIL,

          // Default preferences
          language: 'en',
          themePreference: 'light',
          timezone: 'UTC',
        },
      });

      console.log('✅ User registered successfully with ID:', user.id);

      // Generate tokens
      const tokens = await this.generateTokens(user);

      return {
        tokens,
        user: {
          id: user.id,
          email: user.email || '',
          displayName: user.displayName,
        },
        verificationToken: verificationToken, // Return plain token for email
      };
    } catch (error) {
      console.error('❌ Registration error:', error);

      // Handle Prisma errors
      if (error.code === 'P2002') {
        const targetField = error.meta?.target?.[0];
        if (targetField === 'email') {
          throw new ConflictException('User with this email already exists');
        } else if (targetField === 'phone') {
          throw new ConflictException(
            'User with this phone number already exists',
          );
        }
      }

      throw new InternalServerErrorException(
        'Registration failed. Please try again.',
      );
    }
  }

  async login(loginDto: LoginDto): Promise<TokenResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive || user.isDeleted) {
      throw new UnauthorizedException('Account is disabled or deleted');
    }

    // Check if email is verified
    if (!user.emailVerified) {
      throw new UnauthorizedException(
        'Please verify your email before logging in',
      );
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.generateTokens(user);
  }

  async refreshToken(refreshToken: string): Promise<TokenResponseDto> {
    try {
      // Get JWT refresh secret from environment
      const jwtRefreshSecret =
        this.configService.get<string>('JWT_REFRESH_SECRET');

      if (!jwtRefreshSecret) {
        throw new InternalServerErrorException(
          'JWT refresh secret not configured',
        );
      }

      // Verify refresh token with proper error handling
      let payload: any;
      try {
        payload = this.jwtService.verify(refreshToken, {
          secret: jwtRefreshSecret,
        });
      } catch (jwtError) {
        // Handle different JWT errors
        if (jwtError.name === 'TokenExpiredError') {
          throw new UnauthorizedException(
            'Refresh token has expired. Please login again.',
          );
        } else if (jwtError.name === 'JsonWebTokenError') {
          throw new UnauthorizedException('Invalid refresh token format.');
        } else {
          console.error('JWT verification error:', jwtError);
          throw new UnauthorizedException('Invalid refresh token.');
        }
      }

      // Validate payload structure
      if (!payload.sub || typeof payload.sub !== 'string') {
        throw new UnauthorizedException('Invalid token payload.');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          isDeleted: true,
          refreshToken: true,
          refreshTokenExpiry: true,
        },
      });

      if (!user) {
        throw new UnauthorizedException('User account not found.');
      }

      if (!user.isActive || user.isDeleted) {
        throw new UnauthorizedException('Account is disabled or deleted.');
      }

      // Verify refresh token matches stored token
      if (user.refreshToken !== refreshToken) {
        // Clear invalid refresh token from database
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            refreshToken: null,
            refreshTokenExpiry: null,
          },
        });
        throw new UnauthorizedException(
          'Refresh token mismatch. Please login again.',
        );
      }

      // Check database expiry (extra layer of security)
      if (user.refreshTokenExpiry && user.refreshTokenExpiry < new Date()) {
        // Clear expired token
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            refreshToken: null,
            refreshTokenExpiry: null,
          },
        });
        throw new UnauthorizedException(
          'Refresh token has expired. Please login again.',
        );
      }

      // Generate new tokens (with 365 days expiry)
      return await this.generateTokens(user, true);
    } catch (error) {
      console.error('Refresh token error:', error);

      // If it's already a properly formatted UnauthorizedException, re-throw
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      // Handle other errors
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException(
          'Refresh token has expired. Please login again.',
        );
      } else if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid refresh token format.');
      }

      // Default error
      throw new UnauthorizedException(
        'Authentication failed. Please login again.',
      );
    }
  }

  async getProfile(userId: string): Promise<ProfileResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        displayName: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        bio: true,

        // Location fields
        country: true,
        region: true,
        city: true,
        location: true,

        // Verification fields
        emailVerified: true,
        phoneVerified: true,
        verifiedAt: true,

        // Status fields
        isActive: true,
        isDeleted: true,

        // Auth and role fields
        role: true,
        authProvider: true,
        providerId: true,

        // Timestamps
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        lastProfileUpdateAt: true,
        dateOfBirth: true,
        deletedAt: true,

        // Preferences
        gender: true,
        language: true,
        themePreference: true,
        timezone: true,

        // Settings
        privacySettings: true,
        notificationSettings: true,

        // OTP fields
        lastOtpSentAt: true,
        maxOtpAttempts: true,
        otpAttempts: true,
        otpBlockedUntil: true,
        otpResendCount: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user as unknown as ProfileResponseDto;
  }

  async oauthLogin(
    provider: string,
    providerId: string,
    email: string,
    name: string,
    avatarUrl?: string,
  ): Promise<TokenResponseDto> {
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: email },
          {
            providerId: providerId,
            authProvider: provider.toUpperCase() as AuthProvider,
          },
        ],
      },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: email,
          displayName: name,
          authProvider: provider.toUpperCase() as AuthProvider,
          providerId: providerId,
          emailVerified: true,
          verifiedAt: new Date(),
          isActive: true,
          language: 'en',
          themePreference: 'light',
          timezone: 'UTC',
          avatarUrl: avatarUrl,
        },
      });
    } else {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          authProvider: provider.toUpperCase() as AuthProvider,
          providerId: providerId,
          ...(avatarUrl && { avatarUrl: avatarUrl }),
        },
      });
    }

    return this.generateTokens(user);
  }

  // ==================== VERIFICATION METHODS ====================

  async verifyEmail(userId: string): Promise<{ message: string }> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        verifiedAt: new Date(),
      },
    });

    return { message: 'Email verified successfully' };
  }

  async verifyEmailWithToken(token: string): Promise<{ message: string }> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with this token in privacySettings
    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        isDeleted: false,
      },
    });

    let targetUser: any = null;

    for (const user of users) {
      const privacySettings = user.privacySettings as any;
      if (privacySettings?.emailVerificationToken === tokenHash) {
        const expiry = new Date(privacySettings.emailVerificationTokenExpiry);
        if (expiry > new Date()) {
          targetUser = user;
          break;
        }
      }
    }

    if (!targetUser) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Update user
    const privacySettings = (targetUser.privacySettings as any) || {};
    delete privacySettings.emailVerificationToken;
    delete privacySettings.emailVerificationTokenExpiry;

    await this.prisma.user.update({
      where: { id: targetUser.id },
      data: {
        emailVerified: true,
        verifiedAt: new Date(),
        privacySettings,
      },
    });

    return { message: 'Email verified successfully' };
  }

  async sendVerificationEmail(email: string): Promise<{
    message: string;
    verificationToken: string;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenHash = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store in privacySettings
    const privacySettings = (user.privacySettings as any) || {};
    privacySettings.emailVerificationToken = verificationTokenHash;
    privacySettings.emailVerificationTokenExpiry =
      verificationTokenExpiry.toISOString();

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        privacySettings,
      },
    });

    return {
      message: 'Verification email has been sent.',
      verificationToken,
    };
  }

  async verifyPhone(userId: string): Promise<{ message: string }> {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true, verifiedAt: true },
    });

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        phoneVerified: true,
        verifiedAt:
          existingUser?.emailVerified && !existingUser.verifiedAt
            ? new Date()
            : undefined,
      },
    });

    return { message: 'Phone verified successfully' };
  }

  async isUserVerified(userId: string): Promise<{
    emailVerified: boolean;
    phoneVerified: boolean;
    fullyVerified: boolean;
    verifiedAt: Date | null;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        emailVerified: true,
        phoneVerified: true,
        verifiedAt: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return {
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      fullyVerified: user.emailVerified && user.phoneVerified,
      verifiedAt: user.verifiedAt,
    };
  }

  public async generateTokens(
    user: any,
    isRefresh: boolean = false,
  ): Promise<TokenResponseDto> {
    console.log('🔧 Generating tokens for user:', user.id);

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      displayName: user.displayName,
      country: user.country,
      region: user.region,
      city: user.city,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      verifiedAt: user.verifiedAt,
      iat: Math.floor(Date.now() / 1000), // Issued at timestamp
    };

    // Get JWT configuration from config service
    const authConfig = this.configService.get('auth');

    // Fallback to environment variables if config service doesn't have it
    const jwtSecret = authConfig?.jwt?.secret || process.env.JWT_SECRET;
    const jwtRefreshSecret =
      authConfig?.jwt?.refreshSecret || process.env.JWT_REFRESH_SECRET;

    // Set expiry to 365 days for both tokens
    const jwtExpiresIn = '365d';
    const jwtRefreshExpiresIn = '365d';

    // For access token (used for API calls)
    const accessTokenExpiresIn = authConfig?.jwt?.expiresIn || jwtExpiresIn;
    // For refresh token (used to get new access tokens)
    const refreshTokenExpiresIn =
      authConfig?.jwt?.refreshExpiresIn || jwtRefreshExpiresIn;

    if (!jwtSecret) {
      throw new InternalServerErrorException('JWT secret not configured');
    }

    console.log('🔧 Using JWT Expiry:', accessTokenExpiresIn);

    // Generate access token with 365 days expiry
    const accessToken = this.jwtService.sign(payload, {
      secret: jwtSecret,
      expiresIn: accessTokenExpiresIn,
    } as any);

    // Generate refresh token with 365 days expiry
    const refreshToken = this.jwtService.sign(
      {
        sub: user.id,
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000),
      },
      {
        secret: jwtRefreshSecret || jwtSecret + '-refresh',
        expiresIn: refreshTokenExpiresIn,
      } as any,
    );

    // Calculate expiry times (365 days = 365 * 24 * 60 * 60 seconds)
    const accessTokenExpiryInSeconds =
      this.parseJwtExpiry(accessTokenExpiresIn);
    const refreshTokenExpiryInSeconds = this.parseJwtExpiry(
      refreshTokenExpiresIn,
    );

    // Calculate expiry dates for database storage
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setSeconds(
      refreshTokenExpiry.getSeconds() + refreshTokenExpiryInSeconds,
    );

    // Store refresh token in database
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken,
        refreshTokenExpiry,
        ...(isRefresh ? { lastLoginAt: new Date() } : {}),
      },
    });

    console.log('✅ Tokens generated successfully');
    console.log(
      `📅 Access token expires in: ${accessTokenExpiryInSeconds} seconds (${this.formatTime(accessTokenExpiryInSeconds)})`,
    );
    console.log(
      `📅 Refresh token expires in: ${refreshTokenExpiryInSeconds} seconds (${this.formatTime(refreshTokenExpiryInSeconds)})`,
    );

    return new TokenResponseDto({
      accessToken,
      refreshToken,
      expiresIn: accessTokenExpiryInSeconds,
      refreshExpiresIn: refreshTokenExpiryInSeconds,
    });
  }

  async logout(userId: string): Promise<{ message: string }> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshToken: null,
        refreshTokenExpiry: null,
      },
    });

    return { message: 'Logged out successfully' };
  }

  private parseJwtExpiry(expiry: string): number {
    if (!expiry) return 365 * 24 * 60 * 60; // Default 365 days

    const unit = expiry.slice(-1).toLowerCase();
    const value = parseInt(expiry.slice(0, -1), 10);

    if (isNaN(value)) return 30 * 24 * 60 * 60;

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      case 'y':
        return value * 365 * 24 * 60 * 60; // Handle years
      default:
        return value * 24 * 60 * 60; // Default to days if no unit specified
    }
  }

  private formatTime(seconds: number): string {
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);

    return `${days} days, ${hours} hours, ${minutes} minutes`;
  }

  async validateUser(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive || user.isDeleted) {
      return null;
    }

    return user;
  }

  // ==================== PASSWORD RESET METHODS ====================

  async requestPasswordReset(email: string): Promise<{
    message: string;
    resetToken: string;
    userName: string;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.isActive || user.isDeleted) {
      // Still return success to prevent email enumeration
      return {
        message:
          'If an account exists with this email, you will receive a password reset link.',
        resetToken: '',
        userName: '',
      };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    // Store reset token in privacySettings
    const privacySettings = (user.privacySettings as any) || {};
    privacySettings.passwordResetToken = resetTokenHash;
    privacySettings.passwordResetTokenExpiry = resetTokenExpiry.toISOString();

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        privacySettings,
      },
    });

    return {
      message: 'Password reset instructions have been sent to your email.',
      resetToken,
      userName: user.displayName,
    };
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with this token in privacySettings
    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        isDeleted: false,
      },
    });

    let targetUser: any = null;

    for (const user of users) {
      const privacySettings = user.privacySettings as any;
      if (privacySettings?.passwordResetToken === tokenHash) {
        const expiry = new Date(privacySettings.passwordResetTokenExpiry);
        if (expiry > new Date()) {
          targetUser = user;
          break;
        }
      }
    }

    if (!targetUser) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password and clear reset token from privacySettings
    const privacySettings = (targetUser.privacySettings as any) || {};
    delete privacySettings.passwordResetToken;
    delete privacySettings.passwordResetTokenExpiry;

    await this.prisma.user.update({
      where: { id: targetUser.id },
      data: {
        passwordHash: hashedPassword,
        privacySettings,
        lastProfileUpdateAt: new Date(),
        // Invalidate all refresh tokens for security
        refreshToken: null,
        refreshTokenExpiry: null,
      },
    });

    return {
      message:
        'Password reset successfully. You can now login with your new password.',
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<{ message: string }> {
    // Validate new passwords match
    if (newPassword !== confirmPassword) {
      throw new BadRequestException(
        'New password and confirmation do not match',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Check if new password is same as current password
    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: hashedPassword,
        lastProfileUpdateAt: new Date(),
        // Invalidate all refresh tokens for security
        refreshToken: null,
        refreshTokenExpiry: null,
      },
    });

    return { message: 'Password changed successfully' };
  }

  // ==================== HELPER METHODS ====================

  async updateProfile(
    userId: string,
    updateData: any,
  ): Promise<ProfileResponseDto> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...updateData,
        lastProfileUpdateAt: new Date(),
        ...(updateData.country || updateData.region || updateData.city
          ? {
              location:
                updateData.city && updateData.region && updateData.country
                  ? `${updateData.city}, ${updateData.region}, ${updateData.country}`
                  : null,
            }
          : {}),
      },
      select: {
        id: true,
        email: true,
        phone: true,
        displayName: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        bio: true,
        country: true,
        region: true,
        city: true,
        location: true,
        emailVerified: true,
        phoneVerified: true,
        verifiedAt: true,
        isActive: true,
        role: true,
        authProvider: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        lastProfileUpdateAt: true,
      },
    });

    return user as unknown as ProfileResponseDto;
  }

  async checkEmailExists(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email: email },
      select: { id: true },
    });
    return !!user;
  }

  async checkPhoneExists(phone: string): Promise<boolean> {
    if (!phone || phone.trim() === '') return false;

    const user = await this.prisma.user.findUnique({
      where: { phone: phone },
      select: { id: true },
    });
    return !!user;
  }

  async deleteAccount(userId: string): Promise<{ message: string }> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        isDeleted: true,
        deletedAt: new Date(),
        email: `deleted_${Date.now()}_${userId}@deleted.com`,
        phone: null,
        displayName: 'Deleted User',
        firstName: null,
        lastName: null,
        avatarUrl: null,
        bio: null,
        refreshToken: null,
        refreshTokenExpiry: null,
        country: null,
        region: null,
        city: null,
        location: null,
        verifiedAt: null,
      },
    });

    return { message: 'Account deleted successfully' };
  }

  // ==================== ADMIN METHODS ====================

  async adminVerifyUser(userId: string): Promise<{ message: string }> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        phoneVerified: true,
        verifiedAt: new Date(),
      },
    });

    return { message: 'User verified by admin successfully' };
  }

  async getVerificationStats(): Promise<{
    totalUsers: number;
    emailVerified: number;
    phoneVerified: number;
    fullyVerified: number;
    verifiedAtSet: number;
  }> {
    const totalUsers = await this.prisma.user.count({
      where: { isDeleted: false },
    });

    const emailVerified = await this.prisma.user.count({
      where: { emailVerified: true, isDeleted: false },
    });

    const phoneVerified = await this.prisma.user.count({
      where: { phoneVerified: true, isDeleted: false },
    });

    const fullyVerified = await this.prisma.user.count({
      where: {
        emailVerified: true,
        phoneVerified: true,
        isDeleted: false,
      },
    });

    const verifiedAtSet = await this.prisma.user.count({
      where: {
        verifiedAt: { not: null },
        isDeleted: false,
      },
    });

    return {
      totalUsers,
      emailVerified,
      phoneVerified,
      fullyVerified,
      verifiedAtSet,
    };
  }

  // ==================== DEVICE MANAGEMENT ====================

  async getTrustedDevices(userId: string): Promise<any[]> {
    return await this.prisma.trustedDevice.findMany({
      where: { userId, isTrusted: true },
      orderBy: { lastUsed: 'desc' },
    });
  }

  async revokeDevice(
    userId: string,
    deviceId: string,
  ): Promise<{ message: string }> {
    await this.prisma.trustedDevice.update({
      where: { userId_deviceId: { userId, deviceId } },
      data: { isTrusted: false, status: 'UNTRUSTED' },
    });

    return { message: 'Device access revoked successfully' };
  }

  // ==================== ACCOUNT MANAGEMENT ====================

  async updatePreferences(
    userId: string,
    preferences: any,
  ): Promise<ProfileResponseDto> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        language: preferences.language,
        themePreference: preferences.themePreference,
        timezone: preferences.timezone,
        notificationSettings: preferences.notificationSettings,
        privacySettings: preferences.privacySettings,
        lastProfileUpdateAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        phone: true,
        displayName: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        bio: true,
        country: true,
        region: true,
        city: true,
        location: true,
        emailVerified: true,
        phoneVerified: true,
        verifiedAt: true,
        isActive: true,
        role: true,
        authProvider: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        lastProfileUpdateAt: true,
        language: true,
        themePreference: true,
        timezone: true,
      },
    });

    return user as unknown as ProfileResponseDto;
  }

  async deactivateAccount(userId: string): Promise<{ message: string }> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        lastProfileUpdateAt: new Date(),
      },
    });

    return { message: 'Account deactivated successfully' };
  }

  async reactivateAccount(userId: string): Promise<{ message: string }> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isActive: true,
        lastProfileUpdateAt: new Date(),
      },
    });

    return { message: 'Account reactivated successfully' };
  }

  async findUserByEmail(email: string): Promise<any> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        socialAccounts: {
          where: { provider: 'GOOGLE' },
        },
      },
    });
  }

  async createUserFromGoogle(data: {
    email: string;
    displayName: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    googleId: string;
    googleAccessToken?: string;
    emailVerified: boolean;
  }): Promise<any> {
    // Start a transaction to create both User and SocialAccount
    return this.prisma.$transaction(async (prisma) => {
      // Create the user
      const user = await prisma.user.create({
        data: {
          email: data.email.toLowerCase(),
          displayName: data.displayName,
          firstName: data.firstName,
          lastName: data.lastName,
          avatarUrl: data.avatarUrl,
          providerId: data.googleId,
          emailVerified: data.emailVerified,
          verifiedAt: data.emailVerified ? new Date() : null,
          role: 'USER',
          authProvider: 'GOOGLE',
          isActive: true,
          country: null,
          region: null,
          city: null,
          location: null,
          language: 'en',
          themePreference: 'light',
          timezone: 'UTC',
        },
        include: {
          socialAccounts: true,
        },
      });

      // Create linked SocialAccount for Google
      await prisma.socialAccount.create({
        data: {
          userId: user.id,
          provider: 'GOOGLE',
          providerId: data.googleId,
          email: data.email,
          displayName: data.displayName,
          firstName: data.firstName,
          lastName: data.lastName,
          avatarUrl: data.avatarUrl,
          accessToken: data.googleAccessToken,
          isConnected: true,
          profileData: {
            googleId: data.googleId,
            emailVerified: data.emailVerified,
            verifiedAt: new Date().toISOString(),
          },
        },
      });

      return user;
    });
  }

  async updateUserWithGoogle(
    userId: string,
    data: {
      googleId: string;
      googleAccessToken?: string;
      avatarUrl?: string;
    },
  ): Promise<any> {
    // Start transaction to update both User and SocialAccount
    return this.prisma.$transaction(async (prisma) => {
      // Update the user
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          providerId: data.googleId,
          authProvider: 'GOOGLE',
          ...(data.avatarUrl && { avatarUrl: data.avatarUrl }),
          lastLoginAt: new Date(),
        },
        include: {
          socialAccounts: {
            where: { provider: 'GOOGLE' },
          },
        },
      });

      // Update or create SocialAccount
      const existingSocialAccount = await prisma.socialAccount.findFirst({
        where: {
          userId: userId,
          provider: 'GOOGLE',
        },
      });

      if (existingSocialAccount) {
        await prisma.socialAccount.update({
          where: { id: existingSocialAccount.id },
          data: {
            providerId: data.googleId,
            accessToken: data.googleAccessToken,
            ...(data.avatarUrl && { avatarUrl: data.avatarUrl }),
            isConnected: true,
            updatedAt: new Date(),
          },
        });
      } else {
        await prisma.socialAccount.create({
          data: {
            userId: userId,
            provider: 'GOOGLE',
            providerId: data.googleId,
            email: user.email,
            displayName: user.displayName,
            firstName: user.firstName,
            lastName: user.lastName,
            avatarUrl: data.avatarUrl || user.avatarUrl,
            accessToken: data.googleAccessToken,
            isConnected: true,
            profileData: {
              googleId: data.googleId,
              updatedAt: new Date().toISOString(),
            },
          },
        });
      }

      return user;
    });
  }
}
