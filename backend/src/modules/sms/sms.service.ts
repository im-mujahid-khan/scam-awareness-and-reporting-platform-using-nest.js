import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';
import { getSmsConfig, getSmsTemplates } from '../../config/sms.config';

@Injectable()
export class SmsService {
  private twilioClient: twilio.Twilio;
  private smsTemplates: any;
  private twilioPhoneNumber: string;

  constructor(private configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    const phoneNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER');

    if (!accountSid || !authToken || !phoneNumber) {
      throw new Error('Twilio credentials not fully configured');
    }

    this.twilioClient = twilio(accountSid, authToken);
    this.smsTemplates = getSmsTemplates();
    this.twilioPhoneNumber = phoneNumber;
  }

  /**
   * Send OTP SMS
   */
  async sendOTPSms(phoneNumber: string, otp: string): Promise<boolean> {
    try {
      const message = this.smsTemplates.otpMessage(otp);

      const result = await this.twilioClient.messages.create({
        body: message,
        from: this.twilioPhoneNumber,
        to: phoneNumber,
      });

      console.log(`OTP SMS sent to ${phoneNumber} (SID: ${result.sid})`);
      return true;
    } catch (error) {
      console.error(`Failed to send OTP SMS to ${phoneNumber}:`, error);
      throw error;
    }
  }

  /**
   * Send welcome SMS
   */
  async sendWelcomeSms(phoneNumber: string, name: string): Promise<boolean> {
    try {
      const message = this.smsTemplates.welcomeMessage(name);

      const result = await this.twilioClient.messages.create({
        body: message,
        from: this.twilioPhoneNumber,
        to: phoneNumber,
      });

      console.log(`Welcome SMS sent to ${phoneNumber} (SID: ${result.sid})`);
      return true;
    } catch (error) {
      console.error(`Failed to send welcome SMS to ${phoneNumber}:`, error);
      throw error;
    }
  }

  /**
   * Send login alert SMS
   */
  async sendLoginAlertSms(phoneNumber: string, deviceInfo: any): Promise<boolean> {
    try {
      const message = this.smsTemplates.loginAlertMessage(deviceInfo);

      const result = await this.twilioClient.messages.create({
        body: message,
        from: this.twilioPhoneNumber,
        to: phoneNumber,
      });

      console.log(`Login alert SMS sent to ${phoneNumber} (SID: ${result.sid})`);
      return true;
    } catch (error) {
      console.error(`Failed to send login alert SMS to ${phoneNumber}:`, error);
      throw error;
    }
  }

  /**
   * Send generic SMS
   */
  async sendSms(phoneNumber: string, message: string): Promise<boolean> {
    try {
      const result = await this.twilioClient.messages.create({
        body: message,
        from: this.twilioPhoneNumber,
        to: phoneNumber,
      });

      console.log(`SMS sent to ${phoneNumber} (SID: ${result.sid})`);
      return true;
    } catch (error) {
      console.error(`Failed to send SMS to ${phoneNumber}:`, error);
      throw error;
    }
  }

  /**
   * Check Twilio connection
   */
  async verifyConnection(): Promise<boolean> {
    try {
      const messages = await this.twilioClient.messages.list({ limit: 1 });
      console.log('Twilio connection verified successfully');
      return true;
    } catch (error) {
      console.error('Twilio connection verification failed:', error);
      return false;
    }
  }
}
