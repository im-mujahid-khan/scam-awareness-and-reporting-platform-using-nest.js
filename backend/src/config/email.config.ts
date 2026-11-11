import { ConfigService } from '@nestjs/config';

export const getEmailConfig = (configService: ConfigService) => ({
  host: configService.get<string>('EMAIL_HOST'),
  port: configService.get<number>('EMAIL_PORT'),
  secure: configService.get<boolean>('EMAIL_SECURE') || true,
  auth: {
    user: configService.get<string>('EMAIL_USER'),
    pass: configService.get<string>('EMAIL_PASSWORD'),
  },
  from: configService.get<string>('EMAIL_FROM') || `Scam Alert <${configService.get<string>('EMAIL_USER')}>`,
});

export const getEmailTemplates = () => ({
  otpTemplate: (otp: string, name: string, expiryMinutes: number = 5) => ({
    subject: '🔐 Your Scam Awareness Platform Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Scam Alert</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px;">
          <p style="color: #333; font-size: 16px;">Hi ${name},</p>
          <p style="color: #666; font-size: 14px;">Your verification code is:</p>
          <div style="background: white; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; border: 2px solid #667eea;">
            <p style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #667eea; margin: 0;">${otp}</p>
          </div>
          <p style="color: #999; font-size: 12px; text-align: center;">This code expires in ${expiryMinutes} minutes</p>
          <p style="color: #666; font-size: 13px; margin-top: 30px;">
            <strong>Security Tip:</strong> Never share this code with anyone. We will never ask you for this code.
          </p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;" />
          <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
            © 2024 Scam Alert Awareness. All rights reserved.
          </p>
        </div>
      </div>
    `,
    text: `Your verification code is: ${otp}. This code expires in ${expiryMinutes} minutes.`,
  }),

  welcomeTemplate: (name: string, email: string) => ({
    subject: '🎉 Welcome to Scam Awareness Platform',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Welcome to Scam Alert</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px;">
          <p style="color: #333; font-size: 16px;">Hi ${name},</p>
          <p style="color: #666; font-size: 14px;">Welcome to Scam Awareness Platform! Your account has been successfully created.</p>
          <p style="color: #666; font-size: 14px; margin: 20px 0;">
            You can now log in and help others by reporting scams and staying informed about the latest threats.
          </p>
          <a href="${process.env.FRONTEND_URL || 'https://example.com'}/dashboard" 
             style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
            Go to Dashboard
          </a>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">Email: ${email}</p>
        </div>
      </div>
    `,
    text: `Welcome to Scam Alert! Your account has been created. Log in to get started.`,
  }),

  loginAlertTemplate: (name: string, deviceInfo: any) => ({
    subject: '🔔 New Login Alert - Scam Awareness Platform',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">🔔 New Login Alert</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px;">
          <p style="color: #333; font-size: 16px;">Hi ${name},</p>
          <p style="color: #666; font-size: 14px;">A new login to your account was detected:</p>
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f5576c;">
            <p style="margin: 5px 0;"><strong>Device:</strong> ${deviceInfo.browser} on ${deviceInfo.os}</p>
            <p style="margin: 5px 0;"><strong>Location:</strong> ${deviceInfo.location || 'Unknown'}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <p style="color: #666; font-size: 14px;">If this wasn't you, please change your password immediately.</p>
          <a href="${process.env.FRONTEND_URL || 'https://example.com'}/security" 
             style="display: inline-block; background: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
            Secure Your Account
          </a>
        </div>
      </div>
    `,
    text: `New login detected on ${deviceInfo.browser} at ${new Date().toLocaleString()}. If this wasn't you, please secure your account.`,
  }),
});
