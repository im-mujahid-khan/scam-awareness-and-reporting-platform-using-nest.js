import { ConfigService } from '@nestjs/config';

export const getSmsConfig = (configService: ConfigService) => ({
  accountSid: configService.get<string>('TWILIO_ACCOUNT_SID'),
  authToken: configService.get<string>('TWILIO_AUTH_TOKEN'),
  phoneNumber: configService.get<string>('TWILIO_PHONE_NUMBER'),
});

export const getSmsTemplates = () => ({
  otpMessage: (otp: string, expiryMinutes: number = 5) =>
    `Your Scam Awareness Platform verification code is: ${otp}. Valid for ${expiryMinutes} minutes. Never share this code.`,

  loginAlertMessage: (deviceInfo: any) =>
    `New login detected on ${deviceInfo.browser} at ${new Date().toLocaleTimeString()}. If not you, secure your account immediately.`,

  welcomeMessage: (name: string) =>
    `Welcome to Scam Alert, ${name}! Stay safe and help others by reporting scams. Visit: ${process.env.FRONTEND_URL || 'https://example.com'}`,
});
