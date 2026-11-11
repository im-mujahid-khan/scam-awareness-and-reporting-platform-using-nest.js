import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Delete,
  UseGuards,
  Request,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { SearchService } from '../services/search.service';
import {
  SearchQueryDto,
  FollowIdentityDto,
  SearchResponseDto,
  IdentityProfileResponseDto,
  AutocompleteResponseDto,
  NoResultsResponseDto,
  SearchHistoryResponseDto,
} from '../dtos/search.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Search System')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Search for scam identities',
    description:
      'Search for phone numbers, emails, websites, social media handles, crypto wallets, or keywords.',
  })
  @ApiBody({
    type: SearchQueryDto,
    examples: {
      'Phone Search': {
        value: {
          query: '+1234567890',
          type: 'PHONE',
          country: 'US',
          page: 1,
          limit: 20,
        },
      },
      'Email Search': {
        value: {
          query: 'example@domain.com',
          type: 'EMAIL',
          page: 1,
          limit: 20,
        },
      },
      'Website Search': {
        value: {
          query: 'https://scam-website.com',
          type: 'WEBSITE',
          page: 1,
          limit: 20,
        },
      },
      'Keyword Search': {
        value: {
          query: 'tech support',
          type: 'KEYWORD',
          page: 1,
          limit: 20,
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Search results found',
    type: SearchResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'No results found',
    type: NoResultsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid search parameters',
  })
  async search(@Body() searchQuery: SearchQueryDto, @Request() req) {
    return await this.searchService.search(searchQuery, req.user?.id);
  }

  @Get('autocomplete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get search autocomplete suggestions',
    description:
      'Returns recent searches and popular suggestions based on query.',
  })
  @ApiQuery({
    name: 'query',
    type: String,
    required: true,
    description: 'Partial search query',
    example: '+123',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Autocomplete suggestions',
    type: AutocompleteResponseDto,
  })
  async autocomplete(@Query('query') query: string, @Request() req) {
    return await this.searchService.getAutocomplete(query, req.user?.id);
  }

  @Post('follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Follow an identity for alerts',
    description:
      'Follow a phone number, email, website, etc. to receive alerts for new reports.',
  })
  @ApiBody({
    type: FollowIdentityDto,
    examples: {
      'Follow Phone': {
        value: {
          identity: '+1234567890',
          type: 'PHONE',
          displayName: 'Suspicious Tech Support',
          alertsEnabled: true,
        },
      },
      'Follow Email': {
        value: {
          identity: 'scam@example.com',
          type: 'EMAIL',
          displayName: 'Phishing Email',
          alertsEnabled: true,
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Identity followed successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid identity or type',
  })
  async followIdentity(@Body() followDto: FollowIdentityDto, @Request() req) {
    return await this.searchService.followIdentity(
      followDto.identity,
      followDto.type,
      req.user.id,
      followDto.displayName,
      followDto.alertsEnabled,
    );
  }

  @Delete('follow/:identity')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Unfollow an identity',
    description: 'Stop following an identity and receiving alerts.',
  })
  @ApiParam({
    name: 'identity',
    type: String,
    description: 'Identity to unfollow',
    example: '+1234567890',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Identity unfollowed successfully',
  })
  async unfollowIdentity(@Param('identity') identity: string, @Request() req) {
    return await this.searchService.unfollowIdentity(identity, req.user.id);
  }

  @Get('followed')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get user's followed identities",
    description: 'Returns all identities that the user is currently following.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of followed identities',
  })
  async getFollowedIdentities(@Request() req) {
    return await this.searchService.getFollowedIdentities(req.user.id);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get user's search history",
    description: 'Returns recent searches made by the user.',
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: 'Number of history items to return',
    example: 20,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Search history',
    type: [SearchHistoryResponseDto],
  })
  async getSearchHistory(@Request() req, @Query('limit') limit?: number) {
    return await this.searchService.getSearchHistory(req.user.id, limit);
  }

  @Delete('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Clear user's search history",
    description: 'Delete all search history for the user.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Search history cleared',
  })
  async clearSearchHistory(@Request() req) {
    return await this.searchService.clearSearchHistory(req.user.id);
  }

  @Get('trending')
  @ApiOperation({
    summary: 'Get trending searches',
    description:
      'Returns popular searches across the platform (public endpoint).',
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: 'Number of trending items to return',
    example: 10,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trending searches',
  })
  async getTrendingSearches(@Query('limit') limit?: number) {
    return await this.searchService.getTrendingSearches(limit);
  }

  @Get('identity/:identity')
  @ApiOperation({
    summary: 'Get identity profile',
    description:
      'Get detailed profile for a specific identity (public endpoint, results may be limited for non-authenticated users).',
  })
  @ApiParam({
    name: 'identity',
    type: String,
    description: 'Identity to lookup',
    example: '+1234567890',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Identity profile',
    type: IdentityProfileResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'No results found',
    type: NoResultsResponseDto,
  })
  async getIdentityProfile(
    @Param('identity') identity: string,
    @Request() req,
  ) {
    // This is a simplified version - in practice you'd want to pass type detection
    const searchQuery: SearchQueryDto = {
      query: identity,
      page: 1,
      limit: 1,
    };

    const result = await this.searchService.search(searchQuery, req.user?.id);

    // Type guard to check if result has 'results' property
    if ('results' in result && result.results && result.results.length > 0) {
      return result.results[0];
    }

    // If it's a NoResultsResponseDto, return it as is
    return result;
  }
}
