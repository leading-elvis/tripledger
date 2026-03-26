import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BillCategory } from '@prisma/client';
import { AiSuggestionResult } from '../interfaces/ocr-result.interface';

/**
 * AI 品牌建議服務
 *
 * 當企業對照表查無結果時，使用 Claude API 推測品牌名稱
 */
@Injectable()
export class AiSuggestionService {
  private readonly logger = new Logger(AiSuggestionService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * 使用 AI 推測品牌名稱
   *
   * @param companyName - 公司登記名稱
   * @returns AI 推測結果
   */
  async suggestBrand(companyName: string): Promise<AiSuggestionResult> {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');

    // 若未設定 API Key，回傳原始名稱
    if (!apiKey) {
      this.logger.warn('未設定 ANTHROPIC_API_KEY，跳過 AI 推測');
      return {
        suggestion: companyName,
        confidence: 0.3,
      };
    }

    try {
      const prompt = this.buildPrompt(companyName);
      const response = await this.callClaudeApi(apiKey, prompt);
      return this.parseResponse(response, companyName);
    } catch (error) {
      this.logger.error(`AI 推測失敗: ${error}`);
      return {
        suggestion: companyName,
        confidence: 0.1,
      };
    }
  }

  /**
   * 建立 AI prompt
   */
  private buildPrompt(companyName: string): string {
    return `你是台灣商家品牌辨識助手。請根據公司登記名稱，推測其常用品牌名稱和消費分類。

公司名稱：「${companyName}」

請以 JSON 格式回傳：
{
  "brandName": "常用品牌名稱（消費者熟知的名稱）",
  "category": "分類（FOOD/TRANSPORT/ACCOMMODATION/ATTRACTION/SHOPPING/OTHER）",
  "confidence": 信心度（0-1，數字）,
  "reasoning": "判斷理由（簡短說明）"
}

注意：
1. 品牌名稱應該是消費者常用的名稱，例如「統一超商股份有限公司」→「7-Eleven」
2. 如果無法判斷，brandName 直接使用原始公司名稱
3. 分類說明：
   - FOOD: 餐飲、飲料、超市、便利商店
   - TRANSPORT: 交通、加油站、租車
   - ACCOMMODATION: 住宿、飯店
   - ATTRACTION: 景點、門票、娛樂
   - SHOPPING: 購物、百貨、服飾、3C
   - OTHER: 其他
4. 只回傳 JSON，不要其他文字`;
  }

  /**
   * 呼叫 Claude API
   */
  private async callClaudeApi(apiKey: string, prompt: string): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API 錯誤: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text?: string }>;
    };

    const textContent = data.content.find((c) => c.type === 'text');
    if (!textContent || !textContent.text) {
      throw new Error('無法解析 Claude API 回應');
    }

    return textContent.text;
  }

  /**
   * 解析 AI 回應
   */
  private parseResponse(
    response: string,
    originalName: string,
  ): AiSuggestionResult {
    try {
      // 嘗試提取 JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('找不到 JSON');
      }

      const parsed = JSON.parse(jsonMatch[0]) as {
        brandName?: string;
        category?: string;
        confidence?: number;
        reasoning?: string;
      };

      // 驗證分類
      const validCategories: BillCategory[] = [
        'FOOD',
        'TRANSPORT',
        'ACCOMMODATION',
        'ATTRACTION',
        'SHOPPING',
        'OTHER',
      ];
      const category = validCategories.includes(parsed.category as BillCategory)
        ? (parsed.category as BillCategory)
        : undefined;

      return {
        suggestion: parsed.brandName || originalName,
        category,
        confidence:
          typeof parsed.confidence === 'number'
            ? Math.min(Math.max(parsed.confidence, 0), 1)
            : 0.5,
        reasoning: parsed.reasoning,
      };
    } catch (error) {
      this.logger.warn(`解析 AI 回應失敗: ${error}`);
      return {
        suggestion: originalName,
        confidence: 0.2,
      };
    }
  }
}
