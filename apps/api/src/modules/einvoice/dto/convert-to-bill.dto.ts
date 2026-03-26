import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsArray,
  IsEnum,
  IsOptional,
  ArrayMinSize,
} from 'class-validator';
import { SplitType } from '@prisma/client';

/**
 * 將電子發票轉換為帳單請求 DTO
 */
export class ConvertToBillDto {
  /**
   * 旅程 ID
   */
  @IsUUID('4', { message: '旅程 ID 格式不正確' })
  @IsNotEmpty({ message: '旅程 ID 不能為空' })
  tripId: string;

  /**
   * 發票號碼（AB-12345678 格式）
   */
  @IsString()
  @IsNotEmpty({ message: '發票號碼不能為空' })
  invoiceNumber: string;

  /**
   * 付款人 ID（預設為當前用戶）
   */
  @IsUUID('4', { message: '付款人 ID 格式不正確' })
  @IsOptional()
  payerId?: string;

  /**
   * 分帳方式
   */
  @IsEnum(SplitType, { message: '分帳方式不正確' })
  @IsOptional()
  splitType?: SplitType;

  /**
   * 參與者 ID 列表（空陣列表示全員）
   */
  @IsArray()
  @IsUUID('4', { each: true, message: '參與者 ID 格式不正確' })
  @IsOptional()
  participantIds?: string[];
}

/**
 * 批量轉換電子發票為帳單請求 DTO
 */
export class BatchConvertToBillDto {
  /**
   * 旅程 ID
   */
  @IsUUID('4', { message: '旅程 ID 格式不正確' })
  @IsNotEmpty({ message: '旅程 ID 不能為空' })
  tripId: string;

  /**
   * 發票號碼列表
   */
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: '至少需要一張發票' })
  invoiceNumbers: string[];

  /**
   * 付款人 ID
   */
  @IsUUID('4', { message: '付款人 ID 格式不正確' })
  @IsOptional()
  payerId?: string;

  /**
   * 分帳方式
   */
  @IsEnum(SplitType, { message: '分帳方式不正確' })
  @IsOptional()
  splitType?: SplitType;

  /**
   * 參與者 ID 列表
   */
  @IsArray()
  @IsUUID('4', { each: true, message: '參與者 ID 格式不正確' })
  @IsOptional()
  participantIds?: string[];
}
