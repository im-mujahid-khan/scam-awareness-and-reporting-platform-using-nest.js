import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsNumber, IsString, Min } from 'class-validator';

export class JoinedGroupsResponseDto {
  @ApiProperty({ type: [Object], description: 'List of joined groups' })
  @Type(() => Object)
  groups: any[];

  @ApiProperty({ description: 'Total number of joined groups' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;
}

export class JoinedGroupsQueryDto {
  @ApiProperty({ required: false, description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, description: 'Items per page', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Min(10, { message: 'Limit must be at least 10' })
  limit?: number = 20;

  @ApiProperty({ required: false, description: 'Search by group name' })
  @IsOptional()
  @IsString()
  search?: string;
}