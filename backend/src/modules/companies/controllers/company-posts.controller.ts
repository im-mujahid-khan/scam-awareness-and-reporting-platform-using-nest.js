// src/modules/companies/controllers/company-posts.controller.ts
import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CompanyStaffGuard } from '../guards/company-staff.guard';
import { CompanyAdminGuard } from '../guards/company-admin.guard';
import { CompanyPostsService } from '../services/company-posts.service';
import { CreateCompanyPostDto } from '../dto/create-company-post.dto';
import { UpdateCompanyPostDto } from '../dto/update-company-post.dto';
import { PostResponseDto } from '../dto/post-response.dto';

@ApiTags('Company Posts')
@Controller('companies/:companyId/posts')
@UseGuards(JwtAuthGuard, CompanyStaffGuard)
export class CompanyPostsController {
  constructor(private readonly companyPostsService: CompanyPostsService) {}

  @Post('awareness')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create awareness post',
    description:
      'Create an official awareness post as a company. Requires staff access.',
  })
  @ApiBearerAuth('bearer')
  @ApiParam({ name: 'companyId', description: 'Company ID', type: String })
  @ApiResponse({
    status: 201,
    description: 'Awareness post created successfully',
    type: PostResponseDto,
  })
  async createAwarenessPost(
    @Param('companyId') companyId: string,
    @Body() createPostDto: CreateCompanyPostDto,
    @Request() req,
  ): Promise<PostResponseDto> {
    return this.companyPostsService.createAwarenessPost(
      companyId,
      createPostDto,
      req.user.id,
    );
  }

  @Post('warning')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create official warning',
    description:
      'Create an official scam warning as a company. Requires staff access.',
  })
  @ApiBearerAuth('bearer')
  @ApiParam({ name: 'companyId', description: 'Company ID', type: String })
  @ApiResponse({
    status: 201,
    description: 'Official warning created successfully',
    type: PostResponseDto,
  })
  async createOfficialWarning(
    @Param('companyId') companyId: string,
    @Body() createPostDto: CreateCompanyPostDto,
    @Request() req,
  ): Promise<PostResponseDto> {
    return this.companyPostsService.createOfficialWarning(
      companyId,
      createPostDto,
      req.user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get company posts' })
  @ApiParam({ name: 'companyId', description: 'Company ID', type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['AWARENESS', 'WARNING', 'ALL'],
    example: 'ALL',
  })
  @ApiResponse({
    status: 200,
    description: 'List of company posts',
    schema: {
      example: {
        data: [
          {
            id: 'post_123',
            title: 'Beware of Phishing Scams',
            postType: 'SCAM_AWARENESS',
            publishedAt: '2024-01-15T10:30:00.000Z',
            reactionCounts: { like: 45, upvote: 23 },
            bookmarkCount: 12,
          },
        ],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      },
    },
  })
  async getCompanyPosts(
    @Param('companyId') companyId: string,
    @Request() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
    @Query('type') type: string = 'ALL',
  ) {
    const safeLimit = Math.min(limit, 50);
    // IMPORTANT: Match the parameter order exactly as in the service
    return this.companyPostsService.getCompanyPosts(
      companyId, // 1st parameter - required
      req.user.id, // 2nd parameter - required
      page, // 3rd parameter - optional
      safeLimit, // 4th parameter - optional
      type, // 5th parameter - optional
    );
  }

  @Put(':postId')
  @ApiOperation({ summary: 'Update company post' })
  @ApiParam({ name: 'companyId', type: String })
  @ApiParam({ name: 'postId', type: String })
  @ApiResponse({
    status: 200,
    description: 'Post updated successfully',
    type: PostResponseDto,
  })
  async updatePost(
    @Param('companyId') companyId: string,
    @Param('postId') postId: string,
    @Body() updatePostDto: UpdateCompanyPostDto,
    @Request() req,
  ): Promise<PostResponseDto> {
    return this.companyPostsService.updatePost(
      companyId,
      postId,
      updatePostDto,
      req.user.id,
    );
  }

  @Delete(':postId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete company post' })
  @ApiParam({ name: 'companyId', type: String })
  @ApiParam({ name: 'postId', type: String })
  @ApiResponse({
    status: 200,
    description: 'Post deleted successfully',
    schema: { example: { message: 'Post deleted successfully' } },
  })
  async deletePost(
    @Param('companyId') companyId: string,
    @Param('postId') postId: string,
    @Request() req,
  ): Promise<{ message: string }> {
    return this.companyPostsService.deletePost(companyId, postId, req.user.id);
  }
  @Get('stats')
  @UseGuards(JwtAuthGuard, CompanyAdminGuard)
  @ApiBearerAuth() // Add this line to show authorization in Swagger
  @ApiOperation({ summary: 'Get post statistics' })
  @ApiParam({ name: 'companyId', type: String })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Post statistics' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only admins can view statistics',
  })
  async getPostStats(
    @Param('companyId') companyId: string,
    @Request() req,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.companyPostsService.getPostStats(
      companyId,
      req.user.id,
      from,
      to,
    );
  }
}
