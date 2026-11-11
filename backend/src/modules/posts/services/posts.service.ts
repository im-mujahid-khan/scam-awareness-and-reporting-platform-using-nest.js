import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Post, PostType, PostStatus, User, CompanyStaff } from '@prisma/client';
import { CreatePostDto, EvidenceDto } from '../dto/create-post.dto';
import { CreateScamReportDto } from '../dto/create-scam-report.dto';
import { AdminReviewDto } from '../dto/admin-review.dto';
import { CreateAwarenessQuestionDto } from '../dto/create-awareness-question.dto';
import { UpdatePostDto } from '../dto/update-post.dto';
import { S3Service } from '../../s3/s3.service';
import * as crypto from 'crypto';

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);
  private readonly EDIT_WINDOW_MINUTES = 30; // 30 minutes edit window

  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
  ) {}

  // ==================== PUBLIC METHODS ====================

  async getScamTypes() {
    return this.prisma.scamType.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });
  }

  async getFeed(page: number = 1, limit: number = 20, userId?: string) {
    const skip = (page - 1) * limit;

    // Get posts without user-specific data
    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where: {
          status: 'PUBLISHED',
          deletedAt: null,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              avatarUrl: true,
              country: true,
              region: true,
              city: true,
              location: true,
            },
          },
          company: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
            },
          },
          scamType: true,
          badges: true,
          evidences: {
            where: {
              evidenceType: { in: ['IMAGE', 'VIDEO'] },
            },
            take: 50,
          },
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
                  firstName: true,
                  lastName: true,
                  displayName: true,
                  avatarUrl: true,
                  country: true,
                  region: true,
                  city: true,
                  location: true,
                },
              },
              replies: {
                where: {
                  isDeleted: false,
                },
                include: {
                  user: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      displayName: true,
                      avatarUrl: true,
                      country: true,
                      region: true,
                      city: true,
                      location: true,
                    },
                  },
                },
                take: 10,
                orderBy: { createdAt: 'asc' },
              },
              _count: {
                select: {
                  replies: true,
                  commentReactions: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
          },
          groupPosts: {
            include: {
              group: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  coverImageUrl: true,
                  visibility: true,
                  memberCount: true,
                  topic: true,
                  country: true,
                  region: true,
                  city: true,
                },
              },
            },
            take: 1,
          },
          _count: {
            select: {
              comments: true,
              reactions: true,
            },
          },
        },
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.post.count({
        where: {
          status: 'PUBLISHED',
          deletedAt: null,
        },
      }),
    ]);

    // Get post IDs
    const postIds = posts.map((post) => post.id);

    // Get aggregated reaction data for all posts
    const reactions = await this.prisma.postReaction.groupBy({
      by: ['postId', 'type'],
      where: {
        postId: { in: postIds },
      },
      _count: {
        type: true,
      },
    });

    // Get bookmark counts for all posts
    const bookmarks = await this.prisma.postBookmark.groupBy({
      by: ['postId'],
      where: {
        postId: { in: postIds },
      },
      _count: {
        postId: true,
      },
    });

    // Get user's reactions if userId is provided
    let userReactions: { postId: string; type: string }[] = [];
    let userBookmarks: { postId: string }[] = [];

    if (userId) {
      [userReactions, userBookmarks] = await Promise.all([
        this.prisma.postReaction.findMany({
          where: {
            postId: { in: postIds },
            userId,
          },
          select: {
            postId: true,
            type: true,
          },
        }),
        this.prisma.postBookmark.findMany({
          where: {
            postId: { in: postIds },
            userId,
          },
          select: {
            postId: true,
          },
        }),
      ]);
    }

    // Get ALL post reactions with FULL user details for all posts
    const allPostReactions = await this.prisma.postReaction.findMany({
      where: {
        postId: { in: postIds },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
            avatarUrl: true,
            country: true,
            region: true,
            city: true,
            location: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group post reactions by post ID
    const postReactionsByPostId = allPostReactions.reduce(
      (acc, reaction) => {
        if (!acc[reaction.postId]) {
          acc[reaction.postId] = [];
        }
        acc[reaction.postId].push(reaction);
        return acc;
      },
      {} as Record<string, typeof allPostReactions>,
    );

    // Get ALL post bookmarks with FULL user details for all posts
    const allPostBookmarks = await this.prisma.postBookmark.findMany({
      where: {
        postId: { in: postIds },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
            avatarUrl: true,
            country: true,
            region: true,
            city: true,
            location: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group post bookmarks by post ID
    const postBookmarksByPostId = allPostBookmarks.reduce(
      (acc, bookmark) => {
        if (!acc[bookmark.postId]) {
          acc[bookmark.postId] = [];
        }
        acc[bookmark.postId].push(bookmark);
        return acc;
      },
      {} as Record<string, typeof allPostBookmarks>,
    );

    // Get ALL comment IDs from all posts (including replies)
    const allCommentIds = posts.flatMap((post) =>
      post.comments.flatMap((comment) => [
        comment.id,
        ...comment.replies.map((reply) => reply.id),
      ]),
    );

    // Get ALL comment reactions with FULL user details for all comments across all posts
    const allCommentReactions = await this.prisma.commentReaction.findMany({
      where: {
        commentId: { in: allCommentIds },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
            avatarUrl: true,
            country: true,
            region: true,
            city: true,
            location: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group comment reactions by comment ID for O(1) lookup
    const commentReactionsByCommentId = allCommentReactions.reduce(
      (acc, reaction) => {
        if (!acc[reaction.commentId]) {
          acc[reaction.commentId] = [];
        }
        acc[reaction.commentId].push(reaction);
        return acc;
      },
      {} as Record<string, typeof allCommentReactions>,
    );

    // Pre-calculate reaction counts by type for each comment
    const commentReactionCountsByCommentId = Object.entries(
      commentReactionsByCommentId,
    ).reduce(
      (acc, [commentId, reactions]) => {
        acc[commentId] = reactions.reduce(
          (counts, reaction) => {
            counts[reaction.type] = (counts[reaction.type] || 0) + 1;
            return counts;
          },
          {} as Record<string, number>,
        );
        return acc;
      },
      {} as Record<string, Record<string, number>>,
    );

    // Get user's comment reactions if logged in
    let userCommentReactions: { commentId: string; type: string }[] = [];
    let userCommentReactionMap: Record<string, string> = {};

    if (userId && allCommentIds.length > 0) {
      userCommentReactions = await this.prisma.commentReaction.findMany({
        where: {
          commentId: { in: allCommentIds },
          userId,
        },
        select: {
          commentId: true,
          type: true,
        },
      });

      // Create a map of user's comment reactions for O(1) lookup
      userCommentReactionMap = userCommentReactions.reduce(
        (acc, reaction) => {
          acc[reaction.commentId] = reaction.type;
          return acc;
        },
        {} as Record<string, string>,
      );
    }

    // Process posts with all aggregated data and user details
    const processedPosts = posts.map((post) => {
      // Get reaction counts for this post from groupBy data
      const postReactions = reactions.filter((r) => r.postId === post.id);
      const reactionCounts = postReactions.reduce(
        (acc, reaction) => {
          acc[reaction.type] = reaction._count.type;
          return acc;
        },
        {} as Record<string, number>,
      );

      // Get bookmark count for this post
      const postBookmarks = bookmarks.find((b) => b.postId === post.id);
      const bookmarkCount = postBookmarks?._count.postId || 0;

      // Get user's reaction for this post
      const userReaction = userReactions.find((r) => r.postId === post.id);
      const userReactionType = userReaction?.type;

      // Check if user bookmarked this post
      const hasBookmarked = userBookmarks.some((b) => b.postId === post.id);

      // Get all reactions for this post with FULL user details
      const postAllReactions = postReactionsByPostId[post.id] || [];

      // Format reactions with user details
      const formattedPostReactions = postAllReactions.map((r) => ({
        id: r.id,
        type: r.type,
        createdAt: r.createdAt,
        user: r.user,
      }));

      // Get all bookmarks for this post with FULL user details
      const postAllBookmarks = postBookmarksByPostId[post.id] || [];

      // Format bookmarks with user details
      const formattedPostBookmarks = postAllBookmarks.map((b) => ({
        id: b.id,
        createdAt: b.createdAt,
        user: b.user,
      }));

      // Get group information
      const groupInfo =
        post.groupPosts.length > 0
          ? {
              id: post.groupPosts[0].group.id,
              name: post.groupPosts[0].group.name,
              slug: post.groupPosts[0].group.slug,
              coverImageUrl: post.groupPosts[0].group.coverImageUrl,
              visibility: post.groupPosts[0].group.visibility,
              memberCount: post.groupPosts[0].group.memberCount,
              topic: post.groupPosts[0].group.topic,
              country: post.groupPosts[0].group.country,
              region: post.groupPosts[0].group.region,
              city: post.groupPosts[0].group.city,
            }
          : null;

      // Process comments with FULL reaction details
      const processedComments = post.comments.map((comment) => {
        // Get all reactions for this comment
        const commentReactions = commentReactionsByCommentId[comment.id] || [];

        // Get reaction counts for this comment
        const commentReactionCounts =
          commentReactionCountsByCommentId[comment.id] || {};

        // Get recent reactions with FULL user details (limited to 5)
        const commentRecentReactions = commentReactions
          .map((cr) => ({
            id: cr.id,
            type: cr.type,
            createdAt: cr.createdAt,
            user: cr.user,
          }))
          .slice(0, 5);

        // Get user's reaction for this comment
        const userReactionType = userCommentReactionMap[comment.id];

        // Process replies with FULL reaction details
        const processedReplies = comment.replies.map((reply) => {
          // Get all reactions for this reply
          const replyReactions = commentReactionsByCommentId[reply.id] || [];

          // Get reaction counts for this reply
          const replyReactionCounts =
            commentReactionCountsByCommentId[reply.id] || {};

          // Get recent reactions with FULL user details (limited to 3)
          const replyRecentReactions = replyReactions
            .map((cr) => ({
              id: cr.id,
              type: cr.type,
              createdAt: cr.createdAt,
              user: cr.user,
            }))
            .slice(0, 3);

          const userReplyReactionType = userCommentReactionMap[reply.id];

          return {
            ...reply,
            reactionCounts: replyReactionCounts,
            recentReactions: replyRecentReactions,
            allReactions: replyReactions.map((cr) => ({
              id: cr.id,
              type: cr.type,
              createdAt: cr.createdAt,
              user: cr.user,
            })), // ALL reactions with user details
            hasLiked: userReplyReactionType === 'like',
            hasUpvoted: userReplyReactionType === 'upvote',
            hasDownvoted: userReplyReactionType === 'downvote',
          };
        });

        return {
          ...comment,
          reactionCounts: commentReactionCounts,
          recentReactions: commentRecentReactions,
          allReactions: commentReactions.map((cr) => ({
            id: cr.id,
            type: cr.type,
            createdAt: cr.createdAt,
            user: cr.user,
          })), // ALL reactions with user details
          hasLiked: userReactionType === 'like',
          hasUpvoted: userReactionType === 'upvote',
          hasDownvoted: userReactionType === 'downvote',
          replies: processedReplies,
        };
      });

      return {
        ...post,
        // Post reaction data
        reactionCounts,
        bookmarkCount,
        allReactions: formattedPostReactions, // ALL reactions with user details
        recentReactions: formattedPostReactions.slice(0, 10), // Recent 10 reactions
        allBookmarks: formattedPostBookmarks, // ALL bookmarks with user details
        recentBookmarks: formattedPostBookmarks.slice(0, 5), // Recent 5 bookmarks

        // User's interaction status
        hasLiked: userReactionType === 'like',
        hasUpvoted: userReactionType === 'upvote',
        hasDownvoted: userReactionType === 'downvote',
        hasBookmarked,

        // Comments with FULL reaction details
        comments: processedComments,

        // Group information
        groupInfo,

        // Remove internal arrays
        groupPosts: undefined,
      };
    });

    return {
      data: processedPosts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPostById(id: string, userId?: string) {
    // Get post with basic relationships
    const post = await this.prisma.post.findUnique({
      where: { id, deletedAt: null },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
            avatarUrl: true,
            country: true,
            region: true,
            city: true,
            location: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
        companyStaff: {
          include: {
            company: {
              select: {
                id: true,
                name: true,
                logoUrl: true,
              },
            },
          },
        },
        scamType: true,
        badges: true,
        evidences: true,
        comments: {
          where: {
            isDeleted: false,
            parentId: null, // Only top-level comments
            depth: { lte: 50 },
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                displayName: true,
                avatarUrl: true,
                country: true,
                region: true,
                city: true,
                location: true,
              },
            },
            _count: {
              select: {
                replies: true,
                commentReactions: true,
              },
            },
            replies: {
              where: { isDeleted: false },
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    displayName: true,
                    avatarUrl: true,
                    country: true,
                    region: true,
                    city: true,
                    location: true,
                  },
                },
                _count: {
                  select: {
                    replies: true,
                    commentReactions: true,
                  },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        groupPosts: {
          include: {
            group: {
              select: {
                id: true,
                name: true,
                slug: true,
                coverImageUrl: true,
                visibility: true,
                memberCount: true,
                topic: true,
                country: true,
                region: true,
                city: true,
              },
            },
          },
        },
        _count: {
          select: {
            comments: true,
            reactions: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Only show published posts to non-owners
    if (post.status !== 'PUBLISHED' && post.userId !== userId) {
      throw new NotFoundException('Post not found');
    }

    // Get aggregated reaction data for post
    const reactions = await this.prisma.postReaction.groupBy({
      by: ['type'],
      where: {
        postId: post.id,
      },
      _count: {
        type: true,
      },
    });

    // Get bookmark count
    const bookmarkCount = await this.prisma.postBookmark.count({
      where: {
        postId: post.id,
      },
    });

    // Get all reactions for this post with FULL user details
    const allReactions = await this.prisma.postReaction.findMany({
      where: {
        postId: post.id,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
            avatarUrl: true,
            country: true,
            region: true,
            city: true,
            location: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get all bookmarks for this post with FULL user details
    const allBookmarks = await this.prisma.postBookmark.findMany({
      where: {
        postId: post.id,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
            avatarUrl: true,
            country: true,
            region: true,
            city: true,
            location: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get user's reaction and bookmark status
    let userReactionType: string | null = null;
    let hasBookmarked = false;

    if (userId) {
      const [userReaction, userBookmark] = await Promise.all([
        this.prisma.postReaction.findFirst({
          where: {
            postId: post.id,
            userId,
          },
          select: { type: true },
        }),
        this.prisma.postBookmark.findFirst({
          where: {
            postId: post.id,
            userId,
          },
          select: { id: true },
        }),
      ]);

      userReactionType = userReaction?.type || null;
      hasBookmarked = !!userBookmark;
    }

    // Get all comment IDs (including replies)
    const allCommentIds = post.comments.flatMap((comment) => [
      comment.id,
      ...comment.replies.map((reply) => reply.id),
    ]);

    // Get ALL comment reactions with FULL user details
    const allCommentReactions = await this.prisma.commentReaction.findMany({
      where: {
        commentId: { in: allCommentIds },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
            avatarUrl: true,
            country: true,
            region: true,
            city: true,
            location: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group comment reactions by comment ID for easier access
    const commentReactionsByCommentId = allCommentReactions.reduce(
      (acc, reaction) => {
        if (!acc[reaction.commentId]) {
          acc[reaction.commentId] = [];
        }
        acc[reaction.commentId].push(reaction);
        return acc;
      },
      {} as Record<string, typeof allCommentReactions>,
    );

    // Get reaction counts by type for each comment
    const commentReactionCountsByCommentId = Object.entries(
      commentReactionsByCommentId,
    ).reduce(
      (acc, [commentId, reactions]) => {
        acc[commentId] = reactions.reduce(
          (counts, reaction) => {
            counts[reaction.type] = (counts[reaction.type] || 0) + 1;
            return counts;
          },
          {} as Record<string, number>,
        );
        return acc;
      },
      {} as Record<string, Record<string, number>>,
    );

    // Get user's comment reactions if logged in
    let userCommentReactions: { commentId: string; type: string }[] = [];
    if (userId && allCommentIds.length > 0) {
      userCommentReactions = await this.prisma.commentReaction.findMany({
        where: {
          commentId: { in: allCommentIds },
          userId,
        },
        select: {
          commentId: true,
          type: true,
        },
      });
    }

    // Create a map of user's comment reactions
    const userCommentReactionMap = userCommentReactions.reduce(
      (acc, reaction) => {
        acc[reaction.commentId] = reaction.type;
        return acc;
      },
      {} as Record<string, string>,
    );

    // Process comments with ALL reaction details
    const processedComments = post.comments.map((comment) => {
      // Get all reactions for this comment
      const commentReactions = commentReactionsByCommentId[comment.id] || [];

      // Get reaction counts for this comment
      const commentReactionCounts =
        commentReactionCountsByCommentId[comment.id] || {};

      // Get recent reactions with FULL user details (limited to 10)
      const commentRecentReactions = commentReactions
        .map((cr) => ({
          id: cr.id,
          type: cr.type,
          createdAt: cr.createdAt,
          user: cr.user,
        }))
        .slice(0, 10);

      // Find user's reaction for this comment
      const userReactionType = userCommentReactionMap[comment.id];

      // Process replies with ALL reaction details
      const processedReplies = comment.replies.map((reply) => {
        // Get all reactions for this reply
        const replyReactions = commentReactionsByCommentId[reply.id] || [];

        // Get reaction counts for this reply
        const replyReactionCounts =
          commentReactionCountsByCommentId[reply.id] || {};

        // Get recent reactions with FULL user details (limited to 5)
        const replyRecentReactions = replyReactions
          .map((cr) => ({
            id: cr.id,
            type: cr.type,
            createdAt: cr.createdAt,
            user: cr.user,
          }))
          .slice(0, 5);

        const userReplyReactionType = userCommentReactionMap[reply.id];

        return {
          ...reply,
          reactionCounts: replyReactionCounts,
          recentReactions: replyRecentReactions,
          allReactions: replyReactions.map((cr) => ({
            id: cr.id,
            type: cr.type,
            createdAt: cr.createdAt,
            user: cr.user,
          })), // Include ALL reactions with user details
          hasLiked: userReplyReactionType === 'like',
          hasUpvoted: userReplyReactionType === 'upvote',
          hasDownvoted: userReplyReactionType === 'downvote',
        };
      });

      return {
        ...comment,
        reactionCounts: commentReactionCounts,
        recentReactions: commentRecentReactions,
        allReactions: commentReactions.map((cr) => ({
          id: cr.id,
          type: cr.type,
          createdAt: cr.createdAt,
          user: cr.user,
        })), // Include ALL reactions with user details
        hasLiked: userReactionType === 'like',
        hasUpvoted: userReactionType === 'upvote',
        hasDownvoted: userReactionType === 'downvote',
        replies: processedReplies,
      };
    });

    // Aggregate reaction counts for the post
    const reactionCounts = reactions.reduce(
      (acc, reaction) => {
        acc[reaction.type] = reaction._count.type;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Format all reactions with user details
    const formattedReactions = allReactions.map((r) => ({
      id: r.id,
      type: r.type,
      createdAt: r.createdAt,
      user: r.user,
    }));

    // Format all bookmarks with user details
    const formattedBookmarks = allBookmarks.map((b) => ({
      id: b.id,
      createdAt: b.createdAt,
      user: b.user,
    }));

    // Get group information
    const groupInfo =
      post.groupPosts.length > 0
        ? {
            id: post.groupPosts[0].group.id,
            name: post.groupPosts[0].group.name,
            slug: post.groupPosts[0].group.slug,
            coverImageUrl: post.groupPosts[0].group.coverImageUrl,
            visibility: post.groupPosts[0].group.visibility,
            memberCount: post.groupPosts[0].group.memberCount,
            topic: post.groupPosts[0].group.topic,
            country: post.groupPosts[0].group.country,
            region: post.groupPosts[0].group.region,
            city: post.groupPosts[0].group.city,
          }
        : null;

    return {
      ...post,
      // Post reaction data
      reactionCounts,
      bookmarkCount,
      allReactions: formattedReactions, // All reactions with user details
      recentReactions: formattedReactions.slice(0, 10), // Recent 10 reactions
      allBookmarks: formattedBookmarks, // All bookmarks with user details
      recentBookmarks: formattedBookmarks.slice(0, 5), // Recent 5 bookmarks

      // User's interaction status
      hasLiked: userReactionType === 'like',
      hasUpvoted: userReactionType === 'upvote',
      hasDownvoted: userReactionType === 'downvote',
      hasBookmarked,

      // Processed comments with ALL reaction details
      comments: processedComments,
      groupInfo,

      // Remove internal arrays
      groupPosts: undefined,
    };
  }
  async createScamReport(userId: string, dto: CreateScamReportDto) {
    console.log('=== CREATE SCAM REPORT DEBUG ===');
    console.log('User ID:', userId);
    console.log('DTO evidence:', JSON.stringify(dto.evidence, null, 2));
    console.log('Evidence length:', dto.evidence?.length || 0);

    const user = await this.prisma.user.findUnique({
      where: { id: userId, isActive: true, isDeleted: false },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate scam type exists
    if (dto.scamTypeId) {
      const scamType = await this.prisma.scamType.findUnique({
        where: { id: dto.scamTypeId },
      });

      if (!scamType) {
        throw new BadRequestException('Invalid scam type');
      }
    }

    // Validate company exists if provided
    let companyStaff: CompanyStaff | null = null;
    if (dto.companyId) {
      const company = await this.prisma.company.findUnique({
        where: { id: dto.companyId },
      });

      if (!company) {
        throw new BadRequestException('Invalid company');
      }

      companyStaff = await this.prisma.companyStaff.findFirst({
        where: {
          companyId: dto.companyId,
          userId,
          isActive: true,
        },
      });
    }

    // CRITICAL FIX: Determine post status based on evidence
    const hasEvidence = dto.evidence && dto.evidence.length > 0;
    const status: PostStatus = hasEvidence ? 'UNDER_REVIEW' : 'PUBLISHED';

    console.log('Status determined:', status);
    console.log('Has evidence:', hasEvidence);
    console.log('Evidence array:', dto.evidence);

    // Create the post
    const post = await this.prisma.post.create({
      data: {
        title: dto.title,
        description: dto.description,
        postType: 'SCAM_REPORT',
        status, // This will be UNDER_REVIEW if hasEvidence is true
        scamTypeId: dto.scamTypeId,
        companyId: dto.companyId,
        companyNameManual: dto.companyNameManual,
        lostAmount: dto.lostAmount,
        currency: dto.currency,
        country: dto.country,
        region: dto.region,
        city: dto.city,
        incidentDate: dto.incidentDate,
        userId,
        companyStaffId: companyStaff?.id,
        isCompanyPost: !!companyStaff,
        editableUntil: new Date(
          Date.now() + this.EDIT_WINDOW_MINUTES * 60 * 1000,
        ),
        publishedAt: status === 'PUBLISHED' ? new Date() : null, // Only set if published
      },
    });

    console.log('Post created with ID:', post.id);
    console.log('Post status:', post.status);

    // Add evidence if provided
    let evidenceAdded = false;
    if (hasEvidence && dto.evidence) {
      await this.addEvidence(post.id, dto.evidence);
      evidenceAdded = true;
      console.log('Evidence added to post');
    }

    // Add badges
    await this.addBadges(post.id, evidenceAdded);

    // Create notification if under review
    if (status === 'UNDER_REVIEW') {
      await this.createNotification(
        userId,
        'POST_SUBMITTED_FOR_REVIEW',
        'Thank you for your report. Your submission includes evidence and is currently under review by our team. Once reviewed, it will appear in the newsfeed.',
        { postId: post.id },
      );
      console.log('Review notification sent');
    }

    return this.getPostById(post.id, userId);
  }

  async createAwarenessOrQuestion(
    userId: string,
    dto: CreateAwarenessQuestionDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isActive: true, isDeleted: false },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if company post and user is staff
    let companyStaff: CompanyStaff | null = null;
    if (dto.isCompanyPost) {
      // Get user's active company staff roles
      const staffRoles = await this.prisma.companyStaff.findMany({
        where: {
          userId,
          isActive: true,
          role: { in: ['ADMIN', 'EDITOR', 'STAFF'] },
        },
      });

      if (staffRoles.length === 0) {
        throw new ForbiddenException(
          'You are not authorized to create company posts',
        );
      }

      // Use the first company (or implement company selection logic)
      companyStaff = staffRoles[0];
    }

    // Create the post (always published immediately)
    const post = await this.prisma.post.create({
      data: {
        title: dto.title,
        description: dto.description,
        postType: dto.postType,
        status: 'PUBLISHED',
        userId,
        companyId: companyStaff?.companyId,
        companyStaffId: companyStaff?.id,
        isCompanyPost: !!companyStaff,
        editableUntil: new Date(
          Date.now() + this.EDIT_WINDOW_MINUTES * 60 * 1000,
        ),
        publishedAt: new Date(),
      },
    });

    // Add media if provided
    if (dto.media && dto.media.length > 0) {
      await this.addEvidence(post.id, dto.media);
    }

    // Add badge
    await this.addPostTypeBadge(post.id, dto.postType);

    return this.getPostById(post.id, userId);
  }

  // ==================== EVIDENCE HANDLING ====================

  private async addEvidence(postId: string, evidenceArray: EvidenceDto[]) {
    console.log('Adding evidence for post:', postId);
    console.log('Evidence array:', evidenceArray);

    for (const [index, evidence] of evidenceArray.entries()) {
      console.log(`Processing evidence ${index}:`, evidence);

      // For sensitive evidence types, ensure proper storage
      let originalContent: string | null = null;
      let maskedContent: string | null = null;

      switch (evidence.evidenceType) {
        case 'PHONE_NUMBER':
          if (evidence.phoneNumber) {
            // Store the masked version in phoneNumber field
            // Store original content in originalContent field for search
            originalContent = evidence.phoneNumber;

            // If user didn't consent, we still store for search but mark as masked
            if (!evidence.hasUserConsent) {
              // Store a hashed version for search without exposing the actual number
              const crypto = require('crypto');
              originalContent = crypto
                .createHash('sha256')
                .update(evidence.phoneNumber)
                .digest('hex');
            }
          }
          break;

        case 'EMAIL_ADDRESS':
          if (evidence.emailAddress) {
            originalContent = evidence.emailAddress;

            if (!evidence.hasUserConsent) {
              const crypto = require('crypto');
              originalContent = crypto
                .createHash('sha256')
                .update(evidence.emailAddress)
                .digest('hex');
            }
          }
          break;

        case 'WEBSITE':
          originalContent = evidence.websiteUrl || null;
          break;

        case 'IMAGE':
        case 'VIDEO':
        case 'PDF':
          originalContent = evidence.fileUrl || null;
          break;
      }

      // Store masked content if provided
      if (evidence.maskedContent) {
        maskedContent = evidence.maskedContent;
      }

      const evidenceData = {
        postId,
        evidenceType: evidence.evidenceType as any,
        fileUrl: evidence.fileUrl,
        websiteUrl: evidence.websiteUrl,
        phoneNumber: evidence.phoneNumber, // Store the masked version here
        emailAddress: evidence.emailAddress, // Store the masked version here
        maskedContent: maskedContent,
        originalContent: originalContent, // Store hashed/original for search
        hasUserConsent: evidence.hasUserConsent || false,
        isMasked: evidence.isMasked !== false,
        fileName: evidence.fileName,
        fileSize: evidence.fileSize,
        mimeType: evidence.mimeType,
        orderIndex: index,
      };

      console.log('Creating evidence with data:', evidenceData);

      await this.prisma.evidence.create({
        data: evidenceData,
      });
    }
  }

  // ==================== BADGES ====================

  private async addBadges(postId: string, hasEvidence: boolean) {
    const badges = [
      {
        badgeType: 'SCAM_REPORT' as any,
        color: '#DC2626', // Red
        label: 'Scam Report',
      },
    ];

    if (hasEvidence) {
      badges.push({
        badgeType: 'EVIDENCE_PROVIDED' as any,
        color: '#10B981', // Green
        label: 'Evidence Provided',
      });
    } else {
      badges.push({
        badgeType: 'NO_EVIDENCE' as any,
        color: '#6B7280', // Grey
        label: 'No Evidence',
      });
    }

    for (const badge of badges) {
      await this.prisma.postBadge.create({
        data: {
          postId,
          badgeType: badge.badgeType,
          color: badge.color,
          label: badge.label,
        },
      });
    }
  }

  private async addPostTypeBadge(postId: string, postType: PostType) {
    const badgeConfig = {
      SCAM_AWARENESS: {
        badgeType: 'SCAM_AWARENESS' as any,
        color: '#F59E0B', // Orange
        label: 'Scam Awareness',
      },
      QUESTION: {
        badgeType: 'QUESTION' as any,
        color: '#3B82F6', // Blue
        label: 'Question',
      },
    };

    const config = badgeConfig[postType];
    if (config) {
      await this.prisma.postBadge.create({
        data: {
          postId,
          badgeType: config.badgeType,
          color: config.color,
          label: config.label,
        },
      });
    }
  }

  // ==================== UPDATE & DELETE ====================

  async updatePost(userId: string, postId: string, dto: UpdatePostDto) {
    const post = await this.prisma.post.findUnique({
      where: {
        id: postId,
        deletedAt: null,
      },
      include: {
        companyStaff: true,
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Check ownership (already handled by guard, but keep for service logic)
    const canEdit = await this.canUserEditPost(userId, post);
    if (!canEdit) {
      throw new ForbiddenException('You are not authorized to edit this post');
    }

    // Check edit window
    if (post.editableUntil && new Date() > post.editableUntil) {
      throw new ForbiddenException('Edit window has expired');
    }

    // Check if post is in editable state
    if (post.status === 'DELETED') {
      throw new BadRequestException('Cannot edit deleted post');
    }

    // Update scam type if provided
    if (dto.scamTypeId) {
      const scamType = await this.prisma.scamType.findUnique({
        where: { id: dto.scamTypeId },
      });

      if (!scamType) {
        throw new BadRequestException('Invalid scam type');
      }
    }

    // Update company if provided
    let companyStaff: CompanyStaff | null = null;
    if (dto.companyId) {
      const company = await this.prisma.company.findUnique({
        where: { id: dto.companyId },
      });

      if (!company) {
        throw new BadRequestException('Invalid company');
      }

      companyStaff = await this.prisma.companyStaff.findFirst({
        where: {
          companyId: dto.companyId,
          userId,
          isActive: true,
        },
      });
    }

    // Update the post
    const updatedPost = await this.prisma.post.update({
      where: { id: postId },
      data: {
        title: dto.title,
        description: dto.description,
        scamTypeId: dto.scamTypeId,
        companyId: dto.companyId,
        companyNameManual: dto.companyNameManual,
        lostAmount: dto.lostAmount,
        currency: dto.currency,
        country: dto.country,
        region: dto.region,
        city: dto.city,
        incidentDate: dto.incidentDate,
        companyStaffId: companyStaff?.id,
        isCompanyPost: !!companyStaff,
      },
    });

    // Update evidence if provided
    if (dto.evidence) {
      // Delete existing evidence
      await this.prisma.evidence.deleteMany({
        where: { postId },
      });

      // Add new evidence
      await this.addEvidence(postId, dto.evidence);
    }

    return this.getPostById(postId, userId);
  }

  async deletePost(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({
      where: {
        id: postId,
        deletedAt: null,
      },
      include: {
        companyStaff: true,
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Check ownership (already handled by guard, but keep for service logic)
    const canDelete = await this.canUserDeletePost(userId, post);
    if (!canDelete) {
      throw new ForbiddenException(
        'You are not authorized to delete this post',
      );
    }

    // Soft delete
    await this.prisma.post.update({
      where: { id: postId },
      data: {
        status: 'DELETED',
        deletedAt: new Date(),
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE_POST',
        entityType: 'POST',
        entityId: postId,
        changes: { deletedAt: new Date().toISOString() },
      },
    });

    return { success: true, message: 'Post deleted successfully' };
  }

  // ==================== HELPER METHODS FOR EDIT/DELETE LOGIC ====================

  private async canUserEditPost(userId: string, post: any): Promise<boolean> {
    // Normal user: can edit their own posts
    if (post.userId === userId) {
      return true;
    }

    // Check if user is company staff trying to edit a company post
    if (post.isCompanyPost && post.companyStaff) {
      // Check if this staff member is the one trying to edit
      if (post.companyStaff.userId === userId) {
        // Company staff can only edit specific post types
        const allowedPostTypesForCompanyStaff = ['SCAM_AWARENESS', 'QUESTION'];

        // Company staff can also edit Scam Reports if it's a company post
        if (post.postType === 'SCAM_REPORT') {
          return true; // Company staff can edit company-created scam reports
        }

        // For other post types, check if they're in the allowed list
        return allowedPostTypesForCompanyStaff.includes(post.postType);
      }
    }

    return false;
  }

  private async canUserDeletePost(userId: string, post: any): Promise<boolean> {
    // Same logic as edit
    return this.canUserEditPost(userId, post);
  }

  // ==================== REACTIONS & BOOKMARKS ====================

  async toggleReaction(userId: string, postId: string, type: string = 'like') {
    const existingReaction = await this.prisma.postReaction.findUnique({
      where: {
        postId_userId_type: {
          postId,
          userId,
          type,
        },
      },
    });

    if (existingReaction) {
      await this.prisma.postReaction.delete({
        where: {
          postId_userId_type: {
            postId,
            userId,
            type,
          },
        },
      });
      return { reacted: false };
    } else {
      await this.prisma.postReaction.create({
        data: {
          postId,
          userId,
          type,
        },
      });
      return { reacted: true };
    }
  }

  async toggleBookmark(userId: string, postId: string) {
    const existingBookmark = await this.prisma.postBookmark.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    if (existingBookmark) {
      await this.prisma.postBookmark.delete({
        where: {
          postId_userId: {
            postId,
            userId,
          },
        },
      });
      return { bookmarked: false };
    } else {
      await this.prisma.postBookmark.create({
        data: {
          postId,
          userId,
        },
      });
      return { bookmarked: true };
    }
  }

  // ==================== ADMIN METHODS ====================

  async getPostsUnderReview(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where: {
          status: 'UNDER_REVIEW',
          deletedAt: null,
        },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
          scamType: true,
          evidences: true,
          badges: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.post.count({
        where: {
          status: 'UNDER_REVIEW',
          deletedAt: null,
        },
      }),
    ]);

    return {
      data: posts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async reviewPost(adminId: string, postId: string, dto: AdminReviewDto) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.status !== 'UNDER_REVIEW') {
      throw new BadRequestException('Post is not under review');
    }

    // Validate DTO
    if (!dto.status) {
      throw new BadRequestException('Status is required');
    }

    const validStatuses = ['PUBLISHED', 'REJECTED'];
    if (!validStatuses.includes(dto.status.toUpperCase())) {
      throw new BadRequestException(
        `Status must be one of: ${validStatuses.join(', ')}`,
      );
    }

    // Normalize status to uppercase
    const status = dto.status.toUpperCase();

    // Update post status
    const updatedPost = await this.prisma.post.update({
      where: { id: postId },
      data: {
        status: status as any,
        reviewedAt: new Date(),
        reviewedBy: adminId,
        reviewNotes: dto.reviewNotes,
        rejectionReason: dto.rejectionReason,
        ...(status === 'PUBLISHED' && {
          publishedAt: new Date(),
        }),
      },
    });

    // Update badges if published
    if (status === 'PUBLISHED') {
      // Remove any existing NO_EVIDENCE badge
      await this.prisma.postBadge.deleteMany({
        where: {
          postId,
          badgeType: 'NO_EVIDENCE',
        },
      });

      // Add EVIDENCE_PROVIDED badge if not already present
      const existingEvidenceBadge = await this.prisma.postBadge.findFirst({
        where: {
          postId,
          badgeType: 'EVIDENCE_PROVIDED',
        },
      });

      if (!existingEvidenceBadge) {
        await this.prisma.postBadge.create({
          data: {
            postId,
            badgeType: 'EVIDENCE_PROVIDED' as any,
            color: '#10B981', // Green
            label: 'Evidence Provided',
          },
        });
      }

      // Send notification to user
      await this.createNotification(
        post.userId,
        'POST_APPROVED',
        'Your scam report has been published. Thank you for helping keep the community safe.',
        { postId: post.id },
      );
    } else if (status === 'REJECTED') {
      // Send rejection notification
      await this.createNotification(
        post.userId,
        'POST_REJECTED',
        `Your scam report has been rejected.${dto.rejectionReason ? ` Reason: ${dto.rejectionReason}` : ''}`,
        { postId: post.id },
      );
    }

    return updatedPost;
  }

  // ==================== NOTIFICATION HELPER ====================

  private async createNotification(
    userId: string,
    type: string,
    message: string,
    data?: any,
  ) {
    await this.prisma.notification.create({
      data: {
        userId,
        type,
        title: 'Post Update',
        message,
        data,
      },
    });
  }

  async getUserPosts(
    userId: string,
    page: number = 1,
    limit: number = 20,
    requestingUserId?: string,
  ) {
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where: {
          userId,
          deletedAt: null,
          status: { not: 'DELETED' },
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              avatarUrl: true,
              country: true,
              region: true,
              city: true,
              location: true,
            },
          },
          company: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
            },
          },
          scamType: true,
          badges: true,
          evidences: {
            where: {
              evidenceType: { in: ['IMAGE', 'VIDEO'] },
            },
            take: 50,
          },
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
                  firstName: true,
                  lastName: true,
                  displayName: true,
                  avatarUrl: true,
                  country: true,
                  region: true,
                  city: true,
                  location: true,
                },
              },
              replies: {
                where: {
                  isDeleted: false,
                },
                include: {
                  user: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      displayName: true,
                      avatarUrl: true,
                      country: true,
                      region: true,
                      city: true,
                      location: true,
                    },
                  },
                },
                take: 10,
                orderBy: { createdAt: 'asc' },
              },
              _count: {
                select: {
                  replies: true,
                  commentReactions: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
          },
          groupPosts: {
            include: {
              group: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  coverImageUrl: true,
                  visibility: true,
                  memberCount: true,
                  topic: true,
                  country: true,
                  region: true,
                  city: true,
                },
              },
            },
            take: 1,
          },
          _count: {
            select: {
              comments: true,
              reactions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.post.count({
        where: {
          userId,
          deletedAt: null,
          status: { not: 'DELETED' },
        },
      }),
    ]);

    const postIds = posts.map((post) => post.id);

    // Get all reaction and bookmark data
    const [
      reactions,
      bookmarks,
      userReactions,
      userBookmarks,
      allPostReactions,
      allPostBookmarks,
    ] = await Promise.all([
      this.prisma.postReaction.groupBy({
        by: ['postId', 'type'],
        where: { postId: { in: postIds } },
        _count: { type: true },
      }),
      this.prisma.postBookmark.groupBy({
        by: ['postId'],
        where: { postId: { in: postIds } },
        _count: { postId: true },
      }),
      requestingUserId
        ? this.prisma.postReaction.findMany({
            where: { postId: { in: postIds }, userId: requestingUserId },
            select: { postId: true, type: true },
          })
        : [],
      requestingUserId
        ? this.prisma.postBookmark.findMany({
            where: { postId: { in: postIds }, userId: requestingUserId },
            select: { postId: true },
          })
        : [],
      this.prisma.postReaction.findMany({
        where: { postId: { in: postIds } },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              avatarUrl: true,
              country: true,
              region: true,
              city: true,
              location: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.postBookmark.findMany({
        where: { postId: { in: postIds } },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              avatarUrl: true,
              country: true,
              region: true,
              city: true,
              location: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Group post reactions and bookmarks
    const postReactionsByPostId = allPostReactions.reduce(
      (acc, r) => {
        if (!acc[r.postId]) acc[r.postId] = [];
        acc[r.postId].push(r);
        return acc;
      },
      {} as Record<string, typeof allPostReactions>,
    );

    const postBookmarksByPostId = allPostBookmarks.reduce(
      (acc, b) => {
        if (!acc[b.postId]) acc[b.postId] = [];
        acc[b.postId].push(b);
        return acc;
      },
      {} as Record<string, typeof allPostBookmarks>,
    );

    // Get all comment IDs
    const allCommentIds = posts.flatMap((post) =>
      post.comments.flatMap((comment) => [
        comment.id,
        ...comment.replies.map((reply) => reply.id),
      ]),
    );

    // Get comment reactions
    const [allCommentReactions, userCommentReactions] = await Promise.all([
      this.prisma.commentReaction.findMany({
        where: { commentId: { in: allCommentIds } },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              avatarUrl: true,
              country: true,
              region: true,
              city: true,
              location: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      requestingUserId && allCommentIds.length > 0
        ? this.prisma.commentReaction.findMany({
            where: {
              commentId: { in: allCommentIds },
              userId: requestingUserId,
            },
            select: { commentId: true, type: true },
          })
        : [],
    ]);

    // Group comment reactions
    const commentReactionsByCommentId = allCommentReactions.reduce(
      (acc, r) => {
        if (!acc[r.commentId]) acc[r.commentId] = [];
        acc[r.commentId].push(r);
        return acc;
      },
      {} as Record<string, typeof allCommentReactions>,
    );

    // Pre-calculate comment reaction counts
    const commentReactionCountsByCommentId = Object.entries(
      commentReactionsByCommentId,
    ).reduce(
      (acc, [commentId, reactions]) => {
        acc[commentId] = reactions.reduce(
          (counts, r) => {
            counts[r.type] = (counts[r.type] || 0) + 1;
            return counts;
          },
          {} as Record<string, number>,
        );
        return acc;
      },
      {} as Record<string, Record<string, number>>,
    );

    // Create user comment reaction map
    const userCommentReactionMap = (
      userCommentReactions as { commentId: string; type: string }[]
    ).reduce(
      (acc, r) => {
        acc[r.commentId] = r.type;
        return acc;
      },
      {} as Record<string, string>,
    );

    // Process posts
    const processedPosts = posts.map((post) => {
      const postReactionsData = reactions.filter((r) => r.postId === post.id);
      const reactionCounts = postReactionsData.reduce(
        (acc, r) => ({ ...acc, [r.type]: r._count.type }),
        {} as Record<string, number>,
      );

      const postBookmark = bookmarks.find((b) => b.postId === post.id);
      const bookmarkCount = postBookmark?._count.postId || 0;

      const userReaction = (
        userReactions as { postId: string; type: string }[]
      ).find((r) => r.postId === post.id);
      const userReactionType = userReaction?.type;
      const hasBookmarked = (userBookmarks as { postId: string }[]).some(
        (b) => b.postId === post.id,
      );

      const postAllReactions = postReactionsByPostId[post.id] || [];
      const formattedPostReactions = postAllReactions.map((r) => ({
        id: r.id,
        type: r.type,
        createdAt: r.createdAt,
        user: r.user,
      }));

      const postAllBookmarks = postBookmarksByPostId[post.id] || [];
      const formattedPostBookmarks = postAllBookmarks.map((b) => ({
        id: b.id,
        createdAt: b.createdAt,
        user: b.user,
      }));

      const groupInfo =
        post.groupPosts.length > 0
          ? {
              id: post.groupPosts[0].group.id,
              name: post.groupPosts[0].group.name,
              slug: post.groupPosts[0].group.slug,
              coverImageUrl: post.groupPosts[0].group.coverImageUrl,
              visibility: post.groupPosts[0].group.visibility,
              memberCount: post.groupPosts[0].group.memberCount,
              topic: post.groupPosts[0].group.topic,
              country: post.groupPosts[0].group.country,
              region: post.groupPosts[0].group.region,
              city: post.groupPosts[0].group.city,
            }
          : null;

      // Process comments
      const processedComments = post.comments.map((comment) => {
        const commentReactions = commentReactionsByCommentId[comment.id] || [];
        const commentReactionCounts =
          commentReactionCountsByCommentId[comment.id] || {};
        const commentRecentReactions = commentReactions
          .map((cr) => ({
            id: cr.id,
            type: cr.type,
            createdAt: cr.createdAt,
            user: cr.user,
          }))
          .slice(0, 5);

        const userReactionType = userCommentReactionMap[comment.id];

        const processedReplies = comment.replies.map((reply) => {
          const replyReactions = commentReactionsByCommentId[reply.id] || [];
          const replyReactionCounts =
            commentReactionCountsByCommentId[reply.id] || {};
          const replyRecentReactions = replyReactions
            .map((cr) => ({
              id: cr.id,
              type: cr.type,
              createdAt: cr.createdAt,
              user: cr.user,
            }))
            .slice(0, 3);

          const userReplyReactionType = userCommentReactionMap[reply.id];

          return {
            ...reply,
            reactionCounts: replyReactionCounts,
            recentReactions: replyRecentReactions,
            allReactions: replyReactions.map((cr) => ({
              id: cr.id,
              type: cr.type,
              createdAt: cr.createdAt,
              user: cr.user,
            })),
            hasLiked: userReplyReactionType === 'like',
            hasUpvoted: userReplyReactionType === 'upvote',
            hasDownvoted: userReplyReactionType === 'downvote',
          };
        });

        return {
          ...comment,
          reactionCounts: commentReactionCounts,
          recentReactions: commentRecentReactions,
          allReactions: commentReactions.map((cr) => ({
            id: cr.id,
            type: cr.type,
            createdAt: cr.createdAt,
            user: cr.user,
          })),
          hasLiked: userReactionType === 'like',
          hasUpvoted: userReactionType === 'upvote',
          hasDownvoted: userReactionType === 'downvote',
          replies: processedReplies,
        };
      });

      return {
        ...post,
        reactionCounts,
        bookmarkCount,
        allReactions: formattedPostReactions,
        recentReactions: formattedPostReactions.slice(0, 10),
        allBookmarks: formattedPostBookmarks,
        recentBookmarks: formattedPostBookmarks.slice(0, 5),
        hasLiked: userReactionType === 'like',
        hasUpvoted: userReactionType === 'upvote',
        hasDownvoted: userReactionType === 'downvote',
        hasBookmarked,
        comments: processedComments,
        groupInfo,
        groupPosts: undefined,
      };
    });

    return {
      data: processedPosts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getGroupPostDetails(groupId: string, postId: string, userId?: string) {
    // Check if group exists and user can access it
    const group = await this.prisma.group.findUnique({
      where: { id: groupId, isDeleted: false },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        visibility: true,
        coverImageUrl: true,
        memberCount: true,
        postCount: true,
        followerCount: true,
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Check if user is member for private groups
    if (group.visibility === 'PRIVATE' && userId) {
      const isMember = await this.prisma.groupMember.findFirst({
        where: {
          groupId,
          userId,
          status: 'ACTIVE',
          isActive: true,
        },
      });

      if (!isMember) {
        throw new ForbiddenException(
          'You must be a member to view this group post',
        );
      }
    }

    // Get group post
    const groupPost = await this.prisma.groupPost.findUnique({
      where: {
        groupId_postId: {
          groupId,
          postId,
        },
      },
      include: {
        post: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                displayName: true,
                avatarUrl: true,
                country: true,
                region: true,
                city: true,
                location: true,
              },
            },
            company: {
              select: {
                id: true,
                name: true,
                logoUrl: true,
              },
            },
            companyStaff: {
              include: {
                company: {
                  select: {
                    id: true,
                    name: true,
                    logoUrl: true,
                  },
                },
              },
            },
            scamType: true,
            badges: true,
            evidences: true,
            comments: {
              where: {
                isDeleted: false,
                parentId: null,
                depth: 0,
                groupPostId: postId, // Only comments on this group post
              },
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    displayName: true,
                    avatarUrl: true,
                    country: true,
                    region: true,
                    city: true,
                    location: true,
                  },
                },
                _count: {
                  select: {
                    replies: true,
                    commentReactions: true,
                  },
                },
                replies: {
                  where: { isDeleted: false },
                  include: {
                    user: {
                      select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        displayName: true,
                        avatarUrl: true,
                        country: true,
                        region: true,
                        city: true,
                        location: true,
                      },
                    },
                    _count: {
                      select: {
                        replies: true,
                        commentReactions: true,
                      },
                    },
                  },
                  orderBy: { createdAt: 'asc' },
                },
              },
              orderBy: { createdAt: 'desc' },
            },
            _count: {
              select: {
                comments: true,
                reactions: true,
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
            followerCount: true,
            visibility: true,
            topic: true,
            country: true,
            region: true,
            city: true,
            company: {
              select: {
                id: true,
                name: true,
                logoUrl: true,
                isVerified: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!groupPost) {
      throw new NotFoundException('Group post not found');
    }

    const post = groupPost.post;

    // Get reaction data
    const [reactions, bookmarkCount, allReactions, allBookmarks] =
      await Promise.all([
        this.prisma.postReaction.groupBy({
          by: ['type'],
          where: { postId: post.id },
          _count: { type: true },
        }),
        this.prisma.postBookmark.count({
          where: { postId: post.id },
        }),
        this.prisma.postReaction.findMany({
          where: { postId: post.id },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                displayName: true,
                avatarUrl: true,
                country: true,
                region: true,
                city: true,
                location: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.postBookmark.findMany({
          where: { postId: post.id },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                displayName: true,
                avatarUrl: true,
                country: true,
                region: true,
                city: true,
                location: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

    // Get user's reaction and bookmark status
    let userReactionType: string | null = null;
    let hasBookmarked = false;

    if (userId) {
      const [userReaction, userBookmark] = await Promise.all([
        this.prisma.postReaction.findFirst({
          where: { postId: post.id, userId },
          select: { type: true },
        }),
        this.prisma.postBookmark.findFirst({
          where: { postId: post.id, userId },
          select: { id: true },
        }),
      ]);

      userReactionType = userReaction?.type || null;
      hasBookmarked = !!userBookmark;
    }

    // Get all comment IDs
    const allCommentIds = post.comments.flatMap((comment) => [
      comment.id,
      ...comment.replies.map((reply) => reply.id),
    ]);

    // Get comment reactions
    const [allCommentReactions, userCommentReactions] = await Promise.all([
      this.prisma.commentReaction.findMany({
        where: { commentId: { in: allCommentIds } },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              avatarUrl: true,
              country: true,
              region: true,
              city: true,
              location: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      userId && allCommentIds.length > 0
        ? this.prisma.commentReaction.findMany({
            where: { commentId: { in: allCommentIds }, userId },
            select: { commentId: true, type: true },
          })
        : [],
    ]);

    // Group comment reactions
    const commentReactionsByCommentId = allCommentReactions.reduce(
      (acc, r) => {
        if (!acc[r.commentId]) acc[r.commentId] = [];
        acc[r.commentId].push(r);
        return acc;
      },
      {} as Record<string, typeof allCommentReactions>,
    );

    // Pre-calculate comment reaction counts
    const commentReactionCountsByCommentId = Object.entries(
      commentReactionsByCommentId,
    ).reduce(
      (acc, [commentId, reactions]) => {
        acc[commentId] = reactions.reduce(
          (counts, r) => {
            counts[r.type] = (counts[r.type] || 0) + 1;
            return counts;
          },
          {} as Record<string, number>,
        );
        return acc;
      },
      {} as Record<string, Record<string, number>>,
    );

    // Create user comment reaction map
    const userCommentReactionMap = (
      userCommentReactions as { commentId: string; type: string }[]
    ).reduce(
      (acc, r) => {
        acc[r.commentId] = r.type;
        return acc;
      },
      {} as Record<string, string>,
    );

    // Process comments
    const processedComments = post.comments.map((comment) => {
      const commentReactions = commentReactionsByCommentId[comment.id] || [];
      const commentReactionCounts =
        commentReactionCountsByCommentId[comment.id] || {};
      const commentRecentReactions = commentReactions
        .map((cr) => ({
          id: cr.id,
          type: cr.type,
          createdAt: cr.createdAt,
          user: cr.user,
        }))
        .slice(0, 10);

      const userReactionType = userCommentReactionMap[comment.id];

      const processedReplies = comment.replies.map((reply) => {
        const replyReactions = commentReactionsByCommentId[reply.id] || [];
        const replyReactionCounts =
          commentReactionCountsByCommentId[reply.id] || {};
        const replyRecentReactions = replyReactions
          .map((cr) => ({
            id: cr.id,
            type: cr.type,
            createdAt: cr.createdAt,
            user: cr.user,
          }))
          .slice(0, 5);

        const userReplyReactionType = userCommentReactionMap[reply.id];

        return {
          ...reply,
          reactionCounts: replyReactionCounts,
          recentReactions: replyRecentReactions,
          allReactions: replyReactions.map((cr) => ({
            id: cr.id,
            type: cr.type,
            createdAt: cr.createdAt,
            user: cr.user,
          })),
          hasLiked: userReplyReactionType === 'like',
          hasUpvoted: userReplyReactionType === 'upvote',
          hasDownvoted: userReplyReactionType === 'downvote',
        };
      });

      return {
        ...comment,
        reactionCounts: commentReactionCounts,
        recentReactions: commentRecentReactions,
        allReactions: commentReactions.map((cr) => ({
          id: cr.id,
          type: cr.type,
          createdAt: cr.createdAt,
          user: cr.user,
        })),
        hasLiked: userReactionType === 'like',
        hasUpvoted: userReactionType === 'upvote',
        hasDownvoted: userReactionType === 'downvote',
        replies: processedReplies,
      };
    });

    // Aggregate reaction counts
    const reactionCounts = reactions.reduce(
      (acc, reaction) => {
        acc[reaction.type] = reaction._count.type;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Format reactions and bookmarks
    const formattedReactions = allReactions.map((r) => ({
      id: r.id,
      type: r.type,
      createdAt: r.createdAt,
      user: r.user,
    }));

    const formattedBookmarks = allBookmarks.map((b) => ({
      id: b.id,
      createdAt: b.createdAt,
      user: b.user,
    }));

    return {
      group: groupPost.group,
      post: {
        ...post,
        reactionCounts,
        bookmarkCount,
        allReactions: formattedReactions,
        recentReactions: formattedReactions.slice(0, 10),
        allBookmarks: formattedBookmarks,
        recentBookmarks: formattedBookmarks.slice(0, 5),
        hasLiked: userReactionType === 'like',
        hasUpvoted: userReactionType === 'upvote',
        hasDownvoted: userReactionType === 'downvote',
        hasBookmarked,
        comments: processedComments,
      },
      groupPost: {
        id: groupPost.id,
        pinned: groupPost.pinned,
        createdAt: groupPost.createdAt,
        requiresApproval: groupPost.requiresApproval,
        groupModerationStatus: groupPost.groupModerationStatus,
      },
    };
  }
  /**
   * 8.1 Scam Reports Feed - Latest approved scam reports with filters
   */
  // async getScamReportsFeed(
  //   page: number = 1,
  //   limit: number = 20,
  //   userId?: string,
  //   filters?: {
  //     country?: string;
  //     region?: string;
  //     city?: string;
  //     scamTypeId?: string;
  //     fromDate?: Date;
  //     toDate?: Date;
  //     minLostAmount?: number;
  //     maxLostAmount?: number;
  //   },
  // ) {
  //   const skip = (page - 1) * limit;

  //   // Build where clause
  //   const where: any = {
  //     status: 'PUBLISHED',
  //     deletedAt: null,
  //     postType: 'SCAM_REPORT',
  //   };

  //   // Apply filters
  //   if (filters) {
  //     if (filters.country) where.country = filters.country;
  //     if (filters.region) where.region = filters.region;
  //     if (filters.city) where.city = filters.city;
  //     if (filters.scamTypeId) where.scamTypeId = filters.scamTypeId;

  //     // Date range filter
  //     if (filters.fromDate || filters.toDate) {
  //       where.incidentDate = {};
  //       if (filters.fromDate) where.incidentDate.gte = filters.fromDate;
  //       if (filters.toDate) where.incidentDate.lte = filters.toDate;
  //     }

  //     // Lost amount range
  //     if (filters.minLostAmount || filters.maxLostAmount) {
  //       where.lostAmount = {};
  //       if (filters.minLostAmount) where.lostAmount.gte = filters.minLostAmount;
  //       if (filters.maxLostAmount) where.lostAmount.lte = filters.maxLostAmount;
  //     }
  //   }

  //   // Get posts with filters
  //   const [posts, total] = await Promise.all([
  //     this.prisma.post.findMany({
  //       where,
  //       include: {
  //         user: {
  //           select: {
  //             id: true,
  //             firstName: true,
  //             lastName: true,
  //             displayName: true,
  //             avatarUrl: true,
  //             country: true,
  //             region: true,
  //             city: true,
  //             location: true,
  //           },
  //         },
  //         scamType: true,
  //         badges: true,
  //         evidences: {
  //           where: {
  //             evidenceType: { in: ['IMAGE', 'VIDEO', 'PDF'] },
  //           },
  //           take: 10,
  //         },
  //         _count: {
  //           select: {
  //             comments: true,
  //             reactions: true,
  //           },
  //         },
  //       },
  //       orderBy: { publishedAt: 'desc' },
  //       skip,
  //       take: limit,
  //     }),
  //     this.prisma.post.count({ where }),
  //   ]);

  //   // Get post IDs
  //   const postIds = posts.map((post) => post.id);

  //   // Get reaction counts and user interactions
  //   const [reactions, bookmarks, userReactions, userBookmarks] =
  //     await Promise.all([
  //       this.prisma.postReaction.groupBy({
  //         by: ['postId', 'type'],
  //         where: { postId: { in: postIds } },
  //         _count: { type: true },
  //       }),
  //       this.prisma.postBookmark.groupBy({
  //         by: ['postId'],
  //         where: { postId: { in: postIds } },
  //         _count: { postId: true },
  //       }),
  //       userId
  //         ? this.prisma.postReaction.findMany({
  //             where: { postId: { in: postIds }, userId },
  //             select: { postId: true, type: true },
  //           })
  //         : [],
  //       userId
  //         ? this.prisma.postBookmark.findMany({
  //             where: { postId: { in: postIds }, userId },
  //             select: { postId: true },
  //           })
  //         : [],
  //     ]);

  //   // Get scam identities for each post
  //   const scamIdentities = await this.getScamIdentitiesForPosts(postIds);

  //   // Process posts
  //   const processedPosts = posts.map((post) => {
  //     const postReactions = reactions.filter((r) => r.postId === post.id);
  //     const reactionCounts = postReactions.reduce(
  //       (acc, r) => ({ ...acc, [r.type]: r._count.type }),
  //       {} as Record<string, number>,
  //     );

  //     const postBookmark = bookmarks.find((b) => b.postId === post.id);
  //     // const userReaction = userReactions.find((r) => r.postId === post.id);
  //     // const hasBookmarked = userBookmarks.some((b) => b.postId === post.id);
  //     const userReaction = (
  //       userReactions as { postId: string; type: string }[]
  //     ).find((r) => r.postId === post.id);
  //     const hasBookmarked = (userBookmarks as { postId: string }[]).some(
  //       (b) => b.postId === post.id,
  //     );

  //     return {
  //       ...post,
  //       reactionCounts,
  //       bookmarkCount: postBookmark?._count.postId || 0,
  //       hasLiked: userReaction?.type === 'like',
  //       hasUpvoted: userReaction?.type === 'upvote',
  //       hasDownvoted: userReaction?.type === 'downvote',
  //       hasBookmarked,
  //       scamIdentities: scamIdentities[post.id] || [],
  //       riskScore: this.calculateRiskScore(post, scamIdentities[post.id] || []),
  //     };
  //   });

  //   return {
  //     data: processedPosts,
  //     meta: {
  //       total,
  //       page,
  //       limit,
  //       totalPages: Math.ceil(total / limit),
  //       filters: filters || {},
  //     },
  //   };
  // }
  async getScamReportsFeed(
    page: number = 1,
    limit: number = 20,
    userId?: string,
    filters?: {
      country?: string;
      region?: string;
      city?: string;
      scamTypeId?: string;
      fromDate?: Date;
      toDate?: Date;
      minLostAmount?: number;
      maxLostAmount?: number;
    },
  ) {
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      status: 'PUBLISHED',
      deletedAt: null,
      postType: 'SCAM_REPORT',
    };

    // Apply filters
    if (filters) {
      if (filters.country) where.country = filters.country;
      if (filters.region) where.region = filters.region;
      if (filters.city) where.city = filters.city;
      if (filters.scamTypeId) where.scamTypeId = filters.scamTypeId;

      if (filters.fromDate || filters.toDate) {
        where.incidentDate = {};
        if (filters.fromDate) where.incidentDate.gte = filters.fromDate;
        if (filters.toDate) where.incidentDate.lte = filters.toDate;
      }

      if (filters.minLostAmount || filters.maxLostAmount) {
        where.lostAmount = {};
        if (filters.minLostAmount) where.lostAmount.gte = filters.minLostAmount;
        if (filters.maxLostAmount) where.lostAmount.lte = filters.maxLostAmount;
      }
    }

    // Get posts
    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              avatarUrl: true,
              country: true,
              region: true,
              city: true,
              location: true,
            },
          },
          company: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
            },
          },
          scamType: true,
          badges: true,
          evidences: {
            where: {
              evidenceType: { in: ['IMAGE', 'VIDEO'] },
            },
            take: 50,
          },
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
                  firstName: true,
                  lastName: true,
                  displayName: true,
                  avatarUrl: true,
                  country: true,
                  region: true,
                  city: true,
                  location: true,
                },
              },
              replies: {
                where: {
                  isDeleted: false,
                },
                include: {
                  user: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      displayName: true,
                      avatarUrl: true,
                      country: true,
                      region: true,
                      city: true,
                      location: true,
                    },
                  },
                },
                take: 10,
                orderBy: { createdAt: 'asc' },
              },
              _count: {
                select: {
                  replies: true,
                  commentReactions: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
          },
          groupPosts: {
            include: {
              group: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  coverImageUrl: true,
                  visibility: true,
                  memberCount: true,
                  topic: true,
                  country: true,
                  region: true,
                  city: true,
                },
              },
            },
            take: 1,
          },
          _count: {
            select: {
              comments: true,
              reactions: true,
            },
          },
        },
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.post.count({ where }),
    ]);

    const postIds = posts.map((post) => post.id);

    // Get all reaction and bookmark data
    const [
      reactions,
      bookmarks,
      userReactions,
      userBookmarks,
      allPostReactions,
      allPostBookmarks,
    ] = await Promise.all([
      this.prisma.postReaction.groupBy({
        by: ['postId', 'type'],
        where: { postId: { in: postIds } },
        _count: { type: true },
      }),
      this.prisma.postBookmark.groupBy({
        by: ['postId'],
        where: { postId: { in: postIds } },
        _count: { postId: true },
      }),
      userId
        ? this.prisma.postReaction.findMany({
            where: { postId: { in: postIds }, userId },
            select: { postId: true, type: true },
          })
        : [],
      userId
        ? this.prisma.postBookmark.findMany({
            where: { postId: { in: postIds }, userId },
            select: { postId: true },
          })
        : [],
      this.prisma.postReaction.findMany({
        where: { postId: { in: postIds } },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              avatarUrl: true,
              country: true,
              region: true,
              city: true,
              location: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.postBookmark.findMany({
        where: { postId: { in: postIds } },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              avatarUrl: true,
              country: true,
              region: true,
              city: true,
              location: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Group post reactions and bookmarks
    const postReactionsByPostId = allPostReactions.reduce(
      (acc, r) => {
        if (!acc[r.postId]) acc[r.postId] = [];
        acc[r.postId].push(r);
        return acc;
      },
      {} as Record<string, typeof allPostReactions>,
    );

    const postBookmarksByPostId = allPostBookmarks.reduce(
      (acc, b) => {
        if (!acc[b.postId]) acc[b.postId] = [];
        acc[b.postId].push(b);
        return acc;
      },
      {} as Record<string, typeof allPostBookmarks>,
    );

    // Get all comment IDs
    const allCommentIds = posts.flatMap((post) =>
      post.comments.flatMap((comment) => [
        comment.id,
        ...comment.replies.map((reply) => reply.id),
      ]),
    );

    // Get comment reactions
    const [allCommentReactions, userCommentReactions] = await Promise.all([
      this.prisma.commentReaction.findMany({
        where: { commentId: { in: allCommentIds } },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              avatarUrl: true,
              country: true,
              region: true,
              city: true,
              location: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      userId && allCommentIds.length > 0
        ? this.prisma.commentReaction.findMany({
            where: { commentId: { in: allCommentIds }, userId },
            select: { commentId: true, type: true },
          })
        : [],
    ]);

    // Group comment reactions
    const commentReactionsByCommentId = allCommentReactions.reduce(
      (acc, r) => {
        if (!acc[r.commentId]) acc[r.commentId] = [];
        acc[r.commentId].push(r);
        return acc;
      },
      {} as Record<string, typeof allCommentReactions>,
    );

    // Pre-calculate comment reaction counts
    const commentReactionCountsByCommentId = Object.entries(
      commentReactionsByCommentId,
    ).reduce(
      (acc, [commentId, reactions]) => {
        acc[commentId] = reactions.reduce(
          (counts, r) => {
            counts[r.type] = (counts[r.type] || 0) + 1;
            return counts;
          },
          {} as Record<string, number>,
        );
        return acc;
      },
      {} as Record<string, Record<string, number>>,
    );

    // Create user comment reaction map
    const userCommentReactionMap = (
      userCommentReactions as { commentId: string; type: string }[]
    ).reduce(
      (acc, r) => {
        acc[r.commentId] = r.type;
        return acc;
      },
      {} as Record<string, string>,
    );

    // Process posts
    const processedPosts = posts.map((post) => {
      const postReactionsData = reactions.filter((r) => r.postId === post.id);
      const reactionCounts = postReactionsData.reduce(
        (acc, r) => ({ ...acc, [r.type]: r._count.type }),
        {} as Record<string, number>,
      );

      const postBookmark = bookmarks.find((b) => b.postId === post.id);
      const bookmarkCount = postBookmark?._count.postId || 0;

      const userReaction = (
        userReactions as { postId: string; type: string }[]
      ).find((r) => r.postId === post.id);
      const userReactionType = userReaction?.type;
      const hasBookmarked = (userBookmarks as { postId: string }[]).some(
        (b) => b.postId === post.id,
      );

      const postAllReactions = postReactionsByPostId[post.id] || [];
      const formattedPostReactions = postAllReactions.map((r) => ({
        id: r.id,
        type: r.type,
        createdAt: r.createdAt,
        user: r.user,
      }));

      const postAllBookmarks = postBookmarksByPostId[post.id] || [];
      const formattedPostBookmarks = postAllBookmarks.map((b) => ({
        id: b.id,
        createdAt: b.createdAt,
        user: b.user,
      }));

      const groupInfo =
        post.groupPosts.length > 0
          ? {
              id: post.groupPosts[0].group.id,
              name: post.groupPosts[0].group.name,
              slug: post.groupPosts[0].group.slug,
              coverImageUrl: post.groupPosts[0].group.coverImageUrl,
              visibility: post.groupPosts[0].group.visibility,
              memberCount: post.groupPosts[0].group.memberCount,
              topic: post.groupPosts[0].group.topic,
              country: post.groupPosts[0].group.country,
              region: post.groupPosts[0].group.region,
              city: post.groupPosts[0].group.city,
            }
          : null;

      // Get scam identities for this post
      const scamIdentities = this.extractScamIdentitiesFromPost(post);

      // Process comments
      const processedComments = post.comments.map((comment) => {
        const commentReactions = commentReactionsByCommentId[comment.id] || [];
        const commentReactionCounts =
          commentReactionCountsByCommentId[comment.id] || {};
        const commentRecentReactions = commentReactions
          .map((cr) => ({
            id: cr.id,
            type: cr.type,
            createdAt: cr.createdAt,
            user: cr.user,
          }))
          .slice(0, 5);

        const userReactionType = userCommentReactionMap[comment.id];

        const processedReplies = comment.replies.map((reply) => {
          const replyReactions = commentReactionsByCommentId[reply.id] || [];
          const replyReactionCounts =
            commentReactionCountsByCommentId[reply.id] || {};
          const replyRecentReactions = replyReactions
            .map((cr) => ({
              id: cr.id,
              type: cr.type,
              createdAt: cr.createdAt,
              user: cr.user,
            }))
            .slice(0, 3);

          const userReplyReactionType = userCommentReactionMap[reply.id];

          return {
            ...reply,
            reactionCounts: replyReactionCounts,
            recentReactions: replyRecentReactions,
            allReactions: replyReactions.map((cr) => ({
              id: cr.id,
              type: cr.type,
              createdAt: cr.createdAt,
              user: cr.user,
            })),
            hasLiked: userReplyReactionType === 'like',
            hasUpvoted: userReplyReactionType === 'upvote',
            hasDownvoted: userReplyReactionType === 'downvote',
          };
        });

        return {
          ...comment,
          reactionCounts: commentReactionCounts,
          recentReactions: commentRecentReactions,
          allReactions: commentReactions.map((cr) => ({
            id: cr.id,
            type: cr.type,
            createdAt: cr.createdAt,
            user: cr.user,
          })),
          hasLiked: userReactionType === 'like',
          hasUpvoted: userReactionType === 'upvote',
          hasDownvoted: userReactionType === 'downvote',
          replies: processedReplies,
        };
      });

      return {
        ...post,
        reactionCounts,
        bookmarkCount,
        allReactions: formattedPostReactions,
        recentReactions: formattedPostReactions.slice(0, 10),
        allBookmarks: formattedPostBookmarks,
        recentBookmarks: formattedPostBookmarks.slice(0, 5),
        hasLiked: userReactionType === 'like',
        hasUpvoted: userReactionType === 'upvote',
        hasDownvoted: userReactionType === 'downvote',
        hasBookmarked,
        comments: processedComments,
        groupInfo,
        scamIdentities,
        riskScore: this.calculateRiskScore(post, scamIdentities),
        groupPosts: undefined,
      };
    });

    return {
      data: processedPosts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        filters: filters || {},
      },
    };
  }
  /**
   * 8.2 Awareness Feed - Public warnings, educational posts, company posts
   */
  async getAwarenessFeed(
    page: number = 1,
    limit: number = 20,
    userId?: string,
    filters?: {
      companyId?: string;
      postType?: 'SCAM_AWARENESS' | 'QUESTION';
      includeCompanyPosts?: boolean;
    },
  ) {
    const skip = (page - 1) * limit;

    const where: any = {
      status: 'PUBLISHED',
      deletedAt: null,
      postType: { in: ['SCAM_AWARENESS', 'QUESTION'] },
    };

    if (filters) {
      if (filters.companyId) where.companyId = filters.companyId;
      if (filters.postType) where.postType = filters.postType;
      if (filters.includeCompanyPosts === false) {
        where.isCompanyPost = false;
      }
    }

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              avatarUrl: true,
              country: true,
              region: true,
              city: true,
              location: true,
            },
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
          badges: true,
          evidences: {
            where: {
              evidenceType: { in: ['IMAGE', 'VIDEO'] },
            },
            take: 50,
          },
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
                  firstName: true,
                  lastName: true,
                  displayName: true,
                  avatarUrl: true,
                  country: true,
                  region: true,
                  city: true,
                  location: true,
                },
              },
              replies: {
                where: {
                  isDeleted: false,
                },
                include: {
                  user: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      displayName: true,
                      avatarUrl: true,
                      country: true,
                      region: true,
                      city: true,
                      location: true,
                    },
                  },
                },
                take: 10,
                orderBy: { createdAt: 'asc' },
              },
              _count: {
                select: {
                  replies: true,
                  commentReactions: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
          },
          _count: {
            select: {
              comments: true,
              reactions: true,
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

    // Get all reaction and bookmark data
    const [
      reactions,
      bookmarks,
      userReactions,
      userBookmarks,
      allPostReactions,
      allPostBookmarks,
    ] = await Promise.all([
      this.prisma.postReaction.groupBy({
        by: ['postId', 'type'],
        where: { postId: { in: postIds } },
        _count: { type: true },
      }),
      this.prisma.postBookmark.groupBy({
        by: ['postId'],
        where: { postId: { in: postIds } },
        _count: { postId: true },
      }),
      userId
        ? this.prisma.postReaction.findMany({
            where: { postId: { in: postIds }, userId },
            select: { postId: true, type: true },
          })
        : [],
      userId
        ? this.prisma.postBookmark.findMany({
            where: { postId: { in: postIds }, userId },
            select: { postId: true },
          })
        : [],
      this.prisma.postReaction.findMany({
        where: { postId: { in: postIds } },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              avatarUrl: true,
              country: true,
              region: true,
              city: true,
              location: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.postBookmark.findMany({
        where: { postId: { in: postIds } },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              avatarUrl: true,
              country: true,
              region: true,
              city: true,
              location: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Group post reactions and bookmarks
    const postReactionsByPostId = allPostReactions.reduce(
      (acc, r) => {
        if (!acc[r.postId]) acc[r.postId] = [];
        acc[r.postId].push(r);
        return acc;
      },
      {} as Record<string, typeof allPostReactions>,
    );

    const postBookmarksByPostId = allPostBookmarks.reduce(
      (acc, b) => {
        if (!acc[b.postId]) acc[b.postId] = [];
        acc[b.postId].push(b);
        return acc;
      },
      {} as Record<string, typeof allPostBookmarks>,
    );

    // Get all comment IDs
    const allCommentIds = posts.flatMap((post) =>
      post.comments.flatMap((comment) => [
        comment.id,
        ...comment.replies.map((reply) => reply.id),
      ]),
    );

    // Get comment reactions
    const [allCommentReactions, userCommentReactions] = await Promise.all([
      this.prisma.commentReaction.findMany({
        where: { commentId: { in: allCommentIds } },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              avatarUrl: true,
              country: true,
              region: true,
              city: true,
              location: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      userId && allCommentIds.length > 0
        ? this.prisma.commentReaction.findMany({
            where: { commentId: { in: allCommentIds }, userId },
            select: { commentId: true, type: true },
          })
        : [],
    ]);

    // Group comment reactions
    const commentReactionsByCommentId = allCommentReactions.reduce(
      (acc, r) => {
        if (!acc[r.commentId]) acc[r.commentId] = [];
        acc[r.commentId].push(r);
        return acc;
      },
      {} as Record<string, typeof allCommentReactions>,
    );

    // Pre-calculate comment reaction counts
    const commentReactionCountsByCommentId = Object.entries(
      commentReactionsByCommentId,
    ).reduce(
      (acc, [commentId, reactions]) => {
        acc[commentId] = reactions.reduce(
          (counts, r) => {
            counts[r.type] = (counts[r.type] || 0) + 1;
            return counts;
          },
          {} as Record<string, number>,
        );
        return acc;
      },
      {} as Record<string, Record<string, number>>,
    );

    // Create user comment reaction map
    const userCommentReactionMap = (
      userCommentReactions as { commentId: string; type: string }[]
    ).reduce(
      (acc, r) => {
        acc[r.commentId] = r.type;
        return acc;
      },
      {} as Record<string, string>,
    );

    // Process posts
    const processedPosts = posts.map((post) => {
      const postReactionsData = reactions.filter((r) => r.postId === post.id);
      const reactionCounts = postReactionsData.reduce(
        (acc, r) => ({ ...acc, [r.type]: r._count.type }),
        {} as Record<string, number>,
      );

      const postBookmark = bookmarks.find((b) => b.postId === post.id);
      const bookmarkCount = postBookmark?._count.postId || 0;

      const userReaction = (
        userReactions as { postId: string; type: string }[]
      ).find((r) => r.postId === post.id);
      const userReactionType = userReaction?.type;
      const hasBookmarked = (userBookmarks as { postId: string }[]).some(
        (b) => b.postId === post.id,
      );

      const postAllReactions = postReactionsByPostId[post.id] || [];
      const formattedPostReactions = postAllReactions.map((r) => ({
        id: r.id,
        type: r.type,
        createdAt: r.createdAt,
        user: r.user,
      }));

      const postAllBookmarks = postBookmarksByPostId[post.id] || [];
      const formattedPostBookmarks = postAllBookmarks.map((b) => ({
        id: b.id,
        createdAt: b.createdAt,
        user: b.user,
      }));

      // Process comments
      const processedComments = post.comments.map((comment) => {
        const commentReactions = commentReactionsByCommentId[comment.id] || [];
        const commentReactionCounts =
          commentReactionCountsByCommentId[comment.id] || {};
        const commentRecentReactions = commentReactions
          .map((cr) => ({
            id: cr.id,
            type: cr.type,
            createdAt: cr.createdAt,
            user: cr.user,
          }))
          .slice(0, 5);

        const userReactionType = userCommentReactionMap[comment.id];

        const processedReplies = comment.replies.map((reply) => {
          const replyReactions = commentReactionsByCommentId[reply.id] || [];
          const replyReactionCounts =
            commentReactionCountsByCommentId[reply.id] || {};
          const replyRecentReactions = replyReactions
            .map((cr) => ({
              id: cr.id,
              type: cr.type,
              createdAt: cr.createdAt,
              user: cr.user,
            }))
            .slice(0, 3);

          const userReplyReactionType = userCommentReactionMap[reply.id];

          return {
            ...reply,
            reactionCounts: replyReactionCounts,
            recentReactions: replyRecentReactions,
            allReactions: replyReactions.map((cr) => ({
              id: cr.id,
              type: cr.type,
              createdAt: cr.createdAt,
              user: cr.user,
            })),
            hasLiked: userReplyReactionType === 'like',
            hasUpvoted: userReplyReactionType === 'upvote',
            hasDownvoted: userReplyReactionType === 'downvote',
          };
        });

        return {
          ...comment,
          reactionCounts: commentReactionCounts,
          recentReactions: commentRecentReactions,
          allReactions: commentReactions.map((cr) => ({
            id: cr.id,
            type: cr.type,
            createdAt: cr.createdAt,
            user: cr.user,
          })),
          hasLiked: userReactionType === 'like',
          hasUpvoted: userReactionType === 'upvote',
          hasDownvoted: userReactionType === 'downvote',
          replies: processedReplies,
        };
      });

      return {
        ...post,
        reactionCounts,
        bookmarkCount,
        allReactions: formattedPostReactions,
        recentReactions: formattedPostReactions.slice(0, 10),
        allBookmarks: formattedPostBookmarks,
        recentBookmarks: formattedPostBookmarks.slice(0, 5),
        hasLiked: userReactionType === 'like',
        hasUpvoted: userReactionType === 'upvote',
        hasDownvoted: userReactionType === 'downvote',
        hasBookmarked,
        comments: processedComments,
        isCompanyPost: !!post.company,
        companyVerified: post.company?.isVerified || false,
        groupPosts: undefined,
      };
    });

    return {
      data: processedPosts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  /**
   * 8.3 Group Feed - Posts from joined groups
   */
  async getGroupFeed(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    // Get user's active groups
    const userGroups = await this.prisma.groupMember.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        isActive: true,
      },
      select: { groupId: true },
    });

    const groupIds = userGroups.map((g) => g.groupId);

    if (groupIds.length === 0) {
      return {
        data: [],
        meta: {
          total: 0,
          page,
          limit,
          totalPages: 0,
        },
      };
    }

    // Get group posts
    const [groupPosts, total] = await Promise.all([
      this.prisma.groupPost.findMany({
        where: {
          groupId: { in: groupIds },
          groupModerationStatus: 'APPROVED',
          post: {
            status: 'PUBLISHED',
            deletedAt: null,
          },
        },
        include: {
          post: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  displayName: true,
                  avatarUrl: true,
                  country: true,
                  region: true,
                  city: true,
                  location: true,
                },
              },
              company: {
                select: {
                  id: true,
                  name: true,
                  logoUrl: true,
                },
              },
              scamType: true,
              badges: true,
              evidences: {
                where: {
                  evidenceType: { in: ['IMAGE', 'VIDEO'] },
                },
                take: 50,
              },
              comments: {
                where: {
                  isDeleted: false,
                  parentId: null,
                  depth: 0,
                  groupPostId: { not: null }, // Only group-specific comments
                },
                include: {
                  user: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      displayName: true,
                      avatarUrl: true,
                      country: true,
                      region: true,
                      city: true,
                      location: true,
                    },
                  },
                  replies: {
                    where: {
                      isDeleted: false,
                    },
                    include: {
                      user: {
                        select: {
                          id: true,
                          firstName: true,
                          lastName: true,
                          displayName: true,
                          avatarUrl: true,
                          country: true,
                          region: true,
                          city: true,
                          location: true,
                        },
                      },
                    },
                    take: 10,
                    orderBy: { createdAt: 'asc' },
                  },
                  _count: {
                    select: {
                      replies: true,
                      commentReactions: true,
                    },
                  },
                },
                orderBy: { createdAt: 'desc' },
                take: 50,
              },
              _count: {
                select: {
                  comments: true,
                  reactions: true,
                },
              },
            },
          },
          group: {
            select: {
              id: true,
              name: true,
              slug: true,
              coverImageUrl: true,
              visibility: true,
              memberCount: true,
              topic: true,
              country: true,
              region: true,
              city: true,
            },
          },
        },
        orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.groupPost.count({
        where: {
          groupId: { in: groupIds },
          groupModerationStatus: 'APPROVED',
          post: { status: 'PUBLISHED', deletedAt: null },
        },
      }),
    ]);

    const postIds = groupPosts.map((gp) => gp.postId);

    // Get all reaction and bookmark data
    const [
      reactions,
      bookmarks,
      userReactions,
      userBookmarks,
      allPostReactions,
      allPostBookmarks,
    ] = await Promise.all([
      this.prisma.postReaction.groupBy({
        by: ['postId', 'type'],
        where: { postId: { in: postIds } },
        _count: { type: true },
      }),
      this.prisma.postBookmark.groupBy({
        by: ['postId'],
        where: { postId: { in: postIds } },
        _count: { postId: true },
      }),
      this.prisma.postReaction.findMany({
        where: { postId: { in: postIds }, userId },
        select: { postId: true, type: true },
      }),
      this.prisma.postBookmark.findMany({
        where: { postId: { in: postIds }, userId },
        select: { postId: true },
      }),
      this.prisma.postReaction.findMany({
        where: { postId: { in: postIds } },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              avatarUrl: true,
              country: true,
              region: true,
              city: true,
              location: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.postBookmark.findMany({
        where: { postId: { in: postIds } },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              avatarUrl: true,
              country: true,
              region: true,
              city: true,
              location: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Group post reactions and bookmarks
    const postReactionsByPostId = allPostReactions.reduce(
      (acc, r) => {
        if (!acc[r.postId]) acc[r.postId] = [];
        acc[r.postId].push(r);
        return acc;
      },
      {} as Record<string, typeof allPostReactions>,
    );

    const postBookmarksByPostId = allPostBookmarks.reduce(
      (acc, b) => {
        if (!acc[b.postId]) acc[b.postId] = [];
        acc[b.postId].push(b);
        return acc;
      },
      {} as Record<string, typeof allPostBookmarks>,
    );

    // Get all comment IDs
    const allCommentIds = groupPosts.flatMap((gp) =>
      gp.post.comments.flatMap((comment) => [
        comment.id,
        ...comment.replies.map((reply) => reply.id),
      ]),
    );

    // Get comment reactions
    const [allCommentReactions, userCommentReactions] = await Promise.all([
      this.prisma.commentReaction.findMany({
        where: { commentId: { in: allCommentIds } },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              avatarUrl: true,
              country: true,
              region: true,
              city: true,
              location: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.commentReaction.findMany({
        where: { commentId: { in: allCommentIds }, userId },
        select: { commentId: true, type: true },
      }),
    ]);

    // Group comment reactions
    const commentReactionsByCommentId = allCommentReactions.reduce(
      (acc, r) => {
        if (!acc[r.commentId]) acc[r.commentId] = [];
        acc[r.commentId].push(r);
        return acc;
      },
      {} as Record<string, typeof allCommentReactions>,
    );

    // Pre-calculate comment reaction counts
    const commentReactionCountsByCommentId = Object.entries(
      commentReactionsByCommentId,
    ).reduce(
      (acc, [commentId, reactions]) => {
        acc[commentId] = reactions.reduce(
          (counts, r) => {
            counts[r.type] = (counts[r.type] || 0) + 1;
            return counts;
          },
          {} as Record<string, number>,
        );
        return acc;
      },
      {} as Record<string, Record<string, number>>,
    );

    // Create user comment reaction map
    const userCommentReactionMap = userCommentReactions.reduce(
      (acc, r) => {
        acc[r.commentId] = r.type;
        return acc;
      },
      {} as Record<string, string>,
    );

    // Process group posts
    const processedPosts = groupPosts.map((groupPost) => {
      const post = groupPost.post;

      const postReactionsData = reactions.filter((r) => r.postId === post.id);
      const reactionCounts = postReactionsData.reduce(
        (acc, r) => ({ ...acc, [r.type]: r._count.type }),
        {} as Record<string, number>,
      );

      const postBookmark = bookmarks.find((b) => b.postId === post.id);
      const bookmarkCount = postBookmark?._count.postId || 0;

      const userReaction = userReactions.find((r) => r.postId === post.id);
      const userReactionType = userReaction?.type;
      const hasBookmarked = userBookmarks.some((b) => b.postId === post.id);

      const postAllReactions = postReactionsByPostId[post.id] || [];
      const formattedPostReactions = postAllReactions.map((r) => ({
        id: r.id,
        type: r.type,
        createdAt: r.createdAt,
        user: r.user,
      }));

      const postAllBookmarks = postBookmarksByPostId[post.id] || [];
      const formattedPostBookmarks = postAllBookmarks.map((b) => ({
        id: b.id,
        createdAt: b.createdAt,
        user: b.user,
      }));

      // Process comments
      const processedComments = post.comments.map((comment) => {
        const commentReactions = commentReactionsByCommentId[comment.id] || [];
        const commentReactionCounts =
          commentReactionCountsByCommentId[comment.id] || {};
        const commentRecentReactions = commentReactions
          .map((cr) => ({
            id: cr.id,
            type: cr.type,
            createdAt: cr.createdAt,
            user: cr.user,
          }))
          .slice(0, 5);

        const userReactionType = userCommentReactionMap[comment.id];

        const processedReplies = comment.replies.map((reply) => {
          const replyReactions = commentReactionsByCommentId[reply.id] || [];
          const replyReactionCounts =
            commentReactionCountsByCommentId[reply.id] || {};
          const replyRecentReactions = replyReactions
            .map((cr) => ({
              id: cr.id,
              type: cr.type,
              createdAt: cr.createdAt,
              user: cr.user,
            }))
            .slice(0, 3);

          const userReplyReactionType = userCommentReactionMap[reply.id];

          return {
            ...reply,
            reactionCounts: replyReactionCounts,
            recentReactions: replyRecentReactions,
            allReactions: replyReactions.map((cr) => ({
              id: cr.id,
              type: cr.type,
              createdAt: cr.createdAt,
              user: cr.user,
            })),
            hasLiked: userReplyReactionType === 'like',
            hasUpvoted: userReplyReactionType === 'upvote',
            hasDownvoted: userReplyReactionType === 'downvote',
          };
        });

        return {
          ...comment,
          reactionCounts: commentReactionCounts,
          recentReactions: commentRecentReactions,
          allReactions: commentReactions.map((cr) => ({
            id: cr.id,
            type: cr.type,
            createdAt: cr.createdAt,
            user: cr.user,
          })),
          hasLiked: userReactionType === 'like',
          hasUpvoted: userReactionType === 'upvote',
          hasDownvoted: userReactionType === 'downvote',
          replies: processedReplies,
        };
      });

      return {
        ...post,
        group: groupPost.group,
        groupPost: {
          id: groupPost.id,
          pinned: groupPost.pinned,
          createdAt: groupPost.createdAt,
        },
        reactionCounts,
        bookmarkCount,
        allReactions: formattedPostReactions,
        recentReactions: formattedPostReactions.slice(0, 10),
        allBookmarks: formattedPostBookmarks,
        recentBookmarks: formattedPostBookmarks.slice(0, 5),
        hasLiked: userReactionType === 'like',
        hasUpvoted: userReactionType === 'upvote',
        hasDownvoted: userReactionType === 'downvote',
        hasBookmarked,
        comments: processedComments,
        groupPosts: undefined,
      };
    });

    return {
      data: processedPosts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  /**
   * 8.4 Discover Section - All discovery features
   */
  async getDiscoverSection(userId?: string) {
    const [
      trendingCategories,
      viralAlerts,
      popularGroups,
      suggestedCompanies,
      recentIdentities,
    ] = await Promise.all([
      this.getTrendingScamCategories(),
      this.getViralScamAlerts(),
      this.getPopularGroups(),
      this.getSuggestedCompanies(userId),
      this.getRecentlyReportedIdentities(),
    ]);

    return {
      trendingCategories,
      viralAlerts,
      popularGroups,
      suggestedCompanies,
      recentIdentities,
    };
  }

  // ==================== DISCOVERY HELPER METHODS ====================

  /**
   * Trending scam categories - based on report volume in last 7 days
   */
  async getTrendingScamCategories(limit: number = 10) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const trending = await this.prisma.scamType.findMany({
      where: {
        isActive: true,
        posts: {
          some: {
            status: 'PUBLISHED',
            publishedAt: { gte: sevenDaysAgo },
            postType: 'SCAM_REPORT',
          },
        },
      },
      include: {
        _count: {
          select: {
            posts: {
              where: {
                status: 'PUBLISHED',
                publishedAt: { gte: sevenDaysAgo },
                postType: 'SCAM_REPORT',
              },
            },
          },
        },
      },
      orderBy: {
        posts: {
          _count: 'desc',
        },
      },
      take: limit,
    });

    // Calculate trend percentage
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const previousPeriodCounts = await Promise.all(
      trending.map(async (category) => {
        const count = await this.prisma.post.count({
          where: {
            scamTypeId: category.id,
            status: 'PUBLISHED',
            publishedAt: {
              gte: fourteenDaysAgo,
              lt: sevenDaysAgo,
            },
            postType: 'SCAM_REPORT',
          },
        });
        return { id: category.id, count };
      }),
    );

    const previousCountMap = previousPeriodCounts.reduce(
      (acc, { id, count }) => ({ ...acc, [id]: count }),
      {} as Record<string, number>,
    );

    return trending.map((category) => {
      const currentCount = category._count.posts;
      const previousCount = previousCountMap[category.id] || 0;
      const trend =
        previousCount === 0
          ? 100
          : ((currentCount - previousCount) / previousCount) * 100;

      return {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        reportCount: currentCount,
        trend: Math.round(trend * 10) / 10,
        isSpiking: trend > 50,
      };
    });
  }

  /**
   * Viral scam alerts - Most engaged scam reports in last 24 hours
   */
  async getViralScamAlerts(limit: number = 5) {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const viralPosts = await this.prisma.post.findMany({
      where: {
        status: 'PUBLISHED',
        postType: 'SCAM_REPORT',
        publishedAt: { gte: twentyFourHoursAgo },
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        scamType: true,
        _count: {
          select: {
            reactions: true,
            comments: true,
            bookmarks: true,
          },
        },
      },
      orderBy: [
        { reactions: { _count: 'desc' } },
        { comments: { _count: 'desc' } },
      ],
      take: limit,
    });

    return viralPosts.map((post) => ({
      id: post.id,
      title: post.title,
      scamType: post.scamType?.name || 'Uncategorized',
      engagement: {
        reactions: post._count.reactions,
        comments: post._count.comments,
        bookmarks: post._count.bookmarks,
      },
      author: post.user,
      publishedAt: post.publishedAt,
    }));
  }

  /**
   * Popular groups - Based on member count and activity
   */
  async getPopularGroups(limit: number = 10) {
    const groups = await this.prisma.group.findMany({
      where: {
        isDeleted: false,
        isActive: true,
        visibility: 'PUBLIC',
      },
      include: {
        _count: {
          select: {
            members: {
              where: { status: 'ACTIVE', isActive: true },
            },
            groupPosts: {
              where: {
                groupModerationStatus: 'APPROVED',
                post: { status: 'PUBLISHED' },
              },
            },
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
      orderBy: [{ memberCount: 'desc' }, { postCount: 'desc' }],
      take: limit,
    });

    return groups.map((group) => ({
      id: group.id,
      name: group.name,
      slug: group.slug,
      description: group.description,
      coverImageUrl: group.coverImageUrl,
      topic: group.topic,
      memberCount: group._count.members,
      postCount: group._count.groupPosts,
      followerCount: group._count.follows,
      isOfficial: !!group.company,
      company: group.company,
    }));
  }

  /**
   * Suggested companies - For users to follow
   */
  async getSuggestedCompanies(userId?: string, limit: number = 8) {
    // Get verified companies with activity
    const companies = await this.prisma.company.findMany({
      where: {
        isVerified: true,
        verificationStatus: 'VERIFIED',
      },
      include: {
        _count: {
          select: {
            followers: true,
            posts: {
              where: {
                status: 'PUBLISHED',
                deletedAt: null,
              },
            },
          },
        },
      },
      orderBy: [
        { followers: { _count: 'desc' } },
        { posts: { _count: 'desc' } },
      ],
      take: limit,
    });

    // Check if user already follows these companies
    let userFollows: Set<string> = new Set();
    if (userId) {
      const follows = await this.prisma.companyFollower.findMany({
        where: {
          userId,
          companyId: { in: companies.map((c) => c.id) },
        },
        select: { companyId: true },
      });
      userFollows = new Set(follows.map((f) => f.companyId));
    }

    return companies.map((company) => ({
      id: company.id,
      name: company.name,
      logoUrl: company.logoUrl,
      bannerUrl: company.bannerUrl,
      industry: company.industry,
      description: company.description?.substring(0, 100) + '...',
      isVerified: company.isVerified,
      followerCount: company._count.followers,
      postCount: company._count.posts,
      isFollowed: userFollows.has(company.id),
    }));
  }

  /**
   * Recently reported scam identities
   */
  async getRecentlyReportedIdentities(limit: number = 10) {
    const recentEvidences = await this.prisma.evidence.findMany({
      where: {
        evidenceType: {
          in: ['PHONE_NUMBER', 'EMAIL_ADDRESS', 'WEBSITE'],
        },
        post: {
          status: 'PUBLISHED',
          deletedAt: null,
        },
      },
      select: {
        id: true,
        evidenceType: true,
        phoneNumber: true,
        emailAddress: true,
        websiteUrl: true,
        maskedContent: true,
        createdAt: true,
        post: {
          select: {
            id: true,
            title: true,
            scamType: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Group by identity and get unique recent reports
    const identityMap = new Map();

    recentEvidences.forEach((evidence) => {
      let identity: string | null = null;
      let type: string | null = null;
      let displayValue: string | null = null;

      if (evidence.phoneNumber) {
        identity = evidence.phoneNumber;
        type = 'PHONE_NUMBER';
        displayValue = this.maskPhoneNumber(evidence.phoneNumber);
      } else if (evidence.emailAddress) {
        identity = evidence.emailAddress;
        type = 'EMAIL_ADDRESS';
        displayValue = this.maskEmail(evidence.emailAddress);
      } else if (evidence.websiteUrl) {
        identity = evidence.websiteUrl;
        type = 'WEBSITE';
        displayValue = evidence.websiteUrl;
      }

      if (identity && !identityMap.has(identity)) {
        identityMap.set(identity, {
          identity,
          type,
          displayValue,
          reportCount: 1,
          firstReported: evidence.createdAt,
          lastReported: evidence.createdAt,
          recentPost: {
            id: evidence.post.id,
            title: evidence.post.title,
            scamType: evidence.post.scamType,
          },
        });
      } else if (identity) {
        const existing = identityMap.get(identity);
        existing.reportCount += 1;
        existing.lastReported = evidence.createdAt;
      }
    });

    return Array.from(identityMap.values())
      .sort((a, b) => b.lastReported.getTime() - a.lastReported.getTime())
      .slice(0, limit);
  }

  private extractScamIdentitiesFromPost(post: any): any[] {
    const identities: any[] = [];

    if (post.evidences) {
      post.evidences.forEach((evidence: any) => {
        if (evidence.phoneNumber) {
          identities.push({
            type: 'PHONE_NUMBER',
            value: evidence.phoneNumber,
            masked: this.maskPhoneNumber(evidence.phoneNumber),
          });
        } else if (evidence.emailAddress) {
          identities.push({
            type: 'EMAIL_ADDRESS',
            value: evidence.emailAddress,
            masked: this.maskEmail(evidence.emailAddress),
          });
        } else if (evidence.websiteUrl) {
          identities.push({
            type: 'WEBSITE',
            value: evidence.websiteUrl,
            masked: evidence.websiteUrl,
          });
        }
      });
    }

    return identities;
  }

  private maskPhoneNumber(phoneNumber: string): string {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length <= 4) return phoneNumber;
    const last4 = cleaned.slice(-4);
    return `***-***-${last4}`;
  }

  private maskEmail(email: string): string {
    const [localPart, domain] = email.split('@');
    if (!domain) return email;
    const maskedLocal =
      localPart.length > 2
        ? localPart.slice(0, 2) + '***' + localPart.slice(-1)
        : localPart + '***';
    return `${maskedLocal}@${domain}`;
  }

  private calculateRiskScore(
    post: any,
    identities: any[],
  ): {
    score: number;
    level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    factors: string[];
  } {
    let score = 0;
    const factors: string[] = [];

    if (post.evidences?.length > 0) {
      score += 30;
      factors.push('Has supporting evidence');
    }

    if (post.lostAmount) {
      if (post.lostAmount > 1000) {
        score += 25;
        factors.push(`Financial loss: $${post.lostAmount}`);
      } else {
        score += 15;
        factors.push('Financial loss reported');
      }
    }

    if (identities.length > 0) {
      score += Math.min(identities.length * 10, 30);
      factors.push(`${identities.length} scam identities reported`);
    }

    const daysSinceReport = Math.floor(
      (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceReport < 7) {
      score += 15;
      factors.push('Recently reported');
    }

    let level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    if (score >= 80) level = 'CRITICAL';
    else if (score >= 60) level = 'HIGH';
    else if (score >= 40) level = 'MEDIUM';
    else level = 'LOW';

    return { score, level, factors };
  }
}
