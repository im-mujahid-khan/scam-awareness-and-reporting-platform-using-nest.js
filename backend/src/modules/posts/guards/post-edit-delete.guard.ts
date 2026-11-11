// posts/guards/post-edit-delete.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class PostEditDeleteGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user.id;
    const postId = request.params.id;
    const method = request.method; // 'PUT' for edit, 'DELETE' for delete

    // Get the post with company staff info
    const post = await this.prisma.post.findUnique({
      where: { 
        id: postId,
        deletedAt: null, // Don't allow operations on deleted posts
      },
      include: { 
        companyStaff: true,
        user: true,
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Check edit window for PUT requests
    if (method === 'PUT') {
      if (post.editableUntil && new Date() > post.editableUntil) {
        throw new ForbiddenException('Edit window has expired');
      }

      // Cannot edit deleted posts
      if (post.status === 'DELETED') {
        throw new ForbiddenException('Cannot edit deleted post');
      }
    }

    // Normal user: can edit/delete their own posts
    if (post.userId === userId) {
      return true;
    }

    // Check if user is company staff and this is a company post
    if (post.isCompanyPost && post.companyStaff) {
      // Check if this staff member is the one trying to edit/delete
      if (post.companyStaff.userId === userId) {
        // Company staff can edit/delete:
        // 1. Scam Awareness posts
        // 2. Question posts  
        // 3. Company-created Scam Reports (where isCompanyPost === true)
        const allowedPostTypesForCompanyStaff = ['SCAM_AWARENESS', 'QUESTION'];
        
        if (post.postType === 'SCAM_REPORT') {
          return true; // Company staff can edit/delete company-created scam reports
        }
        
        // For other post types, check if they're in the allowed list
        return allowedPostTypesForCompanyStaff.includes(post.postType);
      }
    }

    throw new ForbiddenException('You are not authorized to perform this action');
  }
}