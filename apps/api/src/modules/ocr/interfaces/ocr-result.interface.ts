import { BillCategory } from '@prisma/client';

/**
 * 品牌查詢來源
 */
export type BrandSource = 'USER_HISTORY' | 'MAPPING_TABLE' | 'AI_SUGGEST' | 'NOT_FOUND';

/**
 * 公司名稱識別來源
 */
export type CompanySource = 'FRANCHISE' | 'PATTERN' | 'FIRST_LINE' | 'NONE';

/**
 * 金額識別來源
 */
export type AmountSource = 'KEYWORD' | 'CURRENCY' | 'GENERAL' | 'NONE';

/**
 * 信心度等級
 */
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * 建議操作
 */
export type SuggestedAction = 'AUTO_FILL' | 'REVIEW_AMOUNT' | 'REVIEW_COMPANY' | 'MANUAL_INPUT';

/**
 * 品牌查詢結果
 */
export interface BrandResult {
  brandName: string;
  category?: BillCategory;
  source: BrandSource;
  confidence: number;
}

/**
 * 信心度詳情
 */
export interface ConfidenceDetails {
  amount: {
    value: number | null;
    source: AmountSource;
    score: number;
  };
  company: {
    value: string | null;
    source: CompanySource;
    score: number;
  };
  date: {
    value: Date | null;
    score: number;
  };
  invoice: {
    value: string | null;
    score: number;
  };
  brand: {
    value: string | null;
    source: BrandSource | null;
    score: number;
  };
}

/**
 * 收據品項明細
 */
export interface ReceiptLineItem {
  /** 品項名稱 */
  name: string;
  /** 單價（部分格式無法解析） */
  unitPrice?: number;
  /** 數量 */
  quantity: number;
  /** 小計金額 */
  subtotal: number;
  /** 是否為折扣/優惠項目（金額為負） */
  isDiscount: boolean;
}

/**
 * 品項解析結果
 */
export interface LineItemParseResult {
  /** 解析到的品項列表 */
  items: ReceiptLineItem[];
  /** 品項金額總和 */
  itemsTotal: number;
  /** 解析信心度 (0-1) */
  confidence: number;
  /** 使用的解析器名稱 */
  parserUsed: string;
}

/**
 * OCR 解析結果
 */
export interface OcrParseResult {
  // 商家資訊
  companyName?: string;
  brandName?: string;
  taxId?: string;

  // 台灣電子發票號碼
  invoiceNumber?: string;

  // 金額
  amount?: number;

  // 日期
  date?: Date;

  // 分類建議
  suggestedCategory?: BillCategory;

  // 信心度
  confidence: number;

  // 信心度等級
  confidenceLevel?: ConfidenceLevel;

  // 信心度詳情
  confidenceDetails?: ConfidenceDetails;

  // 建議操作
  suggestedAction?: SuggestedAction;

  // 原始文字
  rawText: string;

  // 品牌查詢來源
  brandSource?: BrandSource;

  // 品項明細
  lineItems?: LineItemParseResult;

  // 偵測到的語言（由 Vision API 提供）
  detectedLanguage?: string;

  // 幣別推斷結果
  currencyResult?: {
    currency: string;
    confidence: number;
  };
}

/**
 * AI 品牌建議結果
 */
export interface AiSuggestionResult {
  suggestion: string;
  category?: BillCategory;
  confidence: number;
  reasoning?: string;
}
