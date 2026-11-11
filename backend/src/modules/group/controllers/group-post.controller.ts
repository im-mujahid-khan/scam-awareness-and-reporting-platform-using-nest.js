import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
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
import { GroupPostService } from '../services/group-post.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GroupMemberGuard } from '../guards/group-member.guard';
import { GroupAdminGuard } from '../guards/group-admin.guard';
import {
  CreateGroupAwarenessQuestionDto,
  CreateGroupScamReportDto,
  UpdateGroupPostDto,
  UpdateGroupPostStatusDto,
  PinGroupPostDto,
  GroupPostResponseDto,
} from '../dto/group-post.dto';
import { GroupPostModerationStatus } from '@prisma/client';

@ApiTags('Group Posts')
@Controller('groups/:groupId/posts')
export class GroupPostController {
  constructor(private readonly groupPostService: GroupPostService) {}

  // Create awareness/question post
  @Post('awareness-question')
  @UseGuards(JwtAuthGuard, GroupMemberGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create awareness or question post in group',
    description: 'SCAM_AWARENESS or QUESTION post. If group requires approval, post goes to pending review unless user is group admin.',
  })
  @ApiParam({ name: 'groupId', example: 'grp_123456789' })
  @ApiResponse({ 
    status: 201, 
    description: 'Post created successfully',
    type: GroupPostResponseDto
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 403, description: 'Only group members can post' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  async createAwarenessQuestion(
    @Param('groupId') groupId: string,
    @Request() req,
    @Body() dto: CreateGroupAwarenessQuestionDto,
  ) {
    return this.groupPostService.createAwarenessQuestion(
      groupId,
      req.user.id,
      dto,
    );
  }

  // Create scam report post
  @Post('scam-report')
  @UseGuards(JwtAuthGuard, GroupMemberGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create scam report in group',
    description: 'SCAM_REPORT with evidence goes to platform review. Without evidence: if group requires approval, goes to group admin review unless user is group admin.',
  })
  @ApiParam({ name: 'groupId', example: 'grp_123456789' })
  @ApiResponse({ 
    status: 201, 
    description: 'Scam report created successfully',
    type: GroupPostResponseDto
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 403, description: 'Only group members can post' })
  async createScamReport(
    @Param('groupId') groupId: string,
    @Request() req,
    @Body() dto: CreateGroupScamReportDto,
  ) {
    return this.groupPostService.createScamReport(groupId, req.user.id, dto);
  }

  // Get all group posts (with filters)
  @Get()
  @ApiOperation({ summary: 'Get group posts' })
  @ApiParam({ name: 'groupId', example: 'grp_123456789' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['DRAFT', 'UNDER_REVIEW', 'PUBLISHED', 'REJECTED'],
  })
  @ApiQuery({
    name: 'postType',
    required: false,
    enum: ['SCAM_REPORT', 'SCAM_AWARENESS', 'QUESTION'],
  })
  @ApiQuery({
    name: 'moderationStatus',
    required: false,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'REMOVED'],
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of group posts',
    type: [GroupPostResponseDto]
  })
  @ApiResponse({ status: 404, description: 'Group not found' })
  async getGroupPosts(
    @Param('groupId') groupId: string,
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('status') status?: string,
    @Query('postType') postType?: string,
    @Query('moderationStatus') moderationStatus?: GroupPostModerationStatus,
  ) {
    const userId = req.user?.id;
    return this.groupPostService.getGroupPosts(groupId, userId, {
      page,
      limit,
      status,
      postType,
      moderationStatus,
    });
  }

  // Get pending posts (admin only)
  @Get('pending')
  @UseGuards(JwtAuthGuard, GroupAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get pending posts for review (Admin only)',
    description: 'Returns posts that need group admin approval',
  })
  @ApiParam({ name: 'groupId', example: 'grp_123456789' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ 
    status: 200, 
    description: 'List of pending posts',
    type: [GroupPostResponseDto]
  })
  @ApiResponse({
    status: 403,
    description: 'Only group admins can view pending posts',
  })
  async getPendingPosts(
    @Param('groupId') groupId: string,
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.groupPostService.getPendingPosts(groupId, req.user.id, page, limit);
  }

  // Update group post (only owner can update)
  @Put(':postId')
  @UseGuards(JwtAuthGuard, GroupMemberGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a group post',
    description: 'Only post owner can update within edit window (30 minutes)',
  })
  @ApiParam({ name: 'groupId', example: 'grp_123456789' })
  @ApiParam({ name: 'postId', example: 'post_123456789' })
  @ApiResponse({ 
    status: 200, 
    description: 'Post updated successfully',
    type: GroupPostResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or edit window expired',
  })
  @ApiResponse({ status: 403, description: 'Only post owner can update' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async updateGroupPost(
    @Param('groupId') groupId: string,
    @Param('postId') postId: string,
    @Request() req,
    @Body() dto: UpdateGroupPostDto,
  ) {
    return this.groupPostService.updateGroupPost(
      groupId,
      postId,
      req.user.id,
      dto,
    );
  }

  // Delete group post (only owner or admin can delete)
  @Delete(':postId')
  @UseGuards(JwtAuthGuard, GroupMemberGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a group post',
    description: 'Post owner can delete anytime. Group admins can delete any post.',
  })
  @ApiParam({ name: 'groupId', example: 'grp_123456789' })
  @ApiParam({ name: 'postId', example: 'post_123456789' })
  @ApiResponse({ 
    status: 200, 
    description: 'Post deleted successfully'
  })
  @ApiResponse({
    status: 403,
    description: 'Not authorized to delete this post',
  })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async deleteGroupPost(
    @Param('groupId') groupId: string,
    @Param('postId') postId: string,
    @Request() req,
  ) {
    return this.groupPostService.deleteGroupPost(groupId, postId, req.user.id);
  }

  // Pin/Unpin post (admin only)
  @Put(':postId/pin')
  @UseGuards(JwtAuthGuard, GroupAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Pin or unpin a group post (Admin only)',
    description: 'Group admins can pin important posts to top of feed',
  })
  @ApiParam({ name: 'groupId', example: 'grp_123456789' })
  @ApiParam({ name: 'postId', example: 'post_123456789' })
  @ApiResponse({
    status: 200,
    description: 'Post pinned/unpinned successfully',
    type: GroupPostResponseDto
  })
  @ApiResponse({ status: 403, description: 'Only group admins can pin posts' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async pinGroupPost(
    @Param('groupId') groupId: string,
    @Param('postId') postId: string,
    @Request() req,
    @Body() dto: PinGroupPostDto,
  ) {
    return this.groupPostService.pinGroupPost(
      groupId,
      postId,
      dto.pinned,
      req.user.id,
    );
  }

  // Approve/Reject post (admin only - can self-approve)
  @Put(':postId/status')
  @UseGuards(JwtAuthGuard, GroupAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Approve or reject a group post (Admin only)',
    description: 'Group admins can approve pending posts or reject inappropriate posts. Admins can approve their own posts.',
  })
  @ApiParam({ name: 'groupId', example: 'grp_123456789' })
  @ApiParam({ name: 'postId', example: 'post_123456789' })
  @ApiResponse({ 
    status: 200, 
    description: 'Post status updated successfully'
  })
  @ApiResponse({
    status: 403,
    description: 'Only group admins can change post status',
  })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async updatePostStatus(
    @Param('groupId') groupId: string,
    @Param('postId') postId: string,
    @Request() req,
    @Body() dto: UpdateGroupPostStatusDto,
  ) {
    return this.groupPostService.updatePostStatus(
      groupId,
      postId,
      req.user.id,
      dto.status,
      dto.reason,
    );
  }
}