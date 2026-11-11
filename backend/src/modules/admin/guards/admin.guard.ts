import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    console.log('AdminGuard - Request user:', user); // Add this for debugging

    if (!user) {
      console.log('AdminGuard - No user found in request');
      throw new ForbiddenException('User not authenticated');
    }

    try {
      // Check if user exists in database and has admin role
      const userRecord = await this.prisma.user.findUnique({
        where: { id: user.sub || user.id }, // Try both sub and id
        select: { id: true, role: true, isActive: true, isDeleted: true },
      });

      console.log('AdminGuard - Database user found:', userRecord); // Debug

      if (!userRecord) {
        console.log('AdminGuard - User not found in database:', user.sub || user.id);
        throw new ForbiddenException('User not found');
      }

      // Check if user is active and not deleted
      if (!userRecord.isActive || userRecord.isDeleted) {
        console.log('AdminGuard - User inactive or deleted:', {
          isActive: userRecord.isActive,
          isDeleted: userRecord.isDeleted
        });
        throw new ForbiddenException('User account is inactive or deleted');
      }

      // Check if user has admin or super_admin role
      const allowedRoles = ['ADMIN', 'SUPER_ADMIN'];
      if (!allowedRoles.includes(userRecord.role)) {
        console.log('AdminGuard - Insufficient role:', userRecord.role);
        throw new ForbiddenException('Insufficient permissions');
      }

      console.log('AdminGuard - Access granted for role:', userRecord.role);
      return true;
      
    } catch (error) {
      console.log('AdminGuard - Error:', error.message);
      throw new ForbiddenException(error.message || 'Access denied');
    }
  }
}