import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  IsNotEmpty,
  ValidateNested,
  IsDateString,
  IsUrl,
  Min,
  Max,
  MaxLength,
  ArrayMaxSize,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '@prisma/client';
import { BillCategory, SplitType } from '../bills.service';

// TWD 金額上限（十億）
const MAX_AMOUNT = 1_000_000_000;
// 字串長度限制
const MAX_TITLE_LENGTH = 100;
const MAX_NOTE_LENGTH = 500;
const MAX_ITEM_NAME_LENGTH = 100;
const MAX_URL_LENGTH = 2048;
// 陣列大小限制
const MAX_PARTICIPANTS = 50;
const MAX_ITEMS = 100;

export class BillShareInputDto {
  @ApiPropertyOptional({ description: '用戶 ID（與 virtualMemberId 擇一）' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  userId?: string;

  @ApiPropertyOptional({ description: '虛擬人員 ID（與 userId 擇一）' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  virtualMemberId?: string;

  @ApiPropertyOptional({ description: '精確金額（EXACT 模式使用）' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(MAX_AMOUNT)
  amount?: number;

  @ApiPropertyOptional({ description: '百分比（PERCENTAGE 模式使用）' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage?: number;

  @ApiPropertyOptional({ description: '份數（SHARES 模式使用）' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  shares?: number;
}

export class BillItemInputDto {
  @ApiProperty({ description: '品項名稱', example: '零食' })
  @IsString()
  @IsNotEmpty({ message: '品項名稱不可為空' })
  @MaxLength(MAX_ITEM_NAME_LENGTH)
  name: string;

  @ApiProperty({ description: '品項金額', example: 600 })
  @IsNumber()
  @Min(0)
  @Max(MAX_AMOUNT)
  amount: number;

  @ApiProperty({ description: '參與分攤的成員 ID 列表', type: [String] })
  @IsArray()
  @ArrayMinSize(1, { message: '至少需要一位參與者' })
  @ArrayMaxSize(MAX_PARTICIPANTS)
  @IsString({ each: true })
  @IsNotEmpty({ each: true, message: '成員 ID 不可為空' })
  participantIds: string[];

  @ApiPropertyOptional({ description: '參與分攤的虛擬人員 ID 列表', type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_PARTICIPANTS)
  @IsString({ each: true })
  virtualParticipantIds?: string[];
}

export class CreateBillDto {
  @ApiProperty({ description: '帳單標題', example: '午餐 - 一蘭拉麵' })
  @IsString()
  @IsNotEmpty({ message: '帳單標題不可為空' })
  @MaxLength(MAX_TITLE_LENGTH)
  title: string;

  @ApiProperty({ description: '金額', example: 2400 })
  @IsNumber()
  @Min(0)
  @Max(MAX_AMOUNT)
  amount: number;

  @ApiProperty({
    description: '分類',
    enum: BillCategory,
    example: BillCategory.FOOD,
  })
  @IsEnum(BillCategory)
  category: BillCategory;

  @ApiProperty({
    description: '分攤方式',
    enum: SplitType,
    example: SplitType.EQUAL,
  })
  @IsEnum(SplitType)
  splitType: SplitType;

  @ApiPropertyOptional({ description: '收據圖片 URL' })
  @IsOptional()
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: '收據圖片必須是有效的 HTTP/HTTPS URL' },
  )
  @MaxLength(MAX_URL_LENGTH)
  receiptImage?: string;

  @ApiPropertyOptional({ description: '備註' })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_NOTE_LENGTH)
  note?: string;

  @ApiPropertyOptional({ description: '付款日期' })
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiPropertyOptional({
    description: '帳單貨幣（不填則使用旅程預設貨幣）',
    enum: Currency,
    example: Currency.TWD,
  })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional({ description: '付款者用戶 ID（不填則為當前用戶）' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  payerId?: string;

  @ApiPropertyOptional({ description: '付款者虛擬人員 ID（與 payerId 擇一）' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  virtualPayerId?: string;

  @ApiProperty({ description: '參與分攤的成員', type: [BillShareInputDto] })
  @IsArray()
  @ArrayMinSize(1, { message: '至少需要一位參與者' })
  @ArrayMaxSize(MAX_PARTICIPANTS)
  @ValidateNested({ each: true })
  @Type(() => BillShareInputDto)
  participants: BillShareInputDto[];

  @ApiPropertyOptional({
    description: '帳單細項列表（ITEMIZED 模式使用）',
    type: [BillItemInputDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => BillItemInputDto)
  items?: BillItemInputDto[];
}

export class UpdateBillDto {
  @ApiPropertyOptional({ description: '帳單標題' })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_TITLE_LENGTH)
  title?: string;

  @ApiPropertyOptional({ description: '金額' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(MAX_AMOUNT)
  amount?: number;

  @ApiPropertyOptional({ description: '分類', enum: BillCategory })
  @IsOptional()
  @IsEnum(BillCategory)
  category?: BillCategory;

  @ApiPropertyOptional({ description: '分攤方式', enum: SplitType })
  @IsOptional()
  @IsEnum(SplitType)
  splitType?: SplitType;

  @ApiPropertyOptional({ description: '收據圖片 URL' })
  @IsOptional()
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: '收據圖片必須是有效的 HTTP/HTTPS URL' },
  )
  @MaxLength(MAX_URL_LENGTH)
  receiptImage?: string;

  @ApiPropertyOptional({ description: '備註' })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_NOTE_LENGTH)
  note?: string;

  @ApiPropertyOptional({ description: '付款日期' })
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiPropertyOptional({
    description: '帳單貨幣',
    enum: Currency,
    example: Currency.TWD,
  })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional({ description: '付款者用戶 ID' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  payerId?: string;

  @ApiPropertyOptional({ description: '付款者虛擬人員 ID' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  virtualPayerId?: string;

  @ApiPropertyOptional({ description: '參與分攤的成員', type: [BillShareInputDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_PARTICIPANTS)
  @ValidateNested({ each: true })
  @Type(() => BillShareInputDto)
  participants?: BillShareInputDto[];

  @ApiPropertyOptional({
    description: '帳單細項列表（ITEMIZED 模式使用）',
    type: [BillItemInputDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => BillItemInputDto)
  items?: BillItemInputDto[];
}
