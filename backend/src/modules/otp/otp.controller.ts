import { Controller, Post, Body, BadRequestException, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { OtpService } from './otp.service';
import { EmailService } from '../email/email.service';
import { SmsService } from '../sms/sms.service';
import { PrismaService } from '../../database/prisma.service';
import { RequestOtpDto, VerifyOtpDto, ResendOtpDto, CancelOtpDto, CheckOtpStatusDto } from './dto/otp.dto';
import type { Response } from 'express';
import * as jwt from 'jsonwebtoken';

@Controller('auth/otp')
export class OtpController {
  constructor(
    private otpService: OtpService,
    private emailService: EmailService,
    private smsService: SmsService,
    private prisma: PrismaService,
  ) {}

  /**
   * Request OTP (POST /auth/otp/request)
   * Generates and sends OTP to email or phone
   */
  @Post('request')
  @HttpCode(HttpStatus.OK)
  async requestOtp(@Body() dto: RequestOtpDto) {
    const { identifier } = dto;

    // Determine type (email or phone)
    const type = this.isEmail(identifier) ? 'email' : 'phone';

    try {
      // Generate OTP
      const { otp, expiresIn } = await this.otpService.generateOTP(identifier, type);

      // Send OTP
      if (type === 'email') {
        await this.emailService.sendOTPEmail(identifier, otp, 'User');
      } else {
        await this.smsService.sendOTPSms(identifier, otp);
      }

      // Mask identifier for response
      const maskedIdentifier = this.maskIdentifier(identifier);

      return {
        success: true,
        data: {
          message: `OTP sent successfully to ${type}`,
          identifier: maskedIdentifier,
          method: type,
          expiresIn,
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Verify OTP (POST /auth/otp/verify)
   * Verifies OTP and creates JWT token for user
   */
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    const { identifier, otp, name } = dto;
    const type = this.isEmail(identifier) ? 'email' : 'phone';

    try {
      // Verify OTP
      const { verified, userId } = await this.otpService.verifyOTP(identifier, type, otp);

      if (!verified) {
        throw new BadRequestException('OTP verification failed');
      }

      let user: any = null;

      if (userId) {
        // Existing user - login
        user = await this.prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
          throw new BadRequestException('User not found');
        }

        // Update last login and auth provider
        user = await this.prisma.user.update({
          where: { id: userId },
          data: {
            lastLoginAt: new Date(),
            authProvider: type === 'email' ? 'EMAIL' : 'PHONE',
          },
        });

        // Log login
        await this.prisma.loginHistory.create({
          data: {
            userId,
            loginMethod: type === 'email' ? 'OTP_EMAIL' : 'OTP_SMS',
          },
        });
      } else {
        // New user - register
        if (!name) {
          throw new BadRequestException('Name is required for new user registration');
        }

        const emailField = type === 'email' ? identifier : undefined;
        const phoneField = type === 'phone' ? identifier : undefined;

        user = await this.prisma.user.create({
          data: {
            displayName: name,
            firstName: name.split(' ')[0],
            lastName: name.split(' ').slice(1).join(' ') || undefined,
            email: emailField,
            phone: phoneField,
            emailVerified: type === 'email',
            phoneVerified: type === 'phone',
            authProvider: type === 'email' ? 'EMAIL' : 'PHONE',
            isActive: true,
          },
        });

        // Log login
        await this.prisma.loginHistory.create({
          data: {
            userId: user.id,
            loginMethod: type === 'email' ? 'OTP_EMAIL' : 'OTP_SMS',
          },
        });

        // Send welcome email/SMS
        try {
          if (type === 'email') {
            await this.emailService.sendWelcomeEmail(identifier, name);
          } else {
            await this.smsService.sendWelcomeSms(identifier, name);
          }
        } catch (error) {
          console.error('Error sending welcome message:', error);
        }
      }

      if (!user) {
        throw new BadRequestException('Failed to process user');
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' },
      );

      // Clean up OTP
      await this.otpService.cancelOTP(identifier);

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            displayName: user.displayName,
            email: user.email,
            phone: user.phone,
            authMethods: user.authMethods,
          },
          token,
          expiresIn: 86400, // 24 hours
          requiresVerification: false,
        },
        message: userId ? 'Login successful' : 'Account created successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Resend OTP (POST /auth/otp/resend)
   */
  @Post('resend')
  @HttpCode(HttpStatus.OK)
  async resendOtp(@Body() dto: ResendOtpDto) {
    const { identifier } = dto;
    const type = this.isEmail(identifier) ? 'email' : 'phone';

    try {
      const { otp, expiresIn } = await this.otpService.resendOTP(identifier, type);

      // Send OTP
      if (type === 'email') {
        await this.emailService.sendOTPEmail(identifier, otp, 'User');
      } else {
        await this.smsService.sendOTPSms(identifier, otp);
      }

      const maskedIdentifier = this.maskIdentifier(identifier);

      return {
        success: true,
        data: {
          message: 'OTP resent successfully',
          identifier: maskedIdentifier,
          method: type,
          expiresIn,
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Cancel OTP (DELETE /auth/otp/cancel)
   */
  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  async cancelOtp(@Body() dto: CancelOtpDto) {
    const { identifier } = dto;

    try {
      await this.otpService.cancelOTP(identifier);

      return {
        success: true,
        data: {
          message: 'OTP request cancelled',
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Check OTP Status (POST /auth/otp/status)
   */
  @Post('status')
  @HttpCode(HttpStatus.OK)
  async checkOtpStatus(@Body() dto: CheckOtpStatusDto) {
    const { identifier, type } = dto;

    try {
      const status = await this.otpService.getOtpStatus(identifier, type as 'email' | 'phone');

      return {
        success: true,
        data: status,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Private helper methods
   */
  private isEmail(identifier: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(identifier);
  }

  private maskIdentifier(identifier: string): string {
    if (this.isEmail(identifier)) {
      const [localPart, domain] = identifier.split('@');
      const maskedLocal = localPart.charAt(0) + '*'.repeat(localPart.length - 2) + localPart.charAt(localPart.length - 1);
      return `${maskedLocal}@${domain}`;
    } else {
      // Mask phone number
      const masked = identifier.slice(0, 3) + '*'.repeat(identifier.length - 6) + identifier.slice(-3);
      return masked;
    }
  }
}
