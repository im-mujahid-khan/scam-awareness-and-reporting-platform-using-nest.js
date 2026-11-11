import { 
  Controller, 
  Post, 
  Delete, 
  Get,
  Body, 
  Param, 
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
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CompanyAdminGuard } from '../guards/company-admin.guard';
import { CompanyStaffService } from '../services/company-staff.service';
import { AddStaffDto } from '../dto/add-staff.dto';
import { StaffResponseDto } from '../dto/staff-response.dto';

@ApiTags('Company Staff')
@Controller('companies/:id/staff')
@UseGuards(JwtAuthGuard)
export class CompanyStaffController {
  constructor(private readonly companyStaffService: CompanyStaffService) {}

  @Post()
  @UseGuards(CompanyAdminGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Add staff member to company',
    description: 'Add a new staff member to the company. Only company administrators can perform this action.'
  })
  @ApiBearerAuth('bearer')
  @ApiParam({
    name: 'id',
    description: 'Company ID',
    type: String,
  })
  @ApiBody({ type: AddStaffDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Staff member added successfully',
    type: StaffResponseDto 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - invalid data or user is deactivated' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Forbidden - only administrators can add staff' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Not found - company or user not found' 
  })
  @ApiResponse({ 
    status: 409, 
    description: 'Conflict - user is already a staff member' 
  })
  async addStaff(
    @Param('id') companyId: string,
    @Body() addStaffDto: AddStaffDto,
    @Request() req,
  ): Promise<StaffResponseDto> {
    return this.companyStaffService.addStaffMember(companyId, addStaffDto, req.user.id);
  }

  @Delete(':userId')
  @UseGuards(CompanyAdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Remove staff member from company',
    description: 'Remove a staff member from the company. Only company administrators can perform this action.'
  })
  @ApiBearerAuth('bearer')
  @ApiParam({
    name: 'id',
    description: 'Company ID',
    type: String,
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID to remove',
    type: String,
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Staff member removed successfully',
    schema: {
      example: {
        message: 'Staff member removed successfully'
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - cannot remove yourself or company owner' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Forbidden - only administrators can remove staff' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Not found - company or staff member not found' 
  })
  async removeStaff(
    @Param('id') companyId: string,
    @Param('userId') userId: string,
    @Request() req,
  ): Promise<{ message: string }> {
    return this.companyStaffService.removeStaffMember(companyId, userId, req.user.id);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get company staff list',
    description: 'Get a list of all active staff members in the company. Requires authentication.'
  })
  @ApiBearerAuth('bearer')
  @ApiParam({
    name: 'id',
    description: 'Company ID',
    type: String,
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of staff members',
    type: [StaffResponseDto]
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Not found - company not found' 
  })
  async getCompanyStaff(
    @Param('id') companyId: string,
  ): Promise<StaffResponseDto[]> {
    return this.companyStaffService.getCompanyStaff(companyId);
  }
}