// src/modules/email/services/email.service.ts (Create this file)
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('EMAIL_HOST', 'smtp.gmail.com'),
      port: this.configService.get<number>('EMAIL_PORT', 587),
      secure: this.configService.get<boolean>('EMAIL_SECURE', false),
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASSWORD'),
      },
    });
  }

  async sendWelcomeEmail(to: string, name: string, verificationToken: string): Promise<boolean> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const verificationLink = `${frontendUrl}/verify-email?token=${verificationToken}`;
    // const verificationLink = `http://localhost:3000/verify-email?token=${verificationToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Scam Alert Platform</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #667eea; color: white; padding: 20px; text-align: center; }
              .content { background: white; padding: 20px; }
              .button { display: inline-block; padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
              .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
          </style>
      </head>
      <body>
          <div class="header">
              <h1>Welcome to Scam Alert!</h1>
          </div>
          <div class="content">
              <h2>Hello ${name},</h2>
              <p>Thank you for joining the Scam Alert community!</p>
              <p>Click the button below to verify your email:</p>
              <a href="${verificationLink}" class="button">Verify Email</a>
              <p>Or copy this link: ${verificationLink}</p>
              <p>This link expires in 24 hours.</p>
          </div>
          <div class="footer">
              <p>© ${new Date().getFullYear()} Scam Alert Platform</p>
          </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"Scam Alert" <${this.configService.get<string>('EMAIL_FROM')}>`,
      to: to,
      subject: 'Welcome to Scam Alert - Verify Your Email',
      html: html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Welcome email sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${to}:`, error);
      return false;
    }
  }

  async sendPasswordResetEmail(to: string, resetToken: string, userName: string): Promise<boolean> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;
    // const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #f093fb; color: white; padding: 20px; text-align: center; }
              .content { background: white; padding: 20px; }
              .button { display: inline-block; padding: 10px 20px; background: #f093fb; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
              .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
          </style>
      </head>
      <body>
          <div class="header">
              <h1>Password Reset Request</h1>
          </div>
          <div class="content">
              <h2>Hello ${userName},</h2>
              <p>Click the button below to reset your password:</p>
              <a href="${resetLink}" class="button">Reset Password</a>
              <p>Or copy this link: ${resetLink}</p>
              <p>This link expires in 1 hour.</p>
          </div>
          <div class="footer">
              <p>© ${new Date().getFullYear()} Scam Alert Platform</p>
          </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"Scam Alert Support" <${this.configService.get<string>('EMAIL_FROM')}>`,
      to: to,
      subject: 'Reset Your Scam Alert Password',
      html: html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Password reset email sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${to}:`, error);
      return false;
    }
  }

  async sendVerificationEmail(to: string, userName: string, verificationToken: string): Promise<boolean> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const verificationLink = `${frontendUrl}/verify-email?token=${verificationToken}`;
    // const verificationLink = `http://localhost:3000/verify-email?token=${verificationToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #4facfe; color: white; padding: 20px; text-align: center; }
              .content { background: white; padding: 20px; }
              .button { display: inline-block; padding: 10px 20px; background: #4facfe; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
              .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
          </style>
      </head>
      <body>
          <div class="header">
              <h1>Verify Your Email</h1>
          </div>
          <div class="content">
              <h2>Hello ${userName},</h2>
              <p>Click the button below to verify your email:</p>
              <a href="${verificationLink}" class="button">Verify Email</a>
              <p>Or copy this link: ${verificationLink}</p>
              <p>This link expires in 24 hours.</p>
          </div>
          <div class="footer">
              <p>© ${new Date().getFullYear()} Scam Alert Platform</p>
          </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"Scam Alert" <${this.configService.get<string>('EMAIL_FROM')}>`,
      to: to,
      subject: 'Verify Your Scam Alert Email',
      html: html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Verification email sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${to}:`, error);
      return false;
    }
  }
}