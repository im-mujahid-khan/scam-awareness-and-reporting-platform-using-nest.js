import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsString, 
  IsEnum, 
  IsOptional, 
  IsArray, 
  ValidateNested, 
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PostType } from '@prisma/client';
import { EvidenceDto } from './create-post.dto';

export class CreateAwarenessQuestionDto {
  @ApiProperty({ 
    example: 'SCAM_AWARENESS (Required)'
  })
  @IsEnum(PostType, { 
    message: 'postType must be either SCAM_AWARENESS or QUESTION' 
  })
  postType: PostType;

  @ApiProperty({
    example: 'Beware of New Phishing Scam (Required)'
  })
  @IsString()
  title: string;

  @ApiProperty({
    example: 'There\'s a new phishing scam targeting bank customers... (Required)'
  })
  @IsString()
  description: string;

  @ApiPropertyOptional({
    type: [EvidenceDto],
    example: '[{evidenceType: "IMAGE", fileUrl: "https://..."}] (Optional)'
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvidenceDto)
  @IsOptional()
  media?: EvidenceDto[];

  @ApiPropertyOptional({
    example: 'false (Optional, default: false)'
  })
  @IsBoolean()
  @IsOptional()
  isCompanyPost?: boolean = false;

  @ApiPropertyOptional({
    example: 'company-123 (Optional)'
  })
  @IsString()
  @IsOptional()
  companyId?: string;
}