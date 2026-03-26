import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { NotificationType, Currency } from '@prisma/client';

/**
 * 創建通知 DTO（內部使用）
 */
export class CreateNotificationDto {
  @ApiProperty({ description: '接收通知的用戶 ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: '通知類型', enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ description: '通知標題' })
  @IsString()
  title: string;

  @ApiProperty({ description: '通知內容' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: '關聯的旅程 ID' })
  @IsOptional()
  @IsString()
  tripId?: string;

  @ApiPropertyOptional({ description: '旅程名稱' })
  @IsOptional()
  @IsString()
  tripName?: string;

  @ApiPropertyOptional({ description: '關聯的帳單 ID' })
  @IsOptional()
  @IsString()
  billId?: string;

  @ApiPropertyOptional({ description: '關聯的結算 ID' })
  @IsOptional()
  @IsString()
  settlementId?: string;

  @ApiPropertyOptional({ description: '發送通知的用戶 ID' })
  @IsOptional()
  @IsString()
  fromUserId?: string;

  @ApiPropertyOptional({ description: '發送通知的用戶名稱' })
  @IsOptional()
  @IsString()
  fromUserName?: string;

  @ApiPropertyOptional({ description: '相關金額' })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional({ description: '金額貨幣', enum: Currency })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;
}

/**
 * 通知響應 DTO
 */
export class NotificationResponseDto {
  @ApiProperty({ description: '通知 ID' })
  id: string;

  @ApiProperty({ description: '通知類型', enum: NotificationType })
  type: NotificationType;

  @ApiProperty({ description: '通知標題' })
  title: string;

  @ApiProperty({ description: '通知內容' })
  message: string;

  @ApiPropertyOptional({ description: '關聯的旅程 ID' })
  tripId?: string;

  @ApiPropertyOptional({ description: '旅程名稱' })
  tripName?: string;

  @ApiPropertyOptional({ description: '關聯的帳單 ID' })
  billId?: string;

  @ApiPropertyOptional({ description: '關聯的結算 ID' })
  settlementId?: string;

  @ApiPropertyOptional({ description: '發送通知的用戶 ID' })
  fromUserId?: string;

  @ApiPropertyOptional({ description: '發送通知的用戶名稱' })
  fromUserName?: string;

  @ApiPropertyOptional({ description: '相關金額' })
  amount?: number;

  @ApiPropertyOptional({ description: '金額貨幣', enum: Currency })
  currency?: Currency;

  @ApiProperty({ description: '是否已讀' })
  isRead: boolean;

  @ApiProperty({ description: '創建時間' })
  createdAt: Date;
}

/**
 * 未讀計數響應 DTO
 */
export class UnreadCountResponseDto {
  @ApiProperty({ description: '未讀通知數量' })
  count: number;
}
