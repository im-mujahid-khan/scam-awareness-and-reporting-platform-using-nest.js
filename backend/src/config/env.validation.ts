// src/config/env.validation.ts
import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, validateSync, IsBoolean } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
  Staging = 'staging',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumber()
  @IsOptional()
  PORT: number;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRY: string;

  @IsString()
  @IsOptional()
  REDIS_URL: string;

  @IsString()
  @IsOptional()
  REDIS_HOST: string;

  @IsNumber()
  @IsOptional()
  REDIS_PORT: number;

  // ===== OTP Configuration =====
  @IsNumber()
  @IsOptional()
  OTP_LENGTH: number;

  @IsNumber()
  @IsOptional()
  OTP_EXPIRY_MINUTES: number;

  @IsNumber()
  @IsOptional()
  MAX_OTP_ATTEMPTS: number;

  @IsNumber()
  @IsOptional()
  MAX_OTP_REQUESTS_PER_WINDOW: number;

  @IsNumber()
  @IsOptional()
  OTP_RATE_LIMIT_WINDOW_MINUTES: number;

  @IsNumber()
  @IsOptional()
  OTP_RESEND_WAIT_MINUTES: number;

  // ===== Email Configuration =====
  @IsString()
  @IsOptional()
  EMAIL_HOST: string;

  @IsNumber()
  @IsOptional()
  EMAIL_PORT: number;

  @IsBoolean()
  @IsOptional()
  EMAIL_SECURE: boolean;

  @IsString()
  @IsOptional()
  EMAIL_USER: string;

  @IsString()
  @IsOptional()
  EMAIL_PASSWORD: string;

  @IsString()
  @IsOptional()
  EMAIL_FROM: string;

  // ===== SMS Configuration (Twilio) =====
  @IsString()
  @IsOptional()
  TWILIO_ACCOUNT_SID: string;

  @IsString()
  @IsOptional()
  TWILIO_AUTH_TOKEN: string;

  @IsString()
  @IsOptional()
  TWILIO_PHONE_NUMBER: string;

  // ===== Google OAuth Configuration =====
  @IsString()
  @IsOptional()
  GOOGLE_CLIENT_ID: string;

  @IsString()
  @IsOptional()
  GOOGLE_CLIENT_SECRET: string;

  @IsString()
  @IsOptional()
  GOOGLE_CALLBACK_URL: string;

  // ===== Facebook OAuth Configuration =====
  @IsString()
  @IsOptional()
  FACEBOOK_CLIENT_ID: string;

  @IsString()
  @IsOptional()
  FACEBOOK_CLIENT_SECRET: string;

  @IsString()
  @IsOptional()
  FACEBOOK_CALLBACK_URL: string;

  // ===== Apple OAuth Configuration =====
  @IsString()
  @IsOptional()
  APPLE_CLIENT_ID: string;

  @IsString()
  @IsOptional()
  APPLE_TEAM_ID: string;

  @IsString()
  @IsOptional()
  APPLE_KEY_ID: string;

  @IsString()
  @IsOptional()
  APPLE_PRIVATE_KEY: string;

  @IsString()
  @IsOptional()
  APPLE_CALLBACK_URL: string;

  // ===== Frontend Configuration =====
  @IsString()
  @IsOptional()
  FRONTEND_URL: string;

  @IsString()
  @IsOptional()
  API_URL: string;

  // ===== Device Verification =====
  @IsBoolean()
  @IsOptional()
  REQUIRE_DEVICE_VERIFICATION: boolean;

  @IsNumber()
  @IsOptional()
  DEVICE_VERIFICATION_EXPIRY_MINUTES: number;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: true, // Allow optional fields
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  
  return validatedConfig;
}