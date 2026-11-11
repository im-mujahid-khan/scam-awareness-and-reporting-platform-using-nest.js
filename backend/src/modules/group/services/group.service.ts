import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateGroupDto } from '../dto/create-group.dto';
import { UpdateGroupDto } from '../dto/update-group.dto';
import { JoinGroupDto } from '../dto/join-group.dto';
import { SearchGroupsDto } from '../dto/group-search.dto';
import {
  JoinedGroupsResponseDto,
  JoinedGroupsQueryDto,
} from '../dto/joined-groups.dto';

@Injectable()
export class GroupService {
  constructor(private prisma: PrismaService) {}

  // Create Group
  async createGroup(userId: string, dto: CreateGroupDto) {
    // Validate company for OFFICIAL groups
    if (dto.visibility === 'OFFICIAL') {
      if (!dto.companyId) {
        throw new BadRequestException(
          'Company ID required for official groups',
        );
      }

      const companyStaff = await this.prisma.companyStaff.findFirst({
        where: {
          companyId: dto.companyId,
          userId: userId,
          role: 'ADMIN',
          isActive: true,
        },
      });

      if (!companyStaff) {
        throw new ForbiddenException(
          'Only Company Admins can create official groups',
        );
      }
    }

    // Generate unique slug
    const slug = await this.generateUniqueSlug(dto.name);

    const group = await this.prisma.group.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        topic: dto.topic,
        visibility: dto.visibility,
        postApproval: dto.postApproval,
        rules: dto.rules,
        country: dto.country,
        region: dto.region,
        coverImageUrl: dto.coverImageUrl,
        city: dto.city,
        companyId: dto.visibility === 'OFFICIAL' ? dto.companyId : null,
        createdById: userId,
        members: {
          create: {
            userId,
            role: 'ADMIN',
            status: 'ACTIVE',
          },
        },
      },
      include: {
        company: true,
        createdBy: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Update member count
    await this.updateMemberCount(group.id);

    return group;
  }

  // Get Group by Slug with membership info
  async getGroupBySlug(slug: string, userId?: string) {
    const group = await this.prisma.group.findUnique({
      where: { slug, isActive: true, isDeleted: false },
      include: {
        company: true,
        createdBy: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Get counts
    const [memberCount, postCount, followerCount] = await Promise.all([
      this.prisma.groupMember.count({
        where: {
          groupId: group.id,
          status: 'ACTIVE',
          isActive: true,
        },
      }),
      this.prisma.groupPost.count({
        where: {
          groupId: group.id,
          post: { status: 'PUBLISHED' },
        },
      }),
      this.prisma.follow.count({
        where: { targetType: 'GROUP', targetId: group.id },
      }),
    ]);

    let isMember = false;
    let isFollowing = false;
    let memberRole: string | undefined;
    let memberStatus: string | undefined;

    if (userId) {
      const [member, follow] = await Promise.all([
        this.prisma.groupMember.findUnique({
          where: {
            groupId_userId: {
              groupId: group.id,
              userId,
            },
          },
        }),
        this.prisma.follow.findUnique({
          where: {
            userId_targetType_targetId: {
              userId,
              targetType: 'GROUP',
              targetId: group.id,
            },
          },
        }),
      ]);

      isMember = !!member;
      isFollowing = !!follow;
      memberRole = member?.role;
      memberStatus = member?.status;
    }

    return {
      ...group,
      memberCount,
      postCount,
      followerCount,
      isMember,
      isFollowing,
      memberRole, // ab yeh undefined bhi ho sakta hai
      memberStatus, // ab yeh undefined bhi ho sakta hai
    };
  }

  // Search Groups with filters
  async searchGroups(dto: SearchGroupsDto, userId?: string) {
    const {
      search,
      topic,
      country,
      region,
      city,
      visibility,
      page = 1,
      limit = 20,
    } = dto;
    const skip = (page - 1) * limit;

    const where: any = {
      isActive: true,
      isDeleted: false,
    };

    // Search by name/description
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Apply filters
    if (topic) where.topic = topic;
    if (country) where.country = country;
    if (region) where.region = region;
    if (city) where.city = city;
    if (visibility) where.visibility = visibility;

    const [groups, total] = await Promise.all([
      this.prisma.group.findMany({
        where,
        orderBy: [{ memberCount: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.group.count({ where }),
    ]);

    // Check membership for each group
    const enhancedGroups = await Promise.all(
      groups.map(async (group) => {
        let isMember = false;
        let isFollowing = false;

        if (userId) {
          const [member, follow] = await Promise.all([
            this.prisma.groupMember.findUnique({
              where: {
                groupId_userId: {
                  groupId: group.id,
                  userId,
                },
              },
            }),
            this.prisma.follow.findUnique({
              where: {
                userId_targetType_targetId: {
                  userId,
                  targetType: 'GROUP',
                  targetId: group.id,
                },
              },
            }),
          ]);

          isMember = !!member;
          isFollowing = !!follow;
        }

        // Get counts for each group
        const [memberCount, postCount] = await Promise.all([
          this.prisma.groupMember.count({
            where: {
              groupId: group.id,
              status: 'ACTIVE',
              isActive: true,
            },
          }),
          this.prisma.groupPost.count({
            where: {
              groupId: group.id,
              post: { status: 'PUBLISHED' },
            },
          }),
        ]);

        return {
          ...group,
          memberCount,
          postCount,
          isMember,
          isFollowing,
        };
      }),
    );

    return {
      data: enhancedGroups,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Update Group
  async updateGroup(id: string, userId: string, dto: UpdateGroupDto) {
    // Check if user is group admin
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId } },
    });

    if (!member || member.role !== 'ADMIN') {
      throw new ForbiddenException('Only group admins can update group');
    }

    return this.prisma.group.update({
      where: { id, isActive: true, isDeleted: false },
      data: dto,
    });
  }

  // Delete Group (soft delete)
  async deleteGroup(id: string, userId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId } },
    });

    if (!member || member.role !== 'ADMIN') {
      throw new ForbiddenException('Only group admins can delete group');
    }

    return this.prisma.group.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });
  }

  // Join Group
  async joinGroup(groupId: string, userId: string, dto: JoinGroupDto) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId, isActive: true, isDeleted: false },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Check if already member
    const existingMember = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (existingMember) {
      throw new ConflictException('Already a member of this group');
    }

    // Check for pending join request
    const existingRequest = await this.prisma.groupJoinRequest.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (existingRequest) {
      throw new ConflictException('Join request already pending');
    }

    // Handle based on group visibility
    if (group.visibility === 'PUBLIC') {
      // Auto-join for public groups
      await this.prisma.groupMember.create({
        data: {
          groupId,
          userId,
          role: 'MEMBER',
          status: 'ACTIVE',
        },
      });

      await this.updateMemberCount(groupId);
      return {
        success: true,
        message: 'Joined group successfully',
        requiresApproval: false,
      };
    } else if (group.visibility === 'PRIVATE') {
      // Create join request for private groups
      await this.prisma.groupJoinRequest.create({
        data: {
          groupId,
          userId,
          message: dto.message,
        },
      });

      // Notify group admins
      await this.notifyAdmins(groupId, userId);

      return {
        success: true,
        message: 'Join request submitted',
        requiresApproval: true,
      };
    } else if (group.visibility === 'OFFICIAL') {
      // For official groups, check company membership
      if (!group.companyId) {
        throw new ForbiddenException('Cannot join official group');
      }

      const companyMember = await this.prisma.companyStaff.findFirst({
        where: {
          companyId: group.companyId,
          userId,
          isActive: true,
        },
      });

      if (!companyMember) {
        throw new ForbiddenException(
          'Must be company staff to join official group',
        );
      }

      await this.prisma.groupMember.create({
        data: {
          groupId,
          userId,
          role: 'MEMBER',
          status: 'ACTIVE',
        },
      });

      await this.updateMemberCount(groupId);
      return {
        success: true,
        message: 'Joined official group',
        requiresApproval: false,
      };
    }
  }

  // Leave Group
  async leaveGroup(groupId: string, userId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId, isActive: true, isDeleted: false },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (!member) {
      throw new ConflictException('Not a member of this group');
    }

    // Prevent admin from leaving if they're the only admin
    if (member.role === 'ADMIN') {
      const adminCount = await this.prisma.groupMember.count({
        where: {
          groupId,
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      });

      if (adminCount <= 1) {
        throw new ForbiddenException(
          'Cannot leave as the only admin. Assign another admin first.',
        );
      }
    }

    await this.prisma.groupMember.update({
      where: { id: member.id },
      data: { isActive: false },
    });

    await this.updateMemberCount(groupId);
    return { success: true, message: 'Left group successfully' };
  }

  // Get Group Members
  async getGroupMembers(groupId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [members, total] = await Promise.all([
      this.prisma.groupMember.findMany({
        where: {
          groupId,
          status: 'ACTIVE',
          isActive: true,
        },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: [
          { role: 'desc' }, // Admins first
          { joinedAt: 'asc' },
        ],
        skip,
        take: limit,
      }),
      this.prisma.groupMember.count({
        where: {
          groupId,
          status: 'ACTIVE',
          isActive: true,
        },
      }),
    ]);

    return {
      data: members,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Follow Group
  async followGroup(groupId: string, userId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId, isActive: true, isDeleted: false },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const existingFollow = await this.prisma.follow.findUnique({
      where: {
        userId_targetType_targetId: {
          userId,
          targetType: 'GROUP',
          targetId: groupId,
        },
      },
    });

    if (existingFollow) {
      throw new ConflictException('Already following this group');
    }

    await this.prisma.follow.create({
      data: {
        userId,
        targetType: 'GROUP',
        targetId: groupId,
      },
    });

    await this.updateFollowerCount(groupId);
    return { success: true, message: 'Following group' };
  }

  // Unfollow Group
  async unfollowGroup(groupId: string, userId: string) {
    const follow = await this.prisma.follow.findUnique({
      where: {
        userId_targetType_targetId: {
          userId,
          targetType: 'GROUP',
          targetId: groupId,
        },
      },
    });

    if (!follow) {
      throw new ConflictException('Not following this group');
    }

    await this.prisma.follow.delete({
      where: { id: follow.id },
    });

    await this.updateFollowerCount(groupId);
    return { success: true, message: 'Unfollowed group' };
  }

  // Get Pending Join Requests (for group admins)
  async getPendingRequests(
    groupId: string,
    userId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    // Check if user is group admin
    const admin = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
        role: 'ADMIN',
      },
    });

    if (!admin) {
      throw new ForbiddenException('Only group admins can view join requests');
    }

    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      this.prisma.groupJoinRequest.findMany({
        where: {
          groupId,
          status: 'PENDING',
        },
        include: {
          user: {
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
      this.prisma.groupJoinRequest.count({
        where: {
          groupId,
          status: 'PENDING',
        },
      }),
    ]);

    return {
      data: requests,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Approve/Reject Join Request
  async handleJoinRequest(
    groupId: string,
    requestId: string,
    userId: string,
    action: 'APPROVE' | 'REJECT',
  ) {
    const admin = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
        role: 'ADMIN',
      },
    });

    if (!admin) {
      throw new ForbiddenException(
        'Only group admins can handle join requests',
      );
    }

    const request = await this.prisma.groupJoinRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.groupId !== groupId) {
      throw new NotFoundException('Join request not found');
    }

    if (action === 'APPROVE') {
      // Create group member
      await this.prisma.$transaction([
        this.prisma.groupMember.create({
          data: {
            groupId,
            userId: request.userId,
            role: 'MEMBER',
            status: 'ACTIVE',
          },
        }),
        this.prisma.groupJoinRequest.update({
          where: { id: requestId },
          data: {
            status: 'APPROVED',
            reviewedAt: new Date(),
            reviewedBy: userId,
          },
        }),
      ]);

      await this.updateMemberCount(groupId);
      return { success: true, message: 'Join request approved' };
    } else {
      // Reject request
      await this.prisma.groupJoinRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          reviewedAt: new Date(),
          reviewedBy: userId,
        },
      });

      return { success: true, message: 'Join request rejected' };
    }
  }

  // Discover Groups (public and official only)
  async discoverGroups(userId?: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const where = {
      isActive: true,
      isDeleted: false,
      visibility: { in: ['PUBLIC', 'OFFICIAL'] as any[] },
    };

    const groups = await this.prisma.group.findMany({
      where,
      orderBy: [
        { followerCount: 'desc' },
        { memberCount: 'desc' },
        { createdAt: 'desc' },
      ],
      skip,
      take: limit,
    });

    // Check membership/follow status for authenticated user
    const enhancedGroups = await Promise.all(
      groups.map(async (group) => {
        let isMember = false;
        let isFollowing = false;

        if (userId) {
          const [member, follow] = await Promise.all([
            this.prisma.groupMember.findUnique({
              where: { groupId_userId: { groupId: group.id, userId } },
            }),
            this.prisma.follow.findUnique({
              where: {
                userId_targetType_targetId: {
                  userId,
                  targetType: 'GROUP',
                  targetId: group.id,
                },
              },
            }),
          ]);

          isMember = !!member;
          isFollowing = !!follow;
        }

        return {
          ...group,
          isMember,
          isFollowing,
        };
      }),
    );

    const total = await this.prisma.group.count({ where });

    return {
      data: enhancedGroups,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Helper Methods
  private async generateUniqueSlug(name: string): Promise<string> {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
      .trim();

    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.prisma.group.findUnique({
        where: { slug },
      });

      if (!existing) {
        break;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  private async updateMemberCount(groupId: string) {
    const count = await this.prisma.groupMember.count({
      where: {
        groupId,
        status: 'ACTIVE',
        isActive: true,
      },
    });

    await this.prisma.group.update({
      where: { id: groupId },
      data: { memberCount: count },
    });
  }

  private async updateFollowerCount(groupId: string) {
    const count = await this.prisma.follow.count({
      where: { targetType: 'GROUP', targetId: groupId },
    });

    await this.prisma.group.update({
      where: { id: groupId },
      data: { followerCount: count },
    });
  }

  private async notifyAdmins(groupId: string, applicantUserId: string) {
    const admins = await this.prisma.groupMember.findMany({
      where: {
        groupId,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
      include: {
        user: {
          select: { id: true },
        },
      },
    });

    // Create notifications for each admin
    const notifications = admins.map((admin) => ({
      userId: admin.user.id,
      type: 'GROUP_JOIN_REQUEST',
      title: 'New Join Request',
      message: 'A user has requested to join your group',
      data: {
        groupId,
        applicantUserId,
      },
      createdAt: new Date(),
    }));

    await this.prisma.notification.createMany({
      data: notifications,
    });
  }

  async getJoinedGroups(
    userId: string,
    query: JoinedGroupsQueryDto,
  ): Promise<JoinedGroupsResponseDto> {
    const { page = 1, limit = 20, search } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      members: {
        some: {
          userId,
          status: 'ACTIVE',
          isActive: true,
        },
      },
      isActive: true,
      isDeleted: false,
    };

    // Add search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const total = await this.prisma.group.count({ where });

    // Get groups
    const groups = await this.prisma.group.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc', // Sort by newest first
      },
    });

    // Enhance each group with membership info and counts
    const enhancedGroups = await Promise.all(
      groups.map(async (group) => {
        // Get user's membership details for this group
        const member = await this.prisma.groupMember.findUnique({
          where: {
            groupId_userId: {
              groupId: group.id,
              userId,
            },
          },
        });

        // Get counts
        const [memberCount, postCount, followerCount] = await Promise.all([
          this.prisma.groupMember.count({
            where: {
              groupId: group.id,
              status: 'ACTIVE',
              isActive: true,
            },
          }),
          this.prisma.groupPost.count({
            where: {
              groupId: group.id,
              post: { status: 'PUBLISHED' },
            },
          }),
          this.prisma.follow.count({
            where: { targetType: 'GROUP', targetId: group.id },
          }),
        ]);

        // Check if following
        const isFollowing = !!(await this.prisma.follow.findUnique({
          where: {
            userId_targetType_targetId: {
              userId,
              targetType: 'GROUP',
              targetId: group.id,
            },
          },
        }));

        // Convert null to undefined to match DTO
        return {
          ...group,
          description: group.description || undefined,
          topic: group.topic || undefined,
          country: group.country || undefined,
          region: group.region || undefined,
          city: group.city || undefined,
          coverImageUrl: group.coverImageUrl || undefined,
          rules: group.rules || undefined,
          companyId: group.companyId || undefined,
          memberCount,
          postCount,
          followerCount,
          isMember: true, // Always true since we're querying joined groups
          isFollowing,
          memberRole: member?.role || undefined,
          memberStatus: member?.status || undefined,
        };
      }),
    );

    return {
      groups: enhancedGroups,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
