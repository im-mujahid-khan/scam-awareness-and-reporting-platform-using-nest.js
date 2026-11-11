import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CompaniesService } from '../services/companies.service';

@Injectable()
export class CompanyOwnershipGuard implements CanActivate {
  constructor(private readonly companiesService: CompaniesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const companyId = request.params.id;

    if (!user || !companyId) {
      throw new ForbiddenException('Access denied. Authentication required.');
    }

    // Check if user is staff of this company
    const isStaff = await this.companiesService.isUserCompanyStaff(
      companyId,
      user.id,
    );

    if (!isStaff) {
      throw new NotFoundException('Company not found or access denied.');
    }

    // For write operations, check if user has appropriate role
    if (['PUT', 'DELETE', 'PATCH', 'POST'].includes(request.method)) {
      const userRole = await this.companiesService.getUserRoleInCompany(
        companyId,
        user.id,
      );
      
      // Only OWNER and ADMIN can perform write operations
      if (!['OWNER', 'ADMIN'].includes(userRole)) {
        throw new ForbiddenException(
          'Only company owners and admins can perform this action',
        );
      }
    }

    return true;
  }
}