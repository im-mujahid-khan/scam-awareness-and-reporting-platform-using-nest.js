import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { UpdatePrivacySettingsDto, UpdateNotificationSettingsDto } from '../dto/update-settings.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // Get user profile
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { 
        id: userId,
        isDeleted: false 
      },
      select: {
        id: true,
        email: true,
        phone: true,
        displayName: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        bio: true,
        emailVerified: true,
        phoneVerified: true,
        isActive: true,
        isDeleted: true,
        deletedAt: true,
        role: true,
        authProvider: true,
        providerId: true,
        privacySettings: true,
        notificationSettings: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        verifiedAt: true,
        dateOfBirth: true,
        gender: true,
        location: true,
        timezone: true,
        language: true,
        themePreference: true,
        lastProfileUpdateAt: true,
      }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  // Update user profile
  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    // Check if user exists and is not deleted
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId, isDeleted: false }
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Check if email is being updated and is unique
    if (updateProfileDto.email && updateProfileDto.email !== existingUser.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: updateProfileDto.email }
      });
      
      if (emailExists) {
        throw new ConflictException('Email already in use');
      }
    }

    // Check if phone is being updated and is unique
    if (updateProfileDto.phone && updateProfileDto.phone !== existingUser.phone) {
      const phoneExists = await this.prisma.user.findUnique({
        where: { phone: updateProfileDto.phone }
      });
      
      if (phoneExists) {
        throw new ConflictException('Phone number already in use');
      }
    }

    // Prepare update data
    const updateData: any = {
      ...updateProfileDto,
      lastProfileUpdateAt: new Date()
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        phone: true,
        displayName: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        bio: true,
        emailVerified: true,
        phoneVerified: true,
        isActive: true,
        isDeleted: true,
        deletedAt: true,
        role: true,
        authProvider: true,
        privacySettings: true,
        notificationSettings: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        dateOfBirth: true,
        gender: true,
        location: true,
        language: true,
        themePreference: true,
        lastProfileUpdateAt: true,
      }
    });

    return updatedUser;
  }

  // Soft delete user
  async softDeleteUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isDeleted: false }
    });

    if (!user) {
      throw new NotFoundException('User not found or already deleted');
    }

    // Soft delete by marking as deleted and setting deletedAt
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        isActive: false,
        email: user.email ? `${user.email}_deleted_${Date.now()}` : null,
        phone: user.phone ? `${user.phone}_deleted_${Date.now()}` : null,
        // Optionally nullify sensitive data
        passwordHash: null,
        refreshToken: null,
        refreshTokenExpiry: null,
      }
    });

    return { 
      message: 'User account deactivated successfully',
      note: 'Account can be restored within 30 days',
      deletionTime: new Date().toISOString()
    };
  }

  // Update privacy settings
  async updatePrivacySettings(userId: string, settingsDto: UpdatePrivacySettingsDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isDeleted: false }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        privacySettings: settingsDto.privacySettings || {},
        lastProfileUpdateAt: new Date()
      },
      select: {
        id: true,
        displayName: true,
        privacySettings: true,
        updatedAt: true
      }
    });

    return {
      message: 'Privacy settings updated successfully',
      user: updatedUser
    };
  }

  // Update notification settings
  async updateNotificationSettings(userId: string, settingsDto: UpdateNotificationSettingsDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isDeleted: false }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        notificationSettings: settingsDto.notificationSettings || {},
        lastProfileUpdateAt: new Date()
      },
      select: {
        id: true,
        displayName: true,
        notificationSettings: true,
        updatedAt: true
      }
    });

    return {
      message: 'Notification settings updated successfully',
      user: updatedUser
    };
  }

  // Restore soft deleted user
  async restoreUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isDeleted: true }
    });

    if (!user) {
      throw new NotFoundException('No deleted user found with this ID');
    }

    // Handle null email safely - only try to restore if email exists
    if (!user.email) {
      throw new BadRequestException('User email is null, cannot restore automatically');
    }

    const originalEmail = user.email.replace(/_deleted_\d+$/, '');
    const originalPhone = user.phone ? user.phone.replace(/_deleted_\d+$/, '') : null;

    // Check if original email/phone are now taken
    if (originalEmail !== user.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: originalEmail }
      });
      if (emailExists) {
        throw new ConflictException('Original email is now in use by another account');
      }
    }

    if (originalPhone && originalPhone !== user.phone) {
      const phoneExists = await this.prisma.user.findUnique({
        where: { phone: originalPhone }
      });
      if (phoneExists) {
        throw new ConflictException('Original phone number is now in use by another account');
      }
    }

    const restoredUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        isDeleted: false,
        deletedAt: null,
        isActive: true,
        email: originalEmail,
        phone: originalPhone,
        // Restore password hash if it was nullified (optional)
        // passwordHash: user.passwordHash, // Keep as null if you want user to reset password
      }
    });

    return {
      message: 'User account restored successfully',
      user: {
        id: restoredUser.id,
        email: restoredUser.email,
        isActive: restoredUser.isActive,
        isDeleted: restoredUser.isDeleted
      }
    };
  }

  // Helper method to map Prisma user to DTO (optional)
  private mapToUserResponseDto(user: any) {
    return {
      ...user,
      email: user.email ?? null,
      phone: user.phone ?? null,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      avatarUrl: user.avatarUrl ?? null,
      bio: user.bio ?? null,
      location: user.location ?? null,
      gender: user.gender ?? null,
      dateOfBirth: user.dateOfBirth ? 
        new Date(user.dateOfBirth).toISOString().split('T')[0] : null,
      language: user.language ?? null,
      themePreference: user.themePreference ?? null,
      deletedAt: user.deletedAt ?? null,
      lastLoginAt: user.lastLoginAt ?? null,
      lastProfileUpdateAt: user.lastProfileUpdateAt ?? null,
      privacySettings: typeof user.privacySettings === 'string' ? 
        JSON.parse(user.privacySettings) : (user.privacySettings || {}),
      notificationSettings: typeof user.notificationSettings === 'string' ? 
        JSON.parse(user.notificationSettings) : (user.notificationSettings || {}),
    };
  }
}