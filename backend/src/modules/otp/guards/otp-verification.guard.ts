import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { OtpService } from '../../otp/otp.service';

@Injectable()
export class OtpVerificationGuard implements CanActivate {
  constructor(private otpService: OtpService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { identifier, type } = request.body;

    if (!identifier || !type) {
      throw new UnauthorizedException('Identifier and type are required');
    }

    const isVerified = await this.otpService.isOtpVerified(identifier, type);

    if (!isVerified) {
      throw new UnauthorizedException('OTP not verified. Please verify OTP first.');
    }

    request.otpVerified = true;
    return true;
  }
}
