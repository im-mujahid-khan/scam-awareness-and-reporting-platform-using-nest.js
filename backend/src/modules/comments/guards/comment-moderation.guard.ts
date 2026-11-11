import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class CommentModerationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Only allow admins, super_admins, and moderators
    const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'MODERATOR'];
    
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException('Insufficient permissions for comment moderation');
    }

    return true;
  }
}