import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { GroupService } from '../services/group.service';
import { CreateGroupDto } from '../dto/create-group.dto';
import { UpdateGroupDto } from '../dto/update-group.dto';
import { JoinGroupDto, HandleJoinRequestDto } from '../dto/join-group.dto';
import { SearchGroupsDto } from '../dto/group-search.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GroupAdminGuard } from '../guards/group-admin.guard';
import { GroupMemberGuard } from '../guards/group-member.guard';
import {
  JoinedGroupsResponseDto,
  JoinedGroupsQueryDto,
} from '../dto/joined-groups.dto';

@ApiTags('Groups')
@ApiBearerAuth()
@Controller('groups')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Get('joined')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get list of groups user has joined',
    description: 'Returns paginated list of groups where the user is a member',
  })
  @ApiResponse({
    status: 200,
    description: 'List of joined groups',
    type: JoinedGroupsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getJoinedGroups(
    @Request() req,
    @Query() query: JoinedGroupsQueryDto,
  ): Promise<JoinedGroupsResponseDto> {
    return this.groupService.getJoinedGroups(req.user.id, query);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new group' })
  @ApiResponse({ status: 201, description: 'Group created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only company admins can create official groups',
  })
  async createGroup(@Request() req, @Body() dto: CreateGroupDto) {
    return this.groupService.createGroup(req.user.id, dto);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get group by slug' })
  @ApiResponse({ status: 200, description: 'Group details' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  @ApiParam({ name: 'slug', example: 'scam-alert-pakistan' })
  async getGroup(@Param('slug') slug: string, @Request() req) {
    const userId = req.user?.id;
    return this.groupService.getGroupBySlug(slug, userId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, GroupAdminGuard)
  @ApiOperation({ summary: 'Update group' })
  @ApiResponse({ status: 200, description: 'Group updated' })
  @ApiResponse({ status: 403, description: 'Only group admins can update' })
  @ApiParam({ name: 'id', example: 'grp_123456789' })
  async updateGroup(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.groupService.updateGroup(id, req.user.id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, GroupAdminGuard)
  @ApiOperation({ summary: 'Delete group (soft delete)' })
  @ApiResponse({ status: 200, description: 'Group deleted' })
  @ApiResponse({ status: 403, description: 'Only group admins can delete' })
  @ApiParam({ name: 'id', example: 'grp_123456789' })
  async deleteGroup(@Param('id') id: string, @Request() req) {
    return this.groupService.deleteGroup(id, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Search and filter groups' })
  @ApiResponse({ status: 200, description: 'List of groups' })
  async searchGroups(@Query() dto: SearchGroupsDto, @Request() req) {
    const userId = req.user?.id;
    return this.groupService.searchGroups(dto, userId);
  }

  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Join a group' })
  @ApiResponse({
    status: 200,
    description: 'Joined successfully or request submitted',
  })
  @ApiResponse({ status: 403, description: 'Cannot join official group' })
  @ApiResponse({ status: 409, description: 'Already a member' })
  @ApiParam({ name: 'id', example: 'grp_123456789' })
  async joinGroup(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: JoinGroupDto,
  ) {
    return this.groupService.joinGroup(id, req.user.id, dto);
  }

  @Post(':id/leave')
  @UseGuards(JwtAuthGuard, GroupMemberGuard)
  @ApiOperation({ summary: 'Leave a group' })
  @ApiResponse({ status: 200, description: 'Left group successfully' })
  @ApiResponse({ status: 403, description: 'Cannot leave as only admin' })
  @ApiResponse({ status: 409, description: 'Not a member' })
  @ApiParam({ name: 'id', example: 'grp_123456789' })
  async leaveGroup(@Param('id') id: string, @Request() req) {
    return this.groupService.leaveGroup(id, req.user.id);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get group members' })
  @ApiResponse({ status: 200, description: 'List of group members' })
  @ApiParam({ name: 'id', example: 'grp_123456789' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async getGroupMembers(
    @Param('id') id: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.groupService.getGroupMembers(id, page, limit);
  }

  @Post(':id/follow')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Follow a group' })
  @ApiResponse({ status: 200, description: 'Following group' })
  @ApiResponse({ status: 409, description: 'Already following' })
  @ApiParam({ name: 'id', example: 'grp_123456789' })
  async followGroup(@Param('id') id: string, @Request() req) {
    return this.groupService.followGroup(id, req.user.id);
  }

  @Delete(':id/follow')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Unfollow a group' })
  @ApiResponse({ status: 200, description: 'Unfollowed group' })
  @ApiResponse({ status: 409, description: 'Not following' })
  @ApiParam({ name: 'id', example: 'grp_123456789' })
  async unfollowGroup(@Param('id') id: string, @Request() req) {
    return this.groupService.unfollowGroup(id, req.user.id);
  }

  @Get(':id/join-requests')
  @UseGuards(JwtAuthGuard, GroupAdminGuard)
  @ApiOperation({ summary: 'Get pending join requests (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of pending requests' })
  @ApiResponse({ status: 403, description: 'Only group admins can view' })
  @ApiParam({ name: 'id', example: 'grp_123456789' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async getPendingRequests(
    @Param('id') id: string,
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.groupService.getPendingRequests(id, req.user.id, page, limit);
  }

  @Post(':id/join-requests/:requestId')
  @UseGuards(JwtAuthGuard, GroupAdminGuard)
  @ApiOperation({ summary: 'Approve/Reject join request (Admin only)' })
  @ApiResponse({ status: 200, description: 'Request handled' })
  @ApiResponse({ status: 403, description: 'Only group admins can handle' })
  @ApiParam({ name: 'id', example: 'grp_123456789' })
  @ApiParam({ name: 'requestId', example: 'req_123456789' })
  async handleJoinRequest(
    @Param('id') id: string,
    @Param('requestId') requestId: string,
    @Request() req,
    @Body() dto: HandleJoinRequestDto,
  ) {
    return this.groupService.handleJoinRequest(
      id,
      requestId,
      req.user.id,
      dto.action,
    );
  }
}
