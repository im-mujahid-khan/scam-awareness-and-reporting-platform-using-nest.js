import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class PostOwnerGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const postId = request.params.id;

    if (!user || !postId) {
      return false;
    }

    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { companyStaff: true },
    });

    if (!post) {
      return false;
    }

    // Check if user is post owner or company staff
    const isOwner = post.userId === user.id;
    const isCompanyStaff = post.companyStaff?.userId === user.id;

    if (!isOwner && !isCompanyStaff) {
      throw new ForbiddenException('You are not authorized to perform this action');
    }

    return true;
  }
}