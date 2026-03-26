import { IsEnum, IsNumber, IsPositive } from 'class-validator';
import { Currency } from '@prisma/client';

/**
 * 取得匯率 DTO
 */
export class GetRateDto {
  @IsEnum(Currency)
  from: Currency;

  @IsEnum(Currency)
  to: Currency;
}

/**
 * 轉換金額 DTO
 */
export class ConvertAmountDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsEnum(Currency)
  from: Currency;

  @IsEnum(Currency)
  to: Currency;
}

/**
 * 匯率回應
 */
export interface RateResponse {
  baseCurrency: Currency;
  targetCurrency: Currency;
  rate: number;
  fetchedAt: Date;
}

/**
 * 轉換結果回應
 */
export interface ConvertResponse {
  originalAmount: number;
  originalCurrency: Currency;
  convertedAmount: number;
  targetCurrency: Currency;
  rate: number;
  fetchedAt: Date;
}

/**
 * 支援的貨幣資訊
 */
export interface CurrencyInfo {
  code: Currency;
  symbol: string;
  name: string;
  decimalPlaces: number;
}

/**
 * 貨幣資訊對照表
 */
export const CURRENCY_INFO: Record<Currency, CurrencyInfo> = {
  TWD: { code: Currency.TWD, symbol: 'NT$', name: '新台幣', decimalPlaces: 0 },
  USD: { code: Currency.USD, symbol: '$', name: '美元', decimalPlaces: 2 },
  JPY: { code: Currency.JPY, symbol: '¥', name: '日圓', decimalPlaces: 0 },
  EUR: { code: Currency.EUR, symbol: '€', name: '歐元', decimalPlaces: 2 },
  KRW: { code: Currency.KRW, symbol: '₩', name: '韓元', decimalPlaces: 0 },
  CNY: { code: Currency.CNY, symbol: '¥', name: '人民幣', decimalPlaces: 2 },
  HKD: { code: Currency.HKD, symbol: 'HK$', name: '港幣', decimalPlaces: 2 },
  GBP: { code: Currency.GBP, symbol: '£', name: '英鎊', decimalPlaces: 2 },
  THB: { code: Currency.THB, symbol: '฿', name: '泰銖', decimalPlaces: 2 },
  VND: { code: Currency.VND, symbol: '₫', name: '越南盾', decimalPlaces: 0 },
  SGD: { code: Currency.SGD, symbol: 'S$', name: '新加坡幣', decimalPlaces: 2 },
  MYR: { code: Currency.MYR, symbol: 'RM', name: '馬來西亞令吉', decimalPlaces: 2 },
  PHP: { code: Currency.PHP, symbol: '₱', name: '菲律賓披索', decimalPlaces: 2 },
  IDR: { code: Currency.IDR, symbol: 'Rp', name: '印尼盾', decimalPlaces: 0 },
  AUD: { code: Currency.AUD, symbol: 'A$', name: '澳幣', decimalPlaces: 2 },
};
