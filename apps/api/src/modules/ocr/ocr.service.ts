import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { TextParserService } from './services/text-parser.service';
import { BrandLookupService } from './services/brand-lookup.service';
import { VisionOcrService } from './services/vision-ocr.service';
import { LineItemParserService } from './services/line-item-parser.service';
import {
  OcrParseResult,
  ConfidenceDetails,
  ConfidenceLevel,
  SuggestedAction,
  CompanySource,
  BrandSource,
} from './interfaces/ocr-result.interface';
import { S3Service } from '../../common/s3/s3.service';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * OCR 收據解析服務
 *
 * 整合文字解析和品牌對照，提供完整的收據辨識結果
 * 支援 Google Cloud Vision API 進行圖片 OCR
 */
@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  /** 免費用戶每月 Vision API 掃描上限 */
  private readonly FREE_MONTHLY_SCAN_LIMIT = 30;

  constructor(
    private readonly textParser: TextParserService,
    private readonly brandLookup: BrandLookupService,
    private readonly visionOcr: VisionOcrService,
    private readonly s3Service: S3Service,
    private readonly lineItemParser: LineItemParserService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 解析收據
   *
   * @param rawText - OCR 辨識的原始文字
   * @param userId - 用戶 ID（用於個人化品牌對照）
   * @returns 解析結果
   */
  async parseReceipt(rawText: string, userId: string, detectedLanguage?: string): Promise<OcrParseResult> {
    this.logger.debug(`開始解析收據，文字長度: ${rawText.length}, 語言: ${detectedLanguage || '未偵測'}`);

    // 1. 解析基本資訊（傳遞語言以啟用多語言關鍵字）
    const parsed = this.textParser.parseReceipt(rawText, detectedLanguage);

    // 2. 判斷公司名稱來源
    const companySource = this.determineCompanySource(rawText, parsed.companyName);

    // 3. 查詢品牌對照
    let brandResult = null;
    if (parsed.companyName) {
      brandResult = await this.brandLookup.lookup(parsed.companyName, userId);
    }

    // 4. 計算信心度詳情
    const confidenceDetails = this.buildConfidenceDetails(
      parsed,
      companySource,
      brandResult,
    );

    // 5. 解析品項明細
    const effectiveBrandName = brandResult?.brandName || parsed.companyName;
    const lineItems = rawText.length >= 50
      ? await this.lineItemParser.parseLineItems(rawText, effectiveBrandName, parsed.amount)
      : null;

    // 6. 計算整體信心度
    const confidence = this.calculateEnhancedConfidence(confidenceDetails);
    const confidenceLevel = this.determineConfidenceLevel(confidence);
    const suggestedAction = this.determineSuggestedAction(confidenceDetails);

    // 7. 幣別推斷
    const currencyResult = this.detectCurrency(rawText, detectedLanguage);

    // 8. 組合結果
    const result: OcrParseResult = {
      companyName: parsed.companyName,
      brandName: brandResult?.brandName || parsed.companyName,
      taxId: parsed.taxId,
      invoiceNumber: parsed.invoiceNumber,
      amount: parsed.amount,
      date: parsed.date,
      suggestedCategory: brandResult?.category,
      confidence,
      confidenceLevel,
      confidenceDetails,
      suggestedAction,
      rawText,
      brandSource: brandResult?.source,
      lineItems: lineItems ?? undefined,
      detectedLanguage,
      currencyResult: currencyResult ?? undefined,
    };

    this.logger.log(
      `收據解析完成: ${result.brandName || '未知商家'}, ` +
      `金額: ${result.amount || '未知'}, ` +
      `信心度: ${(result.confidence * 100).toFixed(0)}% (${result.confidenceLevel}), ` +
      `建議操作: ${result.suggestedAction}`,
    );

    return result;
  }

  /**
   * 判斷公司名稱識別來源
   */
  private determineCompanySource(rawText: string, companyName?: string): CompanySource {
    if (!companyName) {
      return 'NONE';
    }

    // 檢查是否由 franchise pattern 識別
    const franchiseName = this.textParser.extractFranchiseName(rawText);
    if (franchiseName && franchiseName === companyName) {
      return 'FRANCHISE';
    }

    // 檢查是否包含公司後綴
    const companyPatterns = [
      /股份有限公司$/, /有限公司$/, /企業社$/, /商行$/, /商店$/, /工作室$/, /餐廳$/, /小吃$/,
    ];
    for (const pattern of companyPatterns) {
      if (pattern.test(companyName)) {
        return 'PATTERN';
      }
    }

    // 其他情況為第一行
    return 'FIRST_LINE';
  }

  /**
   * 建立信心度詳情
   */
  private buildConfidenceDetails(
    parsed: ReturnType<TextParserService['parseReceipt']>,
    companySource: CompanySource,
    brandResult: { brandName: string; confidence: number; source: BrandSource } | null,
  ): ConfidenceDetails {
    // 公司名稱評分
    const companyScores: Record<CompanySource, number> = {
      'FRANCHISE': 1.0,
      'PATTERN': 0.8,
      'FIRST_LINE': 0.4,
      'NONE': 0,
    };

    // 品牌對照評分
    const brandScores: Record<BrandSource, number> = {
      'USER_HISTORY': 1.0,
      'MAPPING_TABLE': 0.95,
      'AI_SUGGEST': 0.7,
      'NOT_FOUND': 0.3,
    };

    return {
      amount: {
        value: parsed.amount ?? null,
        source: parsed.amount ? 'KEYWORD' : 'NONE', // 簡化：假設有金額就是 keyword
        score: parsed.amount ? 0.9 : 0,
      },
      company: {
        value: parsed.companyName ?? null,
        source: companySource,
        score: companyScores[companySource],
      },
      date: {
        value: parsed.date ?? null,
        score: parsed.date ? 1.0 : 0,
      },
      invoice: {
        value: parsed.invoiceNumber ?? null,
        score: parsed.invoiceNumber ? 1.0 : 0,
      },
      brand: {
        value: brandResult?.brandName ?? null,
        source: brandResult?.source ?? null,
        score: brandResult ? brandScores[brandResult.source] : 0,
      },
    };
  }

  /**
   * 計算改進後的整體信心度
   *
   * 權重分配：
   * - 金額：35%（最重要）
   * - 公司名稱：30%
   * - 品牌對照：20%
   * - 日期：10%
   * - 發票號碼：5%
   */
  private calculateEnhancedConfidence(details: ConfidenceDetails): number {
    const weights = {
      amount: 0.35,
      company: 0.30,
      brand: 0.20,
      date: 0.10,
      invoice: 0.05,
    };

    const score =
      details.amount.score * weights.amount +
      details.company.score * weights.company +
      details.brand.score * weights.brand +
      details.date.score * weights.date +
      details.invoice.score * weights.invoice;

    return Math.min(score, 1.0);
  }

  /**
   * 判斷信心度等級
   */
  private determineConfidenceLevel(confidence: number): ConfidenceLevel {
    if (confidence >= 0.7) return 'HIGH';
    if (confidence >= 0.4) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * 判斷建議操作
   */
  private determineSuggestedAction(details: ConfidenceDetails): SuggestedAction {
    // 金額和公司都很好 → 自動填入
    if (details.amount.score >= 0.8 && details.company.score >= 0.7) {
      return 'AUTO_FILL';
    }

    // 金額信心度低 → 需確認金額
    if (details.amount.score < 0.5) {
      return 'REVIEW_AMOUNT';
    }

    // 公司名稱信心度低 → 需確認公司
    if (details.company.score < 0.5) {
      return 'REVIEW_COMPANY';
    }

    // 其他情況 → 手動輸入
    return 'MANUAL_INPUT';
  }

  /**
   * 從圖片解析收據
   *
   * 使用 Google Cloud Vision API 進行 OCR 辨識，
   * 對中文的辨識效果優於本地 ML Kit
   *
   * @param imageBuffer - 圖片 Buffer
   * @param userId - 用戶 ID
   * @param mlKitFallbackText - ML Kit 辨識的文字（作為備援）
   * @param saveImage - 是否儲存圖片到 S3
   * @returns 解析結果
   */
  async parseReceiptFromImage(
    imageBuffer: Buffer,
    userId: string,
    mlKitFallbackText?: string,
    saveImage?: boolean,
  ): Promise<OcrParseResult> {
    this.logger.debug('開始從圖片解析收據...');

    let rawText: string;
    let structuredRegions: { header: string[]; body: string[]; footer: string[] } | null = null;
    let detectedLanguage: string | undefined;

    // 1. 嘗試使用 Vision API
    if (this.visionOcr.isEnabled()) {
      try {
        const visionResult = await this.visionOcr.recognizeFromBuffer(imageBuffer);
        rawText = visionResult.fullText;
        structuredRegions = visionResult.structuredRegions;
        detectedLanguage = visionResult.detectedLanguage;
        this.logger.debug(`Vision API 辨識完成，文字長度: ${rawText.length}, 語言: ${detectedLanguage || '未偵測'}`);
      } catch (error) {
        this.logger.error(`Vision API 辨識失敗: ${error}`);
        // 嘗試使用備援文字
        if (mlKitFallbackText) {
          this.logger.debug('使用 ML Kit 備援文字');
          rawText = mlKitFallbackText;
        } else {
          throw new BadRequestException('圖片辨識失敗，請重試或手動輸入');
        }
      }
    } else if (mlKitFallbackText) {
      // Vision API 未設定，使用 ML Kit 文字
      this.logger.debug('Vision API 未設定，使用 ML Kit 備援文字');
      rawText = mlKitFallbackText;
    } else {
      throw new BadRequestException(
        'Google Cloud Vision API 未設定，請提供 ML Kit 辨識的文字作為備援',
      );
    }

    // 2. 可選：儲存圖片到 S3
    if (saveImage && this.s3Service.isEnabled()) {
      try {
        const filename = `receipt_${Date.now()}.jpg`;
        const file = {
          buffer: imageBuffer,
          originalname: filename,
          mimetype: 'image/jpeg',
        } as Express.Multer.File;
        const imageUrl = await this.s3Service.uploadFile(file, 'ocr-receipts');
        this.logger.debug(`收據圖片已上傳: ${imageUrl}`);
      } catch (error) {
        this.logger.warn(`圖片上傳失敗: ${error}`);
        // 圖片上傳失敗不影響解析流程
      }
    }

    // 3. 使用文字解析流程（結合結構化區域）
    return this.parseReceiptWithStructure(rawText, userId, structuredRegions, detectedLanguage);
  }

  /**
   * 解析收據（結合結構化區域）
   *
   * 使用版面分析結果來提升解析準確度：
   * - Header 區域優先用於識別店名
   * - Footer 區域優先用於識別總額
   */
  private async parseReceiptWithStructure(
    rawText: string,
    userId: string,
    structuredRegions: { header: string[]; body: string[]; footer: string[] } | null,
    detectedLanguage?: string,
  ): Promise<OcrParseResult> {
    // 基本解析（傳遞偵測語言）
    const baseResult = await this.parseReceipt(rawText, userId, detectedLanguage);

    // 如果沒有結構化區域或已經有足夠好的結果，直接返回
    if (!structuredRegions || (baseResult.confidence >= 0.7)) {
      return baseResult;
    }

    // 嘗試用結構化區域改進結果
    let improved = false;

    // 1. 如果金額信心度低，嘗試從 footer 提取
    if (
      baseResult.confidenceDetails?.amount.score &&
      baseResult.confidenceDetails.amount.score < 0.8 &&
      structuredRegions.footer.length > 0
    ) {
      const footerText = structuredRegions.footer.join('\n');
      const footerAmount = this.textParser.extractAmount(footerText);
      if (footerAmount && (!baseResult.amount || footerAmount !== baseResult.amount)) {
        this.logger.debug(`從 footer 區域找到金額: ${footerAmount}`);
        baseResult.amount = footerAmount;
        if (baseResult.confidenceDetails) {
          baseResult.confidenceDetails.amount.value = footerAmount;
          baseResult.confidenceDetails.amount.score = 0.95; // footer 金額信心度較高
          baseResult.confidenceDetails.amount.source = 'KEYWORD';
        }
        improved = true;
      }
    }

    // 2. 如果公司名稱信心度低，嘗試從 header 提取
    if (
      baseResult.confidenceDetails?.company.score &&
      baseResult.confidenceDetails.company.score < 0.7 &&
      structuredRegions.header.length > 0
    ) {
      const headerText = structuredRegions.header.join('\n');
      const headerCompany = this.textParser.extractCompanyName(headerText);
      if (headerCompany && headerCompany !== baseResult.companyName) {
        this.logger.debug(`從 header 區域找到公司: ${headerCompany}`);
        baseResult.companyName = headerCompany;
        if (baseResult.confidenceDetails) {
          baseResult.confidenceDetails.company.value = headerCompany;
          baseResult.confidenceDetails.company.score = 0.85; // header 公司名稱信心度較高
        }
        improved = true;
      }
    }

    // 重新計算信心度
    if (improved && baseResult.confidenceDetails) {
      baseResult.confidence = this.calculateEnhancedConfidence(baseResult.confidenceDetails);
      baseResult.confidenceLevel = this.determineConfidenceLevel(baseResult.confidence);
      baseResult.suggestedAction = this.determineSuggestedAction(baseResult.confidenceDetails);
      this.logger.debug(`結構化分析後信心度提升至: ${(baseResult.confidence * 100).toFixed(0)}%`);
    }

    return baseResult;
  }

  /**
   * 幣別推斷
   *
   * 優先級：
   * 1. 明確貨幣符號（₩→KRW, ฿→THB）
   * 2. 模糊符號 + 語言消歧（¥ + ja→JPY, ¥ + zh→CNY）
   * 3. 語言 → 預設貨幣（ja→JPY, ko→KRW）
   *
   * 信心分數 0.0-1.0
   */
  private detectCurrency(
    rawText: string,
    detectedLanguage?: string,
  ): { currency: string; confidence: number } | null {
    // 優先級 1: 明確貨幣符號
    if (/₩/.test(rawText)) return { currency: 'KRW', confidence: 0.95 };
    if (/฿/.test(rawText)) return { currency: 'THB', confidence: 0.95 };
    if (/원/.test(rawText)) return { currency: 'KRW', confidence: 0.9 };
    if (/บาท/.test(rawText)) return { currency: 'THB', confidence: 0.9 };
    if (/円/.test(rawText)) return { currency: 'JPY', confidence: 0.9 };

    // 優先級 2: 模糊符號 + 語言消歧
    if (/¥/.test(rawText)) {
      if (detectedLanguage === 'ja') return { currency: 'JPY', confidence: 0.9 };
      if (detectedLanguage?.startsWith('zh')) return { currency: 'CNY', confidence: 0.9 };
      return { currency: 'JPY', confidence: 0.6 }; // 預設 JPY（旅行場景更常見）
    }

    if (/NT\$|NTD/.test(rawText)) return { currency: 'TWD', confidence: 0.95 };

    // $ 不單獨推斷 — 需要語言或上下文
    if (/\$/.test(rawText)) {
      if (detectedLanguage === 'en') return { currency: 'USD', confidence: 0.5 };
      // 不推斷，返回 null
    }

    // 優先級 3: 語言 → 預設貨幣
    const langToCurrency: Record<string, string> = {
      ja: 'JPY', ko: 'KRW', th: 'THB', vi: 'VND',
    };
    if (detectedLanguage && langToCurrency[detectedLanguage]) {
      return { currency: langToCurrency[detectedLanguage], confidence: 0.7 };
    }

    return null;
  }

  /**
   * 學習品牌對照
   */
  async learnBrandMapping(
    userId: string,
    companyName: string,
    customBrandName: string,
  ): Promise<void> {
    await this.brandLookup.learnMapping(userId, companyName, customBrandName);
  }

  /**
   * 檢查並遞增掃描配額
   *
   * 免費用戶每月 30 次 Vision API 掃描
   * 月份自動重置（比較 month 欄位）
   *
   * @returns true 表示可以掃描，false 表示已達上限
   */
  async checkAndIncrementQuota(userId: string): Promise<boolean> {
    const currentMonth = new Date().toISOString().slice(0, 7); // "2026-03"

    const quota = await this.prisma.ocrScanQuota.findUnique({
      where: { userId },
    });

    if (!quota || quota.month !== currentMonth) {
      // 新用戶或新月份 → 重置計數器
      await this.prisma.ocrScanQuota.upsert({
        where: { userId },
        create: { userId, month: currentMonth, usedCount: 1 },
        update: { month: currentMonth, usedCount: 1 },
      });
      return true;
    }

    if (quota.usedCount >= this.FREE_MONTHLY_SCAN_LIMIT) {
      this.logger.warn(`用戶 ${userId} 已達本月掃描上限 (${quota.usedCount}/${this.FREE_MONTHLY_SCAN_LIMIT})`);
      return false;
    }

    // 遞增計數器
    await this.prisma.ocrScanQuota.update({
      where: { userId },
      data: { usedCount: { increment: 1 } },
    });

    return true;
  }
}
