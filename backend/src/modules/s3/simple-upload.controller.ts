import {
  Controller,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { S3Service } from './s3.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadResponseDto, UploadType } from './dto/simple-upload.dto';

@ApiTags('Uploads')
@Controller('uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class SimpleUploadController {
  constructor(private readonly s3Service: S3Service) {}

  @Post('post-media')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Upload media for posts',
    description: 'Upload images/videos for posts. Returns permanent URL to use in post creation.'
  })
  @ApiResponse({
    status: 201,
    description: 'Post media uploaded',
    type: UploadResponseDto,
  })
  async uploadPostMedia(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 30 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp|mp4|mov|avi|webm)$/ }),
        ],
      })
    ) file: Express.Multer.File,
    @Body('postId') postId?: string
  ): Promise<UploadResponseDto> {
    const metadata: Record<string, string> = {
      'uploaded-at': new Date().toISOString(),
      'upload-type': 'post-media',
    };

    if (postId) {
      metadata['post-id'] = postId;
    }

    return this.s3Service.uploadFileForFrontend(
      file,
      UploadType.POST_MEDIA,
      metadata
    );
  }

  @Post('report-evidence')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Upload evidence for scam reports',
    description: 'Upload screenshots/documents for scam reports. Returns permanent URL to use in report creation.'
  })
  @ApiResponse({
    status: 201,
    description: 'Evidence uploaded',
    type: UploadResponseDto,
  })
  async uploadReportEvidence(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 30 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp|pdf)$/ }),
        ],
      })
    ) file: Express.Multer.File,
    @Body('reportId') reportId?: string
  ): Promise<UploadResponseDto> {
    const metadata: Record<string, string> = {
      'uploaded-at': new Date().toISOString(),
      'upload-type': 'report-evidence',
    };

    if (reportId) {
      metadata['report-id'] = reportId;
    }

    return this.s3Service.uploadFileForFrontend(
      file,
      UploadType.REPORT_EVIDENCE,
      metadata
    );
  }

  @Post('user-profile')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Upload user profile image',
    description: 'Upload profile pictures. Returns permanent URL to use in user profile update.'
  })
  @ApiResponse({
    status: 201,
    description: 'Profile image uploaded',
    type: UploadResponseDto,
  })
  async uploadUserProfile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 30 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ }),
        ],
      })
    ) file: Express.Multer.File,
    @Body('userId') userId?: string
  ): Promise<UploadResponseDto> {
    const metadata: Record<string, string> = {
      'uploaded-at': new Date().toISOString(),
      'upload-type': 'user-profile',
    };

    if (userId) {
      metadata['user-id'] = userId;
    }

    return this.s3Service.uploadFileForFrontend(
      file,
      UploadType.USER_PROFILE,
      metadata
    );
  }

  @Post('company-media')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Upload company media',
    description: 'Upload media for companies. Returns permanent URL to use in company profile.'
  })
  @ApiResponse({
    status: 201,
    description: 'Company media uploaded',
    type: UploadResponseDto,
  })
  async uploadCompanyMedia(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 30 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp|pdf)$/ }),
        ],
      })
    ) file: Express.Multer.File,
    @Body('companyId') companyId?: string
  ): Promise<UploadResponseDto> {
    const metadata: Record<string, string> = {
      'uploaded-at': new Date().toISOString(),
      'upload-type': 'company-media',
    };

    if (companyId) {
      metadata['company-id'] = companyId;
    }

    return this.s3Service.uploadFileForFrontend(
      file,
      UploadType.COMPANY_MEDIA,
      metadata
    );
  }

  @Post('group-image')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Upload group image',
    description: 'Upload cover photos, group images, or banners for groups. Returns permanent URL to use in group creation/updates.'
  })
  @ApiResponse({
    status: 201,
    description: 'Group image uploaded successfully',
    type: UploadResponseDto,
  })
  async uploadGroupImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 30 * 1024 * 1024 }),
          new FileTypeValidator({ 
            fileType: /(jpg|jpeg|png|gif|webp)$/
          }),
        ],
      })
    ) file: Express.Multer.File,
    @Body('groupId') groupId?: string
  ): Promise<UploadResponseDto> {
    const metadata: Record<string, string> = {
      'uploaded-at': new Date().toISOString(),
      'upload-type': 'group-image',
    };

    if (groupId) {
      metadata['group-id'] = groupId;
    }

    return this.s3Service.uploadFileForFrontend(
      file,
      UploadType.GROUP_IMAGE,
      metadata
    );
  }
}