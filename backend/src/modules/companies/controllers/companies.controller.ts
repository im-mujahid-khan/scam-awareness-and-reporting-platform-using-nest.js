// src/modules/companies/controllers/companies.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
  UseInterceptors,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CompaniesService } from '../services/companies.service';
import { CreateCompanyDto } from '../dto/create-company.dto';
import { UpdateCompanyDto } from '../dto/update-company.dto';
import { CompanyResponseDto } from '../dto/company-response.dto';
import { CompanyOwnershipGuard } from '../guards/company-ownership.guard';
import { SafeSerializeInterceptor } from '../../../interceptors/safe-serialize.interceptor';
import { CompanyAnalyticsDto } from '../dto/company-analytics.dto';

@ApiTags('Companies')
@Controller('companies')
@UseInterceptors(SafeSerializeInterceptor)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {
    console.log('✅ CompaniesController initialized');
  }

  // ==================== GET ALL COMPANIES ENDPOINT ====================

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get all companies',
    description:
      'Returns a paginated list of all companies. Requires authentication.',
  })
  @ApiBearerAuth('bearer')
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 10, max: 50)',
    type: Number,
  })
  @ApiOkResponse({
    description: 'List of companies',
    schema: {
      example: {
        companies: [
          {
            id: 'clx2b3c4d5e6f7g8h9i0j1k',
            name: 'Tech Innovations Inc.',
            email: 'contact@techinnovations.com',
            industry: 'Technology',
            isVerified: false,
            staffCount: 1,
            createdAt: '2024-01-15T10:30:00.000Z',
            updatedAt: '2024-01-15T10:30:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
  async getAllCompanies(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const safeLimit = Math.min(limit, 50);
    const skip = (page - 1) * safeLimit;

    // Get total count and paginated companies
    const [companies, total] = await Promise.all([
      this.companiesService.getAllCompanies(skip, safeLimit),
      this.companiesService.getAllCompaniesCount(),
    ]);

    return {
      companies,
      total,
      page,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  // ==================== TEST ENDPOINTS ====================

  @Get('health-check')
  @ApiOperation({
    summary: 'Companies module health check',
    description: 'Simple endpoint to verify companies module is working',
  })
  @ApiOkResponse({
    description: 'Companies module is healthy',
    schema: {
      example: {
        status: 'healthy',
        module: 'companies',
        timestamp: '2024-01-15T10:30:00.000Z',
        endpoints: [
          'GET /companies - Get all companies',
          'POST /companies - Create company',
          'GET /companies/me - Get user companies',
          'GET /companies/:id - Get company details',
          'PUT /companies/:id - Update company',
        ],
      },
    },
  })
  async healthCheck() {
    return {
      status: 'healthy',
      module: 'companies',
      timestamp: new Date().toISOString(),
      endpoints: [
        'GET /companies - Get all companies',
        'POST /companies - Create company',
        'GET /companies/me - Get user companies',
        'GET /companies/:id - Get company details',
        'PUT /companies/:id - Update company',
      ],
    };
  }

  @Get('test')
  @ApiOperation({
    summary: 'Test endpoint',
    description: 'Test if companies endpoint is accessible',
  })
  @ApiOkResponse({
    description: 'Test successful',
    schema: {
      example: {
        message: 'Companies API is working!',
        timestamp: '2024-01-15T10:30:00.000Z',
        path: '/api/v1/companies/test',
        availableEndpoints: [
          'GET /companies',
          'POST /companies',
          'GET /companies/me',
          'GET /companies/:id',
          'PUT /companies/:id',
        ],
      },
    },
  })
  testRoute() {
    return {
      message: 'Companies API is working!',
      timestamp: new Date().toISOString(),
      path: '/api/v1/companies/test',
      availableEndpoints: [
        'GET /companies',
        'POST /companies',
        'GET /companies/me',
        'GET /companies/:id',
        'PUT /companies/:id',
      ],
    };
  }

  // ==================== CORE COMPANY ENDPOINTS ====================

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new company',
    description:
      'Authenticated users can create a new company. The creator becomes the company owner.',
  })
  @ApiBody({ type: CreateCompanyDto })
  @ApiBearerAuth('bearer')
  @ApiCreatedResponse({
    description: 'Company successfully created',
    type: CompanyResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
  })
  @ApiConflictResponse({
    description: 'Company name or email already exists',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
  async createCompany(
    @Body() createCompanyDto: CreateCompanyDto,
    @Request() req,
  ): Promise<CompanyResponseDto> {
    console.log('Create company request from user:', req.user?.id);
    return this.companiesService.createCompany(req.user.id, createCompanyDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Get current user's companies",
    description:
      'Returns a list of companies where the user is a staff member.',
  })
  @ApiBearerAuth('bearer')
  @ApiOkResponse({
    description: 'List of user companies',
    schema: {
      example: {
        companies: [],
        count: 0,
        message: 'User companies retrieved successfully',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
  async getUserCompanies(@Request() req) {
    const companies = await this.companiesService.getUserCompanies(req.user.id);
    return {
      companies,
      count: companies.length,
      message: 'User companies retrieved successfully',
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, CompanyOwnershipGuard)
  @ApiOperation({
    summary: 'Get company details',
    description:
      'Get detailed information about a specific company. User must be a staff member.',
  })
  @ApiParam({
    name: 'id',
    description: 'Company ID',
    type: String,
  })
  @ApiBearerAuth('bearer')
  @ApiOkResponse({
    description: 'Company details',
    type: CompanyResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Company not found',
  })
  @ApiForbiddenResponse({
    description: 'Access denied',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
  async getCompany(
    @Param('id') id: string,
    @Request() req,
  ): Promise<CompanyResponseDto> {
    return this.companiesService.findCompanyById(id, req.user.id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, CompanyOwnershipGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update company profile',
    description:
      'Update company information. Only company owners and admins can perform this action.',
  })
  @ApiParam({
    name: 'id',
    description: 'Company ID',
    type: String,
  })
  @ApiBody({ type: UpdateCompanyDto })
  @ApiBearerAuth('bearer')
  @ApiOkResponse({
    description: 'Company updated successfully',
    type: CompanyResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Company not found',
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions',
  })
  @ApiConflictResponse({
    description: 'Company name or email already exists',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
  async updateCompany(
    @Param('id') id: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
    @Request() req,
  ): Promise<CompanyResponseDto> {
    return this.companiesService.updateCompany(
      id,
      updateCompanyDto,
      req.user.id,
    );
  }

  @Get(':id/analytics')
  @UseGuards(JwtAuthGuard, CompanyOwnershipGuard)
  @ApiOperation({
    summary: 'Get company analytics dashboard',
    description:
      'Get analytics data for the company. Only company owners and admins can access this.',
  })
  @ApiParam({
    name: 'id',
    description: 'Company ID',
    type: String,
  })
  @ApiBearerAuth('bearer')
  @ApiOkResponse({
    description: 'Company analytics data',
    type: CompanyAnalyticsDto,
  })
  @ApiForbiddenResponse({
    description: 'Only owners and admins can view analytics',
  })
  async getCompanyAnalytics(
    @Param('id') id: string,
    @Request() req,
  ): Promise<CompanyAnalyticsDto> {
    return this.companiesService.getCompanyAnalytics(id, req.user.id);
  }
}
