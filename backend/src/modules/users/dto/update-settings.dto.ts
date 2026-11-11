import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsObject } from 'class-validator';

export class UpdatePrivacySettingsDto {
  @ApiPropertyOptional({ 
    description: 'Profile visibility', 
    example: { 
      profileVisibleTo: 'ALL', // ALL, REGISTERED_USERS, FRIENDS_ONLY, PRIVATE
      showEmail: false,
      showPhone: false,
      showOnlineStatus: true,
      searchable: true
    }
  })
  @IsOptional()
  @IsObject()
  privacySettings?: Record<string, any>;
}

export class UpdateNotificationSettingsDto {
  @ApiPropertyOptional({ 
    description: 'Notification preferences', 
    example: { 
      emailNotifications: true,
      pushNotifications: true,
      marketingEmails: false,
      securityAlerts: true,
      weeklyDigest: true,
      mentionNotifications: true
    }
  })
  @IsOptional()
  @IsObject()
  notificationSettings?: Record<string, any>;
}