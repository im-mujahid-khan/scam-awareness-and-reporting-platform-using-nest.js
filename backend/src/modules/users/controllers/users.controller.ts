import { 
  Controller, 
  Get, 
  Put, 
  Delete, 
  Body, 
  UseGuards, 
  Request, 
  HttpCode, 
  HttpStatus,
  UseInterceptors,
  Param,
  Post,
  ForbiddenException
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse
} from '@nestjs/swagger';
import { UsersService } from '../services/users.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OwnershipGuard } from '../guards/ownership.guard';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { UpdatePrivacySettingsDto, UpdateNotificationSettingsDto } from '../dto/update-settings.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { SafeSerializeInterceptor } from '../../../interceptors/safe-serialize.interceptor';

@ApiTags('Users')
@Controller('users')
@UseInterceptors(SafeSerializeInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ==================== USER PROFILE ENDPOINTS ====================

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Get current user profile',
    description: 'Returns the complete profile of the currently authenticated user'
  })
  @ApiOkResponse({ 
    description: 'User profile retrieved successfully',
    type: UserResponseDto
  })
  @ApiUnauthorizedResponse({ 
    description: 'Missing or invalid authentication token' 
  })
  @ApiNotFoundResponse({ 
    description: 'User not found' 
  })
  async getCurrentUser(@Request() req): Promise<UserResponseDto> {
    const user = await this.usersService.getProfile(req.user.id);
    return user as UserResponseDto;
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Update current user profile',
    description: 'Update profile information for the authenticated user'
  })
  @ApiBody({ type: UpdateProfileDto })
  @ApiOkResponse({ 
    description: 'Profile updated successfully',
    type: UserResponseDto
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid input data' 
  })
  @ApiUnauthorizedResponse({ 
    description: 'Missing or invalid authentication token' 
  })
  @ApiNotFoundResponse({ 
    description: 'User not found' 
  })
  @ApiForbiddenResponse({ 
    description: 'Permission denied' 
  })
  async updateCurrentUser(@Request() req, @Body() updateProfileDto: UpdateProfileDto): Promise<UserResponseDto> {
    const user = await this.usersService.updateProfile(req.user.id, updateProfileDto);
    return user as UserResponseDto;
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Soft delete current user account',
    description: 'Deactivate user account (soft delete). Account can be restored within 30 days.'
  })
  @ApiOkResponse({ 
    description: 'Account deactivated successfully',
    schema: {
      example: {
        message: 'User account deactivated successfully',
        note: 'Account can be restored within 30 days',
        deletionTime: '2024-01-15T10:30:00.000Z'
      }
    }
  })
  @ApiUnauthorizedResponse({ 
    description: 'Missing or invalid authentication token' 
  })
  @ApiNotFoundResponse({ 
    description: 'User not found' 
  })
  async deleteCurrentUser(@Request() req): Promise<{ message: string; note: string; deletionTime: string }> {
    return this.usersService.softDeleteUser(req.user.id);
  }

  // ==================== PRIVACY SETTINGS ====================

  @Put('me/privacy')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Update privacy settings',
    description: 'Update privacy preferences and visibility settings'
  })
  @ApiBody({ type: UpdatePrivacySettingsDto })
  @ApiOkResponse({ 
    description: 'Privacy settings updated successfully',
    schema: {
      example: {
        message: 'Privacy settings updated successfully',
        user: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          displayName: 'John Doe',
          privacySettings: {
            profileVisibleTo: 'ALL',
            showEmail: false,
            showPhone: false
          },
          updatedAt: '2024-01-15T10:30:00.000Z'
        }
      }
    }
  })
  async updatePrivacySettings(@Request() req, @Body() settingsDto: UpdatePrivacySettingsDto) {
    return this.usersService.updatePrivacySettings(req.user.id, settingsDto);
  }

  // ==================== NOTIFICATION SETTINGS ====================

  @Put('me/notifications')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Update notification settings',
    description: 'Update notification preferences and delivery methods'
  })
  @ApiBody({ type: UpdateNotificationSettingsDto })
  @ApiOkResponse({ 
    description: 'Notification settings updated successfully',
    schema: {
      example: {
        message: 'Notification settings updated successfully',
        user: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          displayName: 'John Doe',
          notificationSettings: {
            emailNotifications: true,
            pushNotifications: true,
            marketingEmails: false
          },
          updatedAt: '2024-01-15T10:30:00.000Z'
        }
      }
    }
  })
  async updateNotificationSettings(@Request() req, @Body() settingsDto: UpdateNotificationSettingsDto) {
    return this.usersService.updateNotificationSettings(req.user.id, settingsDto);
  }

  // ==================== ADMIN/RESTORE ENDPOINTS ====================

  @Post(':id/restore')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Restore soft deleted user (Admin)',
    description: 'Restore a soft deleted user account. Requires admin privileges.'
  })
  @ApiOkResponse({ 
    description: 'User restored successfully',
    schema: {
      example: {
        message: 'User account restored successfully',
        user: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'user@example.com',
          isActive: true,
          isDeleted: false
        }
      }
    }
  })
  @ApiUnauthorizedResponse({ 
    description: 'Missing or invalid authentication token' 
  })
  @ApiForbiddenResponse({ 
    description: 'Admin privileges required' 
  })
  async restoreUser(@Param('id') userId: string, @Request() req) {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Admin privileges required');
    }
    
    return this.usersService.restoreUser(userId);
  }

  // ==================== GET USER BY ID (Public/Admin) ====================

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Get user by ID',
    description: 'Get user profile by ID. Returns public information based on privacy settings.'
  })
  @ApiOkResponse({ 
    description: 'User profile retrieved successfully',
    type: UserResponseDto
  })
  @ApiNotFoundResponse({ 
    description: 'User not found' 
  })
 async getUserById(@Param('id') userId: string, @Request() req) {
  // Admin can see any user, regular users can only see themselves
  if (req.user.role !== 'ADMIN' && req.user.id !== userId) {
    throw new ForbiddenException('You can only view your own profile');
  }

  const user = await this.usersService.getProfile(userId);
  
  // Apply privacy settings for non-admin requests
  if (req.user.role !== 'ADMIN' && req.user.id !== userId) {
    const privacySettings = user.privacySettings as Record<string, any> || {};
    
    // Instead of delete, set to null
    if (!privacySettings.showEmail) user.email = null;
    if (!privacySettings.showPhone) user.phone = null;
    
    // Add more privacy filters as needed
    if (!privacySettings.showLocation) user.location = null;
    if (!privacySettings.showDateOfBirth) user.dateOfBirth = null;
  }

  return user as UserResponseDto;
}
}