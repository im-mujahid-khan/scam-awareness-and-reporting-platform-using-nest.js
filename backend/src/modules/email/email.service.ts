import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { getEmailConfig, getEmailTemplates } from '../../config/email.config';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private emailTemplates: any;

  constructor(private configService: ConfigService) {
    const emailConfig = getEmailConfig(configService);
    this.transporter = nodemailer.createTransport(emailConfig);
    this.emailTemplates = getEmailTemplates();
  }

  /**
   * Send OTP email
   */
  async sendOTPEmail(email: string, otp: string, userName: string = 'User'): Promise<boolean> {
    try {
      const template = this.emailTemplates.otpTemplate(otp, userName);
      
      await this.transporter.sendMail({
        from: this.configService.get<string>('EMAIL_FROM'),
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      console.log(`OTP email sent to ${email}`);
      return true;
    } catch (error) {
      console.error(`Failed to send OTP email to ${email}:`, error);
      throw error;
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    try {
      const template = this.emailTemplates.welcomeTemplate(name, email);
      
      await this.transporter.sendMail({
        from: this.configService.get<string>('EMAIL_FROM'),
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      console.log(`Welcome email sent to ${email}`);
      return true;
    } catch (error) {
      console.error(`Failed to send welcome email to ${email}:`, error);
      throw error;
    }
  }

  /**
   * Send login alert email
   */
  async sendLoginAlertEmail(email: string, userName: string, deviceInfo: any): Promise<boolean> {
    try {
      const template = this.emailTemplates.loginAlertTemplate(userName, deviceInfo);
      
      await this.transporter.sendMail({
        from: this.configService.get<string>('EMAIL_FROM'),
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      console.log(`Login alert email sent to ${email}`);
      return true;
    } catch (error) {
      console.error(`Failed to send login alert email to ${email}:`, error);
      throw error;
    }
  }

  /**
   * Send generic email
   */
  async sendEmail(to: string, subject: string, html: string, text?: string): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('EMAIL_FROM'),
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''),
      });

      console.log(`Email sent to ${to}`);
      return true;
    } catch (error) {
      console.error(`Failed to send email to ${to}:`, error);
      throw error;
    }
  }

  /**
   * Verify email transporter
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('Email transporter verified successfully');
      return true;
    } catch (error) {
      console.error('Email transporter verification failed:', error);
      return false;
    }
  }
}
