import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { SearchQueryDto, IdentityType, IdentityProfileResponseDto, RiskScoreResponseDto, NoResultsResponseDto } from '../dtos/search.dto';
import { User } from '@prisma/client';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Main search function
   */
  async search(query: SearchQueryDto, userId?: string) {
    const { query: searchQuery, type, country, region, city, page = 1, limit = 20 } = query;
    
    // Log search history - type is optional, provide default if undefined
    if (userId) {
      await this.logSearchHistory(searchQuery, type || undefined, userId, country, region, city);
    }

    // Normalize the search query
    const normalizedQuery = this.normalizeIdentity(searchQuery, type);
    
    // Get autocomplete suggestions
    const suggestions = await this.getAutocompleteSuggestions(searchQuery, userId);

    // Search in evidence tables and posts
    const results = await this.searchIdentities(normalizedQuery, type, country, region, city, page, limit);

    // If no results found, return no results response
    if (results.length === 0) {
      const isFollowing = userId ? await this.isFollowing(normalizedQuery, userId) : false;
      return this.createNoResultsResponse(searchQuery, type, isFollowing);
    }

    // Get detailed profiles for each result
    const identityProfiles = await Promise.all(
      results.map(identity => this.getIdentityProfile(identity, userId))
    );

    return {
      success: true,
      page,
      limit,
      total: results.length,
      results: identityProfiles,
      suggestions
    };
  }

  /**
   * Get autocomplete suggestions
   */
  async getAutocomplete(query: string, userId?: string) {
    const identities = await this.prisma.searchHistory.findMany({
      where: {
        ...(userId && { userId }),
        query: {
          contains: query,
          mode: 'insensitive'
        }
      },
      distinct: ['query'],
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { query: true }
    });

    // Also search in popular scam types/keywords
    const popularKeywords = await this.prisma.scamType.findMany({
      where: {
        name: {
          contains: query,
          mode: 'insensitive'
        },
        isActive: true
      },
      take: 5,
      select: { name: true }
    });

    return {
      identities: identities.map(h => h.query),
      keywords: popularKeywords.map(k => k.name.toLowerCase())
    };
  }

  /**
   * Follow an identity for alerts
   */
  async followIdentity(identity: string, type: IdentityType, userId: string, displayName?: string, alertsEnabled = true) {
    const normalizedIdentity = this.normalizeIdentity(identity, type);

    const existing = await this.prisma.identityFollow.findUnique({
      where: {
        userId_identity: {
          userId,
          identity: normalizedIdentity
        }
      }
    });

    if (existing) {
      return await this.prisma.identityFollow.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          alertsEnabled,
          updatedAt: new Date()
        }
      });
    }

    // Get initial risk score
    const riskScoreDto = await this.calculateRiskScore(normalizedIdentity, type);

    return await this.prisma.identityFollow.create({
      data: {
        userId,
        identity: normalizedIdentity,
        identityType: type,
        displayName,
        riskScore: riskScoreDto.score, // Extract just the score number
        alertsEnabled,
        isActive: true
      }
    });
  }

  /**
   * Unfollow an identity
   */
  async unfollowIdentity(identity: string, userId: string) {
    const normalizedIdentity = this.normalizeIdentity(identity);

    return await this.prisma.identityFollow.updateMany({
      where: {
        userId,
        identity: normalizedIdentity
      },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Get user's followed identities
   */
  async getFollowedIdentities(userId: string) {
    return await this.prisma.identityFollow.findMany({
      where: {
        userId,
        isActive: true
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  /**
   * Get user's search history
   */
  async getSearchHistory(userId: string, limit = 20) {
    return await this.prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  /**
   * Clear user's search history
   */
  async clearSearchHistory(userId: string) {
    return await this.prisma.searchHistory.deleteMany({
      where: { userId }
    });
  }

  /**
   * Get trending/popular searches
   */
  async getTrendingSearches(limit = 10) {
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    const popularSearches = await this.prisma.searchHistory.groupBy({
      by: ['query'],
      where: {
        createdAt: { gte: lastWeek }
      },
      _count: {
        query: true
      },
      orderBy: {
        _count: {
          query: 'desc'
        }
      },
      take: limit
    });

    return popularSearches.map(search => ({
      query: search.query,
      count: search._count.query
    }));
  }

  /**
   * PRIVATE HELPER METHODS
   */
  private async logSearchHistory(query: string, type: IdentityType | undefined, userId: string, country?: string, region?: string, city?: string) {
    try {
      // Count results for this search
      const normalizedQuery = this.normalizeIdentity(query, type);
      const resultsCount = await this.countSearchResults(normalizedQuery, type);

      await this.prisma.searchHistory.create({
        data: {
          userId,
          query,
          identityType: type,
          country,
          region,
          city,
          resultsCount
        }
      });

      // Keep only last 50 searches per user
      await this.prisma.$executeRaw`
        DELETE FROM search_history 
        WHERE id IN (
          SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as row_num
            FROM search_history 
            WHERE user_id = ${userId}
          ) as ranked 
          WHERE row_num > 50
        )
      `;
    } catch (error) {
      this.logger.error('Failed to log search history:', error);
    }
  }

  private async searchIdentities(query: string, type?: IdentityType, country?: string, region?: string, city?: string, page = 1, limit = 20) {
    const normalizedQuery = this.normalizeIdentity(query, type);
    const skip = (page - 1) * limit;

    // Build search conditions based on evidence types
    const whereConditions: any = {
      OR: [],
      post: {
        status: 'PUBLISHED',
        deletedAt: null
      }
    };

    // Add location filters if provided
    if (country || region || city) {
      whereConditions.post = {
        ...whereConditions.post,
        ...(country && { country }),
        ...(region && { region }),
        ...(city && { city })
      };
    }

    // Search in different evidence fields based on type
    if (type) {
      switch (type) {
        case IdentityType.PHONE:
          whereConditions.OR.push(
            { phoneNumber: { contains: normalizedQuery, mode: 'insensitive' } },
            { maskedContent: { contains: normalizedQuery, mode: 'insensitive' } }
          );
          break;
        case IdentityType.EMAIL:
          whereConditions.OR.push(
            { emailAddress: { contains: normalizedQuery, mode: 'insensitive' } },
            { maskedContent: { contains: normalizedQuery, mode: 'insensitive' } }
          );
          break;
        case IdentityType.WEBSITE:
          whereConditions.OR.push(
            { websiteUrl: { contains: normalizedQuery, mode: 'insensitive' } },
            { maskedContent: { contains: normalizedQuery, mode: 'insensitive' } }
          );
          break;
        case IdentityType.SOCIAL_MEDIA:
          whereConditions.OR.push(
            { maskedContent: { contains: normalizedQuery, mode: 'insensitive' } }
          );
          break;
        case IdentityType.CRYPTO_WALLET:
          whereConditions.OR.push(
            { maskedContent: { contains: normalizedQuery, mode: 'insensitive' } }
          );
          break;
        default:
          whereConditions.OR.push(
            { phoneNumber: { contains: normalizedQuery, mode: 'insensitive' } },
            { emailAddress: { contains: normalizedQuery, mode: 'insensitive' } },
            { websiteUrl: { contains: normalizedQuery, mode: 'insensitive' } },
            { maskedContent: { contains: normalizedQuery, mode: 'insensitive' } }
          );
      }
    } else {
      // Search all fields if no type specified
      whereConditions.OR.push(
        { phoneNumber: { contains: normalizedQuery, mode: 'insensitive' } },
        { emailAddress: { contains: normalizedQuery, mode: 'insensitive' } },
        { websiteUrl: { contains: normalizedQuery, mode: 'insensitive' } },
        { maskedContent: { contains: normalizedQuery, mode: 'insensitive' } }
      );
    }

    const evidences = await this.prisma.evidence.findMany({
      where: whereConditions,
      select: {
        id: true,
        evidenceType: true,
        phoneNumber: true,
        emailAddress: true,
        websiteUrl: true,
        maskedContent: true,
        post: {
          select: {
            id: true,
            title: true,
            postType: true,
            scamTypeId: true,
            country: true,
            region: true,
            city: true,
            incidentDate: true
          }
        }
      },
      distinct: ['phoneNumber', 'emailAddress', 'websiteUrl', 'maskedContent'],
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    // Extract unique identities
    const identities = new Map();
    evidences.forEach(evidence => {
      const identity = this.extractIdentityFromEvidence(evidence, type);
      if (identity) {
        identities.set(identity, {
          identity,
          type: this.detectIdentityType(identity),
          evidenceIds: [...(identities.get(identity)?.evidenceIds || []), evidence.id],
          postIds: [...(identities.get(identity)?.postIds || []), evidence.post.id],
          evidence
        });
      }
    });

    return Array.from(identities.values());
  }

  private async getIdentityProfile(identityData: any, userId?: string) {
    const { identity, type, evidenceIds, postIds } = identityData;
    
    // Get all related evidence
    const relatedEvidence = await this.prisma.evidence.findMany({
      where: {
        id: { in: evidenceIds }
      },
      include: {
        post: {
          include: {
            scamType: true,
            user: {
              select: {
                id: true,
                displayName: true,
                country: true
              }
            }
          }
        }
      }
    });

    // Get all related posts
    const relatedPosts = await this.prisma.post.findMany({
      where: {
        id: { in: postIds },
        status: 'PUBLISHED',
        deletedAt: null
      },
      include: {
        scamType: true,
        user: {
          select: {
            id: true,
            displayName: true
          }
        },
        evidences: {
          take: 3,
          where: {
            OR: [
              { phoneNumber: { contains: identity, mode: 'insensitive' } },
              { emailAddress: { contains: identity, mode: 'insensitive' } },
              { websiteUrl: { contains: identity, mode: 'insensitive' } },
              { maskedContent: { contains: identity, mode: 'insensitive' } }
            ]
          }
        }
      },
      orderBy: { incidentDate: 'desc' },
      take: 10
    });

    // Calculate risk score
    const riskScore = await this.calculateRiskScore(identity, type);

    // Get scam type breakdown
    const scamTypes = await this.getScamTypeBreakdown(postIds);

    // Get connected identities
    const connectedIdentities = await this.findConnectedIdentities(identity, postIds);

    // Check if user is following this identity
    const isFollowing = userId ? await this.isFollowing(identity, userId) : false;

    // Mask the identity for display
    const maskedIdentity = this.maskIdentity(identity, type);

    // Safely calculate dates
    const validPosts = relatedPosts.filter(post => post.incidentDate);
    const firstReportDate = validPosts.length > 0 
      ? validPosts.reduce((earliest, post) => 
          post.incidentDate && (!earliest || post.incidentDate < earliest) ? post.incidentDate : earliest
        , validPosts[0].incidentDate)
      : null;

    const lastReportDate = validPosts.length > 0
      ? validPosts.reduce((latest, post) => 
          post.incidentDate && (!latest || post.incidentDate > latest) ? post.incidentDate : latest
        , validPosts[0].incidentDate)
      : null;

    return {
      maskedIdentity,
      type,
      icon: this.getIdentityIcon(type),
      riskScore,
      totalReports: relatedPosts.length,
      uniqueReporters: new Set(relatedPosts.map(p => p.userId)).size,
      firstReportDate,
      lastReportDate,
      scamTypes,
      recentReports: relatedPosts.slice(0, 5).map(post => ({
        id: post.id,
        title: post.title,
        postType: post.postType,
        scamType: post.scamType?.name,
        incidentDate: post.incidentDate,
        country: post.country,
        lostAmount: post.lostAmount
      })),
      evidencePreviews: relatedEvidence.slice(0, 5).map(evidence => ({
        id: evidence.id,
        type: evidence.evidenceType,
        previewUrl: evidence.fileUrl,
        description: evidence.maskedContent?.substring(0, 100),
        createdAt: evidence.createdAt
      })),
      connectedIdentities,
      isFollowing,
      safetyWarning: this.generateSafetyWarning(riskScore.score, relatedPosts.length)
    };
  }

  private async calculateRiskScore(identity: string, type: IdentityType): Promise<RiskScoreResponseDto> {
    // Get all related posts
    const relatedPosts = await this.prisma.post.findMany({
      where: {
        status: 'PUBLISHED',
        deletedAt: null,
        evidences: {
          some: {
            OR: [
              { phoneNumber: { contains: identity, mode: 'insensitive' } },
              { emailAddress: { contains: identity, mode: 'insensitive' } },
              { websiteUrl: { contains: identity, mode: 'insensitive' } },
              { maskedContent: { contains: identity, mode: 'insensitive' } }
            ]
          }
        }
      }
    });

    if (relatedPosts.length === 0) {
      return {
        score: 0,
        level: 'LOW',
        description: 'No known risk signals'
      };
    }

    // Calculate base score based on number of reports
    let score = Math.min(relatedPosts.length * 10, 50);

    // Adjust based on recency (recent reports weigh more)
    const now = new Date();
    const ninetyDaysAgo = new Date(now.setDate(now.getDate() - 90));
    
    const recentReports = relatedPosts.filter(post => 
      post.incidentDate && post.incidentDate > ninetyDaysAgo
    ).length;
    
    score += Math.min(recentReports * 15, 30);

    // Adjust based on financial loss
    const totalLoss = relatedPosts.reduce((sum, post) => 
      sum + (post.lostAmount?.toNumber() || 0), 0
    );
    
    if (totalLoss > 1000) score += 10;
    if (totalLoss > 10000) score += 10;

    // Cap at 100
    score = Math.min(score, 100);

    // Determine risk level
    let level: string, description: string;
    if (score >= 80) {
      level = 'CRITICAL';
      description = 'Extremely high risk - Multiple recent reports with significant financial loss';
    } else if (score >= 60) {
      level = 'HIGH';
      description = 'High risk - Multiple reports detected';
    } else if (score >= 40) {
      level = 'MEDIUM';
      description = 'Medium risk - Some reports detected';
    } else if (score >= 20) {
      level = 'LOW';
      description = 'Low risk - Limited reports detected';
    } else {
      level = 'LOW';
      description = 'Minimal risk - No concerning patterns detected';
    }

    return { score, level, description };
  }

  private async getScamTypeBreakdown(postIds: string[]) {
    const scamTypes = await this.prisma.post.groupBy({
      by: ['scamTypeId'],
      where: {
        id: { in: postIds },
        scamTypeId: { not: null }
      },
      _count: { id: true }
    });

    const scamTypeDetails = await Promise.all(
      scamTypes.map(async (type) => {
        const scamType = await this.prisma.scamType.findUnique({
          where: { id: type.scamTypeId! }
        });
        return {
          type: scamType?.slug,
          name: scamType?.name,
          count: type._count.id
        };
      })
    );

    return scamTypeDetails.filter(st => st.type && st.name);
  }

  private async findConnectedIdentities(mainIdentity: string, postIds: string[]) {
    // Find other identities that appear in the same posts
    const connectedEvidences = await this.prisma.evidence.findMany({
      where: {
        postId: { in: postIds },
        OR: [
          { phoneNumber: { not: null } },
          { emailAddress: { not: null } },
          { websiteUrl: { not: null } },
          { maskedContent: { not: null } }
        ],
        NOT: {
          OR: [
            { phoneNumber: { contains: mainIdentity, mode: 'insensitive' } },
            { emailAddress: { contains: mainIdentity, mode: 'insensitive' } },
            { websiteUrl: { contains: mainIdentity, mode: 'insensitive' } },
            { maskedContent: { contains: mainIdentity, mode: 'insensitive' } }
          ]
        }
      },
      select: {
        phoneNumber: true,
        emailAddress: true,
        websiteUrl: true,
        maskedContent: true,
        postId: true
      }
    });

    // Group connected identities
    const connections = new Map();
    
    connectedEvidences.forEach(evidence => {
      const identities = [
        evidence.phoneNumber,
        evidence.emailAddress,
        evidence.websiteUrl,
        ...(evidence.maskedContent?.split(/\s+/).filter((item: string) => 
          this.looksLikeIdentity(item)
        ) || [])
      ].filter(Boolean);

      identities.forEach(connectedIdentity => {
        if (connectedIdentity && !connectedIdentity.includes(mainIdentity)) {
          const current = connections.get(connectedIdentity) || { count: 0, posts: new Set() };
          connections.set(connectedIdentity, {
            count: current.count + 1,
            posts: current.posts.add(evidence.postId),
            identity: connectedIdentity,
            type: this.detectIdentityType(connectedIdentity)
          });
        }
      });
    });

    return Array.from(connections.values())
      .filter(conn => conn.count > 1) // Only show strong connections
      .map(conn => ({
        identity: this.maskIdentity(conn.identity, conn.type),
        type: conn.type,
        connectionStrength: conn.count,
        relationship: this.getRelationshipDescription(conn.count)
      }))
      .slice(0, 10); // Limit to top 10 connections
  }

  private async countSearchResults(query: string, type?: IdentityType) {
    const normalizedQuery = this.normalizeIdentity(query, type);
    
    const whereConditions: any = {
      OR: [],
      post: {
        status: 'PUBLISHED',
        deletedAt: null
      }
    };

    if (type) {
      switch (type) {
        case IdentityType.PHONE:
          whereConditions.OR.push(
            { phoneNumber: { contains: normalizedQuery, mode: 'insensitive' } }
          );
          break;
        case IdentityType.EMAIL:
          whereConditions.OR.push(
            { emailAddress: { contains: normalizedQuery, mode: 'insensitive' } }
          );
          break;
        case IdentityType.WEBSITE:
          whereConditions.OR.push(
            { websiteUrl: { contains: normalizedQuery, mode: 'insensitive' } }
          );
          break;
        default:
          whereConditions.OR.push(
            { maskedContent: { contains: normalizedQuery, mode: 'insensitive' } }
          );
      }
    } else {
      whereConditions.OR.push(
        { phoneNumber: { contains: normalizedQuery, mode: 'insensitive' } },
        { emailAddress: { contains: normalizedQuery, mode: 'insensitive' } },
        { websiteUrl: { contains: normalizedQuery, mode: 'insensitive' } },
        { maskedContent: { contains: normalizedQuery, mode: 'insensitive' } }
      );
    }

    const count = await this.prisma.evidence.count({
      where: whereConditions
    });

    return count;
  }

  private async getAutocompleteSuggestions(query: string, userId?: string) {
    // Get user's recent searches
    const recentSearches = userId ? await this.prisma.searchHistory.findMany({
      where: { userId },
      distinct: ['query'],
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { query: true }
    }) : [];

    // Get trending searches
    const trending = await this.getTrendingSearches(5);

    // Combine and deduplicate
    const suggestions = new Set([
      ...recentSearches.map(s => s.query),
      ...trending.map(t => t.query)
    ]);

    return Array.from(suggestions).slice(0, 10);
  }

  private async isFollowing(identity: string, userId: string) {
    const normalizedIdentity = this.normalizeIdentity(identity);
    
    const follow = await this.prisma.identityFollow.findFirst({
      where: {
        userId,
        identity: normalizedIdentity,
        isActive: true
      }
    });
    
    return !!follow;
  }

  private createNoResultsResponse(query: string, type?: IdentityType, isFollowing = false): NoResultsResponseDto {
    return {
      message: 'No reports found yet.',
      identity: this.maskIdentity(query, type),
      type: type || this.detectIdentityType(query),
      isFollowing
    };
  }

  private normalizeIdentity(identity: string, type?: IdentityType): string {
    if (!identity) return '';
    
    let normalized = identity.trim();
    
    if (type === IdentityType.PHONE) {
      // Remove all non-digit characters except leading +
      normalized = normalized.replace(/[^\d+]/g, '');
    } else if (type === IdentityType.EMAIL) {
      normalized = normalized.toLowerCase();
    } else if (type === IdentityType.WEBSITE) {
      // Remove protocol and www
      normalized = normalized.replace(/^(https?:\/\/)?(www\.)?/, '');
      normalized = normalized.replace(/\/$/, ''); // Remove trailing slash
    }
    
    return normalized;
  }

  private extractIdentityFromEvidence(evidence: any, type?: IdentityType): string | null {
    if (type === IdentityType.PHONE && evidence.phoneNumber) {
      return evidence.phoneNumber;
    }
    if (type === IdentityType.EMAIL && evidence.emailAddress) {
      return evidence.emailAddress;
    }
    if (type === IdentityType.WEBSITE && evidence.websiteUrl) {
      return evidence.websiteUrl;
    }
    if (evidence.maskedContent) {
      // Try to extract identity from masked content
      const patterns = {
        phone: /(\+\d{1,3}[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
        email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        website: /(https?:\/\/)?(www\.)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/[^\s]*)?/g
      };
      
      const matches = [
        ...(evidence.maskedContent.match(patterns.phone) || []),
        ...(evidence.maskedContent.match(patterns.email) || []),
        ...(evidence.maskedContent.match(patterns.website) || [])
      ];
      
      if (matches.length > 0) {
        return matches[0];
      }
    }
    
    return null;
  }

  private detectIdentityType(identity: string): IdentityType {
    if (/^(\+\d{1,3}[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/.test(identity)) {
      return IdentityType.PHONE;
    }
    if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(identity)) {
      return IdentityType.EMAIL;
    }
    if (/^(https?:\/\/)?(www\.)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/[^\s]*)?$/.test(identity)) {
      return IdentityType.WEBSITE;
    }
    if (/^0x[a-fA-F0-9]{40}$/.test(identity) || /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(identity)) {
      return IdentityType.CRYPTO_WALLET;
    }
    if (identity.includes('@') || identity.includes('facebook.com') || identity.includes('twitter.com') || identity.includes('instagram.com')) {
      return IdentityType.SOCIAL_MEDIA;
    }
    return IdentityType.KEYWORD;
  }

  private maskIdentity(identity: string, type?: IdentityType): string {
    if (!type) type = this.detectIdentityType(identity);
    
    switch (type) {
      case IdentityType.PHONE:
        // Format: +44 7XXX XXX123
        const digits = identity.replace(/\D/g, '');
        if (digits.length >= 10) {
          const countryCode = digits.length > 10 ? `+${digits.slice(0, digits.length - 10)} ` : '';
          const lastThree = digits.slice(-3);
          const middle = 'X'.repeat(Math.max(0, digits.length - 3 - (countryCode ? countryCode.length - 1 : 0)));
          return `${countryCode}${middle}${lastThree}`;
        }
        return identity;
        
      case IdentityType.EMAIL:
        // Format: ab***@mail.com
        const [local, domain] = identity.split('@');
        if (local.length > 2) {
          return `${local.charAt(0)}${'*'.repeat(Math.max(0, local.length - 2))}${local.charAt(local.length - 1)}@${domain}`;
        }
        return `***@${domain}`;
        
      case IdentityType.WEBSITE:
        // Keep domain visible, mask path
        const url = new URL(identity.includes('://') ? identity : `https://${identity}`);
        return `${url.hostname}/***`;
        
      default:
        // For other types, show first 4 and last 4 characters
        if (identity.length > 8) {
          return `${identity.substring(0, 4)}...${identity.substring(identity.length - 4)}`;
        }
        return '***';
    }
  }

  private getIdentityIcon(type: IdentityType): string {
    const icons = {
      [IdentityType.PHONE]: 'phone',
      [IdentityType.EMAIL]: 'mail',
      [IdentityType.WEBSITE]: 'globe',
      [IdentityType.SOCIAL_MEDIA]: 'users',
      [IdentityType.CRYPTO_WALLET]: 'currency',
      [IdentityType.KEYWORD]: 'search'
    };
    return icons[type] || 'search';
  }

  private generateSafetyWarning(riskScore: number, reportCount: number): string {
    if (riskScore >= 80) {
      return 'This identity has been reported multiple times with significant financial loss. Exercise extreme caution.';
    } else if (riskScore >= 60) {
      return 'This identity has been reported by multiple users. Exercise caution before engaging.';
    } else if (riskScore >= 40) {
      return 'This identity has some reported activity. Be vigilant in your interactions.';
    } else if (reportCount > 0) {
      return 'This identity has been reported. Stay alert during communications.';
    }
    return 'No known risk signals detected.';
  }

  private looksLikeIdentity(text: string): boolean {
    return this.detectIdentityType(text) !== IdentityType.KEYWORD;
  }

  private getRelationshipDescription(count: number): string {
    if (count >= 5) return 'Strongly connected - Frequently appears together';
    if (count >= 3) return 'Often appears together in reports';
    return 'Connected in some reports';
  }
}