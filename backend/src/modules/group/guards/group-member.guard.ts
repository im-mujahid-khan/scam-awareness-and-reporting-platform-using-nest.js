import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class GroupMemberGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const groupId = request.params.groupId || request.params.id;

    if (!userId || !groupId) {
      throw new ForbiddenException('Access denied');
    }

    const member = await this.prisma.groupMember.findUnique({
      where: { 
        groupId_userId: { 
          groupId, 
          userId 
        },
        status: 'ACTIVE',
        isActive: true,
      },
    });

    if (!member) {
      throw new ForbiddenException('Only group members can perform this action');
    }

    return true;
  }
}