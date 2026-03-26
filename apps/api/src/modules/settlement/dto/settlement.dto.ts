import { IsString, IsNumber, IsNotEmpty, IsOptional, IsInt, Min, Max, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// TWD 金額上限（十億）
const MAX_AMOUNT = 1_000_000_000;
const MAX_ID_LENGTH = 50;

export class CreateSettlementDto {
  @ApiProperty({ description: '旅程 ID' })
  @IsString()
  @IsNotEmpty({ message: '旅程 ID 不可為空' })
  @MaxLength(MAX_ID_LENGTH)
  tripId: string;

  @ApiPropertyOptional({ description: '收款人 ID（與 virtualReceiverId 擇一）' })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_ID_LENGTH)
  receiverId?: string;

  @ApiPropertyOptional({ description: '虛擬人員付款者 ID' })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_ID_LENGTH)
  virtualPayerId?: string;

  @ApiPropertyOptional({ description: '虛擬人員收款者 ID' })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_ID_LENGTH)
  virtualReceiverId?: string;

  @ApiProperty({ description: '金額（TWD 整數）', example: 500 })
  @IsNumber()
  @IsInt({ message: '金額必須為整數' })
  @Min(1, { message: 'TWD 最小單位為 1 元' })
  @Max(MAX_AMOUNT)
  amount: number;
}
