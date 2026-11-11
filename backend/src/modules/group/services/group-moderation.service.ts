import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { GroupMemberRole, GroupMemberStatus } from '@prisma/client';

@Injectable()
export class GroupModerationService {
  constructor(private prisma: PrismaService) {}

  async assignAdminRole(groupId: string, targetUserId: string, currentUserId: string) {
    // Check if current user is admin
    const currentAdmin = await this.prisma.groupMember.findUnique({
      where: { 
        groupId_userId: { groupId, userId: currentUserId },
        role: GroupMemberRole.ADMIN,
      },
    });

    if (!currentAdmin) {
      throw new ForbiddenException('Only group admins can assign admin roles');
    }

    // Check if target user is a member
    const targetMember = await this.prisma.groupMember.findUnique({
      where: { 
        groupId_userId: { groupId, userId: targetUserId },
        status: GroupMemberStatus.ACTIVE,
      },
    });

    if (!targetMember) {
      throw new NotFoundException('User is not an active member of this group');
    }

    // Update role to admin
    await this.prisma.groupMember.update({
      where: { id: targetMember.id },
      data: { role: GroupMemberRole.ADMIN },
    });

    await this.prisma.groupModerationLog.create({
      data: {
        groupId,
        adminUserId: currentUserId,
        action: 'ASSIGN_ADMIN',
        targetType: 'MEMBER',
        targetId: targetUserId,
      },
    });

    return { success: true, message: 'Admin role assigned successfully' };
  }

  async removeMember(groupId: string, targetUserId: string, currentUserId: string, reason?: string) {
    // Check if current user is admin
    const currentAdmin = await this.prisma.groupMember.findUnique({
      where: { 
        groupId_userId: { groupId, userId: currentUserId },
        role: GroupMemberRole.ADMIN,
      },
    });

    if (!currentAdmin) {
      throw new ForbiddenException('Only group admins can remove members');
    }

    // Cannot remove yourself
    if (currentUserId === targetUserId) {
      throw new ForbiddenException('Cannot remove yourself from group');
    }

    // Check if target user is a member
    const targetMember = await this.prisma.groupMember.findUnique({
      where: { 
        groupId_userId: { groupId, userId: targetUserId },
      },
    });

    if (!targetMember) {
      throw new NotFoundException('User is not a member of this group');
    }

    // Remove member (soft delete)
    await this.prisma.groupMember.update({
      where: { id: targetMember.id },
      data: { 
        isActive: false,
        status: GroupMemberStatus.BANNED,
      },
    });

    await this.prisma.groupModerationLog.create({
      data: {
        groupId,
        adminUserId: currentUserId,
        action: 'REMOVE_MEMBER',
        targetType: 'MEMBER',
        targetId: targetUserId,
        reason,
      },
    });

    // Update member count
    await this.updateMemberCount(groupId);

    return { success: true, message: 'Member removed from group' };
  }

  async getModerationLogs(groupId: string, userId: string, page: number = 1, limit: number = 20) {
    // Check if user is admin
    const admin = await this.prisma.groupMember.findUnique({
      where: { 
        groupId_userId: { groupId, userId },
        role: GroupMemberRole.ADMIN,
      },
    });

    if (!admin) {
      throw new ForbiddenException('Only group admins can view moderation logs');
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.groupModerationLog.findMany({
        where: { groupId },
        include: {
          admin: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.groupModerationLog.count({ where: { groupId } }),
    ]);

    return {
      data: logs,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  private async updateMemberCount(groupId: string) {
    const count = await this.prisma.groupMember.count({
      where: { 
        groupId, 
        status: GroupMemberStatus.ACTIVE,
        isActive: true,
      },
    });

    await this.prisma.group.update({
      where: { id: groupId },
      data: { memberCount: count },
    });
  }
}