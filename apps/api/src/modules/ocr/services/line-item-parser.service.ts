import { Injectable, Logger } from '@nestjs/common';
import { LineItemParser } from '../interfaces/line-item-parser.interface';
import { LineItemParseResult } from '../interfaces/ocr-result.interface';
import { SmartLineItemParser } from './line-item-parsers/smart-line-item.parser';

/**
 * 品項解析調度服務
 *
 * 依優先順序嘗試各解析器，回傳第一個成功的結果。
 * 目前僅有 SmartLineItemParser（通用），
 * 未來可加入 LlmLineItemParser（以 priority 100 作為 fallback）。
 */
@Injectable()
export class LineItemParserService {
  private readonly logger = new Logger(LineItemParserService.name);
  private readonly parsers: LineItemParser[];

  constructor() {
    this.parsers = [
      new SmartLineItemParser(),
      // 未來: new LlmLineItemParser(configService) — priority: 100
    ].sort((a, b) => a.priority - b.priority);
  }

  /**
   * 解析品項明細
   *
   * @param rawText - OCR 原始文字
   * @param brandName - 已辨識的品牌名稱（可選，供特定解析器使用）
   * @param totalAmount - 已解析的總金額（可選，用於驗證品項總和）
   * @returns 解析結果，或 null 表示無法解析
   */
  async parseLineItems(
    rawText: string,
    brandName?: string,
    totalAmount?: number,
  ): Promise<LineItemParseResult | null> {
    if (!rawText || rawText.length < 10) {
      return null;
    }

    for (const parser of this.parsers) {
      if (!parser.canParse(rawText, brandName)) {
        continue;
      }

      this.logger.debug(`嘗試使用 ${parser.name} 解析品項...`);

      try {
        const items = await parser.parse(rawText);

        if (items.length === 0) {
          this.logger.debug(`${parser.name} 未解析到品項，嘗試下一個`);
          continue;
        }

        const itemsTotal = items.reduce((sum, item) => sum + item.subtotal, 0);
        const confidence = this.calculateConfidence(items, itemsTotal, totalAmount);

        const result: LineItemParseResult = {
          items,
          itemsTotal,
          confidence,
          parserUsed: parser.name,
        };

        this.logger.log(
          `品項解析完成: ${items.length} 項, ` +
          `總計: ${itemsTotal}, ` +
          `信心度: ${(confidence * 100).toFixed(0)}%, ` +
          `解析器: ${parser.name}`,
        );

        return result;
      } catch (error) {
        this.logger.error(`${parser.name} 解析失敗: ${error}`);
        continue;
      }
    }

    return null;
  }

  /**
   * 計算品項解析信心度
   */
  private calculateConfidence(
    items: { name: string; quantity: number; subtotal: number; isDiscount: boolean }[],
    itemsTotal: number,
    totalAmount?: number,
  ): number {
    let confidence = 0;
    const validItems = items.filter((i) => !i.isDiscount);

    if (validItems.length === 0) return 0;

    // 有品項就有基礎分 (0.3)
    confidence += 0.3;

    // 所有正常品項小計 > 0 (+0.15)
    if (validItems.every((i) => i.subtotal > 0)) {
      confidence += 0.15;
    }

    // 數量合理 1~99 (+0.1)
    if (validItems.every((i) => i.quantity >= 1 && i.quantity <= 99)) {
      confidence += 0.1;
    }

    // 品名長度合理 2~50 字 (+0.1)
    if (validItems.every((i) => i.name.length >= 2 && i.name.length <= 50)) {
      confidence += 0.1;
    }

    // 品項總和為正 (+0.1)
    if (itemsTotal > 0) {
      confidence += 0.1;
    }

    // 品項總和與已知總額吻合 (+0.25)
    if (totalAmount && totalAmount > 0 && itemsTotal > 0) {
      const diff = Math.abs(itemsTotal - totalAmount);
      const tolerance = totalAmount * 0.05; // 5% 容差
      if (diff <= tolerance) {
        confidence += 0.25;
      } else if (diff <= totalAmount * 0.15) {
        confidence += 0.1; // 15% 以內仍有部分加分
      }
    }

    return Math.min(confidence, 1.0);
  }
}
