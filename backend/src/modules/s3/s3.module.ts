import { Module } from '@nestjs/common';
import { S3Service } from './s3.service';
import { SimpleUploadController } from './simple-upload.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [SimpleUploadController],
  providers: [S3Service],
  exports: [S3Service],
})
export class S3Module {}