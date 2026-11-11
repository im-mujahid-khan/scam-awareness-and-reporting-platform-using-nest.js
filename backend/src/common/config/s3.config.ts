import { registerAs } from '@nestjs/config';

export default registerAs('s3', () => ({
  region: process.env.AWS_REGION || 'eu-west-2',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  bucketName: process.env.AWS_S3_BUCKET_NAME || 'scamapp-media',
  baseUrl: process.env.AWS_S3_BASE_URL,
  publicUrlExpiry: parseInt(process.env.AWS_S3_PUBLIC_URL_EXPIRY || '3600', 10),
}));