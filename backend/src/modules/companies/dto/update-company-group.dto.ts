// src/modules/companies/dto/update-company-group.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateCompanyGroupDto } from './create-company-group.dto';

export class UpdateCompanyGroupDto extends PartialType(CreateCompanyGroupDto) {}