// src/modules/companies/guards/company-staff.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { CompaniesService } from '../services/companies.service';

@Injectable()
export class CompanyStaffGuard implements CanActivate {
  constructor(private readonly companiesService: CompaniesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const companyId = request.params.companyId || request.params.id;

    if (!user || !companyId) {
      throw new ForbiddenException('Access denied');
    }

    // Check if user is active staff of this company
    const isStaff = await this.companiesService.isUserCompanyStaff(companyId, user.id);
    
    if (!isStaff) {
      throw new ForbiddenException('You must be a company staff member to perform this action');
    }

    // Get user's role for permission checks
    const userRole = await this.companiesService.getUserRoleInCompany(companyId, user.id);
    request.companyRole = userRole;

    return true;
  }
}