import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// 字串長度限制
const MAX_NAME_LENGTH = 100;
const MAX_URL_LENGTH = 2048;

export class UpdateUserDto {
  @ApiPropertyOptional({ description: '用戶名稱' })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_NAME_LENGTH)
  name?: string;

  @ApiPropertyOptional({ description: '頭像 URL' })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_URL_LENGTH)
  avatarUrl?: string;
}
