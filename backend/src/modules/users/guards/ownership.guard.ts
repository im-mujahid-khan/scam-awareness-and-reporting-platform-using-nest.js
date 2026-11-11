// src/modules/users/guards/ownership.guard.ts (Simple fix)
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class OwnershipGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    
    // Use type assertion to avoid TypeScript errors
    const user = request.user as any;
    const authenticatedUserId = user?.id;
    
    const userId = request.params?.id || request.body?.id;

    if (!authenticatedUserId) {
      throw new ForbiddenException('Authentication required');
    }

    // Admin bypass
    if (user?.role === 'ADMIN') {
      return true;
    }

    // Ownership check
    if (userId && userId !== authenticatedUserId) {
      throw new ForbiddenException('You can only access your own profile');
    }

    return true;
  }
}