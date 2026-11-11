import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AdminFilterDto } from './dto/admin-filter.dto';
import { ReviewPostDto } from './dto/review-post.dto';
import { ManageUserDto } from './dto/manage-user.dto';
import { ManageCompanyDto } from './dto/manage-company.dto';
import { ManageGroupDto } from './dto/manage-group.dto';
import { AnalyticsFilterDto } from './dto/analytics.dto';
import { PostStatus, UserRole, ReportStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // ==================== POST MANAGEMENT ====================

  async getPostsForReview(filter: AdminFilterDto) {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const {
      search,
      status,
      fromDate,
      toDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filter;
    const skip = (page - 1) * limit;

    const where: any = {
      OR: [
        { status: PostStatus.UNDER_REVIEW }, // Use enum, not string
        // { status: PostStatus.PENDING },       // Use enum, not string
      ],
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // If status filter is provided, replace the OR condition
    if (status) {
      // Convert string status to enum if needed
      const statusEnum = status as PostStatus;
      delete where.OR; // Remove the default OR condition
      where.status = statusEnum;
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
              role: true,
            },
          },
          company: {
            select: {
              id: true,
              name: true,
              isVerified: true,
            },
          },
          scamType: {
            select: {
              id: true,
              name: true,
            },
          },
          evidences: {
            select: {
              id: true,
              evidenceType: true,
              fileUrl: true,
            },
          },
          _count: {
            select: {
              comments: true,
              reactions: true,
              bookmarks: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder as any,
        },
        skip,
        take: limit,
      }),
      this.prisma.post.count({ where }),
    ]);

    return {
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async reviewPost(postId: string, adminId: string, data: ReviewPostDto) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const updateData: any = {
      status: data.status,
      reviewedAt: new Date(),
      reviewedBy: adminId,
      reviewNotes: data.notes,
    };

    if (data.status === 'REJECTED' && data.rejectionReason) {
      updateData.rejectionReason = data.rejectionReason;
    }

    if (data.status === 'PUBLISHED') {
      updateData.publishedAt = new Date();
    }

    const updatedPost = await this.prisma.post.update({
      where: { id: postId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    });

    // Create notification for user
    await this.prisma.notification.create({
      data: {
        userId: updatedPost.userId,
        type: 'POST_REVIEWED',
        title: 'Your post has been reviewed',
        message: `Your post "${updatedPost.title}" has been ${data.status.toLowerCase()}.`,
        data: {
          postId: updatedPost.id,
          status: data.status,
          notes: data.notes,
        },
        postId: updatedPost.id,
      },
    });

    return updatedPost;
  }

  async bulkReviewPosts(
    postIds: string[],
    adminId: string,
    data: ReviewPostDto,
  ) {
    const results: Array<{
      postId: string;
      success: boolean;
      data?: any;
      error?: string;
    }> = [];

    for (const postId of postIds) {
      try {
        const result = await this.reviewPost(postId, adminId, data);
        results.push({ postId, success: true, data: result });
      } catch (error: any) {
        results.push({ postId, success: false, error: error.message });
      }
    }

    return results;
  }

  // ==================== USER MANAGEMENT ====================

  async getUsers(filter: AdminFilterDto) {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const {
      search,
      status,
      fromDate,
      toDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filter;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status === 'active') {
      where.isActive = true;
      where.isDeleted = false;
    } else if (status === 'banned') {
      where.isActive = false;
    } else if (status === 'deleted') {
      where.isDeleted = true;
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          phone: true,
          displayName: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          isDeleted: true,
          emailVerified: true,
          phoneVerified: true,
          verifiedAt: true,
          lastLoginAt: true,
          createdAt: true,
          _count: {
            select: {
              posts: true,
              comments: true,
              groupMemberships: true,
              sentMessages: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder as any,
        },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async manageUser(userId: string, adminId: string, data: ManageUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updateData: any = {};

    if (data.role !== undefined) updateData.role = data.role;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.isDeleted !== undefined) updateData.isDeleted = data.isDeleted;
    if (data.verifiedAt !== undefined)
      updateData.verifiedAt = new Date(data.verifiedAt);

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        isActive: true,
        isDeleted: true,
        verifiedAt: true,
        updatedAt: true,
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'MANAGE_USER',
        entityType: 'USER',
        entityId: userId,
        changes: data as any,
      },
    });

    // Create notification for user if warned
    if (data.warningMessage) {
      await this.prisma.notification.create({
        data: {
          userId: userId,
          type: 'ADMIN_WARNING',
          title: 'Administrative Warning',
          message: data.warningMessage,
          data: {
            adminId,
            action: 'warning',
            timestamp: new Date(),
          } as any,
        },
      });
    }

    return updatedUser;
  }

  // ==================== COMPANY MANAGEMENT ====================

  async getCompanies(filter: AdminFilterDto) {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const {
      search,
      status,
      fromDate,
      toDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filter;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { website: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status === 'verified') {
      where.isVerified = true;
    } else if (status === 'pending') {
      where.verificationStatus = 'PENDING';
    } else if (status === 'rejected') {
      where.verificationStatus = 'REJECTED';
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }

    const [companies, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        include: {
          _count: {
            select: {
              staff: true,
              followers: true,
              posts: true,
            },
          },
          analytics: {
            select: {
              followerCount: true,
              postReach: true,
              engagementRate: true,
              scamMentionCount: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder as any,
        },
        skip,
        take: limit,
      }),
      this.prisma.company.count({ where }),
    ]);

    return {
      companies,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async manageCompany(
    companyId: string,
    adminId: string,
    data: ManageCompanyDto,
  ) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        staff: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const updateData: any = {};

    if (data.verificationStatus !== undefined)
      updateData.verificationStatus = data.verificationStatus;
    if (data.isVerified !== undefined) updateData.isVerified = data.isVerified;
    if (data.verifiedBadge !== undefined)
      updateData.verifiedBadge = data.verifiedBadge;
    if (data.verificationNotes !== undefined)
      updateData.verificationNotes = data.verificationNotes;
    if (data.verifiedAt !== undefined)
      updateData.verifiedAt = new Date(data.verifiedAt);
    // if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updatedCompany = await this.prisma.company.update({
      where: { id: companyId },
      data: updateData,
      include: {
        _count: {
          select: {
            staff: true,
            followers: true,
          },
        },
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'MANAGE_COMPANY',
        entityType: 'COMPANY',
        entityId: companyId,
        changes: data as any,
      },
    });

    // Notify company staff about verification status change
    if (data.verificationStatus || data.isVerified !== undefined) {
      const notificationPromises = company.staff.map((staff) =>
        this.prisma.notification.create({
          data: {
            userId: staff.userId,
            type: 'COMPANY_VERIFICATION_UPDATE',
            title: 'Company Verification Status Updated',
            message: `Your company "${company.name}" verification status has been updated to ${data.verificationStatus || (data.isVerified ? 'VERIFIED' : 'NOT_VERIFIED')}`,
            data: {
              companyId,
              status:
                data.verificationStatus ||
                (data.isVerified ? 'VERIFIED' : 'NOT_VERIFIED'),
              notes: data.verificationNotes,
            } as any,
          },
        }),
      );
      await Promise.all(notificationPromises);
    }

    return updatedCompany;
  }

  // ==================== COMMENT MANAGEMENT ====================

  async getReportedComments(filter: AdminFilterDto) {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const { search, status, sortBy = 'createdAt', sortOrder = 'desc' } = filter;
    const skip = (page - 1) * limit;

    const where: any = {
      isReported: true,
    };

    if (search) {
      where.content = { contains: search, mode: 'insensitive' };
    }

    if (status === 'resolved') {
      where.isResolved = true;
    } else if (status === 'unresolved') {
      where.isResolved = false;
    }

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
              role: true,
            },
          },
          post: {
            select: {
              id: true,
              title: true,
              postType: true,
            },
          },
          reports: {
            include: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                },
              },
            },
          },
          _count: {
            select: {
              replies: true,
              commentReactions: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder as any,
        },
        skip,
        take: limit,
      }),
      this.prisma.comment.count({ where }),
    ]);

    return {
      comments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async manageComment(
    commentId: string,
    adminId: string,
    action: 'delete' | 'restore' | 'resolve',
    reason?: string,
  ) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        reports: true,
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    let updateData: any = {};
    let notificationType = '';
    let notificationMessage = '';

    switch (action) {
      case 'delete':
        updateData = { isDeleted: true, deletedAt: new Date() };
        notificationType = 'COMMENT_DELETED';
        notificationMessage = `Your comment has been deleted by an administrator${reason ? `: ${reason}` : ''}`;
        break;
      case 'restore':
        updateData = { isDeleted: false, deletedAt: null };
        notificationType = 'COMMENT_RESTORED';
        notificationMessage =
          'Your comment has been restored by an administrator';
        break;
      case 'resolve':
        updateData = { isReported: false };
        // Resolve all reports for this comment
        await this.prisma.commentReport.updateMany({
          where: { commentId },
          data: {
            isResolved: true,
            resolvedAt: new Date(),
            resolvedBy: adminId,
          },
        });
        notificationType = 'COMMENT_REPORT_RESOLVED';
        notificationMessage =
          'Reports on your comment have been resolved by an administrator';
        break;
    }

    const updatedComment = await this.prisma.comment.update({
      where: { id: commentId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: `MANAGE_COMMENT_${action.toUpperCase()}`,
        entityType: 'COMMENT',
        entityId: commentId,
        changes: { action, reason } as any,
      },
    });

    // Notify comment owner
    if (notificationType) {
      await this.prisma.notification.create({
        data: {
          userId: comment.userId,
          type: notificationType,
          title: 'Comment Management',
          message: notificationMessage,
          data: {
            commentId,
            action,
            reason,
            adminId,
          } as any,
        },
      });
    }

    return updatedComment;
  }

  // ==================== MESSAGE REPORTS MANAGEMENT ====================

  async getReportedMessages(filter: AdminFilterDto) {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const { status, sortBy = 'createdAt', sortOrder = 'desc' } = filter;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) {
      where.status = status as ReportStatus;
    }

    const [reports, total] = await Promise.all([
      this.prisma.messageReport.findMany({
        where,
        include: {
          message: {
            include: {
              sender: {
                select: {
                  id: true,
                  displayName: true,
                },
              },
              conversation: {
                include: {
                  user1: {
                    select: {
                      id: true,
                      displayName: true,
                    },
                  },
                  user2: {
                    select: {
                      id: true,
                      displayName: true,
                    },
                  },
                },
              },
            },
          },
          reporter: {
            select: {
              id: true,
              displayName: true,
            },
          },
          reviewer: {
            select: {
              id: true,
              displayName: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder as any,
        },
        skip,
        take: limit,
      }),
      this.prisma.messageReport.count({ where }),
    ]);

    return {
      reports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async reviewMessageReport(
    reportId: string,
    adminId: string,
    data: { status: ReportStatus; resolution?: string },
  ) {
    const report = await this.prisma.messageReport.findUnique({
      where: { id: reportId },
      include: {
        message: true,
      },
    });

    if (!report) {
      throw new NotFoundException('Message report not found');
    }

    const updatedReport = await this.prisma.messageReport.update({
      where: { id: reportId },
      data: {
        status: data.status,
        reviewedAt: new Date(),
        reviewedBy: adminId,
        resolution: data.resolution,
      },
      include: {
        message: {
          include: {
            sender: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
        },
        reporter: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });

    // If message is found to be abusive, update message status
    if (
      data.status === 'RESOLVED' &&
      data.resolution?.toLowerCase().includes('abusive')
    ) {
      await this.prisma.message.update({
        where: { id: report.messageId },
        data: {
          isReported: true,
          isSafe: false,
        },
      });
    }

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'REVIEW_MESSAGE_REPORT',
        entityType: 'MESSAGE_REPORT',
        entityId: reportId,
        changes: data as any,
      },
    });

    // Notify reporter
    await this.prisma.notification.create({
      data: {
        userId: report.reporterId,
        type: 'MESSAGE_REPORT_RESOLVED',
        title: 'Message Report Reviewed',
        message: `Your report on a message has been ${data.status.toLowerCase()}.`,
        data: {
          reportId,
          status: data.status,
          resolution: data.resolution,
        } as any,
      },
    });

    return updatedReport;
  }

  // ==================== GROUP MANAGEMENT ====================

  async getGroups(filter: AdminFilterDto) {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const { search, status, sortBy = 'createdAt', sortOrder = 'desc' } = filter;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status === 'active') {
      where.isActive = true;
      where.isDeleted = false;
    } else if (status === 'inactive') {
      where.isActive = false;
    } else if (status === 'deleted') {
      where.isDeleted = true;
    }

    const [groups, total] = await Promise.all([
      this.prisma.group.findMany({
        where,
        include: {
          createdBy: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
          company: {
            select: {
              id: true,
              name: true,
              isVerified: true,
            },
          },
          _count: {
            select: {
              members: true,
              groupPosts: true,
              follows: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder as any,
        },
        skip,
        take: limit,
      }),
      this.prisma.group.count({ where }),
    ]);

    return {
      groups,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async manageGroup(groupId: string, adminId: string, data: ManageGroupDto) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        createdBy: {
          select: {
            id: true,
            displayName: true,
          },
        },
        members: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    let updateData: any = {};
    let actionType = '';

    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
      actionType = data.isActive ? 'ACTIVATE_GROUP' : 'DEACTIVATE_GROUP';
    }

    if (data.isDeleted !== undefined) {
      updateData.isDeleted = data.isDeleted;
      updateData.deletedAt = data.isDeleted ? new Date() : null;
      actionType = data.isDeleted ? 'DELETE_GROUP' : 'RESTORE_GROUP';
    }

    if (data.permanentDelete) {
      // Permanent delete all related records
      await this.prisma.groupPost.deleteMany({ where: { groupId } });
      await this.prisma.groupMember.deleteMany({ where: { groupId } });
      await this.prisma.groupJoinRequest.deleteMany({ where: { groupId } });
      await this.prisma.groupModerationLog.deleteMany({ where: { groupId } });
      await this.prisma.follow.deleteMany({ where: { groupId } });

      await this.prisma.group.delete({
        where: { id: groupId },
      });

      // Create audit log
      await this.prisma.auditLog.create({
        data: {
          userId: adminId,
          action: 'PERMANENT_DELETE_GROUP',
          entityType: 'GROUP',
          entityId: groupId,
          changes: { reason: data.reason } as any,
        },
      });

      // Notify group creator and members
      const notificationPromises = [
        this.prisma.notification.create({
          data: {
            userId: group.createdBy.id,
            type: 'GROUP_PERMANENTLY_DELETED',
            title: 'Group Permanently Deleted',
            message: `Your group "${group.name}" has been permanently deleted by an administrator${data.reason ? `: ${data.reason}` : ''}`,
            data: {
              groupId,
              groupName: group.name,
              reason: data.reason,
            } as any,
          },
        }),
      ];

      // Notify all members (limit to first 100 to avoid performance issues)
      const memberIds = group.members.slice(0, 100).map((m) => m.userId);
      for (const memberId of memberIds) {
        notificationPromises.push(
          this.prisma.notification.create({
            data: {
              userId: memberId,
              type: 'GROUP_PERMANENTLY_DELETED',
              title: 'Group Deleted',
              message: `The group "${group.name}" has been permanently deleted by an administrator.`,
              data: {
                groupId,
                groupName: group.name,
              } as any,
            },
          }),
        );
      }

      await Promise.all(notificationPromises);

      return { success: true, message: 'Group permanently deleted' };
    }

    const updatedGroup = await this.prisma.group.update({
      where: { id: groupId },
      data: updateData,
      include: {
        createdBy: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: actionType,
        entityType: 'GROUP',
        entityId: groupId,
        changes: { ...data, action: actionType } as any,
      },
    });

    // Notify group creator
    if (actionType) {
      await this.prisma.notification.create({
        data: {
          userId: group.createdBy.id,
          type: actionType,
          title: 'Group Management',
          message: `Your group "${group.name}" has been ${data.isActive ? 'activated' : data.isDeleted ? 'deleted' : 'restored'} by an administrator${data.reason ? `: ${data.reason}` : ''}`,
          data: {
            groupId,
            action: actionType,
            reason: data.reason,
          } as any,
        },
      });
    }

    return updatedGroup;
  }

  // ==================== CATEGORIES & TAGS MANAGEMENT ====================

  async getScamTypes(filter: AdminFilterDto) {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const { search, status, sortBy = 'order', sortOrder = 'asc' } = filter;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    const [scamTypes, total] = await Promise.all([
      this.prisma.scamType.findMany({
        where,
        include: {
          _count: {
            select: {
              posts: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder as any,
        },
        skip,
        take: limit,
      }),
      this.prisma.scamType.count({ where }),
    ]);

    return {
      scamTypes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async manageScamType(
    scamTypeId: string,
    data: {
      name?: string;
      description?: string;
      isActive?: boolean;
      order?: number;
    },
  ) {
    const scamType = await this.prisma.scamType.findUnique({
      where: { id: scamTypeId },
    });

    if (!scamType) {
      throw new NotFoundException('Scam type not found');
    }

    // If name is being updated, generate slug
    const updateData: any = { ...data };
    if (data.name && data.name !== scamType.name) {
      updateData.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }

    const updatedScamType = await this.prisma.scamType.update({
      where: { id: scamTypeId },
      data: updateData,
      include: {
        _count: {
          select: {
            posts: true,
          },
        },
      },
    });

    return updatedScamType;
  }

  async createScamType(data: {
    name: string;
    description?: string;
    isActive?: boolean;
    order?: number;
  }) {
    const existing = await this.prisma.scamType.findFirst({
      where: {
        OR: [
          { name: data.name },
          { slug: data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') },
        ],
      },
    });

    if (existing) {
      throw new BadRequestException('Scam type with this name already exists');
    }

    const scamType = await this.prisma.scamType.create({
      data: {
        name: data.name,
        slug: data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: data.description,
        isActive: data.isActive ?? true,
        order: data.order ?? 0,
      },
    });

    return scamType;
  }

  // ==================== ANALYTICS ====================

  async getSystemAnalytics(filter: AnalyticsFilterDto) {
    const { period = 'monthly', startDate, endDate, country, region } = filter;

    // Calculate date ranges based on period
    const now = new Date();
    let start = new Date();

    if (period === 'daily') {
      start.setDate(now.getDate() - 7); // Last 7 days
    } else if (period === 'weekly') {
      start.setDate(now.getDate() - 30); // Last 30 days
    } else if (period === 'monthly') {
      start.setMonth(now.getMonth() - 12); // Last 12 months
    } else if (period === 'yearly') {
      start.setFullYear(now.getFullYear() - 5); // Last 5 years
    }

    const dateFilter = {
      gte: startDate ? new Date(startDate) : start,
      lte: endDate ? new Date(endDate) : now,
    };

    // Get summary statistics using Prisma queries instead of raw SQL
    const totalUsers = await this.prisma.user.count({
      where: { isDeleted: false },
    });
    const totalAdmins = await this.prisma.user.count({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
    });
    const totalPublishedPosts = await this.prisma.post.count({
      where: { status: 'PUBLISHED' },
    });
    const pendingReviewPosts = await this.prisma.post.count({
      where: { status: 'UNDER_REVIEW' },
    });
    const verifiedCompanies = await this.prisma.company.count({
      where: { isVerified: true },
    });
    const activeGroups = await this.prisma.group.count({
      where: { isDeleted: false },
    });
    const reportedComments = await this.prisma.comment.count({
      where: { isReported: true },
    });
    const pendingMessageReports = await this.prisma.messageReport.count({
      where: { status: 'PENDING' },
    });

    // Get user analytics by date
    const userAnalytics = await this.prisma.user.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: dateFilter,
      },
      _count: {
        _all: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Get post analytics by date
    const postAnalytics = await this.prisma.post.groupBy({
      by: ['createdAt', 'postType', 'status'],
      where: {
        createdAt: dateFilter,
      },
      _count: {
        _all: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Get company analytics by date
    const companyAnalytics = await this.prisma.company.groupBy({
      by: ['createdAt', 'isVerified'],
      where: {
        createdAt: dateFilter,
      },
      _count: {
        _all: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return {
      userAnalytics,
      postAnalytics,
      companyAnalytics,
      summary: {
        totalUsers,
        totalAdmins,
        totalPublishedPosts,
        pendingReviewPosts,
        verifiedCompanies,
        activeGroups,
        reportedComments,
        pendingMessageReports,
      },
    };
  }

  // ==================== GLOBAL SEARCH ====================

  async globalSearch(query: string, filter?: AdminFilterDto) {
    const page = filter?.page ?? 1;
    const limit = filter?.limit ?? 20;
    const skip = (page - 1) * limit;

    // Search across multiple tables
    const [users, posts, companies, groups, comments] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          OR: [
            { email: { contains: query, mode: 'insensitive' } },
            { displayName: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          createdAt: true,
        },
        take: limit,
      }),
      this.prisma.post.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          title: true,
          postType: true,
          status: true,
          createdAt: true,
        },
        take: limit,
      }),
      this.prisma.company.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { website: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          isVerified: true,
          createdAt: true,
        },
        take: limit,
      }),
      this.prisma.group.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          visibility: true,
          isActive: true,
          createdAt: true,
        },
        take: limit,
      }),
      this.prisma.comment.findMany({
        where: {
          content: { contains: query, mode: 'insensitive' },
        },
        select: {
          id: true,
          content: true,
          isReported: true,
          createdAt: true,
        },
        take: limit,
      }),
    ]);

    return {
      users,
      posts,
      companies,
      groups,
      comments,
      totalResults:
        users.length +
        posts.length +
        companies.length +
        groups.length +
        comments.length,
    };
  }

  // ==================== LOGS & MODERATION HISTORY ====================

  async getAuditLogs(filter: AdminFilterDto) {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const {
      search,
      fromDate,
      toDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filter;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { entityType: { contains: search, mode: 'insensitive' } },
        { entityId: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder as any,
        },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getModerationHistory(filter: AdminFilterDto) {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const {
      entityType,
      fromDate,
      toDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filter;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (entityType) {
      where.entityType = entityType;
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }

    // Get audit logs with moderation actions
    where.OR = [
      { action: { contains: 'POST' } },
      { action: { contains: 'COMMENT' } },
      { action: { contains: 'MESSAGE' } },
      { action: { contains: 'USER' } },
      { action: { contains: 'COMPANY' } },
      { action: { contains: 'GROUP' } },
    ];

    const [history, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder as any,
        },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      history,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}
