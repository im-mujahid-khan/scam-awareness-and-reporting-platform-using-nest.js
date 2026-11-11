// src/modules/companies/controllers/company-followers.controller.ts
import { 
  Controller, 
  Post, 
  Delete, 
  Get,
  Param, 
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
  DefaultValuePipe,
  ParseIntPipe
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
import { CompanyFollowersService } from '../services/company-followers.service';

@ApiTags('Company Followers')
@Controller('companies/:id/followers')
export class CompanyFollowersController {
  constructor(private readonly companyFollowersService: CompanyFollowersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Follow a company',
    description: 'Follow a company to receive updates. Requires authentication.'
  })
  @ApiBearerAuth('bearer')
  @ApiParam({
    name: 'id',
    description: 'Company ID',
    type: String,
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Company followed successfully',
    schema: {
      example: {
        followed: true,
        message: 'Company followed successfully'
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Company not found' 
  })
  async followCompany(
    @Param('id') companyId: string,
    @Request() req,
  ): Promise<{ followed: boolean; message: string }> {
    return this.companyFollowersService.followCompany(companyId, req.user.id);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Unfollow a company',
    description: 'Unfollow a company. Requires authentication.'
  })
  @ApiBearerAuth('bearer')
  @ApiParam({
    name: 'id',
    description: 'Company ID',
    type: String,
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Company unfollowed successfully',
    schema: {
      example: {
        unfollowed: true,
        message: 'Company unfollowed successfully'
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Company not found' 
  })
  async unfollowCompany(
    @Param('id') companyId: string,
    @Request() req,
  ): Promise<{ unfollowed: boolean; message: string }> {
    return this.companyFollowersService.unfollowCompany(companyId, req.user.id);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get company followers',
    description: 'Get a paginated list of users following this company.'
  })
  @ApiParam({
    name: 'id',
    description: 'Company ID',
    type: String,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 20, max: 50)',
    type: Number,
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of followers',
    schema: {
      example: {
        followers: [
          {
            id: 'user_123',
            displayName: 'John Doe',
            avatarUrl: 'https://example.com/avatar.jpg',
            followedAt: '2025-02-17T10:30:00.000Z'
          }
        ],
        total: 150,
        page: 1,
        limit: 20,
        totalPages: 8
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Company not found' 
  })
  async getCompanyFollowers(
    @Param('id') companyId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const safeLimit = Math.min(limit, 50);
    return this.companyFollowersService.getCompanyFollowers(companyId, page, safeLimit);
  }

  @Get('check')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: 'Check if user follows company',
    description: 'Check if the authenticated user follows this company.'
  })
  @ApiBearerAuth('bearer')
  @ApiParam({
    name: 'id',
    description: 'Company ID',
    type: String,
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Follow status',
    schema: {
      example: {
        isFollowing: true
      }
    }
  })
  async checkFollowStatus(
    @Param('id') companyId: string,
    @Request() req,
  ): Promise<{ isFollowing: boolean }> {
    const isFollowing = await this.companyFollowersService.isFollowing(companyId, req.user.id);
    return { isFollowing };
  }
}