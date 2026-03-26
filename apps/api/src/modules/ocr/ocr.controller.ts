import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OcrService } from './ocr.service';
import { BrandLookupService } from './services/brand-lookup.service';
import {
  ScanReceiptDto,
  ScanReceiptImageDto,
  BrandLookupDto,
  LearnMappingDto,
} from './dto/scan-receipt.dto';

/**
 * 圖片檔案過濾器
 * 只允許 JPEG, PNG, GIF, WebP 格式
 */
const imageFileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ];
  if (allowedMimeTypes.includes(file.mimetype)) {
    callback(null, true);
  } else {
    callback(new BadRequestException('只支援 JPEG, PNG, GIF, WebP 格式的圖片'), false);
  }
};

/**
 * OCR 收據掃描 API
 *
 * 提供收據文字解析、品牌對照、學習等功能
 */
@ApiTags('OCR')
@Controller('ocr')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OcrController {
  constructor(
    private readonly ocrService: OcrService,
    private readonly brandLookupService: BrandLookupService,
  ) {}

  /**
   * 掃描收據
   *
   * 前端使用 ML Kit 辨識後，將原始文字傳送至此 API 解析
   */
  @Post('scan-receipt')
  @ApiOperation({
    summary: '解析收據文字',
    description: '將 OCR 辨識的原始文字解析為結構化資料',
  })
  @ApiResponse({
    status: 200,
    description: '解析成功',
    schema: {
      type: 'object',
      properties: {
        companyName: { type: 'string', description: '公司名稱' },
        brandName: { type: 'string', description: '品牌名稱' },
        taxId: { type: 'string', description: '統一編號' },
        amount: { type: 'number', description: '金額' },
        date: { type: 'string', format: 'date-time', description: '日期' },
        suggestedCategory: { type: 'string', description: '建議分類' },
        confidence: { type: 'number', description: '信心度 (0-1)' },
        brandSource: { type: 'string', description: '品牌來源' },
      },
    },
  })
  async scanReceipt(
    @CurrentUser() user: { id: string },
    @Body() dto: ScanReceiptDto,
  ) {
    return this.ocrService.parseReceipt(dto.rawText, user.id);
  }

  /**
   * 掃描收據圖片
   *
   * 使用 Google Cloud Vision API 進行 OCR 辨識，
   * 對中文（特別是台灣熱感應紙收據）的辨識效果優於本地 ML Kit
   * 免費用戶每月有限額，超過後降級到 ML Kit
   */
  @Post('scan-receipt-image')
  @UseInterceptors(
    FileInterceptor('receiptImage', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: imageFileFilter,
    }),
  )
  @ApiOperation({
    summary: '掃描收據圖片',
    description: '上傳收據圖片，使用 Google Cloud Vision API 進行 OCR 辨識',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        receiptImage: {
          type: 'string',
          format: 'binary',
          description: '收據圖片檔案',
        },
        tripId: {
          type: 'string',
          description: '旅程 ID',
        },
        mlKitFallbackText: {
          type: 'string',
          description: 'ML Kit 辨識的原始文字（作為備援）',
        },
        saveImage: {
          type: 'boolean',
          description: '是否儲存圖片到 S3',
        },
      },
      required: ['receiptImage'],
    },
  })
  @ApiResponse({
    status: 200,
    description: '辨識成功',
    schema: {
      type: 'object',
      properties: {
        companyName: { type: 'string', description: '公司名稱' },
        brandName: { type: 'string', description: '品牌名稱' },
        taxId: { type: 'string', description: '統一編號' },
        amount: { type: 'number', description: '金額' },
        date: { type: 'string', format: 'date-time', description: '日期' },
        invoiceNumber: { type: 'string', description: '電子發票號碼' },
        suggestedCategory: { type: 'string', description: '建議分類' },
        confidence: { type: 'number', description: '信心度 (0-1)' },
        brandSource: { type: 'string', description: '品牌來源' },
        rawText: { type: 'string', description: '原始辨識文字' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '圖片格式不支援或 Vision API 未設定',
  })
  async scanReceiptImage(
    @CurrentUser() user: { id: string; isAdFree?: boolean },
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ScanReceiptImageDto,
  ) {
    if (!file) {
      throw new BadRequestException('請上傳收據圖片');
    }

    // 配額檢查：Premium 用戶無限制，免費用戶每月 30 次
    if (!user.isAdFree) {
      const canScan = await this.ocrService.checkAndIncrementQuota(user.id);
      if (!canScan) {
        throw new BadRequestException(
          '本月免費掃描次數已用完，請升級至進階版或使用手動輸入',
        );
      }
    }

    return this.ocrService.parseReceiptFromImage(
      file.buffer,
      user.id,
      dto.mlKitFallbackText,
      dto.saveImage,
    );
  }

  /**
   * 查詢品牌對照
   *
   * 根據公司名稱查詢對應的品牌名稱
   */
  @Get('company-mapping')
  @ApiOperation({
    summary: '查詢品牌對照',
    description: '根據公司名稱查詢品牌對照結果',
  })
  @ApiResponse({
    status: 200,
    description: '查詢成功',
    schema: {
      type: 'object',
      properties: {
        brandName: { type: 'string', description: '品牌名稱' },
        category: { type: 'string', description: '分類' },
        source: { type: 'string', description: '來源' },
        confidence: { type: 'number', description: '信心度' },
      },
    },
  })
  async getCompanyMapping(
    @Query() dto: BrandLookupDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.brandLookupService.lookup(dto.companyName, user.id);
  }

  /**
   * 學習品牌對照
   *
   * 用戶修正品牌名稱後，記錄個人化對照供未來使用
   */
  @Post('learn')
  @ApiOperation({
    summary: '學習品牌對照',
    description: '記錄用戶的品牌修正，供未來辨識使用',
  })
  @ApiResponse({
    status: 200,
    description: '學習成功',
  })
  async learnMapping(
    @CurrentUser() user: { id: string },
    @Body() dto: LearnMappingDto,
  ) {
    await this.ocrService.learnBrandMapping(
      user.id,
      dto.companyName,
      dto.customBrandName,
    );
    return { success: true };
  }
}
