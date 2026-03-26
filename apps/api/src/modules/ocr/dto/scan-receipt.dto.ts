import { IsString, IsOptional, IsNotEmpty, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

/**
 * 收據掃描請求 DTO
 * 前端使用 ML Kit 辨識後，將原始文字傳送至後端解析
 */
export class ScanReceiptDto {
  @ApiProperty({
    description: 'OCR 辨識的原始文字',
    example: '統一超商股份有限公司\n2026/01/29\n小計 NT$150',
  })
  @IsString()
  @IsNotEmpty()
  rawText: string;

  @ApiPropertyOptional({
    description: '旅程 ID（用於個人化品牌對照）',
  })
  @IsString()
  @IsOptional()
  tripId?: string;
}

/**
 * 品牌查詢請求 DTO
 */
export class BrandLookupDto {
  @ApiProperty({
    description: '公司名稱',
    example: '統一超商股份有限公司',
  })
  @IsString()
  @IsNotEmpty()
  companyName: string;
}

/**
 * 品牌學習請求 DTO
 * 用戶修正品牌名稱後，記錄個人化對照
 */
export class LearnMappingDto {
  @ApiProperty({
    description: '原始公司名稱',
    example: '統一超商股份有限公司',
  })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({
    description: '用戶自訂品牌名稱',
    example: '7-11 中山店',
  })
  @IsString()
  @IsNotEmpty()
  customBrandName: string;
}

/**
 * 圖片收據掃描請求 DTO
 * 直接上傳收據圖片，使用 Google Cloud Vision API 進行 OCR
 * 此功能需要進階版
 */
export class ScanReceiptImageDto {
  @ApiProperty({
    description: '旅程 ID（必填，用於進階版驗證）',
  })
  @IsString()
  @IsNotEmpty()
  tripId: string;

  @ApiPropertyOptional({
    description: 'ML Kit 辨識的原始文字（作為備援）',
  })
  @IsString()
  @IsOptional()
  mlKitFallbackText?: string;

  @ApiPropertyOptional({
    description: '是否儲存圖片到 S3（預設不儲存）',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  saveImage?: boolean;
}
