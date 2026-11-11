import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsBase64, IsMimeType } from 'class-validator';

export class FileUploadDto {
  @ApiProperty({
    description: 'File name with extension',
    example: 'profile.jpg',
  })
  @IsString()
  fileName: string;

  @ApiProperty({
    description: 'Base64 encoded file data',
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
  })
  @IsString()
  @IsBase64()
  fileData: string;

  @ApiProperty({
    description: 'Folder path in S3 bucket',
    required: false,
    example: 'users/profile',
  })
  @IsString()
  @IsOptional()
  folder?: string;

  @ApiProperty({
    description: 'Whether the file should be publicly accessible',
    required: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiProperty({
    description: 'Content type of the file',
    required: false,
    example: 'image/jpeg',
  })
  @IsString()
  @IsOptional()
  contentType?: string;
}

export class GetSignedUrlDto {
  @ApiProperty({
    description: 'S3 file key',
    example: 'users/profile/1234567890-profile.jpg',
  })
  @IsString()
  key: string;

  @ApiProperty({
    description: 'Expiration time in seconds',
    required: false,
    default: 3600,
  })
  @IsOptional()
  expiresIn?: number;
}