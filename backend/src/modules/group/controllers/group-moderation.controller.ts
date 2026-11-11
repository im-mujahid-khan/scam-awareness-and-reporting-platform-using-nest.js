import { 
  Controller, Get, Post, Delete, Body, 
  Param, Query, UseGuards, Request 
} from '@nestjs/common';
import { 
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery 
} from '@nestjs/swagger';
import { GroupModerationService } from '../services/group-moderation.service';
import { RemoveMemberDto } from '../dto/moderation.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GroupAdminGuard } from '../guards/group-admin.guard';

@ApiTags('Group Moderation')
@ApiBearerAuth('bearer')
@Controller('groups/:groupId/moderation')
export class GroupModerationController {
  constructor(private readonly moderationService: GroupModerationService) {}

  @Post('admins/:userId')
  @UseGuards(JwtAuthGuard, GroupAdminGuard)
  @ApiOperation({ summary: 'Assign admin role to member (Admin only)' })
  @ApiResponse({ status: 200, description: 'Admin role assigned' })
  @ApiResponse({ status: 403, description: 'Only group admins can assign roles' })
  @ApiParam({ name: 'groupId', example: 'grp_123456789' })
  @ApiParam({ name: 'userId', example: 'usr_123456789' })
  async assignAdminRole(
    @Param('groupId') groupId: string,
    @Param('userId') userId: string,
    @Request() req,
  ) {
    return this.moderationService.assignAdminRole(groupId, userId, req.user.id);
  }

  @Delete('members/:userId')
  @UseGuards(JwtAuthGuard, GroupAdminGuard)
  @ApiOperation({ summary: 'Remove member from group (Admin only)' })
  @ApiResponse({ status: 200, description: 'Member removed' })
  @ApiResponse({ status: 403, description: 'Only group admins can remove members' })
  @ApiParam({ name: 'groupId', example: 'grp_123456789' })
  @ApiParam({ name: 'userId', example: 'usr_123456789' })
  async removeMember(
    @Param('groupId') groupId: string,
    @Param('userId') userId: string,
    @Request() req,
    @Body() dto: RemoveMemberDto,
  ) {
    return this.moderationService.removeMember(groupId, userId, req.user.id, dto.reason);
  }

  @Get('logs')
  @UseGuards(JwtAuthGuard, GroupAdminGuard)
  @ApiOperation({ summary: 'Get moderation logs (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of moderation logs' })
  @ApiResponse({ status: 403, description: 'Only group admins can view logs' })
  @ApiParam({ name: 'groupId', example: 'grp_123456789' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async getModerationLogs(
    @Param('groupId') groupId: string,
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.moderationService.getModerationLogs(groupId, req.user.id, page, limit);
  }
}