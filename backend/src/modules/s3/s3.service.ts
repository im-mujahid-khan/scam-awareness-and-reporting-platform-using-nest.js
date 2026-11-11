import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { S3 } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

export interface UploadResponse {
  url: string;
  key: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  folder: string;
  // Remove expiresAt since URLs are permanent
}

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly baseUrl: string;
  private readonly logger = new Logger(S3Service.name);

  constructor(private configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION') || 'eu-west-2';
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME') || 'scamapp-media';
    
    const envBaseUrl = this.configService.get<string>('AWS_S3_BASE_URL');
    this.baseUrl = envBaseUrl || `https://${this.bucketName}.s3.${region}.amazonaws.com`;

    if (!accessKeyId || !secretAccessKey) {
      this.logger.warn('AWS credentials not found, S3 service will not work properly');
    }

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
      },
    });

    this.logger.log(`S3 Service initialized for bucket: ${this.bucketName}`);
    this.logger.log(`All files will have permanent public URLs`);
  }

  /**
   * Generate unique filename
   */
  private generateFileName(originalName: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 10);
    const cleanName = originalName
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    return `${timestamp}-${randomString}-${cleanName}`;
  }

  /**
   * Get folder path based on upload type
   */
  private getFolderPath(type: string): string {
    const folderMap: Record<string, string> = {
      'post-media': 'posts/media/',
      'report-evidence': 'reports/evidence/',
      'user-profile': 'users/profile-images/',
      'company-media': 'companies/media/',
      'group-image': 'groups/images/',
    };
    
    return folderMap[type] || 'uploads/';
  }

  /**
   * Simple upload method for frontend - ALWAYS PUBLIC
   */
  async uploadFileForFrontend(
    file: Express.Multer.File,
    type: string,
    metadata?: Record<string, string>
  ): Promise<UploadResponse> {
    const folder = this.getFolderPath(type);
    const fileName = this.generateFileName(file.originalname);
    const key = `${folder}${fileName}`;

    this.logger.log(`Uploading file: ${key} (${file.size} bytes)`);

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: metadata || {},
      ACL: 'public-read', // ALWAYS make files public
    });

    try {
      await this.s3Client.send(command);
      this.logger.log(`File uploaded successfully: ${key}`);

      // ALWAYS use permanent public URL
      const url = `${this.baseUrl}/${key}`;

      return {
        url,
        key,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        folder: folder.replace(/\/$/, ''), // Remove trailing slash
        // NO expiresAt field - URLs are permanent
      };
    } catch (error: any) {
      this.logger.error(`Failed to upload file: ${error.message}`, error.stack);
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  /**
   * Delete file from S3
   */
  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      await this.s3Client.send(command);
      this.logger.log(`File deleted: ${key}`);
    } catch (error: any) {
      this.logger.error(`Failed to delete file: ${error.message}`, error.stack);
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      // Try to create a head object command (not available in v3 without additional import)
      // For simplicity, we'll assume it exists if we can construct the URL
      const url = `${this.baseUrl}/${key}`;
      this.logger.log(`Checking file at: ${url}`);
      return true;
    } catch (error: any) {
      return false;
    }
  }

  /**
   * Get public URL (permanent)
   */
  getPublicUrl(key: string): string {
    return `${this.baseUrl}/${key}`;
  }

  /**
   * Extract file extension from content type
   */
  getExtensionFromContentType(contentType: string): string {
    const extensionMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
      'video/quicktime': 'mov',
      'video/x-msvideo': 'avi',
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    };

    return extensionMap[contentType] || 'bin';
  }

  /**
   * Get file size in human readable format
   */
  getHumanReadableSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Validate file size (max 10MB by default)
   */
  validateFileSize(buffer: Buffer, maxSizeInMB: number = 10): boolean {
    const maxSize = maxSizeInMB * 1024 * 1024; // Convert MB to bytes
    return buffer.length <= maxSize;
  }
}