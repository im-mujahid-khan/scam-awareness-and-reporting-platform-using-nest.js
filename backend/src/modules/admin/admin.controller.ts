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
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminFilterDto } from './dto/admin-filter.dto';
import { ReviewPostDto } from './dto/review-post.dto';
import { ManageUserDto } from './dto/manage-user.dto';
import { ManageCompanyDto } from './dto/manage-company.dto';
import { ManageGroupDto } from './dto/manage-group.dto';
import { AnalyticsFilterDto } from './dto/analytics.dto';
import { UserRole } from '@prisma/client';


@ApiTags('Admin Panel')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard) // Use existing guards
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN) // Apply role restriction decorator
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ==================== POST MANAGEMENT ====================

  @Get('posts/review')
  @ApiOperation({ summary: 'Get posts for review' })
  @ApiResponse({ status: 200, description: 'Returns posts pending review' })
  async getPostsForReview(@Query() filter: AdminFilterDto) {
    return this.adminService.getPostsForReview(filter);
  }

  @Put('posts/:id/review')
  @ApiOperation({ summary: 'Review a post' })
  @ApiResponse({ status: 200, description: 'Post reviewed successfully' })
  async reviewPost(
    @Param('id') postId: string,
    @Body() data: ReviewPostDto,
    @Req() req: any,
  ) {
    return this.adminService.reviewPost(postId, req.user.id, data);
  }

  @Post('posts/bulk-review')
  @ApiOperation({ summary: 'Bulk review posts' })
  @ApiResponse({ status: 200, description: 'Posts reviewed in bulk' })
  async bulkReviewPosts(
    @Body() body: { postIds: string[]; data: ReviewPostDto },
    @Req() req: any,
  ) {
    return this.adminService.bulkReviewPosts(body.postIds, req.user.id, body.data);
  }

  // ==================== USER MANAGEMENT ====================

  @Get('users')
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'Returns list of users' })
  async getUsers(@Query() filter: AdminFilterDto) {
    return this.adminService.getUsers(filter);
  }

  @Put('users/:id/manage')
  @ApiOperation({ summary: 'Manage user (ban, warn, verify, etc.)' })
  @ApiResponse({ status: 200, description: 'User managed successfully' })
  async manageUser(
    @Param('id') userId: string,
    @Body() data: ManageUserDto,
    @Req() req: any,
  ) {
    return this.adminService.manageUser(userId, req.user.id, data);
  }

  // ==================== COMPANY MANAGEMENT ====================

  @Get('companies')
  @ApiOperation({ summary: 'Get all companies' })
  @ApiResponse({ status: 200, description: 'Returns list of companies' })
  async getCompanies(@Query() filter: AdminFilterDto) {
    return this.adminService.getCompanies(filter);
  }

  @Put('companies/:id/manage')
  @ApiOperation({ summary: 'Manage company verification' })
  @ApiResponse({ status: 200, description: 'Company managed successfully' })
  async manageCompany(
    @Param('id') companyId: string,
    @Body() data: ManageCompanyDto,
    @Req() req: any,
  ) {
    return this.adminService.manageCompany(companyId, req.user.id, data);
  }

  // ==================== COMMENT MANAGEMENT ====================

  @Get('comments/reported')
  @ApiOperation({ summary: 'Get reported comments' })
  @ApiResponse({ status: 200, description: 'Returns reported comments' })
  async getReportedComments(@Query() filter: AdminFilterDto) {
    return this.adminService.getReportedComments(filter);
  }

  @Put('comments/:id/:action')
  @ApiOperation({ summary: 'Manage comment (delete, restore, resolve)' })
  @ApiResponse({ status: 200, description: 'Comment managed successfully' })
  async manageComment(
    @Param('id') commentId: string,
    @Param('action') action: 'delete' | 'restore' | 'resolve',
    @Body() body: { reason?: string },
    @Req() req: any,
  ) {
    return this.adminService.manageComment(commentId, req.user.id, action, body.reason);
  }

  // ==================== MESSAGE REPORTS MANAGEMENT ====================

  @Get('messages/reported')
  @ApiOperation({ summary: 'Get reported messages' })
  @ApiResponse({ status: 200, description: 'Returns reported messages' })
  async getReportedMessages(@Query() filter: AdminFilterDto) {
    return this.adminService.getReportedMessages(filter);
  }

  @Put('message-reports/:id/review')
  @ApiOperation({ summary: 'Review message report' })
  @ApiResponse({ status: 200, description: 'Message report reviewed' })
  async reviewMessageReport(
    @Param('id') reportId: string,
    @Body() data: { status: string; resolution?: string },
    @Req() req: any,
  ) {
    return this.adminService.reviewMessageReport(reportId, req.user.id, {
      status: data.status as any,
      resolution: data.resolution,
    });
  }

  // ==================== GROUP MANAGEMENT ====================

  @Get('groups')
  @ApiOperation({ summary: 'Get all groups' })
  @ApiResponse({ status: 200, description: 'Returns list of groups' })
  async getGroups(@Query() filter: AdminFilterDto) {
    return this.adminService.getGroups(filter);
  }

  @Put('groups/:id/manage')
  @ApiOperation({ summary: 'Manage group (delete, restore, deactivate)' })
  @ApiResponse({ status: 200, description: 'Group managed successfully' })
  async manageGroup(
    @Param('id') groupId: string,
    @Body() data: ManageGroupDto,
    @Req() req: any,
  ) {
    return this.adminService.manageGroup(groupId, req.user.id, data);
  }

  // ==================== CATEGORIES & TAGS MANAGEMENT ====================

  @Get('scam-types')
  @ApiOperation({ summary: 'Get all scam types/categories' })
  @ApiResponse({ status: 200, description: 'Returns list of scam types' })
  async getScamTypes(@Query() filter: AdminFilterDto) {
    return this.adminService.getScamTypes(filter);
  }

  @Post('scam-types')
  @ApiOperation({ summary: 'Create new scam type' })
  @ApiResponse({ status: 201, description: 'Scam type created successfully' })
  async createScamType(@Body() data: { name: string; description?: string }) {
    return this.adminService.createScamType(data);
  }

  @Put('scam-types/:id')
  @ApiOperation({ summary: 'Update scam type' })
  @ApiResponse({ status: 200, description: 'Scam type updated successfully' })
  async updateScamType(
    @Param('id') scamTypeId: string,
    @Body() data: { name?: string; description?: string; isActive?: boolean },
  ) {
    return this.adminService.manageScamType(scamTypeId, data);
  }

  // ==================== ANALYTICS ====================

  @Get('analytics')
  @ApiOperation({ summary: 'Get system analytics' })
  @ApiResponse({ status: 200, description: 'Returns system analytics' })
  async getSystemAnalytics(@Query() filter: AnalyticsFilterDto) {
    return this.adminService.getSystemAnalytics(filter);
  }

  // ==================== GLOBAL SEARCH ====================

  @Get('search')
  @ApiOperation({ summary: 'Global content search' })
  @ApiResponse({ status: 200, description: 'Returns search results across all content' })
  @ApiQuery({ name: 'query', required: true })
  async globalSearch(
    @Query('query') query: string,
    @Query() filter: AdminFilterDto,
  ) {
    return this.adminService.globalSearch(query, filter);
  }

  // ==================== LOGS & MODERATION HISTORY ====================

  @Get('audit-logs')
  @ApiOperation({ summary: 'Get audit logs' })
  @ApiResponse({ status: 200, description: 'Returns audit logs' })
  async getAuditLogs(@Query() filter: AdminFilterDto) {
    return this.adminService.getAuditLogs(filter);
  }

  @Get('moderation-history')
  @ApiOperation({ summary: 'Get moderation history' })
  @ApiResponse({ status: 200, description: 'Returns moderation history' })
  async getModerationHistory(@Query() filter: AdminFilterDto) {
    return this.adminService.getModerationHistory(filter);
  }
}