import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class PinPostDto {
  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  pinned: boolean = true;
}

export class RemoveMemberDto {
  @ApiPropertyOptional({ example: 'Violating group rules' })
  @IsString()
  @IsOptional()
  reason?: string;
}