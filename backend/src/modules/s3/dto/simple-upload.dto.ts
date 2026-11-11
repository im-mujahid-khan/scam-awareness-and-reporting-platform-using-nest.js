import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum UploadType {
  POST_MEDIA = 'post-media',
  REPORT_EVIDENCE = 'report-evidence',
  USER_PROFILE = 'user-profile',
  COMPANY_MEDIA = 'company-media',
  GROUP_IMAGE = 'group-image',
}

export class SimpleUploadDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'File to upload (images: jpg, png, gif; videos: mp4, mov; documents: pdf)'
  })
  file: any;

  @ApiProperty({
    enum: UploadType,
    description: 'Type of upload - determines folder structure',
    example: UploadType.REPORT_EVIDENCE
  })
  @IsEnum(UploadType)
  type: UploadType;

  @ApiPropertyOptional({
    description: 'ID associated with this upload (userId, postId, companyId, groupId, etc.)',
    example: 'user-123'
  })
  @IsString()
  @IsOptional()
  associatedId?: string;

  // REMOVED isPublic field - all files are public
}

export class UploadResponseDto {
  @ApiProperty({
    description: 'Permanent S3 URL of uploaded file',
    example: 'https://scamapp-media.s3.eu-west-2.amazonaws.com/reports/evidence/1234567890-abc123-screenshot.jpg'
  })
  url: string;

  @ApiProperty({
    description: 'S3 key/path of uploaded file',
    example: 'reports/evidence/1234567890-abc123-screenshot.jpg'
  })
  key: string;

  @ApiProperty({
    description: 'Original file name',
    example: 'screenshot.jpg'
  })
  fileName: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 1024000
  })
  fileSize: number;

  @ApiProperty({
    description: 'MIME type of file',
    example: 'image/jpeg'
  })
  mimeType: string;

  @ApiProperty({
    description: 'Folder where file is stored',
    example: 'reports/evidence'
  })
  folder: string;

  // REMOVED expiresAt field - URLs are permanent
}