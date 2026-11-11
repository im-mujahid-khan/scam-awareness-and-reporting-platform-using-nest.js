import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export class LinkSocialAccountDto {
  @IsNotEmpty()
  @IsString()
  @IsEnum(['google', 'facebook', 'apple'])
  provider: string;
}

export class UnlinkSocialAccountDto {
  @IsNotEmpty()
  @IsString()
  @IsEnum(['google', 'facebook', 'apple'])
  provider: string;
}

export class GetAuthMethodsDto {
  // No required fields, returns all available auth methods for user
}

export class UpdateAuthMethodsDto {
  @IsNotEmpty()
  @IsString({ each: true })
  methods: string[]; // Array of auth methods user wants to use
}

export class SocialLoginResponseDto {
  @IsString()
  id: string;

  @IsString()
  email: string;

  @IsString()
  displayName: string;

  @IsString()
  avatarUrl?: string;

  @IsString()
  token: string;

  @IsString({ each: true })
  authMethods: string[];
}
