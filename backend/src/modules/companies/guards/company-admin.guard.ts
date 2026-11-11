// src/modules/companies/guards/company-admin.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { CompaniesService } from '../services/companies.service';

@Injectable()
export class CompanyAdminGuard implements CanActivate {
  constructor(private readonly companiesService: CompaniesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const companyId = request.params.companyId || request.params.id;

    if (!user || !companyId) {
      throw new ForbiddenException('Access denied');
    }

    const userRole = await this.companiesService.getUserRoleInCompany(companyId, user.id);
    
    // Only ADMIN or OWNER can access
    if (userRole !== 'ADMIN' && userRole !== 'OWNER') {
      throw new ForbiddenException('Only company administrators can access this resource');
    }

    return true;
  }
}