import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class CommentOwnershipGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const commentId = request.params.id;

    if (!commentId) {
      return true;
    }

    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { userId: true, isDeleted: true },
    });

    if (!comment) {
      throw new ForbiddenException('Comment not found');
    }

    // Allow admins and moderators
    if (user.role === 'ADMIN' || user.role === 'MODERATOR' || user.role === 'SUPER_ADMIN') {
      return true;
    }

    // Check ownership
    if (comment.userId !== user.id) {
      throw new ForbiddenException('You can only edit/delete your own comments');
    }

    // Check if comment is already deleted
    if (comment.isDeleted) {
      throw new ForbiddenException('Comment is already deleted');
    }

    return true;
  }
}