// src/modules/companies/companies.module.ts
import { Module } from '@nestjs/common';
import { CompaniesController } from './controllers/companies.controller';
import { CompanyStaffController } from './controllers/company-staff.controller';
import { CompanyFollowersController } from './controllers/company-followers.controller';
import { CompanyGroupsController } from './controllers/company-groups.controller';
import { CompanyPostsController } from './controllers/company-posts.controller';
import { CompaniesService } from './services/companies.service';
import { CompanyStaffService } from './services/company-staff.service';
import { CompanyFollowersService } from './services/company-followers.service';
import { CompanyGroupsService } from './services/company-groups.service';
import { CompanyPostsService } from './services/company-posts.service';
import { CompanyOwnershipGuard } from './guards/company-ownership.guard';
import { CompanyAdminGuard } from './guards/company-admin.guard';
import { CompanyStaffGuard } from './guards/company-staff.guard';

@Module({
  imports: [],
  controllers: [
    CompaniesController, 
    CompanyStaffController,
    CompanyFollowersController,
    CompanyGroupsController,
    CompanyPostsController
  ],
  providers: [
    CompaniesService,
    CompanyStaffService,
    CompanyFollowersService,
    CompanyGroupsService,
    CompanyPostsService,
    CompanyOwnershipGuard,
    CompanyAdminGuard,
    CompanyStaffGuard,
  ],
  exports: [
    CompaniesService,
    CompanyStaffService,
    CompanyFollowersService,
    CompanyGroupsService,
    CompanyPostsService,
    CompanyOwnershipGuard,
    CompanyAdminGuard,
    CompanyStaffGuard,
  ],
})
export class CompaniesModule {}