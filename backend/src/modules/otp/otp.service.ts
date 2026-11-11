import { Injectable, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CacheService } from '../cache/cache.service';
import { ConfigService } from '@nestjs/config';
import { getOtpConfig } from '../../config/otp.config';
import * as crypto from 'crypto';

@Injectable()
export class OtpService {
  private otpConfig: any;
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
    private configService: ConfigService,
  ) {
    this.otpConfig = getOtpConfig(configService);
    this.logger.log(`OTP Service initialized with config: ${JSON.stringify(this.otpConfig)}`);
  }

  /**
   * Generate and send OTP
   */
  async generateOTP(identifier: string, type: 'email' | 'phone'): Promise<{ otp: string; expiresIn: number }> {
    this.logger.log(`Generating OTP for ${identifier}, type: ${type}`);
    
    // Validate identifier format
    if (type === 'email' && !this.isValidEmail(identifier)) {
      throw new BadRequestException('Invalid email format');
    }
    if (type === 'phone' && !this.isValidPhone(identifier)) {
      throw new BadRequestException('Invalid phone format');
    }

    // Check rate limiting
    const rateLimitKey = `otp:ratelimit:${identifier}`;
    const requestCount = await this.cacheService.get(rateLimitKey);
    
    this.logger.debug(`Rate limit check for ${identifier}: ${requestCount || 0}/${this.otpConfig.maxOtpRequestsPerWindow}`);
    
    if (requestCount && requestCount >= this.otpConfig.maxOtpRequestsPerWindow) {
      throw new ConflictException(
        `Too many OTP requests. Please try again after ${this.otpConfig.otpRateLimitWindowMinutes} minutes.`,
      );
    }

    // Generate 6-digit OTP
    const otp = this.generateRandomOTP();
    this.logger.debug(`Generated OTP: ${otp} for ${identifier}`);

    // Store OTP in database
    const existingOtp = await this.prisma.otpLog.findFirst({
      where: { destination: identifier, isUsed: false },
    });

    if (existingOtp) {
      this.logger.debug(`Deleting existing OTP for ${identifier}`);
      await this.prisma.otpLog.delete({ where: { id: existingOtp.id } });
    }

    const expiresAt = new Date(Date.now() + this.otpConfig.otpExpirySeconds * 1000);

    const newOtpRecord = await this.prisma.otpLog.create({
      data: {
        destination: identifier,
        email: type === 'email' ? identifier : undefined,
        phone: type === 'phone' ? identifier : undefined,
        code: otp,
        method: type === 'email' ? 'EMAIL' : 'SMS',
        attempts: 0,
        isUsed: false,
        expiresAt,
        maxAttempts: this.otpConfig.maxOtpAttempts,
      },
    });

    this.logger.debug(`Stored OTP in database with ID: ${newOtpRecord.id}`);

    // Update rate limit in cache
    if (!requestCount) {
      await this.cacheService.set(
        rateLimitKey,
        1,
        this.otpConfig.otpRateLimitWindowMinutes * 60,
      );
    } else {
      await this.cacheService.increment(rateLimitKey, 1);
    }

    // Store OTP in Redis cache for fast access
    const cacheKey = `otp:${type}:${identifier}`;
    const cacheData = {
      id: newOtpRecord.id,
      code: otp,
      attempts: 0,
      isUsed: false,
      createdAt: newOtpRecord.createdAt,
      expiresAt: newOtpRecord.expiresAt,
      maxAttempts: this.otpConfig.maxOtpAttempts,
    };
    
    try {
      await this.cacheService.set(
        cacheKey,
        cacheData,
        this.otpConfig.otpExpirySeconds,
      );
      this.logger.debug(`Stored OTP in cache with key: ${cacheKey}`);
    } catch (cacheError) {
      this.logger.error(`Failed to store OTP in cache: ${cacheError.message}`);
      // Continue even if cache fails - we have database as backup
    }

    return {
      otp, // In production, don't return this; just return success
      expiresIn: this.otpConfig.otpExpirySeconds,
    };
  }

  /**
   * Verify OTP
   */
  async verifyOTP(
    identifier: string,
    type: 'email' | 'phone',
    userOTP: string,
  ): Promise<{ verified: boolean; userId?: string }> {
    this.logger.log(`Verifying OTP for ${identifier}, type: ${type}`);
    
    // Trim and validate input
    const providedOTP = userOTP?.trim();
    if (!providedOTP || providedOTP.length !== 6 || !/^\d+$/.test(providedOTP)) {
      throw new BadRequestException('OTP must be exactly 6 digits');
    }

    // Try to get from cache first (faster)
    const cacheKey = `otp:${type}:${identifier}`;
    let cachedData: any;
    try {
      cachedData = await this.cacheService.get(cacheKey);
    } catch (cacheError) {
      this.logger.warn(`Cache error for ${cacheKey}: ${cacheError.message}`);
      cachedData = null;
    }
    
    let otpRecord: any = null;
    let recordId: string | null = null;
    let isFromCache = false;

    if (cachedData && cachedData.code) {
      // Use cache data
      otpRecord = cachedData;
      recordId = cachedData.id;
      isFromCache = true;
      this.logger.debug(`Using cached OTP record for ${identifier}`);
    } else {
      // Fall back to database
      this.logger.debug(`Cache miss for ${identifier}, querying database...`);
      const dbRecord = await this.prisma.otpLog.findFirst({
        where: {
          destination: identifier,
          isUsed: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!dbRecord) {
        throw new BadRequestException('OTP not found or expired. Please request a new OTP.');
      }

      // Convert to same structure as cache
      otpRecord = {
        id: dbRecord.id,
        code: dbRecord.code,
        attempts: dbRecord.attempts || 0,
        isUsed: dbRecord.isUsed,
        createdAt: dbRecord.createdAt,
        expiresAt: dbRecord.expiresAt,
        maxAttempts: dbRecord.maxAttempts || this.otpConfig.maxOtpAttempts,
      };
      recordId = dbRecord.id;
      
      this.logger.debug(`Found database OTP record ID: ${recordId}`);
    }

    // Validate otpRecord
    if (!otpRecord || !otpRecord.code) {
      this.logger.error(`Invalid OTP record for ${identifier}:`, otpRecord);
      throw new BadRequestException('Invalid OTP record. Please request a new OTP.');
    }

    // Check if expired
    const expiryDate = new Date(otpRecord.expiresAt);
    if (new Date() > expiryDate) {
      this.logger.debug(`OTP expired for ${identifier}`);
      if (recordId) {
        await this.prisma.otpLog.delete({ where: { id: recordId } });
      }
      try {
        await this.cacheService.delete(cacheKey);
      } catch (error) {
        this.logger.warn(`Failed to delete expired OTP from cache: ${error.message}`);
      }
      throw new BadRequestException('OTP has expired. Please request a new OTP.');
    }

    // Check max attempts
    const maxAttempts = otpRecord.maxAttempts || this.otpConfig.maxOtpAttempts;
    if (otpRecord.attempts >= maxAttempts) {
      this.logger.warn(`Max attempts exceeded for ${identifier}`);
      if (recordId) {
        await this.prisma.otpLog.delete({ where: { id: recordId } });
      }
      try {
        await this.cacheService.delete(cacheKey);
      } catch (error) {
        this.logger.warn(`Failed to delete maxed OTP from cache: ${error.message}`);
      }
      throw new BadRequestException('Too many incorrect attempts. Please request a new OTP.');
    }

    // Verify OTP - trim and compare
    const storedOTP = otpRecord.code.toString().trim();
    
    this.logger.debug(`OTP comparison for ${identifier}: Provided="${providedOTP}", Stored="${storedOTP}"`);

    if (providedOTP !== storedOTP) {
      otpRecord.attempts += 1;
      
      this.logger.debug(`Invalid OTP attempt for ${identifier}. Attempts: ${otpRecord.attempts}/${maxAttempts}`);
      
      try {
        // Update cache
        const ttl = Math.floor((expiryDate.getTime() - Date.now()) / 1000);
        if (ttl > 0) {
          await this.cacheService.set(
            cacheKey,
            otpRecord,
            ttl,
          );
        }

        // Update database
        if (recordId) {
          await this.prisma.otpLog.update({
            where: { id: recordId },
            data: { attempts: otpRecord.attempts },
          });
        }
      } catch (updateError) {
        this.logger.error(`Failed to update OTP attempts: ${updateError.message}`);
      }

      const attemptsRemaining = maxAttempts - otpRecord.attempts;
      throw new BadRequestException(
        `Invalid OTP. ${attemptsRemaining} attempt${attemptsRemaining !== 1 ? 's' : ''} remaining.`,
      );
    }

    this.logger.log(`OTP verification successful for ${identifier}`);

    // OTP verified successfully
    otpRecord.isUsed = true;
    otpRecord.usedAt = new Date();

    try {
      // Update cache
      await this.cacheService.set(
        cacheKey,
        otpRecord,
        60, // Keep for 1 minute after verification
      );

      // Update database
      if (recordId) {
        await this.prisma.otpLog.update({
          where: { id: recordId },
          data: { 
            isUsed: true, 
            usedAt: new Date(),
            attempts: otpRecord.attempts,
          },
        });
      }
    } catch (updateError) {
      this.logger.error(`Failed to update OTP verification status: ${updateError.message}`);
      // Don't throw error here - OTP was verified successfully
    }

    // Find user by email or phone
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phone: identifier },
        ],
      },
    });

    this.logger.debug(`User lookup for ${identifier}: ${user ? 'Found' : 'Not found'}`);

    return {
      verified: true,
      userId: user?.id,
    };
  }

  /**
   * Resend OTP
   */
  async resendOTP(identifier: string, type: 'email' | 'phone'): Promise<{ otp: string; expiresIn: number }> {
    this.logger.log(`Resending OTP for ${identifier}, type: ${type}`);
    
    // Check if previous OTP is still valid
    const otpRecord = await this.prisma.otpLog.findFirst({
      where: { destination: identifier, isUsed: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    if (otpRecord) {
      const timeDiffSeconds = Math.floor((otpRecord.expiresAt.getTime() - Date.now()) / 1000);
      const resendWaitSeconds = this.otpConfig.otpResendWaitMinutes * 60;
      
      if (timeDiffSeconds > this.otpConfig.otpExpirySeconds - resendWaitSeconds) {
        const waitMinutes = this.otpConfig.otpResendWaitMinutes;
        throw new ConflictException(
          `Please wait ${waitMinutes} minute${waitMinutes !== 1 ? 's' : ''} before requesting another OTP.`,
        );
      }
      
      // Delete the old OTP
      await this.prisma.otpLog.delete({ where: { id: otpRecord.id } });
    }

    // Clear cache
    try {
      await this.cacheService.delete(`otp:email:${identifier}`);
      await this.cacheService.delete(`otp:phone:${identifier}`);
    } catch (cacheError) {
      this.logger.warn(`Failed to clear cache for resend: ${cacheError.message}`);
    }

    return this.generateOTP(identifier, type);
  }

  /**
   * Cancel OTP request
   */
  async cancelOTP(identifier: string): Promise<void> {
    this.logger.log(`Canceling OTP for ${identifier}`);
    
    await this.prisma.otpLog.deleteMany({
      where: { destination: identifier },
    });

    // Clear cache
    try {
      await Promise.all([
        this.cacheService.delete(`otp:email:${identifier}`),
        this.cacheService.delete(`otp:phone:${identifier}`),
        this.cacheService.delete(`otp:ratelimit:${identifier}`),
      ]);
    } catch (error) {
      this.logger.error(`Failed to delete cache for cancellation: ${error.message}`);
    }
  }

  /**
   * Check if identifier has verified OTP
   */
  async isOtpVerified(identifier: string, type: 'email' | 'phone'): Promise<boolean> {
    const cacheKey = `otp:${type}:${identifier}`;
    let cached: any;
    
    try {
      cached = await this.cacheService.get(cacheKey);
    } catch (error) {
      this.logger.warn(`Cache error checking OTP verification: ${error.message}`);
      cached = null;
    }

    if (cached?.isUsed) {
      return true;
    }

    const dbRecord = await this.prisma.otpLog.findFirst({
      where: { 
        destination: identifier, 
        isUsed: true, 
        expiresAt: { gt: new Date() } 
      },
    });

    return !!dbRecord;
  }

  /**
   * Clean up expired OTPs
   */
  async cleanupExpiredOTPs(): Promise<number> {
    this.logger.log('Cleaning up expired OTPs');
    
    const result = await this.prisma.otpLog.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    this.logger.log(`Cleaned up ${result.count} expired OTPs`);
    return result.count;
  }

  /**
   * Get OTP status for an identifier
   */
  async getOtpStatus(identifier: string, type: 'email' | 'phone'): Promise<{
    exists: boolean;
    verified: boolean;
    attemptsRemaining: number;
    expiresIn: number;
    maxAttempts: number;
    createdAt: Date;
  }> {
    const otpRecord = await this.prisma.otpLog.findFirst({
      where: { 
        destination: identifier, 
        method: type === 'email' ? 'EMAIL' : 'SMS' 
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      return {
        exists: false,
        verified: false,
        attemptsRemaining: this.otpConfig.maxOtpAttempts,
        expiresIn: 0,
        maxAttempts: this.otpConfig.maxOtpAttempts,
        createdAt: new Date(),
      };
    }

    const expiresInSeconds = Math.floor((otpRecord.expiresAt.getTime() - Date.now()) / 1000);
    const isExpired = expiresInSeconds <= 0;

    if (isExpired) {
      await this.prisma.otpLog.delete({ where: { id: otpRecord.id } });
      return {
        exists: false,
        verified: false,
        attemptsRemaining: this.otpConfig.maxOtpAttempts,
        expiresIn: 0,
        maxAttempts: this.otpConfig.maxOtpAttempts,
        createdAt: new Date(),
      };
    }

    return {
      exists: true,
      verified: otpRecord.isUsed,
      attemptsRemaining: (otpRecord.maxAttempts || this.otpConfig.maxOtpAttempts) - (otpRecord.attempts || 0),
      expiresIn: expiresInSeconds,
      maxAttempts: otpRecord.maxAttempts || this.otpConfig.maxOtpAttempts,
      createdAt: otpRecord.createdAt,
    };
  }

  /**
   * Private helper methods
   */
  private generateRandomOTP(): string {
    // Generate cryptographically secure random OTP
    try {
      const buffer = crypto.randomBytes(3); // 3 bytes = 24 bits
      const number = buffer.readUIntBE(0, 3);
      return (number % 900000 + 100000).toString(); // Ensure 6 digits
    } catch (error) {
      this.logger.error(`Error generating random OTP: ${error.message}`);
      // Fallback to Math.random if crypto fails
      return Math.floor(100000 + Math.random() * 900000).toString();
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    // Basic phone validation - at least 10 digits
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/\s|-/g, ''));
  }

  /**
   * Validate OTP format (for testing/debugging)
   */
  async validateOtpFormat(otp: string): Promise<boolean> {
    if (!otp || typeof otp !== 'string') return false;
    const trimmed = otp.trim();
    return /^\d{6}$/.test(trimmed);
  }

  /**
   * Get active OTP count for monitoring
   */
  async getActiveOtpCount(): Promise<{ total: number; byType: { email: number; phone: number } }> {
    const total = await this.prisma.otpLog.count({
      where: {
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
    });

    const emailCount = await this.prisma.otpLog.count({
      where: {
        method: 'EMAIL',
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
    });

    const phoneCount = await this.prisma.otpLog.count({
      where: {
        method: 'SMS',
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
    });

    return {
      total,
      byType: { email: emailCount, phone: phoneCount },
    };
  }

  /**
   * Test cache connection
   */
  async testCacheConnection(): Promise<{ connected: boolean; error?: string }> {
    try {
      const testKey = 'otp:test:connection';
      const testValue = { timestamp: new Date().toISOString() };
      
      await this.cacheService.set(testKey, testValue, 10);
      const retrieved = await this.cacheService.get(testKey);
      
      return {
        connected: JSON.stringify(testValue) === JSON.stringify(retrieved),
        error: JSON.stringify(testValue) === JSON.stringify(retrieved) ? undefined : 'Cache test failed'
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }
}