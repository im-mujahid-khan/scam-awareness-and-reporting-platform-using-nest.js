import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Request } from 'express';

@Injectable()
export class DeviceTrustGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    const userId = (request as any).user?.userId;

    if (!userId) {
      throw new ForbiddenException('User not authenticated');
    }

    const deviceId = this.getDeviceId(request);
    if (!deviceId) {
      // Allow if no device ID provided
      return true;
    }

    // Check if device is trusted
    const trustedDevice = await this.prisma.trustedDevice.findFirst({
      where: {
        userId,
        deviceId,
      },
    });

    if (!trustedDevice) {
      // Device not trusted - in production, you might want to:
      // 1. Send verification email/SMS
      // 2. Require additional verification
      // 3. Log the attempt
      
      console.log(`Untrusted device login attempt for user ${userId} from device ${deviceId}`);
      
      // For now, we allow it but log it
      // In production, you might throw ForbiddenException here
    }

    return true;
  }

  private getDeviceId(request: Request): string | null {
    // Try to get device ID from headers or cookies
    const deviceId = request.headers['x-device-id'] as string ||
                     request.cookies?.['device-id'] ||
                     this.generateDeviceFingerprint(request);

    return deviceId;
  }

  private generateDeviceFingerprint(request: Request): string {
    // Simple fingerprinting based on user agent and IP
    const userAgent = request.headers['user-agent'] || '';
    const ip = request.ip || '';
    return `${userAgent}-${ip}`.substring(0, 50);
  }
}
