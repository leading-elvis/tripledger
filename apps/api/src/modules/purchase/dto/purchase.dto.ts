import { IsString, IsEnum, IsOptional, IsNotEmpty, IsArray, ArrayMinSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PlatformDto {
  IOS = 'IOS',
  ANDROID = 'ANDROID',
}

/**
 * 驗證購買收據 DTO
 */
export class VerifyPurchaseDto {
  @ApiProperty({
    description: '平台',
    enum: PlatformDto,
    example: 'IOS',
  })
  @IsEnum(PlatformDto)
  platform: PlatformDto;

  @ApiProperty({
    description: 'App Store / Google Play 產品 ID',
    example: 'trip_premium_7d',
  })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({
    description: '收據資料（Base64 編碼）',
  })
  @IsString()
  @IsNotEmpty()
  receiptData: string;

  @ApiProperty({
    description: '交易 ID',
  })
  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @ApiPropertyOptional({
    description: '旅程 ID（消耗型產品必填）',
  })
  @IsString()
  @IsOptional()
  tripId?: string;
}

/**
 * 恢復購買 DTO
 */
export class RestorePurchaseDto {
  @ApiProperty({
    description: '平台',
    enum: PlatformDto,
  })
  @IsEnum(PlatformDto)
  platform: PlatformDto;

  @ApiProperty({
    description: '收據資料列表（Base64 編碼）',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1, { message: '至少需要一筆收據資料' })
  @IsString({ each: true })
  @IsNotEmpty({ each: true, message: '收據資料不可為空' })
  receiptDataList: string[];
}

/**
 * 購買回應
 */
export class PurchaseResponseDto {
  @ApiProperty({ description: '購買記錄 ID' })
  id: string;

  @ApiProperty({ description: '產品 ID' })
  productId: string;

  @ApiProperty({ description: '產品類型' })
  productType: string;

  @ApiPropertyOptional({ description: '旅程 ID' })
  tripId?: string;

  @ApiPropertyOptional({ description: '購買天數' })
  daysGranted?: number;

  @ApiProperty({ description: '購買時間' })
  purchasedAt: Date;

  @ApiPropertyOptional({ description: '到期時間' })
  expiresAt?: Date;
}

/**
 * 旅程進階狀態回應
 */
export class TripPremiumStatusDto {
  @ApiProperty({ description: '是否為進階版' })
  isPremium: boolean;

  @ApiPropertyOptional({ description: '到期時間', nullable: true })
  expiresAt?: Date | null;

  @ApiPropertyOptional({ description: '剩餘天數' })
  remainingDays?: number;
}

/**
 * 去廣告狀態回應
 */
export class AdFreeStatusDto {
  @ApiProperty({ description: '是否已購買去廣告' })
  isAdFree: boolean;

  @ApiPropertyOptional({ description: '購買時間', nullable: true })
  purchasedAt?: Date | null;
}

/**
 * 恢復購買回應
 */
export class RestoreResponseDto {
  @ApiProperty({ description: '是否有恢復的購買' })
  hasRestoredPurchases: boolean;

  @ApiProperty({ description: '去廣告狀態' })
  adFreeRestored: boolean;

  @ApiProperty({ description: '恢復的購買數量' })
  restoredCount: number;
}
