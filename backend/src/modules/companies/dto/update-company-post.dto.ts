// src/modules/companies/dto/update-company-post.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateCompanyPostDto } from './create-company-post.dto';

export class UpdateCompanyPostDto extends PartialType(CreateCompanyPostDto) {}