import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class GroupAccessGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const groupId = request.params.groupId || request.params.id;

    const group = await this.prisma.group.findUnique({
      where: { id: groupId, isActive: true, isDeleted: false },
    });

    if (!group) {
      throw new ForbiddenException('Group not found');
    }

    // Public groups are accessible to everyone
    if (group.visibility === 'PUBLIC') {
      return true;
    }

    // Private/Official groups require membership
    if (!userId) {
      throw new ForbiddenException('Authentication required');
    }

    const member = await this.prisma.groupMember.findUnique({
      where: { 
        groupId_userId: { 
          groupId, 
          userId 
        },
        isActive: true,
      },
    });

    if (!member) {
      throw new ForbiddenException('Group membership required');
    }

    return true;
  }
}