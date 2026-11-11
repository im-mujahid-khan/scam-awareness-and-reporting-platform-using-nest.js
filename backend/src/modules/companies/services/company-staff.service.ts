// src/modules/companies/services/company-staff.service.ts
import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AddStaffDto, StaffRole } from '../dto/add-staff.dto';
import { StaffResponseDto } from '../dto/staff-response.dto';

@Injectable()
export class CompanyStaffService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async addStaffMember(
  companyId: string, 
  addStaffDto: AddStaffDto, 
  requesterUserId: string
): Promise<StaffResponseDto> {
  console.log('👥 Adding staff:', { companyId, email: addStaffDto.userEmail });
  
  // Check if company exists
  const company = await this.prisma.company.findUnique({
    where: { id: companyId },
  });

  if (!company) {
    throw new NotFoundException('Company not found');
  }

  // Check if requester is ADMIN or OWNER
  const requesterRole = await this.getUserRoleInCompany(companyId, requesterUserId);
  if (requesterRole !== 'ADMIN' && requesterRole !== 'OWNER') {
    throw new ForbiddenException('Only company administrators can add staff');
  }

  // Find user by email
  const user = await this.prisma.user.findUnique({
    where: { email: addStaffDto.userEmail },
    select: {
      id: true,
      email: true,
      displayName: true,
      isActive: true,
    },
  });

  if (!user) {
    throw new NotFoundException('User not found with this email');
  }

  if (!user.isActive) {
    throw new BadRequestException('User account is deactivated');
  }

  // FIX: Check if user is already ACTIVE staff in this company
  const existingActiveStaff = await this.prisma.companyStaff.findFirst({
    where: {
      companyId,
      userId: user.id,
      isActive: true, // Only check active staff
    },
  });

  if (existingActiveStaff) {
    console.log('⚠️ User already active staff:', existingActiveStaff);
    throw new ConflictException('User is already a staff member of this company');
  }

  // Check if there's an INACTIVE record we can reactivate
  const inactiveStaff = await this.prisma.companyStaff.findFirst({
    where: {
      companyId,
      userId: user.id,
      isActive: false,
    },
  });

  if (inactiveStaff) {
    console.log(' Reactivating inactive staff:', inactiveStaff.id);
    
    // Reactivate with new role/permissions
    const reactivatedStaff = await this.prisma.companyStaff.update({
      where: { id: inactiveStaff.id },
      data: {
        isActive: true,
        role: addStaffDto.role,
        permissions: addStaffDto.permissions || [],
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            email: true,
            displayName: true,
          },
        },
      },
    });

    console.log(' Staff reactivated:', reactivatedStaff);
    return this.mapToStaffResponseDto(reactivatedStaff);
  }

  // Create new staff record
  console.log('➕ Creating new staff record...');
  const staff = await this.prisma.companyStaff.create({
    data: {
      companyId,
      userId: user.id,
      role: addStaffDto.role,
      permissions: addStaffDto.permissions || [],
      isActive: true,
    },
    include: {
      user: {
        select: {
          email: true,
          displayName: true,
        },
      },
    },
  });

  console.log(' New staff created:', staff);
  return this.mapToStaffResponseDto(staff);
}
  async removeStaffMember(
    companyId: string,
    userId: string,
    requesterUserId: string
  ): Promise<{ message: string }> {
    // Check if company exists
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Check if requester is ADMIN or OWNER
    const requesterRole = await this.getUserRoleInCompany(companyId, requesterUserId);
    if (requesterRole !== 'ADMIN' && requesterRole !== 'OWNER') {
      throw new ForbiddenException('Only company administrators can remove staff');
    }

    // Check if user to remove is the company owner (cannot remove owner)
    const targetStaff = await this.prisma.companyStaff.findFirst({
      where: {
        companyId,
        userId,
      },
    });

    if (!targetStaff) {
      throw new NotFoundException('Staff member not found in this company');
    }

    if (targetStaff.role === 'OWNER') {
      throw new ForbiddenException('Cannot remove the company owner');
    }

    // Check if requester is trying to remove themselves
    if (userId === requesterUserId) {
      throw new BadRequestException('You cannot remove yourself. Ask another admin to do it.');
    }

    // Remove staff member (soft delete by setting isActive to false)
    await this.prisma.companyStaff.update({
      where: {
        id: targetStaff.id,
      },
      data: {
        isActive: false,
      },
    });

    return { message: 'Staff member removed successfully' };
  }

  async getCompanyStaff(companyId: string): Promise<StaffResponseDto[]> {
    const staff = await this.prisma.companyStaff.findMany({
      where: {
        companyId,
        isActive: true,
      },
      include: {
        user: {
          select: {
            email: true,
            displayName: true,
          },
        },
      },
      orderBy: {
        role: 'asc',
      },
    });

    return staff.map(staff => this.mapToStaffResponseDto(staff));
  }

  async getUserRoleInCompany(companyId: string, userId: string): Promise<string> {
    const staff = await this.prisma.companyStaff.findFirst({
      where: {
        companyId,
        userId,
        isActive: true,
      },
    });

    return staff?.role || 'NONE';
  }

  private mapToStaffResponseDto(staff: any): StaffResponseDto {
    return new StaffResponseDto({
      id: staff.id,
      companyId: staff.companyId,
      userId: staff.userId,
      userEmail: staff.user.email,
      userDisplayName: staff.user.displayName,
      role: staff.role as StaffRole,
      isActive: staff.isActive,
      permissions: staff.permissions as string[] || [],
      joinedAt: staff.joinedAt,
      updatedAt: staff.updatedAt,
    });
  }
}