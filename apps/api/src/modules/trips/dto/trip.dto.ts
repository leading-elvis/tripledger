import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  MaxLength,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  Validate,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MemberRole, Currency } from '@prisma/client';

// 字串長度限制
const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_URL_LENGTH = 2048;
const MAX_INVITE_CODE_LENGTH = 20;

/**
 * 日期範圍驗證器：確保 startDate <= endDate
 */
@ValidatorConstraint({ name: 'isDateRangeValid', async: false })
class IsDateRangeValidConstraint implements ValidatorConstraintInterface {
  validate(_endDate: string, args: ValidationArguments): boolean {
    const obj = args.object as { startDate?: string; endDate?: string };
    if (!obj.startDate || !obj.endDate) {
      return true; // 如果任一日期未提供，跳過驗證
    }
    return new Date(obj.startDate) <= new Date(obj.endDate);
  }

  defaultMessage(): string {
    return '結束日期必須晚於或等於開始日期';
  }
}

export class CreateTripDto {
  @ApiProperty({ description: '旅程名稱', example: '2024 日本東京自由行' })
  @IsString()
  @IsNotEmpty({ message: '旅程名稱不可為空' })
  @MaxLength(MAX_NAME_LENGTH)
  name: string;

  @ApiPropertyOptional({ description: '旅程描述' })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_DESCRIPTION_LENGTH)
  description?: string;

  @ApiPropertyOptional({ description: '封面圖片 URL' })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_URL_LENGTH)
  coverImage?: string;

  @ApiPropertyOptional({ description: '開始日期', example: '2024-03-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '結束日期', example: '2024-03-07' })
  @IsOptional()
  @IsDateString()
  @Validate(IsDateRangeValidConstraint)
  endDate?: string;

  @ApiPropertyOptional({
    description: '預設貨幣',
    enum: Currency,
    example: Currency.TWD,
    default: Currency.TWD,
  })
  @IsOptional()
  @IsEnum(Currency)
  defaultCurrency?: Currency;
}

export class UpdateTripDto {
  @ApiPropertyOptional({ description: '旅程名稱' })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_NAME_LENGTH)
  name?: string;

  @ApiPropertyOptional({ description: '旅程描述' })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_DESCRIPTION_LENGTH)
  description?: string;

  @ApiPropertyOptional({ description: '封面圖片 URL' })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_URL_LENGTH)
  coverImage?: string;

  @ApiPropertyOptional({ description: '開始日期' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '結束日期' })
  @IsOptional()
  @IsDateString()
  @Validate(IsDateRangeValidConstraint)
  endDate?: string;

  @ApiPropertyOptional({
    description: '預設貨幣',
    enum: Currency,
    example: Currency.TWD,
  })
  @IsOptional()
  @IsEnum(Currency)
  defaultCurrency?: Currency;
}

export class JoinTripDto {
  @ApiProperty({ description: '邀請碼' })
  @IsString()
  @IsNotEmpty({ message: '邀請碼不可為空' })
  @MaxLength(MAX_INVITE_CODE_LENGTH)
  inviteCode: string;
}

export class UpdateMemberNicknameDto {
  @ApiProperty({ description: '成員在此旅程中的暱稱', example: '小明' })
  @IsString()
  @MaxLength(50)
  nickname: string;
}

export class UpdateMemberRoleDto {
  @ApiProperty({
    description: '成員角色',
    enum: MemberRole,
    example: MemberRole.ADMIN,
  })
  @IsEnum(MemberRole)
  role: MemberRole;
}

// ============================================
// 虛擬人員 DTO
// ============================================

export class CreateVirtualMemberDto {
  @ApiProperty({ description: '虛擬人員名稱', example: '小華' })
  @IsString()
  @IsNotEmpty({ message: '虛擬人員名稱不可為空' })
  @MaxLength(50)
  name: string;
}

export class UpdateVirtualMemberDto {
  @ApiProperty({ description: '虛擬人員名稱', example: '小華' })
  @IsString()
  @IsNotEmpty({ message: '虛擬人員名稱不可為空' })
  @MaxLength(50)
  name: string;
}
