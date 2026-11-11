import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  CreateGroupAwarenessQuestionDto,
  CreateGroupScamReportDto,
  UpdateGroupPostDto,
} from '../dto/group-post.dto';
import {
  PostType,
  PostStatus,
  PostApprovalSetting,
  GroupMemberRole,
  BadgeType,
  GroupPostModerationStatus,
} from '@prisma/client';

@Injectable()
export class GroupPostService {
  constructor(private prisma: PrismaService) {}

  // Create awareness/question post with proper approval logic
  async createAwarenessQuestion(
    groupId: string,
    userId: string,
    dto: CreateGroupAwarenessQuestionDto,
  ) {
    // Check if user is group member
    const membership = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId },
        status: 'ACTIVE',
        isActive: true,
      },
      include: {
        group: {
          select: {
            postApproval: true,
          },
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('Only group members can create posts');
    }

    // Get group
    const group = await this.prisma.group.findUnique({
      where: { id: groupId, isActive: true, isDeleted: false },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Determine post status based on your requirements:
    // 1. If group admin creates post → directly approved (both INSTANT and APPROVAL_REQUIRED)
    // 2. If group member creates post → 
    //    - INSTANT setting: directly approved
    //    - APPROVAL_REQUIRED: goes for approval to admin

    let postStatus: PostStatus = PostStatus.PUBLISHED;
    let groupModerationStatus: GroupPostModerationStatus =
      GroupPostModerationStatus.APPROVED;
    let requiresApproval = false;

    const isAdmin = membership.role === GroupMemberRole.ADMIN || membership.role === GroupMemberRole.MODERATOR;

    // Apply your criteria:
    if (isAdmin) {
      // Criteria 1 & 2: Admin posts are always approved regardless of group setting
      postStatus = PostStatus.PUBLISHED;
      groupModerationStatus = GroupPostModerationStatus.APPROVED;
      requiresApproval = false;
    } else {
      // Criteria 3 & 4: Member posts
      if (group.postApproval === PostApprovalSetting.INSTANT) {
        // Criteria 3: Instant approval for members
        postStatus = PostStatus.PUBLISHED;
        groupModerationStatus = GroupPostModerationStatus.APPROVED;
        requiresApproval = false;
      } else if (group.postApproval === PostApprovalSetting.APPROVAL_REQUIRED) {
        // Criteria 4: Needs admin approval
        postStatus = PostStatus.UNDER_REVIEW;
        groupModerationStatus = GroupPostModerationStatus.PENDING;
        requiresApproval = true;
      }
    }

    // Create the post
    const post = await this.prisma.post.create({
      data: {
        title: dto.title,
        description: dto.description,
        postType: dto.postType,
        status: postStatus,
        userId: userId,
        isCompanyPost: dto.isCompanyPost || false,
        companyId: dto.companyId,
      },
    });

    // Create group post relation with userId
    const groupPost = await this.prisma.groupPost.create({
      data: {
        groupId,
        postId: post.id,
        userId, // Store userId in group post table
        requiresApproval,
        groupModerationStatus,
        groupReviewedAt:
          groupModerationStatus === GroupPostModerationStatus.APPROVED
            ? new Date()
            : null,
        groupReviewedBy:
          groupModerationStatus === GroupPostModerationStatus.APPROVED
            ? userId
            : null,
      },
      include: {
        post: true,
        group: true,
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Create badges
    const badges: Array<{
      badgeType: BadgeType;
      color: string;
      label: string;
    }> = [];

    if (dto.postType === PostType.SCAM_AWARENESS) {
      badges.push({
        badgeType: BadgeType.SCAM_AWARENESS,
        color: '#FF9800',
        label: 'Scam Awareness',
      });
    } else if (dto.postType === PostType.QUESTION) {
      badges.push({
        badgeType: BadgeType.QUESTION,
        color: '#2196F3',
        label: 'Question',
      });
    }

    if (badges.length > 0) {
      await this.prisma.postBadge.createMany({
        data: badges.map((badge) => ({
          postId: post.id,
          badgeType: badge.badgeType,
          color: badge.color,
          label: badge.label,
          createdAt: new Date(),
        })),
      });
    }

    // Update group post count
    await this.prisma.group.update({
      where: { id: groupId },
      data: {
        postCount: { increment: 1 },
      },
    });

    // If post needs approval, log moderation action
    if (requiresApproval) {
      await this.prisma.groupModerationLog.create({
        data: {
          groupId,
          adminUserId: userId, // The user who submitted
          action: 'SUBMIT_FOR_REVIEW',
          targetType: 'POST',
          targetId: post.id,
          reason: `${dto.postType} post submitted for group admin approval`,
        },
      });

      // Notify group admins (except the creator)
      await this.notifyGroupAdmins(
        groupId,
        userId,
        post.id,
        'New post pending approval',
      );
    }

    return {
      ...groupPost,
      requiresApproval,
      message: requiresApproval
        ? 'Your post has been submitted for admin approval'
        : 'Your post has been published to the group',
    };
  }

  // Create scam report post with proper approval logic
  async createScamReport(
    groupId: string,
    userId: string,
    dto: CreateGroupScamReportDto,
  ) {
    // Check if user is group member
    const membership = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId },
        status: 'ACTIVE',
        isActive: true,
      },
      include: {
        group: {
          select: {
            postApproval: true,
          },
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('Only group members can create posts');
    }

    // Get group
    const group = await this.prisma.group.findUnique({
      where: { id: groupId, isActive: true, isDeleted: false },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Determine post status based on evidence and group settings
    const hasEvidence = dto.evidence && dto.evidence.length > 0;
    let postStatus: PostStatus = PostStatus.DRAFT;
    let groupModerationStatus: GroupPostModerationStatus =
      GroupPostModerationStatus.APPROVED;
    let requiresApproval = false;

    const isAdmin = membership.role === GroupMemberRole.ADMIN || membership.role === GroupMemberRole.MODERATOR;

    // Check evidence first
    if (hasEvidence) {
      postStatus = PostStatus.UNDER_REVIEW; // Evidence requires platform review
    } else {
      // No evidence, apply your criteria
      if (isAdmin) {
        // Admin posts are always approved
        postStatus = PostStatus.PUBLISHED;
        groupModerationStatus = GroupPostModerationStatus.APPROVED;
        requiresApproval = false;
      } else {
        // Member posts
        if (group.postApproval === PostApprovalSetting.INSTANT) {
          // Instant approval for members
          postStatus = PostStatus.PUBLISHED;
          groupModerationStatus = GroupPostModerationStatus.APPROVED;
          requiresApproval = false;
        } else if (group.postApproval === PostApprovalSetting.APPROVAL_REQUIRED) {
          // Needs admin approval
          postStatus = PostStatus.UNDER_REVIEW;
          groupModerationStatus = GroupPostModerationStatus.PENDING;
          requiresApproval = true;
        }
      }
    }

    // Create the post
    const post = await this.prisma.post.create({
      data: {
        title: dto.title,
        description: dto.description,
        postType: PostType.SCAM_REPORT,
        status: postStatus,
        userId: userId,
        scamTypeId: dto.scamTypeId,
        lostAmount: dto.lostAmount ? parseFloat(dto.lostAmount) : null,
        currency: dto.currency,
        country: dto.country,
        region: dto.region,
        city: dto.city,
        incidentDate: dto.incidentDate,
        companyId: dto.companyId,
        companyNameManual: dto.companyNameManual,
        isCompanyPost: dto.isCompanyPost || false,
      },
    });

    // Create evidence if provided
    if (dto.evidence && dto.evidence.length > 0) {
      await this.prisma.evidence.createMany({
        data: dto.evidence.map((evidence, index) => ({
          postId: post.id,
          evidenceType: evidence.evidenceType as any,
          fileUrl: evidence.fileUrl,
          websiteUrl: evidence.websiteUrl,
          phoneNumber: evidence.phoneNumber,
          emailAddress: evidence.emailAddress,
          maskedContent: evidence.maskedContent,
          hasUserConsent: evidence.hasUserConsent || false,
          isMasked: evidence.isMasked !== false,
          fileName: evidence.fileName,
          fileSize: evidence.fileSize,
          mimeType: evidence.mimeType,
          orderIndex: index,
        })),
      });
    }

    // Create group post relation with userId
    const groupPost = await this.prisma.groupPost.create({
      data: {
        groupId,
        postId: post.id,
        userId, // Store userId in group post table
        requiresApproval,
        groupModerationStatus,
        groupReviewedAt:
          groupModerationStatus === GroupPostModerationStatus.APPROVED
            ? new Date()
            : null,
        groupReviewedBy:
          groupModerationStatus === GroupPostModerationStatus.APPROVED
            ? userId
            : null,
      },
      include: {
        post: true,
        group: true,
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Create badges
    const badges: Array<{
      badgeType: BadgeType;
      color: string;
      label: string;
    }> = [
      {
        badgeType: BadgeType.SCAM_REPORT,
        color: '#F44336',
        label: 'Scam Report',
      },
      {
        badgeType: hasEvidence
          ? BadgeType.EVIDENCE_PROVIDED
          : BadgeType.NO_EVIDENCE,
        color: hasEvidence ? '#4CAF50' : '#9E9E9E',
        label: hasEvidence ? 'Evidence Provided' : 'No Evidence',
      },
    ];

    await this.prisma.postBadge.createMany({
      data: badges.map((badge) => ({
        postId: post.id,
        badgeType: badge.badgeType,
        color: badge.color,
        label: badge.label,
        createdAt: new Date(),
      })),
    });

    // Update group post count
    await this.prisma.group.update({
      where: { id: groupId },
      data: {
        postCount: { increment: 1 },
      },
    });

    // Log moderation action if under review
    if (postStatus === PostStatus.UNDER_REVIEW) {
      await this.prisma.groupModerationLog.create({
        data: {
          groupId,
          adminUserId: userId,
          action: 'SUBMIT_FOR_REVIEW',
          targetType: 'POST',
          targetId: post.id,
          reason: hasEvidence
            ? 'Scam report with evidence submitted for review'
            : 'Scam report submitted for group admin approval',
        },
      });

      // If it's group approval (not evidence), notify group admins
      if (!hasEvidence && requiresApproval) {
        await this.notifyGroupAdmins(
          groupId,
          userId,
          post.id,
          'New scam report pending approval',
        );
      }
    }

    return {
      ...groupPost,
      requiresReview: postStatus === PostStatus.UNDER_REVIEW,
      requiresGroupApproval: requiresApproval,
      message: hasEvidence
        ? 'Thank you for your report. Your submission includes evidence and is currently under review.'
        : requiresApproval
          ? 'Your report has been submitted for group admin approval.'
          : 'Thank you for your report. It has been published to the group.',
    };
  }

  // Get single group post
  async getGroupPost(groupId: string, groupPostId: string, userId?: string) {
    const groupPost = await this.prisma.groupPost.findFirst({
      where: {
        id: groupPostId,
        groupId,
      },
      include: {
        post: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                avatarUrl: true,
              },
            },
            scamType: true,
            company: true,
            evidences: true,
            badges: true,
            comments: {
              where: {
                isDeleted: false,
                parentId: null,
                depth: 0,
              },
              include: {
                user: {
                  select: {
                    id: true,
                    displayName: true,
                    avatarUrl: true,
                  },
                },
                commentReactions: userId
                  ? {
                      where: { userId },
                      select: { type: true },
                    }
                  : false,
                _count: {
                  select: {
                    replies: true,
                    commentReactions: true,
                  },
                },
              },
              orderBy: { createdAt: 'desc' },
              take: 3,
            },
            _count: {
              select: {
                comments: true,
                reactions: true,
                bookmarks: true,
              },
            },
          },
        },
        group: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            coverImageUrl: true,
            memberCount: true,
            postCount: true,
          },
        },
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!groupPost) {
      throw new NotFoundException('Group post not found');
    }

    // Check if user is member to see full content
    const membership = userId
      ? await this.prisma.groupMember.findUnique({
          where: {
            groupId_userId: { groupId, userId },
            status: 'ACTIVE',
            isActive: true,
          },
        })
      : null;

    // If non-member, only show approved/published posts
    if (!membership && 
        (groupPost.post.status !== PostStatus.PUBLISHED || 
         groupPost.groupModerationStatus !== GroupPostModerationStatus.APPROVED)) {
      throw new ForbiddenException('You do not have permission to view this post');
    }

    // Get user interactions
    let userReaction: any = null;
    let isBookmarked = false;

    if (userId) {
      const [reaction, bookmark] = await Promise.all([
        this.prisma.postReaction.findFirst({
          where: {
            postId: groupPost.post.id,
            userId,
          },
        }),
        this.prisma.postBookmark.findUnique({
          where: {
            postId_userId: {
              postId: groupPost.post.id,
              userId,
            },
          },
        }),
      ]);

      userReaction = reaction;
      isBookmarked = !!bookmark;
    }

    return {
      ...groupPost,
      userReaction,
      isBookmarked,
      isMember: !!membership,
      canModerate: membership?.role === GroupMemberRole.ADMIN || 
                   membership?.role === GroupMemberRole.MODERATOR,
      canEdit: groupPost.userId === userId && 
               (membership?.role === GroupMemberRole.ADMIN || 
                membership?.role === GroupMemberRole.MODERATOR || 
                groupPost.post.userId === userId),
    };
  }

  // Get group posts with filters
  async getGroupPosts(
    groupId: string,
    userId?: string,
    filters?: {
      page: number;
      limit: number;
      status?: string;
      postType?: string;
      moderationStatus?: GroupPostModerationStatus;
    },
  ) {
    const {
      page = 1,
      limit = 20,
      status,
      postType,
      moderationStatus,
    } = filters || {};
    const skip = (page - 1) * limit;

    // Check group exists
    const group = await this.prisma.group.findUnique({
      where: { id: groupId, isActive: true, isDeleted: false },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Check if user is member
    const membership = userId
      ? await this.prisma.groupMember.findUnique({
          where: {
            groupId_userId: { groupId, userId },
            status: 'ACTIVE',
            isActive: true,
          },
        })
      : null;

    const where: any = {
      groupId,
      post: {
        deletedAt: null,
      },
    };

    // Status filter
    if (status) {
      where.post.status = status;
    } else if (!membership) {
      // Non-members only see published posts
      where.post.status = 'PUBLISHED';
    }

    // Post type filter
    if (postType) {
      where.post.postType = postType;
    }

    // Group moderation status filter
    if (moderationStatus) {
      where.groupModerationStatus = moderationStatus;
    } else if (!membership) {
      // Non-members only see approved posts
      where.groupModerationStatus = GroupPostModerationStatus.APPROVED;
    }

    const [groupPosts, total] = await Promise.all([
      this.prisma.groupPost.findMany({
        where,
        include: {
          post: {
            include: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                  avatarUrl: true,
                },
              },
              scamType: true,
              company: true,
              evidences: true,
              badges: true,
              // Include comments
              comments: {
                where: {
                  isDeleted: false,
                  parentId: null,
                  depth: 0,
                },
                include: {
                  user: {
                    select: {
                      id: true,
                      displayName: true,
                      avatarUrl: true,
                    },
                  },
                  commentReactions: userId
                    ? {
                        where: { userId },
                        select: { type: true },
                      }
                    : false,
                  _count: {
                    select: {
                      replies: true,
                      commentReactions: true,
                    },
                  },
                },
                orderBy: { createdAt: 'desc' },
                take: 3,
              },
              _count: {
                select: {
                  comments: true,
                  reactions: true,
                  bookmarks: true,
                },
              },
            },
          },
          group: {
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
            },
          },
          user: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: [{ pinned: 'desc' }, { post: { createdAt: 'desc' } }],
        skip,
        take: limit,
      }),
      this.prisma.groupPost.count({ where }),
    ]);

    // Process user interactions
    const enhancedPosts = await Promise.all(
      groupPosts.map(async (groupPost) => {
        let userReaction: any = null;
        let isBookmarked = false;

        if (userId) {
          const [reaction, bookmark] = await Promise.all([
            this.prisma.postReaction.findFirst({
              where: {
                postId: groupPost.post.id,
                userId,
              },
            }),
            this.prisma.postBookmark.findUnique({
              where: {
                postId_userId: {
                  postId: groupPost.post.id,
                  userId,
                },
              },
            }),
          ]);

          userReaction = reaction;
          isBookmarked = !!bookmark;
        }

        return {
          ...groupPost,
          userReaction,
          isBookmarked,
          isMember: !!membership,
          canModerate:
            membership?.role === GroupMemberRole.ADMIN ||
            membership?.role === GroupMemberRole.MODERATOR,
          canEdit: groupPost.userId === userId && 
                   (membership?.role === GroupMemberRole.ADMIN || 
                    membership?.role === GroupMemberRole.MODERATOR || 
                    groupPost.post.userId === userId),
        };
      }),
    );

    return {
      data: enhancedPosts,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        isMember: !!membership,
      },
    };
  }

  // Update group post
  async updateGroupPost(
    groupId: string,
    groupPostId: string,
    userId: string,
    dto: UpdateGroupPostDto,
  ) {
    const groupPost = await this.prisma.groupPost.findFirst({
      where: {
        postId: groupPostId,
        groupId: groupId,
      },
      include: {
        post: true,
      },
    });

    if (!groupPost) {
      throw new NotFoundException('Post not found in this group');
    }

    // Check if user can edit (post owner OR group admin/moderator)
    const canEdit = groupPost.userId === userId || 
                    await this.isGroupAdminModerator(groupId, userId);

    if (!canEdit) {
      throw new ForbiddenException('You do not have permission to edit this post');
    }

    // Check edit window for non-admin users
    if (groupPost.userId === userId) {
      const editWindowEnd = new Date(groupPost.post.createdAt);
      editWindowEnd.setMinutes(editWindowEnd.getMinutes() + 30);

      if (new Date() > editWindowEnd) {
        throw new BadRequestException('Edit window has expired (30 minutes)');
      }
    }

    // Check if post can be edited
    if (groupPost.post.status === PostStatus.PUBLISHED) {
      throw new BadRequestException('Published posts cannot be edited');
    }

    // Update the post
    const updatedPost = await this.prisma.post.update({
      where: { id: groupPost.postId },
      data: {
        title: dto.title,
        description: dto.description,
        scamTypeId: dto.scamTypeId,
        lostAmount: dto.lostAmount ? parseFloat(dto.lostAmount) : null,
        currency: dto.currency,
        country: dto.country,
        region: dto.region,
        city: dto.city,
        incidentDate: dto.incidentDate,
        companyId: dto.companyId,
        companyNameManual: dto.companyNameManual,
        updatedAt: new Date(),
      },
    });

    return {
      ...groupPost,
      post: updatedPost,
      message: 'Post updated successfully',
    };
  }

  // Delete group post
  async deleteGroupPost(groupId: string, groupPostId: string, userId: string) {
    const groupPost = await this.prisma.groupPost.findFirst({
      where: {
        postId: groupPostId,
        groupId: groupId,
      },
      include: {
        post: true,
      },
    });

    if (!groupPost) {
      throw new NotFoundException('Post not found in this group');
    }

    // Check if user can delete (post owner OR group admin/moderator)
    const canDelete = groupPost.userId === userId || 
                      await this.isGroupAdminModerator(groupId, userId);

    if (!canDelete) {
      throw new ForbiddenException('You do not have permission to delete this post');
    }

    await this.prisma.post.update({
      where: { id: groupPost.postId },
      data: {
        deletedAt: new Date(),
        status: PostStatus.DELETED,
      },
    });

    await this.prisma.groupPost.update({
      where: { id: groupPost.id },
      data: {
        groupModerationStatus: GroupPostModerationStatus.REMOVED,
        updatedAt: new Date(),
      },
    });

    // Update group post count
    await this.prisma.group.update({
      where: { id: groupId },
      data: {
        postCount: { decrement: 1 },
      },
    });

    // Log deletion
    await this.prisma.groupModerationLog.create({
      data: {
        groupId,
        adminUserId: userId,
        action: 'DELETE_POST',
        targetType: 'POST',
        targetId: groupPost.postId,
        reason: groupPost.userId === userId 
          ? 'Post deleted by owner' 
          : 'Post deleted by group admin/moderator',
      },
    });

    return {
      success: true,
      message: 'Post deleted successfully',
    };
  }

  // Pin/Unpin post (admin only - Criteria 5)
  async pinGroupPost(
    groupId: string,
    groupPostId: string,
    pinned: boolean,
    userId: string,
  ) {
    // Check if user is group admin/moderator
    const membership = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId },
        status: 'ACTIVE',
        isActive: true,
        role: { in: [GroupMemberRole.ADMIN, GroupMemberRole.MODERATOR] },
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'Only group admins/moderators can pin posts',
      );
    }

    const groupPost = await this.prisma.groupPost.findFirst({
      where: {
        postId: groupPostId,
        groupId: groupId,
      },
    });

    if (!groupPost) {
      throw new NotFoundException('Post not found in this group');
    }

    // Check if post is approved before pinning
    if (pinned && groupPost.groupModerationStatus !== GroupPostModerationStatus.APPROVED) {
      throw new BadRequestException('Only approved posts can be pinned');
    }

    const updatedGroupPost = await this.prisma.groupPost.update({
      where: { id: groupPost.id },
      data: {
        pinned,
        updatedAt: new Date(),
      },
      include: {
        post: true,
        group: true,
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Log moderation action
    await this.prisma.groupModerationLog.create({
      data: {
        groupId,
        adminUserId: userId,
        action: pinned ? 'PIN_POST' : 'UNPIN_POST',
        targetType: 'POST',
        targetId: groupPost.postId,
        reason: pinned
          ? 'Post pinned to top of group feed'
          : 'Post unpinned from group feed',
      },
    });

    return {
      success: true,
      message: `Post ${pinned ? 'pinned' : 'unpinned'} successfully`,
      data: updatedGroupPost,
    };
  }

  // Approve/Reject post (admin only - can self-approve)
  async updatePostStatus(
    groupId: string,
    groupPostId: string,
    adminUserId: string,
    status: 'APPROVED' | 'REJECTED',
    reason?: string,
  ) {
    const groupPost = await this.prisma.groupPost.findFirst({
      where: {
        postId: groupPostId,
        groupId: groupId,
      },
      include: {
        post: true,
      },
    });

    if (!groupPost) {
      throw new NotFoundException('Post not found in this group');
    }

    // Check if user is group admin/moderator
    const membership = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId: adminUserId },
        status: 'ACTIVE',
        isActive: true,
        role: { in: [GroupMemberRole.ADMIN, GroupMemberRole.MODERATOR] },
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'Only group admins/moderators can change post status',
      );
    }

    // Check if user is trying to approve their own post (this is allowed per criteria 1 & 2)
    const isOwnPost = groupPost.userId === adminUserId;

    const newGroupModerationStatus =
      status === 'APPROVED'
        ? GroupPostModerationStatus.APPROVED
        : GroupPostModerationStatus.REJECTED;

    const newPostStatus =
      status === 'APPROVED' ? PostStatus.PUBLISHED : PostStatus.REJECTED;

    // Update post and group post
    const [updatedPost, updatedGroupPost] = await this.prisma.$transaction([
      this.prisma.post.update({
        where: { id: groupPost.postId },
        data: {
          status: newPostStatus,
          publishedAt: status === 'APPROVED' ? new Date() : null,
          reviewedAt: new Date(),
          reviewedBy: adminUserId,
          rejectionReason: status === 'REJECTED' ? reason : null,
        },
      }),
      this.prisma.groupPost.update({
        where: { id: groupPost.id },
        data: {
          groupModerationStatus: newGroupModerationStatus,
          groupReviewedAt: new Date(),
          groupReviewedBy: adminUserId,
          groupRejectionReason: status === 'REJECTED' ? reason : null,
          updatedAt: new Date(),
        },
      }),
    ]);

    // Log moderation action
    await this.prisma.groupModerationLog.create({
      data: {
        groupId,
        adminUserId,
        action: status === 'APPROVED' ? 'APPROVE_POST' : 'REJECT_POST',
        targetType: 'POST',
        targetId: groupPost.postId,
        reason: isOwnPost 
          ? `${reason || 'Self-approved by admin'}` 
          : reason || `Post ${status.toLowerCase()} by group admin`,
      },
    });

    // Get group for notification
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { name: true },
    });

    // Send notification to post owner if approved and not self-approved
    if (status === 'APPROVED' && group && !isOwnPost) {
      await this.prisma.notification.create({
        data: {
          userId: groupPost.post.userId,
          type: 'GROUP_POST_APPROVED',
          title: 'Your group post has been approved',
          message: `Your post "${groupPost.post.title}" has been approved and is now visible in ${group.name}.`,
          data: {
            groupId,
            postId: groupPost.postId,
            groupName: group.name,
          },
        },
      });
    }

    return {
      success: true,
      message: `Post ${status.toLowerCase()} successfully`,
      status: newPostStatus,
      groupModerationStatus: newGroupModerationStatus,
      isSelfApproved: isOwnPost,
      data: {
        post: updatedPost,
        groupPost: updatedGroupPost,
      },
    };
  }

  // Get pending posts for group admin approval
  async getPendingPosts(
    groupId: string,
    userId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;

    // Check if user is group admin/moderator
    const membership = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId },
        status: 'ACTIVE',
        isActive: true,
        role: { in: [GroupMemberRole.ADMIN, GroupMemberRole.MODERATOR] },
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'Only group admins/moderators can view pending posts',
      );
    }

    const where = {
      groupId,
      groupModerationStatus: GroupPostModerationStatus.PENDING,
      post: {
        deletedAt: null,
        status: PostStatus.UNDER_REVIEW, // Only posts waiting for group approval
      },
    };

    const [groupPosts, total] = await Promise.all([
      this.prisma.groupPost.findMany({
        where,
        include: {
          post: {
            include: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                  avatarUrl: true,
                },
              },
              scamType: true,
              evidences: true,
              badges: true,
            },
          },
          user: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: {
          post: { createdAt: 'asc' },
        },
        skip,
        take: limit,
      }),
      this.prisma.groupPost.count({ where }),
    ]);

    return {
      data: groupPosts,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Helper: Check if user is group admin/moderator
  private async isGroupAdminModerator(groupId: string, userId: string): Promise<boolean> {
    const membership = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId },
        status: 'ACTIVE',
        isActive: true,
        role: { in: [GroupMemberRole.ADMIN, GroupMemberRole.MODERATOR] },
      },
    });
    return !!membership;
  }

  // Helper: Notify group admins about pending posts
  private async notifyGroupAdmins(
    groupId: string,
    excludedUserId: string,
    postId: string,
    message: string,
  ) {
    const groupAdmins = await this.prisma.groupMember.findMany({
      where: {
        groupId,
        status: 'ACTIVE',
        isActive: true,
        role: { in: [GroupMemberRole.ADMIN, GroupMemberRole.MODERATOR] },
        userId: { not: excludedUserId },
      },
      include: {
        user: {
          select: { id: true },
        },
      },
    });

    // Get group and post info for notification
    const [group, post] = await Promise.all([
      this.prisma.group.findUnique({
        where: { id: groupId },
        select: { name: true },
      }),
      this.prisma.post.findUnique({
        where: { id: postId },
        select: { title: true },
      }),
    ]);

    if (group && post) {
      const notifications = groupAdmins.map((admin) => ({
        userId: admin.user.id,
        type: 'GROUP_POST_PENDING_APPROVAL',
        title: 'New post pending approval',
        message: `${message}: "${post.title}" in ${group.name}`,
        data: {
          groupId,
          postId,
          groupName: group.name,
          postTitle: post.title,
        },
        createdAt: new Date(),
      }));

      if (notifications.length > 0) {
        await this.prisma.notification.createMany({
          data: notifications,
        });
      }
    }
  }
}