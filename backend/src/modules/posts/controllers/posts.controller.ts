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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { PostsService } from '../services/posts.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PostEditDeleteGuard } from '../guards/post-edit-delete.guard';
import { CreateScamReportDto } from '../dto/create-scam-report.dto';
import { CreateAwarenessQuestionDto } from '../dto/create-awareness-question.dto';
import { UpdatePostDto } from '../dto/update-post.dto';

@ApiTags('Posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  // ==================== PUBLIC ENDPOINTS ====================

  @Get('feed')
  @ApiOperation({ summary: 'Get newsfeed posts' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns newsfeed posts' })
  async getFeed(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.postsService.getFeed(page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get post by ID' })
  @ApiResponse({ status: 200, description: 'Returns post details' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async getPost(@Param('id') id: string, @Request() req) {
    const userId = req.user?.id;
    return this.postsService.getPostById(id, userId);
  }

  // ==================== AUTHENTICATED ENDPOINTS ====================

  @Post('scam-report')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a scam report',
    description:
      'Creates a scam report with evidence. Reports with evidence go to admin review, reports without evidence are auto-published.',
  })
  @ApiResponse({
    status: 201,
    description:
      'Scam report created successfully. If evidence provided, it goes to admin review. If no evidence, it is auto-published.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid input data. Ensure sensitive data is masked (phone numbers, emails) with asterisks (*).',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createScamReport(@Request() req, @Body() dto: CreateScamReportDto) {
    return this.postsService.createScamReport(req.user.id, dto);
  }

  // Update createAwarenessOrQuestion method documentation:
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create awareness or question post',
    description:
      'Creates a scam awareness or question post. These are published immediately without admin review.',
  })
  @ApiResponse({
    status: 201,
    description: 'Post created successfully and published immediately',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createAwarenessOrQuestion(
    @Request() req,
    @Body() dto: CreateAwarenessQuestionDto,
  ) {
    return this.postsService.createAwarenessOrQuestion(req.user.id, dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, PostEditDeleteGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a post' })
  @ApiResponse({ status: 200, description: 'Post updated successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or edit window expired',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - not authorized' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async updatePost(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: UpdatePostDto,
  ) {
    return this.postsService.updatePost(req.user.id, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PostEditDeleteGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a post' })
  @ApiResponse({ status: 200, description: 'Post deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - not authorized' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async deletePost(@Param('id') id: string, @Request() req) {
    return this.postsService.deletePost(req.user.id, id);
  }

  @Post(':id/reactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle reaction on a post' })
  @ApiResponse({ status: 200, description: 'Reaction toggled' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async toggleReaction(
    @Param('id') id: string,
    @Request() req,
    @Body('type') type: string = 'like',
  ) {
    return this.postsService.toggleReaction(req.user.id, id, type);
  }

  @Post(':id/bookmarks')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle bookmark on a post' })
  @ApiResponse({ status: 200, description: 'Bookmark toggled' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async toggleBookmark(@Param('id') id: string, @Request() req) {
    return this.postsService.toggleBookmark(req.user.id, id);
  }

  @Get('user/my-posts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user posts' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns user posts' })
  async getUserPosts(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.postsService.getUserPosts(req.user.id, page, limit);
  }

  // ==================== FEEDS & DISCOVERY ENDPOINTS ====================

  @Get('feed/scam-reports')
  @ApiOperation({ summary: 'Get scam reports feed with filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'country', required: false, type: String })
  @ApiQuery({ name: 'region', required: false, type: String })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'scamTypeId', required: false, type: String })
  @ApiQuery({ name: 'fromDate', required: false, type: Date })
  @ApiQuery({ name: 'toDate', required: false, type: Date })
  @ApiQuery({ name: 'minLostAmount', required: false, type: Number })
  @ApiQuery({ name: 'maxLostAmount', required: false, type: Number })
  async getScamReportsFeed(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Request() req,
    @Query('country') country?: string,
    @Query('region') region?: string,
    @Query('city') city?: string,
    @Query('scamTypeId') scamTypeId?: string,
    @Query('fromDate') fromDate?: Date,
    @Query('toDate') toDate?: Date,
    @Query('minLostAmount') minLostAmount?: number,
    @Query('maxLostAmount') maxLostAmount?: number,
  ) {
    return this.postsService.getScamReportsFeed(page, limit, req.user?.id, {
      country,
      region,
      city,
      scamTypeId,
      fromDate,
      toDate,
      minLostAmount,
      maxLostAmount,
    });
  }

  @Get('feed/awareness')
  @ApiOperation({ summary: 'Get awareness feed' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'companyId', required: false, type: String })
  @ApiQuery({
    name: 'postType',
    required: false,
    enum: ['SCAM_AWARENESS', 'QUESTION'],
  })
  async getAwarenessFeed(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Request() req,
    @Query('companyId') companyId?: string,
    @Query('postType') postType?: 'SCAM_AWARENESS' | 'QUESTION',
  ) {
    return this.postsService.getAwarenessFeed(page, limit, req.user?.id, {
      companyId,
      postType,
      includeCompanyPosts: true,
    });
  }

  @Get('feed/groups')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get group feed - posts from joined groups' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getGroupFeed(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.postsService.getGroupFeed(req.user.id, page, limit);
  }

  @Get('discover')
  @ApiOperation({ summary: 'Get discover section' })
  async getDiscoverSection(@Request() req) {
    return this.postsService.getDiscoverSection(req.user?.id);
  }

  @Get('trending/categories')
  @ApiOperation({ summary: 'Get trending scam categories' })
  async getTrendingCategories() {
    return this.postsService.getTrendingScamCategories(); // Now works - method is public
  }

  @Get('trending/viral')
  @ApiOperation({ summary: 'Get viral scam alerts' })
  async getViralAlerts() {
    return this.postsService.getViralScamAlerts(); // Now works - method is public
  }

  @Get('groups/popular')
  @ApiOperation({ summary: 'Get popular groups' })
  async getPopularGroups() {
    return this.postsService.getPopularGroups(); // Now works - method is public
  }

  @Get('companies/suggested')
  @ApiOperation({ summary: 'Get suggested companies to follow' })
  async getSuggestedCompanies(@Request() req) {
    return this.postsService.getSuggestedCompanies(req.user?.id); // Now works - method is public
  }

  @Get('identities/recent')
  @ApiOperation({ summary: 'Get recently reported scam identities' })
  async getRecentIdentities() {
    return this.postsService.getRecentlyReportedIdentities(); // Now works - method is public
  }
}
