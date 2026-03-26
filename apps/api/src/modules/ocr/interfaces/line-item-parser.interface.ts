import { ReceiptLineItem } from './ocr-result.interface';

/**
 * 品項解析器介面（Strategy 模式）
 *
 * 每個實作負責特定類型的收據格式。
 * parse() 使用 async 簽名，預留未來 LLM 解析器的擴充空間。
 */
export interface LineItemParser {
  /** 解析器名稱 */
  readonly name: string;

  /** 優先順序（數字越小越先執行） */
  readonly priority: number;

  /**
   * 判斷此解析器是否能處理指定的收據文字
   */
  canParse(rawText: string, brandName?: string): boolean;

  /**
   * 解析品項明細
   */
  parse(rawText: string): Promise<ReceiptLineItem[]>;
}
