import { IsOptional, IsString, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { GroupTopic, GroupType } from '@prisma/client';

export class SearchGroupsDto {
  @ApiPropertyOptional({ example: 'scam' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: GroupTopic, example: GroupTopic.PHISHING })
  @IsEnum(GroupTopic)
  @IsOptional()
  topic?: GroupTopic;

  @ApiPropertyOptional({ example: 'Pakistan' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ example: 'Punjab' })
  @IsString()
  @IsOptional()
  region?: string;

  @ApiPropertyOptional({ example: 'Lahore' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ enum: GroupType, example: GroupType.PUBLIC })
  @IsEnum(GroupType)
  @IsOptional()
  visibility?: GroupType;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}