-- CreateTable OTP
CREATE TABLE "otps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "emailOrPhone" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable SocialAccount
CREATE TABLE "social_accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    CONSTRAINT "social_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE,
    UNIQUE("userId", "provider")
);

-- CreateTable TrustedDevice
CREATE TABLE "trusted_devices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "deviceType" TEXT,
    "os" TEXT,
    "browser" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "trusted_devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE
);

-- CreateTable LoginHistory
CREATE TABLE "login_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "location" TEXT,
    "deviceId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "login_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE
);

-- Add new columns to User table
ALTER TABLE "users" ADD COLUMN "isPasswordlessEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "lastOtpSentAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "otpAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "otpBlockedUntil" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "authMethods" TEXT[] DEFAULT ARRAY['password'];
ALTER TABLE "users" ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "twoFactorSecret" TEXT;

-- Create indexes
CREATE INDEX "otps_emailOrPhone_idx" ON "otps"("emailOrPhone");
CREATE INDEX "otps_expiresAt_idx" ON "otps"("expiresAt");
CREATE INDEX "otps_verified_idx" ON "otps"("verified");

CREATE INDEX "social_accounts_userId_idx" ON "social_accounts"("userId");
CREATE INDEX "social_accounts_provider_idx" ON "social_accounts"("provider");
CREATE INDEX "social_accounts_providerId_idx" ON "social_accounts"("providerId");
CREATE INDEX "social_accounts_connectedAt_idx" ON "social_accounts"("connectedAt");

CREATE INDEX "trusted_devices_userId_idx" ON "trusted_devices"("userId");
CREATE INDEX "trusted_devices_deviceId_idx" ON "trusted_devices"("deviceId");
CREATE INDEX "trusted_devices_lastUsedAt_idx" ON "trusted_devices"("lastUsedAt");

CREATE INDEX "login_history_userId_idx" ON "login_history"("userId");
CREATE INDEX "login_history_method_idx" ON "login_history"("method");
CREATE INDEX "login_history_status_idx" ON "login_history"("status");
CREATE INDEX "login_history_timestamp_idx" ON "login_history"("timestamp");

CREATE INDEX "users_isPasswordlessEnabled_idx" ON "users"("isPasswordlessEnabled");
CREATE INDEX "users_otpBlockedUntil_idx" ON "users"("otpBlockedUntil");
CREATE INDEX "users_twoFactorEnabled_idx" ON "users"("twoFactorEnabled");
