// src/modules/companies/services/company-posts.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient, PostStatus, PostType } from '@prisma/client';
import { CreateCompanyPostDto } from '../dto/create-company-post.dto';
import { UpdateCompanyPostDto } from '../dto/update-company-post.dto';
import { PostResponseDto } from '../dto/post-response.dto';

@Injectable()
export class CompanyPostsService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async createAwarenessPost(
    companyId: string,
    createPostDto: CreateCompanyPostDto,
    userId: string,
  ): Promise<PostResponseDto> {
    // Get staff member details
    const staffMember = await this.prisma.companyStaff.findFirst({
      where: {
        companyId,
        userId,
        isActive: true,
      },
    });

    if (!staffMember) {
      throw new ForbiddenException(
        'You are not a staff member of this company',
      );
    }

    // Create awareness post
    const post = await this.prisma.post.create({
      data: {
        title: createPostDto.title,
        description: createPostDto.description,
        postType: 'SCAM_AWARENESS',
        status: 'PUBLISHED',
        userId,
        companyId,
        companyStaffId: staffMember.id,
        isCompanyPost: true,
        publishedAt: new Date(),
        country: createPostDto.country,
        region: createPostDto.region,
        city: createPostDto.city,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            isVerified: true,
            verifiedBadge: true,
          },
        },
      },
    });

    // Add badge
    await this.prisma.postBadge.create({
      data: {
        postId: post.id,
        badgeType: 'SCAM_AWARENESS',
        color: '#F59E0B',
        label: 'Official Awareness',
      },
    });

    // Add media if provided
    if (createPostDto.media && createPostDto.media.length > 0) {
      await this.addMedia(post.id, createPostDto.media);
    }

    return this.mapToPostResponseDto(post);
  }

  async createOfficialWarning(
    companyId: string,
    createPostDto: CreateCompanyPostDto,
    userId: string,
  ): Promise<PostResponseDto> {
    // Get staff member details
    const staffMember = await this.prisma.companyStaff.findFirst({
      where: {
        companyId,
        userId,
        isActive: true,
      },
    });

    if (!staffMember) {
      throw new ForbiddenException(
        'You are not a staff member of this company',
      );
    }

    // Create warning post
    const post = await this.prisma.post.create({
      data: {
        title: createPostDto.title,
        description: createPostDto.description,
        postType: 'SCAM_REPORT',
        status: 'PUBLISHED',
        userId,
        companyId,
        companyStaffId: staffMember.id,
        isCompanyPost: true,
        publishedAt: new Date(),
        scamTypeId: createPostDto.scamTypeId,
        lostAmount: createPostDto.lostAmount,
        currency: createPostDto.currency,
        country: createPostDto.country,
        region: createPostDto.region,
        city: createPostDto.city,
        incidentDate: createPostDto.incidentDate,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            isVerified: true,
            verifiedBadge: true,
          },
        },
        scamType: true,
      },
    });

    // Add badge
    await this.prisma.postBadge.create({
      data: {
        postId: post.id,
        badgeType: 'SCAM_REPORT',
        color: '#DC2626',
        label: 'Official Warning',
      },
    });

    // Add evidence if provided
    if (createPostDto.evidence && createPostDto.evidence.length > 0) {
      await this.addEvidence(post.id, createPostDto.evidence);
    }

    return this.mapToPostResponseDto(post);
  }

  // src/modules/companies/services/company-posts.service.ts

  async getCompanyPosts(
    companyId: string, // Required - position 1
    userId: string, // Required - position 2 (MUST come before any optional params)
    page: number = 1, // Optional with default - position 3
    limit: number = 20, // Optional with default - position 4
    type: string = 'ALL', // Optional with default - position 5
  ) {
    const skip = (page - 1) * limit;

    const where: any = {
      companyId,
      status: 'PUBLISHED',
      deletedAt: null,
    };

    if (type === 'AWARENESS') {
      where.postType = 'SCAM_AWARENESS';
    } else if (type === 'WARNING') {
      where.postType = 'SCAM_REPORT';
    }

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        include: {
          scamType: true,
          badges: true,
          evidences: {
            where: { evidenceType: { in: ['IMAGE', 'VIDEO'] } },
            take: 5,
          },
          company: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
              isVerified: true,
              verifiedBadge: true,
            },
          },
          _count: {
            select: {
              reactions: true,
              comments: true,
              bookmarks: true,
            },
          },
        },
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.post.count({ where }),
    ]);

    const postIds = posts.map((p) => p.id);

    // Get reaction counts
    const reactions = await this.prisma.postReaction.groupBy({
      by: ['postId', 'type'],
      where: { postId: { in: postIds } },
      _count: { type: true },
    });

    // Get bookmark counts
    const bookmarks = await this.prisma.postBookmark.groupBy({
      by: ['postId'],
      where: { postId: { in: postIds } },
      _count: { postId: true },
    });

    // Get user's reactions
    let userReactions: { postId: string; type: string }[] = [];
    let userBookmarks: { postId: string }[] = [];

    if (userId) {
      [userReactions, userBookmarks] = await Promise.all([
        this.prisma.postReaction.findMany({
          where: { postId: { in: postIds }, userId },
          select: { postId: true, type: true },
        }),
        this.prisma.postBookmark.findMany({
          where: { postId: { in: postIds }, userId },
          select: { postId: true },
        }),
      ]);
    }

    const processedPosts = posts.map((post) => {
      const postReactions = reactions.filter((r) => r.postId === post.id);
      const reactionCounts = postReactions.reduce(
        (acc, r) => ({ ...acc, [r.type]: r._count.type }),
        {} as Record<string, number>,
      );

      const postBookmark = bookmarks.find((b) => b.postId === post.id);
      const userReaction = userReactions.find((r) => r.postId === post.id);
      const hasBookmarked = userBookmarks.some((b) => b.postId === post.id);

      return {
        ...post,
        reactionCounts,
        bookmarkCount: postBookmark?._count.postId || 0,
        hasLiked: userReaction?.type === 'like',
        hasUpvoted: userReaction?.type === 'upvote',
        hasDownvoted: userReaction?.type === 'downvote',
        hasBookmarked,
      };
    });

    const data = processedPosts.map((post) => this.mapToPostResponseDto(post));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  async updatePost(
    companyId: string,
    postId: string,
    updatePostDto: UpdateCompanyPostDto,
    userId: string,
  ): Promise<PostResponseDto> {
    // Check if post exists and belongs to company
    const post = await this.prisma.post.findFirst({
      where: {
        id: postId,
        companyId,
        deletedAt: null,
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Check if user can edit (staff member who created or admin)
    const staffMember = await this.prisma.companyStaff.findFirst({
      where: {
        companyId,
        userId,
        isActive: true,
      },
    });

    if (
      !staffMember ||
      (staffMember.userId !== post.userId && staffMember.role !== 'ADMIN')
    ) {
      throw new ForbiddenException('You cannot edit this post');
    }

    // Update post
    const updatedPost = await this.prisma.post.update({
      where: { id: postId },
      data: {
        title: updatePostDto.title,
        description: updatePostDto.description,
        scamTypeId: updatePostDto.scamTypeId,
        lostAmount: updatePostDto.lostAmount,
        currency: updatePostDto.currency,
        country: updatePostDto.country,
        region: updatePostDto.region,
        city: updatePostDto.city,
        incidentDate: updatePostDto.incidentDate,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            isVerified: true,
            verifiedBadge: true,
          },
        },
        scamType: true,
        badges: true,
      },
    });

    return this.mapToPostResponseDto(updatedPost);
  }

  async deletePost(
    companyId: string,
    postId: string,
    userId: string,
  ): Promise<{ message: string }> {
    // Check if post exists and belongs to company
    const post = await this.prisma.post.findFirst({
      where: {
        id: postId,
        companyId,
        deletedAt: null,
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Check if user can delete (admin only)
    const staffMember = await this.prisma.companyStaff.findFirst({
      where: {
        companyId,
        userId,
        role: { in: ['OWNER', 'ADMIN'] },
        isActive: true,
      },
    });

    if (!staffMember) {
      throw new ForbiddenException('Only admins can delete posts');
    }

    // Soft delete
    await this.prisma.post.update({
      where: { id: postId },
      data: {
        status: 'DELETED',
        deletedAt: new Date(),
      },
    });

    return { message: 'Post deleted successfully' };
  }

  async getPostStats(
    companyId: string,
    userId: string,
    from?: string,
    to?: string,
  ) {
    // Check if user is admin
    const staffMember = await this.prisma.companyStaff.findFirst({
      where: {
        companyId,
        userId,
        role: { in: ['OWNER', 'ADMIN'] },
        isActive: true,
      },
    });

    if (!staffMember) {
      throw new ForbiddenException('Only admins can view post statistics');
    }

    const dateFilter: any = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);

    const posts = await this.prisma.post.findMany({
      where: {
        companyId,
        status: 'PUBLISHED',
        deletedAt: null,
        publishedAt: dateFilter,
      },
      include: {
        _count: {
          select: {
            reactions: true,
            comments: true,
            bookmarks: true,
          },
        },
      },
    });

    const totalReach = posts.reduce(
      (sum, p) =>
        sum + p._count.reactions + p._count.comments + p._count.bookmarks,
      0,
    );

    const byType = {
      awareness: posts.filter((p) => p.postType === 'SCAM_AWARENESS').length,
      warnings: posts.filter((p) => p.postType === 'SCAM_REPORT').length,
    };

    const avgEngagement = posts.length > 0 ? totalReach / posts.length : 0;

    return {
      totalPosts: posts.length,
      totalReach,
      averageEngagement: Math.round(avgEngagement * 10) / 10,
      byType,
      period: { from, to },
    };
  }

  private async addMedia(postId: string, media: any[]) {
    for (const [index, item] of media.entries()) {
      await this.prisma.evidence.create({
        data: {
          postId,
          evidenceType: 'IMAGE',
          fileUrl: item.url,
          fileName: item.fileName,
          fileSize: item.fileSize,
          mimeType: item.mimeType,
          orderIndex: index,
          isMasked: false,
          hasUserConsent: true,
        },
      });
    }
  }

  private async addEvidence(postId: string, evidence: any[]) {
    for (const [index, item] of evidence.entries()) {
      await this.prisma.evidence.create({
        data: {
          postId,
          evidenceType: item.type || 'IMAGE',
          fileUrl: item.url,
          phoneNumber: item.phoneNumber,
          emailAddress: item.emailAddress,
          websiteUrl: item.websiteUrl,
          orderIndex: index,
          isMasked: item.isMasked || false,
          hasUserConsent: item.hasUserConsent || true,
        },
      });
    }
  }

  private mapToPostResponseDto(post: any): PostResponseDto {
    return {
      id: post.id,
      title: post.title,
      description: post.description,
      postType: post.postType,
      status: post.status,
      // Company - return undefined if not present
      company: post.company
        ? {
            id: post.company.id,
            name: post.company.name,
            logoUrl: post.company.logoUrl || undefined,
            isVerified: post.company.isVerified || false,
            verifiedBadge: post.company.verifiedBadge || false,
          }
        : undefined,
      // ScamType - return undefined if not present
      scamType: post.scamType
        ? {
            id: post.scamType.id,
            name: post.scamType.name,
          }
        : undefined,
      // Badges - always return array
      badges: Array.isArray(post.badges)
        ? post.badges.map((badge: any) => ({
            id: badge.id,
            badgeType: badge.badgeType,
            color: badge.color,
            label: badge.label,
          }))
        : [],
      // Evidences - always return array
      evidences: Array.isArray(post.evidences)
        ? post.evidences.map((evidence: any) => ({
            id: evidence.id,
            evidenceType: evidence.evidenceType,
            fileUrl: evidence.fileUrl || undefined,
            phoneNumber: evidence.phoneNumber || undefined,
            emailAddress: evidence.emailAddress || undefined,
            websiteUrl: evidence.websiteUrl || undefined,
          }))
        : [],
      // Reaction counts - initialize as empty object
      reactionCounts: {},
      // Bookmark count - default to 0
      bookmarkCount: 0,
      // User interaction flags - default to false
      hasLiked: false,
      hasUpvoted: false,
      hasDownvoted: false,
      hasBookmarked: false,
      // Location fields - use undefined if not present
      country: post.country || undefined,
      region: post.region || undefined,
      city: post.city || undefined,
      // Dates - use undefined if not present
      publishedAt: post.publishedAt || undefined,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
  }
}
