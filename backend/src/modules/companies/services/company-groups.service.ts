// src/modules/companies/services/company-groups.service.ts
import { 
  Injectable, 
  NotFoundException, 
  ForbiddenException,
  BadRequestException 
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateCompanyGroupDto } from '../dto/create-company-group.dto';
import { UpdateCompanyGroupDto } from '../dto/update-company-group.dto';
import { GroupResponseDto } from '../dto/group-response.dto';

@Injectable()
export class CompanyGroupsService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async createOfficialGroup(
    companyId: string,
    createGroupDto: CreateCompanyGroupDto,
    userId: string
  ): Promise<GroupResponseDto> {
    // Verify company exists
    const company = await this.prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Check if user is company staff (already done by guard, but double-check)
    const staffMember = await this.prisma.companyStaff.findFirst({
      where: {
        companyId,
        userId,
        role: { in: ['OWNER', 'ADMIN'] },
        isActive: true
      }
    });

    if (!staffMember) {
      throw new ForbiddenException('Only company admins can create official groups');
    }

    // Create the group
    const group = await this.prisma.group.create({
      data: {
        name: createGroupDto.name,
        slug: this.generateSlug(createGroupDto.name),
        description: createGroupDto.description,
        topic: createGroupDto.topic,
        visibility: 'PUBLIC', // Official groups are public by default
        postApproval: createGroupDto.postApproval || 'INSTANT',
        coverImageUrl: createGroupDto.coverImageUrl,
        rules: createGroupDto.rules,
        companyId, // Link to company
        createdById: userId,
        isActive: true,
        isDeleted: false,
        memberCount: 1, // Creator as first member
        postCount: 0,
        followerCount: 0
      }
    });

    // Add creator as group admin
    await this.prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId,
        role: 'ADMIN',
        status: 'ACTIVE',
        isActive: true
      }
    });

    return this.mapToGroupResponseDto(group);
  }

  async getCompanyGroups(companyId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [groups, total] = await Promise.all([
      this.prisma.group.findMany({
        where: { 
          companyId,
          isDeleted: false,
          isActive: true 
        },
        include: {
          _count: {
            select: {
              members: { where: { status: 'ACTIVE', isActive: true } },
              groupPosts: { where: { groupModerationStatus: 'APPROVED' } },
              follows: true,
            },
          },
          company: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
              isVerified: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.group.count({
        where: { companyId, isDeleted: false, isActive: true }
      }),
    ]);

    return {
      data: groups.map(group => ({
        id: group.id,
        name: group.name,
        slug: group.slug,
        description: group.description,
        topic: group.topic,
        coverImageUrl: group.coverImageUrl,
        memberCount: group._count.members,
        postCount: group._count.groupPosts,
        followerCount: group._count.follows,
        company: group.company,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async updateOfficialGroup(
    companyId: string,
    groupId: string,
    updateGroupDto: UpdateCompanyGroupDto,
    userId: string
  ): Promise<GroupResponseDto> {
    // Verify group exists and belongs to company
    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        companyId,
        isDeleted: false
      }
    });

    if (!group) {
      throw new NotFoundException('Group not found or does not belong to this company');
    }

    // Check if user is group admin or company admin
    const isGroupAdmin = await this.prisma.groupMember.findFirst({
      where: {
        groupId,
        userId,
        role: 'ADMIN',
        status: 'ACTIVE',
        isActive: true
      }
    });

    const isCompanyAdmin = await this.prisma.companyStaff.findFirst({
      where: {
        companyId,
        userId,
        role: { in: ['OWNER', 'ADMIN'] },
        isActive: true
      }
    });

    if (!isGroupAdmin && !isCompanyAdmin) {
      throw new ForbiddenException('Only group admins or company admins can update this group');
    }

    // Update the group
    const updatedGroup = await this.prisma.group.update({
      where: { id: groupId },
      data: {
        name: updateGroupDto.name,
        description: updateGroupDto.description,
        topic: updateGroupDto.topic,
        postApproval: updateGroupDto.postApproval,
        coverImageUrl: updateGroupDto.coverImageUrl,
        rules: updateGroupDto.rules,
      }
    });

    return this.mapToGroupResponseDto(updatedGroup);
  }

  async deleteOfficialGroup(
    companyId: string,
    groupId: string,
    userId: string
  ): Promise<{ message: string }> {
    // Verify group exists and belongs to company
    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        companyId,
        isDeleted: false
      }
    });

    if (!group) {
      throw new NotFoundException('Group not found or does not belong to this company');
    }

    // Check if user is company admin
    const isCompanyAdmin = await this.prisma.companyStaff.findFirst({
      where: {
        companyId,
        userId,
        role: { in: ['OWNER', 'ADMIN'] },
        isActive: true
      }
    });

    if (!isCompanyAdmin) {
      throw new ForbiddenException('Only company admins can delete official groups');
    }

    // Soft delete the group
    await this.prisma.group.update({
      where: { id: groupId },
      data: {
        isDeleted: true,
        isActive: false,
        deletedAt: new Date()
      }
    });

    return { message: 'Group deleted successfully' };
  }

  async getGroupMembers(companyId: string, groupId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    // Verify group belongs to company
    const group = await this.prisma.group.findFirst({
      where: { id: groupId, companyId, isDeleted: false }
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const [members, total] = await Promise.all([
      this.prisma.groupMember.findMany({
        where: {
          groupId,
          status: 'ACTIVE',
          isActive: true
        },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            }
          }
        },
        orderBy: { joinedAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.groupMember.count({
        where: { groupId, status: 'ACTIVE', isActive: true }
      })
    ]);

    return {
      data: members.map(m => ({
        id: m.user.id,
        displayName: m.user.displayName,
        firstName: m.user.firstName,
        lastName: m.user.lastName,
        avatarUrl: m.user.avatarUrl,
        role: m.role,
        joinedAt: m.joinedAt
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    };
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);
  }

  private mapToGroupResponseDto(group: any): GroupResponseDto {
    return {
      id: group.id,
      name: group.name,
      slug: group.slug,
      description: group.description,
      topic: group.topic,
      visibility: group.visibility,
      coverImageUrl: group.coverImageUrl,
      rules: group.rules,
      memberCount: group.memberCount || 0,
      postCount: group.postCount || 0,
      followerCount: group.followerCount || 0,
      isOfficial: true,
      companyId: group.companyId,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt
    };
  }
}