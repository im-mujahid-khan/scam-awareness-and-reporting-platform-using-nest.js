import { Module } from '@nestjs/common';
import { OtpController } from './otp.controller';
import { OtpService } from './otp.service';
import { CacheModule } from '../cache/cache.module';
import { PrismaModule } from '../../database/prisma.module';
import { EmailModule } from '../email/email.module';
import { SmsModule } from '../sms/sms.module';
import { EmailService } from '../email/email.service';
import { SmsService } from '../sms/sms.service';

@Module({
  imports: [CacheModule, PrismaModule, EmailModule, SmsModule],
  controllers: [OtpController],
  providers: [OtpService, EmailService, SmsService],
  exports: [OtpService],
})
export class OtpModule {}
