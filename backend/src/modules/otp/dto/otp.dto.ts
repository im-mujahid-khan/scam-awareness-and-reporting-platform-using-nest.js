import { IsEmail, IsNotEmpty, IsString, Length, IsPhoneNumber, IsOptional } from 'class-validator';

export class RequestOtpDto {
  @IsNotEmpty()
  @IsString()
  identifier: string; // Can be email or phone
}

export class VerifyOtpDto {
  @IsNotEmpty()
  @IsString()
  identifier: string; // Email or phone

  @IsNotEmpty()
  @IsString()
  @Length(6, 6)
  otp: string; // 6-digit OTP

  @IsOptional()
  @IsString()
  name?: string; // For new user registration
}

export class ResendOtpDto {
  @IsNotEmpty()
  @IsString()
  identifier: string; // Email or phone
}

export class CancelOtpDto {
  @IsNotEmpty()
  @IsString()
  identifier: string; // Email or phone
}

export class CheckOtpStatusDto {
  @IsNotEmpty()
  @IsString()
  identifier: string; // Email or phone

  @IsNotEmpty()
  @IsString()
  type: 'email' | 'phone';
}
