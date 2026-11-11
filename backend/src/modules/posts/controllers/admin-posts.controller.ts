import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  BadRequestException,
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
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AdminReviewDto } from '../dto/admin-review.dto';

@ApiTags('Admin - Posts')
@Controller('admin/posts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MODERATOR)
@ApiBearerAuth()
export class AdminPostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get('under-review')
  @ApiOperation({ 
    summary: 'Get posts under review',
    description: 'Get all scam reports that have evidence and are pending admin approval'
  })
  @ApiQuery({ 
    name: 'page', 
    required: false, 
    type: Number,
    description: 'Page number',
    example: 1 
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    type: Number,
    description: 'Items per page',
    example: 20 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns posts under review' 
  })
  async getUnderReview(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.postsService.getPostsUnderReview(page, limit);
  }

  @Post(':id/review')
  @ApiOperation({ 
    summary: 'Review a post',
    description: 'Approve or reject a scam report that is under review'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Post reviewed successfully' 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid input data' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Post not found' 
  })
  async reviewPost(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: AdminReviewDto,
  ) {
    console.log('=== REVIEW POST REQUEST ===');
    console.log('Post ID:', id);
    console.log('Admin ID:', req.user.id);
    console.log('Review DTO:', dto);
    
    return this.postsService.reviewPost(req.user.id, id, dto);
  }
}