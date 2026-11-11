import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class DiscoveryService {
  constructor(private prisma: PrismaService) {}

  // Discover Posts
  async discoverPosts(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const posts = await this.prisma.post.findMany({
      where: {
        status: 'PUBLISHED',
        deletedAt: null,
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
          select: { comments: true, reactions: true, bookmarks: true },
        },
      },
      orderBy: [
        { createdAt: 'desc' }, // Recent first
      ],
      skip,
      take: limit,
    });

    const total = await this.prisma.post.count({
      where: {
        status: 'PUBLISHED',
        deletedAt: null,
      },
    });

    return {
      data: posts,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Discover Companies
  async discoverCompanies(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const companies = await this.prisma.company.findMany({
      where: {
        isVerified: true,
      },
      include: {
        _count: {
          select: { staff: true, posts: true },
        },
      },
      orderBy: [
        { verifiedAt: 'desc' }, // Recently verified
      ],
      skip,
      take: limit,
    });

    const total = await this.prisma.company.count({
      where: {
        isVerified: true,
      },
    });

    return {
      data: companies,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}