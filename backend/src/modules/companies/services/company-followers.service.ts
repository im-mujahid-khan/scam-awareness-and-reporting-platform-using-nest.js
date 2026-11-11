// src/modules/companies/services/company-followers.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class CompanyFollowersService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async followCompany(companyId: string, userId: string): Promise<{ followed: boolean; message: string }> {
    // Check if company exists
    const company = await this.prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    try {
      // Create follow relationship
      await this.prisma.companyFollower.create({
        data: {
          companyId,
          userId
        }
      });

      // Update follower count in analytics
      await this.updateFollowerCount(companyId);

      return { followed: true, message: 'Company followed successfully' };
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('You are already following this company');
      }
      throw error;
    }
  }

  async unfollowCompany(companyId: string, userId: string): Promise<{ unfollowed: boolean; message: string }> {
    try {
      await this.prisma.companyFollower.delete({
        where: {
          companyId_userId: {
            companyId,
            userId
          }
        }
      });

      // Update follower count in analytics
      await this.updateFollowerCount(companyId);

      return { unfollowed: true, message: 'Company unfollowed successfully' };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('You are not following this company');
      }
      throw error;
    }
  }

  async getCompanyFollowers(companyId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [followers, total] = await Promise.all([
      this.prisma.companyFollower.findMany({
        where: { companyId },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
              country: true,
              region: true,
              city: true
            }
          }
        },
        orderBy: { followedAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.companyFollower.count({
        where: { companyId }
      })
    ]);

    return {
      followers: followers.map(f => ({
        id: f.user.id,
        displayName: f.user.displayName,
        firstName: f.user.firstName,
        lastName: f.user.lastName,
        avatarUrl: f.user.avatarUrl,
        country: f.user.country,
        region: f.user.region,
        city: f.user.city,
        followedAt: f.followedAt
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async isFollowing(companyId: string, userId: string): Promise<boolean> {
    const follow = await this.prisma.companyFollower.findUnique({
      where: {
        companyId_userId: {
          companyId,
          userId
        }
      }
    });
    return !!follow;
  }

  private async updateFollowerCount(companyId: string) {
    const count = await this.prisma.companyFollower.count({
      where: { companyId }
    });

    await this.prisma.companyAnalytics.upsert({
      where: { companyId },
      update: { followerCount: count },
      create: {
        companyId,
        followerCount: count,
        postReach: 0,
        engagementRate: 0,
        scamMentionCount: 0
      }
    });
  }
}