import { ConfigService } from '@nestjs/config';

export const getOtpConfig = (configService: ConfigService) => ({
  // OTP settings
  otpLength: configService.get<number>('OTP_LENGTH') || 6,
  otpExpiryMinutes: configService.get<number>('OTP_EXPIRY_MINUTES') || 5,
  otpExpirySeconds: (configService.get<number>('OTP_EXPIRY_MINUTES') || 5) * 60,
  maxOtpAttempts: configService.get<number>('MAX_OTP_ATTEMPTS') || 3,
  otpResendWaitMinutes: configService.get<number>('OTP_RESEND_WAIT_MINUTES') || 1,
  
  // Rate limiting
  maxOtpRequestsPerWindow: configService.get<number>('MAX_OTP_REQUESTS_PER_WINDOW') || 3,
  otpRateLimitWindowMinutes: configService.get<number>('OTP_RATE_LIMIT_WINDOW_MINUTES') || 15,
  
  // Device verification
  requireDeviceVerification: configService.get<boolean>('REQUIRE_DEVICE_VERIFICATION') || false,
  deviceVerificationExpiryMinutes: configService.get<number>('DEVICE_VERIFICATION_EXPIRY_MINUTES') || 10,
});
