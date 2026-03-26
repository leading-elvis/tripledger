import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { BrandResult } from '../interfaces/ocr-result.interface';
import { AiSuggestionService } from './ai-suggestion.service';

/**
 * 品牌對照查詢服務
 *
 * 查詢優先順序：
 * 1. 用戶個人化對照（最高優先）
 * 2. 全域企業對照表
 * 3. AI 推測（最低優先）
 */
@Injectable()
export class BrandLookupService {
  private readonly logger = new Logger(BrandLookupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiSuggestionService,
  ) {}

  /**
   * 查詢品牌對照
   *
   * @param companyName - 公司登記名稱或發票上的名稱
   * @param userId - 用戶 ID（用於個人化對照）
   * @returns 品牌查詢結果
   */
  async lookup(companyName: string, userId: string): Promise<BrandResult> {
    // 清理輸入
    const cleanedName = this.cleanCompanyName(companyName);

    if (!cleanedName) {
      return {
        brandName: companyName,
        source: 'NOT_FOUND',
        confidence: 0,
      };
    }

    // 1. 優先查詢用戶個人化對照
    const userMapping = await this.findUserMapping(cleanedName, userId);
    if (userMapping) {
      this.logger.debug(`找到用戶個人化對照: ${companyName} → ${userMapping.customBrandName}`);
      return {
        brandName: userMapping.customBrandName,
        source: 'USER_HISTORY',
        confidence: 1.0,
      };
    }

    // 2. 查詢全域企業對照表
    const globalMapping = await this.findGlobalMapping(cleanedName);
    if (globalMapping) {
      this.logger.debug(`找到全域對照: ${companyName} → ${globalMapping.brandName}`);
      return {
        brandName: globalMapping.brandName,
        category: globalMapping.category ?? undefined,
        source: 'MAPPING_TABLE',
        confidence: 0.95,
      };
    }

    // 3. 使用 AI 推測
    try {
      const aiResult = await this.aiService.suggestBrand(cleanedName);
      this.logger.debug(`AI 推測: ${companyName} → ${aiResult.suggestion} (信心度: ${aiResult.confidence})`);
      return {
        brandName: aiResult.suggestion,
        category: aiResult.category,
        source: 'AI_SUGGEST',
        confidence: aiResult.confidence,
      };
    } catch (error) {
      this.logger.warn(`AI 推測失敗: ${error}`);
      return {
        brandName: companyName,
        source: 'NOT_FOUND',
        confidence: 0,
      };
    }
  }

  /**
   * 查詢用戶個人化對照
   */
  private async findUserMapping(companyName: string, userId: string) {
    return this.prisma.userBrandMapping.findFirst({
      where: {
        userId,
        companyName: {
          contains: companyName,
          mode: 'insensitive',
        },
      },
      orderBy: {
        useCount: 'desc',
      },
    });
  }

  /**
   * 查詢全域企業對照表
   */
  private async findGlobalMapping(companyName: string) {
    // 先嘗試精確匹配
    let mapping = await this.prisma.companyBrandMapping.findFirst({
      where: {
        OR: [
          { companyName: { equals: companyName, mode: 'insensitive' } },
          { aliases: { has: companyName } },
        ],
      },
    });

    if (mapping) return mapping;

    // 嘗試模糊匹配（包含關係）
    mapping = await this.prisma.companyBrandMapping.findFirst({
      where: {
        OR: [
          { companyName: { contains: companyName, mode: 'insensitive' } },
          { brandName: { contains: companyName, mode: 'insensitive' } },
        ],
      },
    });

    return mapping;
  }

  /**
   * 清理公司名稱
   * 移除常見後綴、空白等
   */
  private cleanCompanyName(name: string): string {
    if (!name) return '';

    return name
      .trim()
      // 移除常見後綴
      .replace(/股份有限公司$/g, '')
      .replace(/有限公司$/g, '')
      .replace(/企業$/g, '')
      .replace(/實業$/g, '')
      // 移除分店資訊
      .replace(/[（(].*?[）)]/g, '')
      // 移除多餘空白
      .replace(/\s+/g, '')
      .trim();
  }

  /**
   * 記錄用戶品牌對照（學習）
   *
   * 同時檢查是否有足夠多用戶進行相同修正，
   * 若達到閾值則建議加入全域對照表
   */
  async learnMapping(
    userId: string,
    companyName: string,
    customBrandName: string,
  ): Promise<void> {
    await this.prisma.userBrandMapping.upsert({
      where: {
        userId_companyName: {
          userId,
          companyName,
        },
      },
      update: {
        customBrandName,
        useCount: { increment: 1 },
      },
      create: {
        userId,
        companyName,
        customBrandName,
        useCount: 1,
      },
    });

    this.logger.log(`用戶品牌學習: ${companyName} → ${customBrandName}`);

    // 檢查是否應該建議加入全域對照
    await this.checkForGlobalMappingSuggestion(companyName, customBrandName);
  }

  /**
   * 檢查是否應該建議加入全域對照
   *
   * 當多位用戶（>=3）將同一公司名稱修正為相同品牌名稱時，
   * 記錄日誌建議加入全域對照表
   */
  private async checkForGlobalMappingSuggestion(
    companyName: string,
    brandName: string,
  ): Promise<void> {
    const THRESHOLD = 3; // 達到此數量時建議加入全域對照

    // 計算有多少不同用戶做了相同的修正
    const count = await this.prisma.userBrandMapping.count({
      where: {
        companyName: {
          equals: companyName,
          mode: 'insensitive',
        },
        customBrandName: {
          equals: brandName,
          mode: 'insensitive',
        },
      },
    });

    if (count >= THRESHOLD) {
      // 檢查是否已在全域對照表中
      const existingGlobal = await this.prisma.companyBrandMapping.findFirst({
        where: {
          OR: [
            { companyName: { equals: companyName, mode: 'insensitive' } },
            { brandName: { equals: brandName, mode: 'insensitive' } },
          ],
        },
      });

      if (!existingGlobal) {
        this.logger.warn(
          `🔔 建議加入全域對照: "${companyName}" → "${brandName}" ` +
          `(已有 ${count} 位用戶進行相同修正)`,
        );

        // 可選：自動加入全域對照（未驗證狀態）
        // await this.createUnverifiedGlobalMapping(companyName, brandName);
      }
    }
  }

  /**
   * 建立未驗證的全域對照（可選功能）
   */
  async createUnverifiedGlobalMapping(
    companyName: string,
    brandName: string,
  ): Promise<void> {
    try {
      await this.prisma.companyBrandMapping.create({
        data: {
          companyName,
          brandName,
          category: 'OTHER', // 預設分類
          isVerified: false, // 標記為未驗證
        },
      });
      this.logger.log(`已自動建立未驗證全域對照: ${companyName} → ${brandName}`);
    } catch (error) {
      // 可能因為重複而失敗，忽略
      this.logger.debug(`建立全域對照失敗（可能已存在）: ${error}`);
    }
  }

  /**
   * 增加用戶對照使用次數
   */
  async incrementUseCount(userId: string, companyName: string): Promise<void> {
    await this.prisma.userBrandMapping.updateMany({
      where: {
        userId,
        companyName,
      },
      data: {
        useCount: { increment: 1 },
      },
    });
  }
}
