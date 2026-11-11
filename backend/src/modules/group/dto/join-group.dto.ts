import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class JoinGroupDto {
  @ApiPropertyOptional({ example: 'I want to join this group to learn about scams' })
  @IsString()
  @IsOptional()
  message?: string;
}

export class HandleJoinRequestDto {
  @ApiPropertyOptional({ enum: ['APPROVE', 'REJECT'], example: 'APPROVE' })
  @IsString()
  action: 'APPROVE' | 'REJECT';

  @ApiPropertyOptional({ example: 'User meets all requirements' })
  @IsString()
  @IsOptional()
  reason?: string;
}