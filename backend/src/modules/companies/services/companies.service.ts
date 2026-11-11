// src/modules/companies/services/companies.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateCompanyDto } from '../dto/create-company.dto';
import { UpdateCompanyDto } from '../dto/update-company.dto';
import { CompanyResponseDto } from '../dto/company-response.dto';

@Injectable()
export class CompaniesService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  // ==================== GET ALL COMPANIES METHODS ====================

  async getAllCompanies(skip: number = 0, take: number = 10): Promise<any[]> {
    try {
      const companies = await this.prisma.company.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              staff: {
                where: { isActive: true },
              },
            },
          },
        },
      });

      return companies.map((company) => ({
        id: company.id,
        name: company.name,
        email: company.email,
        phone: company.phone,
        website: company.website,
        industry: company.industry,
        description: company.description,
        logoUrl: company.logoUrl,
        bannerUrl: company.bannerUrl,
        isVerified: company.isVerified || false,
        verificationStatus: company.verificationStatus || 'PENDING',
        verificationDocs: this.parseVerificationDocs(company.verificationDocs),
        verifiedBadge: company.verifiedBadge || false,
        verificationNotes: company.verificationNotes,
        contactName: company.contactName,
        contactEmail: company.contactEmail,
        contactPhone: company.contactPhone,
        staffCount: company._count?.staff || 0,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
      }));
    } catch (error) {
      console.error('Error getting all companies:', error);
      return [];
    }
  }

  async getAllCompaniesCount(): Promise<number> {
    try {
      return await this.prisma.company.count();
    } catch (error) {
      console.error('Error counting companies:', error);
      return 0;
    }
  }

  // ==================== EXISTING METHODS ====================

  async createCompany(
    userId: string,
    createCompanyDto: CreateCompanyDto,
  ): Promise<any> {
    console.log('Creating company for user:', userId);

    // Check if company name already exists
    const existingCompany = await this.prisma.company.findUnique({
      where: { name: createCompanyDto.name },
    });

    if (existingCompany) {
      throw new ConflictException('Company name already exists');
    }

    // Check if company email already exists
    const existingEmail = await this.prisma.company.findUnique({
      where: { email: createCompanyDto.email },
    });

    if (existingEmail) {
      throw new ConflictException('Company email already exists');
    }

    // Create company and add creator as OWNER
    const company = await this.prisma.$transaction(async (prisma) => {
      const newCompany = await prisma.company.create({
        data: {
          ...createCompanyDto,
          isVerified: false,
          verificationStatus: 'PENDING',
          verificationDocs: createCompanyDto.verificationDocs || [],
          verifiedBadge: false,
        },
      });

      // Add creator as OWNER staff member
      await prisma.companyStaff.create({
        data: {
          companyId: newCompany.id,
          userId: userId,
          role: 'OWNER',
          permissions: ['*'], // Owner has all permissions
          isActive: true,
        },
      });

      return newCompany;
    });

    return {
      id: company.id,
      name: company.name,
      email: company.email,
      phone: company.phone,
      website: company.website,
      industry: company.industry,
      description: company.description,
      logoUrl: company.logoUrl,
      bannerUrl: company.bannerUrl,
      isVerified: company.isVerified || false,
      verificationStatus: company.verificationStatus || 'PENDING',
      verificationDocs: this.parseVerificationDocs(company.verificationDocs),
      verifiedBadge: company.verifiedBadge || false,
      verificationNotes: company.verificationNotes,
      contactName: company.contactName,
      contactEmail: company.contactEmail,
      contactPhone: company.contactPhone,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
      staffCount: 1,
      isOwner: true,
      userRole: 'OWNER',
    };
  }

  async findCompanyById(id: string, userId?: string): Promise<any> {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        staff: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        // Note: followers count might not exist yet in schema
      },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const userRole =
      company.staff.find((staff) => staff.userId === userId)?.role || 'NONE';

    return {
      id: company.id,
      name: company.name,
      email: company.email,
      phone: company.phone,
      website: company.website,
      industry: company.industry,
      description: company.description,
      logoUrl: company.logoUrl,
      bannerUrl: company.bannerUrl,
      isVerified: company.isVerified || false,
      verificationStatus: company.verificationStatus || 'PENDING',
      verificationDocs: this.parseVerificationDocs(company.verificationDocs),
      verifiedBadge: company.verifiedBadge || false,
      verificationNotes: company.verificationNotes,
      contactName: company.contactName,
      contactEmail: company.contactEmail,
      contactPhone: company.contactPhone,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
      staffCount: company.staff.length,
      followerCount: 0, // Placeholder until followers schema is added
      isOwner: userRole === 'OWNER',
      userRole: userRole,
    };
  }

  async updateCompany(
    companyId: string,
    updateCompanyDto: UpdateCompanyDto,
    userId: string,
  ): Promise<any> {
    // Check if user is owner/admin
    const staffRecord = await this.prisma.companyStaff.findFirst({
      where: {
        companyId,
        userId,
        role: { in: ['OWNER', 'ADMIN'] },
        isActive: true,
      },
    });

    if (!staffRecord) {
      throw new ForbiddenException(
        'Only company owners and admins can update company profile',
      );
    }

    // Check for unique constraints
    if (updateCompanyDto.name) {
      const existingName = await this.prisma.company.findFirst({
        where: {
          name: updateCompanyDto.name,
          id: { not: companyId },
        },
      });

      if (existingName) {
        throw new ConflictException('Company name already exists');
      }
    }

    if (updateCompanyDto.email) {
      const existingEmail = await this.prisma.company.findFirst({
        where: {
          email: updateCompanyDto.email,
          id: { not: companyId },
        },
      });

      if (existingEmail) {
        throw new ConflictException('Company email already exists');
      }
    }

    // Get current company to handle verification docs
    const currentCompany = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { verificationDocs: true },
    });

    let updatedData: any = { ...updateCompanyDto };

    // Handle verification document updates
    if (currentCompany && currentCompany.verificationDocs) {
      let verificationDocs =
        this.parseVerificationDocs(currentCompany.verificationDocs) || [];

      // Add new documents
      if (
        updateCompanyDto.addVerificationDocs &&
        Array.isArray(updateCompanyDto.addVerificationDocs)
      ) {
        verificationDocs = [
          ...verificationDocs,
          ...updateCompanyDto.addVerificationDocs,
        ];
      }

      // Remove documents
      if (
        updateCompanyDto.removeVerificationDocs &&
        Array.isArray(updateCompanyDto.removeVerificationDocs)
      ) {
        verificationDocs = verificationDocs.filter(
          (doc: string) =>
            !updateCompanyDto.removeVerificationDocs!.includes(doc),
        );
      }

      // Remove duplicates and ensure it's an array of strings
      verificationDocs = Array.from(new Set(verificationDocs.filter(Boolean)));

      updatedData.verificationDocs = verificationDocs;

      // Remove temporary fields before updating
      delete updatedData.addVerificationDocs;
      delete updatedData.removeVerificationDocs;
    }

    const updatedCompany = await this.prisma.company.update({
      where: { id: companyId },
      data: updatedData,
    });

    return this.findCompanyById(companyId, userId);
  }

  async getUserCompanies(userId: string): Promise<any[]> {
    const staffRecords = await this.prisma.companyStaff.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        company: true,
      },
    });

    return staffRecords.map((record) => ({
      ...record.company,
      isVerified: record.company.isVerified || false,
      verificationStatus: record.company.verificationStatus || 'PENDING',
      verificationDocs: this.parseVerificationDocs(
        record.company.verificationDocs,
      ),
      verifiedBadge: record.company.verifiedBadge || false,
      role: record.role,
      joinedAt: record.joinedAt,
      permissions: record.permissions,
    }));
  }

  async isUserCompanyStaff(
    companyId: string,
    userId: string,
  ): Promise<boolean> {
    const staff = await this.prisma.companyStaff.findFirst({
      where: {
        companyId,
        userId,
        isActive: true,
      },
    });

    return !!staff;
  }

  async getUserRoleInCompany(
    companyId: string,
    userId: string,
  ): Promise<string> {
    const staff = await this.prisma.companyStaff.findFirst({
      where: {
        companyId,
        userId,
        isActive: true,
      },
    });

    return staff?.role || 'NONE';
  }

  // ==================== HELPER METHODS ====================

  /**
   * Parse verification docs from Prisma Json type to string array
   */
  private parseVerificationDocs(verificationDocs: any): string[] {
    if (!verificationDocs) return [];

    if (Array.isArray(verificationDocs)) {
      return verificationDocs.filter(
        (item): item is string => typeof item === 'string',
      );
    }

    // Handle string or JSON string
    if (typeof verificationDocs === 'string') {
      try {
        const parsed = JSON.parse(verificationDocs);
        return Array.isArray(parsed)
          ? parsed.filter((item): item is string => typeof item === 'string')
          : [];
      } catch {
        return [];
      }
    }

    return [];
  }

  // ==================== NEW STAFF MANAGEMENT METHODS ====================

  async addStaffMember(
    companyId: string,
    userEmail: string,
    role: string,
    requesterUserId: string,
  ): Promise<any> {
    // Check if company exists
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Check if requester is ADMIN or OWNER
    const requesterRole = await this.getUserRoleInCompany(
      companyId,
      requesterUserId,
    );
    if (requesterRole !== 'ADMIN' && requesterRole !== 'OWNER') {
      throw new ForbiddenException('Only company administrators can add staff');
    }

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: userEmail },
      select: {
        id: true,
        email: true,
        displayName: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found with this email');
    }

    if (!user.isActive) {
      throw new BadRequestException('User account is deactivated');
    }

    // Check if user is already staff in this company
    const existingStaff = await this.prisma.companyStaff.findFirst({
      where: {
        companyId,
        userId: user.id,
      },
    });

    if (existingStaff) {
      throw new ConflictException(
        'User is already a staff member of this company',
      );
    }

    // Create staff record
    const staff = await this.prisma.companyStaff.create({
      data: {
        companyId,
        userId: user.id,
        role: role,
        permissions: [],
        isActive: true,
      },
      include: {
        user: {
          select: {
            email: true,
            displayName: true,
          },
        },
      },
    });

    return {
      id: staff.id,
      companyId: staff.companyId,
      userId: staff.userId,
      userEmail: staff.user.email,
      userDisplayName: staff.user.displayName,
      role: staff.role,
      isActive: staff.isActive,
      permissions: staff.permissions,
      joinedAt: staff.joinedAt,
      updatedAt: staff.updatedAt,
    };
  }

  async removeStaffMember(
    companyId: string,
    targetUserId: string,
    requesterUserId: string,
  ): Promise<{ message: string }> {
    // Check if company exists
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Check if requester is ADMIN or OWNER
    const requesterRole = await this.getUserRoleInCompany(
      companyId,
      requesterUserId,
    );
    if (requesterRole !== 'ADMIN' && requesterRole !== 'OWNER') {
      throw new ForbiddenException(
        'Only company administrators can remove staff',
      );
    }

    // Check if user to remove is the company owner (cannot remove owner)
    const targetStaff = await this.prisma.companyStaff.findFirst({
      where: {
        companyId,
        userId: targetUserId,
      },
    });

    if (!targetStaff) {
      throw new NotFoundException('Staff member not found in this company');
    }

    if (targetStaff.role === 'OWNER') {
      throw new ForbiddenException('Cannot remove the company owner');
    }

    // Check if requester is trying to remove themselves
    if (targetUserId === requesterUserId) {
      throw new BadRequestException(
        'You cannot remove yourself. Ask another admin to do it.',
      );
    }

    // Remove staff member (soft delete by setting isActive to false)
    await this.prisma.companyStaff.update({
      where: {
        id: targetStaff.id,
      },
      data: {
        isActive: false,
      },
    });

    return { message: 'Staff member removed successfully' };
  }

  async getCompanyStaff(companyId: string): Promise<any[]> {
    const staff = await this.prisma.companyStaff.findMany({
      where: {
        companyId,
        isActive: true,
      },
      include: {
        user: {
          select: {
            email: true,
            displayName: true,
          },
        },
      },
      orderBy: {
        role: 'asc',
      },
    });

    return staff.map((staff) => ({
      id: staff.id,
      companyId: staff.companyId,
      userId: staff.userId,
      userEmail: staff.user.email,
      userDisplayName: staff.user.displayName,
      role: staff.role,
      isActive: staff.isActive,
      permissions: staff.permissions,
      joinedAt: staff.joinedAt,
      updatedAt: staff.updatedAt,
    }));
  }

  async getCompanyAnalytics(companyId: string, userId: string): Promise<any> {
    // Check if user is owner or admin
    const userRole = await this.getUserRoleInCompany(companyId, userId);
    if (userRole !== 'OWNER' && userRole !== 'ADMIN') {
      throw new ForbiddenException('Only owners and admins can view analytics');
    }

    // Get or create analytics
    let analytics = await this.prisma.companyAnalytics.findUnique({
      where: { companyId },
    });

    if (!analytics) {
      analytics = await this.prisma.companyAnalytics.create({
        data: {
          companyId,
          followerCount: 0,
          postReach: 0,
          engagementRate: 0,
          scamMentionCount: 0,
        },
      });
    }

    // Get follower count
    const followerCount = await this.prisma.companyFollower.count({
      where: { companyId },
    });

    // Get company posts
    const posts = await this.prisma.post.findMany({
      where: {
        companyId,
        status: 'PUBLISHED',
        deletedAt: null,
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
      orderBy: { publishedAt: 'desc' },
    });

    // Calculate metrics
    const awarenessPostCount = posts.filter(
      (p) => p.postType === 'SCAM_AWARENESS',
    ).length;
    const officialWarningCount = posts.filter(
      (p) =>
        p.postType === 'SCAM_REPORT' &&
        p.title?.toLowerCase().includes('warning'),
    ).length;

    // Calculate total reach
    const totalPostReach = posts.reduce((sum, post) => {
      return (
        sum +
        (post._count.reactions + post._count.comments + post._count.bookmarks)
      );
    }, 0);

    // Calculate weekly reach (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weeklyPosts = posts.filter(
      (p) => p.publishedAt && p.publishedAt >= sevenDaysAgo,
    );
    const weeklyPostReach = weeklyPosts.reduce((sum, post) => {
      return (
        sum +
        (post._count.reactions + post._count.comments + post._count.bookmarks)
      );
    }, 0);

    // Calculate engagement rate
    const engagementRate =
      followerCount > 0 ? (totalPostReach / followerCount) * 100 : 0;

    // Get scam mentions count
    const scamMentionCount = await this.prisma.post.count({
      where: {
        companyId,
        postType: 'SCAM_REPORT',
        status: 'PUBLISHED',
        deletedAt: null,
      },
    });

    // Calculate follower growth (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newFollowers = await this.prisma.companyFollower.count({
      where: {
        companyId,
        followedAt: { gte: thirtyDaysAgo },
      },
    });

    const followerGrowth =
      followerCount > 0 ? (newFollowers / followerCount) * 100 : 0;

    // FIXED: Explicitly typed reachHistory array
    const reachHistory: Array<{
      date: string;
      reach: number;
      engagement: number;
    }> = [];

    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayPosts = posts.filter(
        (p) =>
          p.publishedAt && p.publishedAt >= date && p.publishedAt < nextDate,
      );

      const dayReach = dayPosts.reduce((sum, post) => {
        return (
          sum +
          (post._count.reactions + post._count.comments + post._count.bookmarks)
        );
      }, 0);

      const dayEngagement =
        followerCount > 0 && dayPosts.length > 0
          ? (dayReach / followerCount) * 100
          : 0;

      reachHistory.push({
        date: date.toISOString().split('T')[0],
        reach: dayReach,
        engagement: Math.round(dayEngagement * 10) / 10,
      });
    }

    return {
      companyId,
      followerCount,
      followerGrowth: Math.round(followerGrowth * 10) / 10,
      totalPostReach,
      weeklyPostReach,
      engagementRate: Math.round(engagementRate * 10) / 10,
      scamMentionCount,
      awarenessPostCount,
      officialWarningCount,
      reachHistory,
      lastUpdated: new Date(),
    };
  }
}
