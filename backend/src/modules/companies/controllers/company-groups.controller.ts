// src/modules/companies/controllers/company-groups.controller.ts
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
import { CompanyAdminGuard } from '../guards/company-admin.guard';
import { CompanyGroupsService } from '../services/company-groups.service';
import { CreateCompanyGroupDto } from '../dto/create-company-group.dto';
import { UpdateCompanyGroupDto } from '../dto/update-company-group.dto';
import { GroupResponseDto } from '../dto/group-response.dto';

@ApiTags('Company Groups')
@Controller('companies/:companyId/groups')
@UseGuards(JwtAuthGuard)
export class CompanyGroupsController {
  constructor(private readonly companyGroupsService: CompanyGroupsService) {}

  @Post()
  @UseGuards(CompanyAdminGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Create official group',
    description: 'Create an official company group. Only company admins can perform this action.'
  })
  @ApiBearerAuth('bearer')
  @ApiParam({ name: 'companyId', description: 'Company ID', type: String })
  @ApiResponse({ 
    status: 201, 
    description: 'Official group created successfully',
    type: GroupResponseDto 
  })
  @ApiResponse({ status: 403, description: 'Only company admins can create groups' })
  async createOfficialGroup(
    @Param('companyId') companyId: string,
    @Body() createGroupDto: CreateCompanyGroupDto,
    @Request() req,
  ): Promise<GroupResponseDto> {
    return this.companyGroupsService.createOfficialGroup(companyId, createGroupDto, req.user.id);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get company groups',
    description: 'Get all official groups belonging to this company.'
  })
  @ApiParam({ name: 'companyId', description: 'Company ID', type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ 
    status: 200, 
    description: 'List of company groups',
    schema: {
      example: {
        data: [
          {
            id: 'group_123',
            name: 'Official Support Group',
            description: 'Get official support here',
            memberCount: 150,
            postCount: 45,
            createdAt: '2024-01-15T10:30:00.000Z'
          }
        ],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 }
      }
    }
  })
  async getCompanyGroups(
    @Param('companyId') companyId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const safeLimit = Math.min(limit, 50);
    return this.companyGroupsService.getCompanyGroups(companyId, page, safeLimit);
  }

  @Put(':groupId')
  @UseGuards(CompanyAdminGuard)
  @ApiOperation({ summary: 'Update official group' })
  @ApiParam({ name: 'companyId', description: 'Company ID', type: String })
  @ApiParam({ name: 'groupId', description: 'Group ID', type: String })
  @ApiResponse({ status: 200, description: 'Group updated successfully', type: GroupResponseDto })
  async updateOfficialGroup(
    @Param('companyId') companyId: string,
    @Param('groupId') groupId: string,
    @Body() updateGroupDto: UpdateCompanyGroupDto,
    @Request() req,
  ): Promise<GroupResponseDto> {
    return this.companyGroupsService.updateOfficialGroup(companyId, groupId, updateGroupDto, req.user.id);
  }

  @Delete(':groupId')
  @UseGuards(CompanyAdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete official group' })
  @ApiParam({ name: 'companyId', description: 'Company ID', type: String })
  @ApiParam({ name: 'groupId', description: 'Group ID', type: String })
  @ApiResponse({ 
    status: 200, 
    description: 'Group deleted successfully',
    schema: { example: { message: 'Group deleted successfully' } }
  })
  async deleteOfficialGroup(
    @Param('companyId') companyId: string,
    @Param('groupId') groupId: string,
    @Request() req,
  ): Promise<{ message: string }> {
    return this.companyGroupsService.deleteOfficialGroup(companyId, groupId, req.user.id);
  }

  @Get(':groupId/members')
  @ApiOperation({ summary: 'Get group members' })
  @ApiParam({ name: 'companyId', type: String })
  @ApiParam({ name: 'groupId', type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of group members' })
  async getGroupMembers(
    @Param('companyId') companyId: string,
    @Param('groupId') groupId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.companyGroupsService.getGroupMembers(companyId, groupId, page, limit);
  }
}