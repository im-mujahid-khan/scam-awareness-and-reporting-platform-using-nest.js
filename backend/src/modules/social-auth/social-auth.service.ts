import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface SocialProfile {
  id: string;
  email?: string;
  displayName: string;
  photos?: Array<{ value: string }>;
  provider: 'google' | 'facebook' | 'apple';
}

@Injectable()
export class SocialAuthService {
  constructor(private prisma: PrismaService) {}

  /**
   * Find existing user by social account or create new one
   */
  async findOrCreateUser(profile: SocialProfile): Promise<any> {
    // Check if social account already linked
    let user = await this.prisma.user.findFirst({
      where: {
        socialAccounts: {
          some: {
            provider: profile.provider.toUpperCase() as any,
            providerId: profile.id,
          },
        },
      },
      include: { socialAccounts: true },
    });

    if (user) {
      // Update user status
      await this.prisma.socialAccount.updateMany({
        where: {
          userId: user.id,
          provider: profile.provider.toUpperCase() as any,
        },
        data: {
          isConnected: true,
        },
      });

      return user;
    }

    // Check if email exists (link to existing account)
    if (profile.email) {
      user = await this.prisma.user.findUnique({
        where: { email: profile.email },
        include: { socialAccounts: true },
      });

      if (user) {
        // Link social account to existing user
        await this.prisma.socialAccount.create({
          data: {
            userId: user.id,
            provider: profile.provider.toUpperCase() as any,
            providerId: profile.id,
            isConnected: true,
          },
        });

        // Update authProvider if this is a new auth method
        if (user.authProvider !== profile.provider.toUpperCase()) {
          await this.prisma.user.update({
            where: { id: user.id },
            data: {
              authProvider: profile.provider.toUpperCase() as any,
            },
          });
        }

        return user;
      }
    }

    // Create new user
    user = await this.prisma.user.create({
      data: {
        email: profile.email,
        displayName: profile.displayName,
        firstName: profile.displayName.split(' ')[0],
        lastName: profile.displayName.split(' ').slice(1).join(' ') || undefined,
        avatarUrl: profile.photos?.[0]?.value,
        emailVerified: !!profile.email, // Auto-verify email from social provider
        authProvider: profile.provider.toUpperCase() as any,
        isActive: true,
        socialAccounts: {
          create: {
            provider: profile.provider.toUpperCase() as any,
            providerId: profile.id,
            isConnected: true,
          },
        },
      },
      include: { socialAccounts: true },
    });

    return user;
  }

  /**
   * Link additional social account to existing user
   */
  async linkSocialAccount(userId: string, profile: SocialProfile): Promise<any> {
    // Check if this social account is already linked to another user
    const existingLink = await this.prisma.socialAccount.findFirst({
      where: {
        provider: profile.provider.toUpperCase() as any,
        providerId: profile.id,
      },
    });

    if (existingLink && existingLink.userId !== userId) {
      throw new BadRequestException(
        `This ${profile.provider} account is already linked to another user account.`,
      );
    }

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { socialAccounts: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // If already linked, just return user
    if (existingLink && existingLink.userId === userId) {
      return user;
    }

    // Link the social account
    await this.prisma.socialAccount.create({
      data: {
        userId,
        provider: profile.provider.toUpperCase() as any,
        providerId: profile.id,
        isConnected: true,
      },
    });

    // Update authProvider if needed
    if (user.authProvider !== profile.provider.toUpperCase()) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          authProvider: profile.provider.toUpperCase() as any,
        },
      });
    }

    // Update email if not set
    if (!user.email && profile.email) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          email: profile.email,
          emailVerified: true,
        },
      });
    }

    return user;
  }

  /**
   * Unlink social account from user
   */
  async unlinkSocialAccount(userId: string, provider: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { socialAccounts: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Check if provider exists
    const socialAccount = user.socialAccounts.find((sa) => sa.provider === provider.toUpperCase());
    if (!socialAccount) {
      throw new BadRequestException(`${provider} account not linked to this user`);
    }

    // Check if this is the last auth method
    const otherAccounts = user.socialAccounts.filter((sa) => sa.provider !== provider.toUpperCase());
    if (otherAccounts.length === 0 && !user.passwordHash) {
      throw new BadRequestException(
        'Cannot unlink the last authentication method. Please set a password first.',
      );
    }

    // Delete social account
    await this.prisma.socialAccount.delete({
      where: { id: socialAccount.id },
    });

    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { socialAccounts: true },
    });
  }

  /**
   * Get user's linked social accounts
   */
  async getUserSocialAccounts(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        socialAccounts: {
          select: {
            id: true,
            provider: true,
            isConnected: true,
          },
        },
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user.socialAccounts;
  }

  /**
   * Find user by social provider ID
   */
  async findUserBySocialId(provider: string, providerId: string): Promise<any | null> {
    return this.prisma.user.findFirst({
      where: {
        socialAccounts: {
          some: {
            provider: provider.toUpperCase() as any,
            providerId,
          },
        },
      },
      include: { socialAccounts: true },
    });
  }

  /**
   * Update social account tokens (when refreshing)
   */
  async updateSocialAccountTokens(
    userId: string,
    provider: string,
    accessToken: string,
    refreshToken?: string,
  ): Promise<void> {
    await this.prisma.socialAccount.updateMany({
      where: {
        userId,
        provider: provider.toUpperCase() as any,
      },
      data: {
        accessToken,
        refreshToken: refreshToken || undefined,
      },
    });
  }
}
