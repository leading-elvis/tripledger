import { Module } from '@nestjs/common';
import { OcrController } from './ocr.controller';
import { OcrService } from './ocr.service';
import { TextParserService } from './services/text-parser.service';
import { BrandLookupService } from './services/brand-lookup.service';
import { AiSuggestionService } from './services/ai-suggestion.service';
import { VisionOcrService } from './services/vision-ocr.service';
import { LineItemParserService } from './services/line-item-parser.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

/**
 * OCR 智慧收據掃描模組
 *
 * 提供收據 OCR 文字解析、品牌對照、AI 推測、品項明細解析等功能
 * 支援 Google Cloud Vision API 進行圖片文字辨識
 */
@Module({
  imports: [PrismaModule],
  controllers: [OcrController],
  providers: [
    OcrService,
    TextParserService,
    BrandLookupService,
    AiSuggestionService,
    VisionOcrService,
    LineItemParserService,
  ],
  exports: [OcrService, BrandLookupService, VisionOcrService],
})
export class OcrModule {}
