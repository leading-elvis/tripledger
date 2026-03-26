import { IsString, IsOptional, IsEmail, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// 字串長度限制
const MAX_ID_LENGTH = 100;
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254; // RFC 5321
const MAX_URL_LENGTH = 2048;
const MAX_TOKEN_LENGTH = 2048;
const MAX_PASSWORD_LENGTH = 100;

export class LineLoginDto {
  @ApiProperty({ description: 'LINE User ID' })
  @IsString()
  @MaxLength(MAX_ID_LENGTH)
  lineId: string;

  @ApiProperty({ description: '用戶名稱' })
  @IsString()
  @MaxLength(MAX_NAME_LENGTH)
  name: string;

  @ApiPropertyOptional({ description: '頭像 URL' })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_URL_LENGTH)
  avatarUrl?: string;
}

export class GoogleLoginDto {
  @ApiProperty({ description: 'Google User ID' })
  @IsString()
  @MaxLength(MAX_ID_LENGTH)
  googleId: string;

  @ApiProperty({ description: 'Email' })
  @IsEmail()
  @MaxLength(MAX_EMAIL_LENGTH)
  email: string;

  @ApiProperty({ description: '用戶名稱' })
  @IsString()
  @MaxLength(MAX_NAME_LENGTH)
  name: string;

  @ApiPropertyOptional({ description: '頭像 URL' })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_URL_LENGTH)
  avatarUrl?: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh Token' })
  @IsString()
  @MaxLength(MAX_TOKEN_LENGTH)
  refreshToken: string;
}

export class DemoLoginDto {
  @ApiProperty({ description: 'Demo 帳號' })
  @IsString()
  @MaxLength(MAX_NAME_LENGTH)
  username: string;

  @ApiProperty({ description: 'Demo 密碼' })
  @IsString()
  @MaxLength(MAX_PASSWORD_LENGTH)
  password: string;
}

export class AppleLoginDto {
  @ApiProperty({ description: 'Apple User ID (userIdentifier)' })
  @IsString()
  @MaxLength(MAX_ID_LENGTH)
  appleId: string;

  @ApiProperty({ description: 'Apple Identity Token (用於驗證)' })
  @IsString()
  @MaxLength(MAX_TOKEN_LENGTH)
  identityToken: string;

  @ApiPropertyOptional({ description: 'Email（首次登入時提供）' })
  @IsOptional()
  @IsEmail()
  @MaxLength(MAX_EMAIL_LENGTH)
  email?: string;

  @ApiProperty({ description: '用戶名稱' })
  @IsString()
  @MaxLength(MAX_NAME_LENGTH)
  name: string;
}
