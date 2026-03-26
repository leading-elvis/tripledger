import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Currency } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CURRENCY_INFO, RateResponse, ConvertResponse } from './dto/exchange-rate.dto';

/**
 * 匯率服務
 *
 * 負責取得和快取匯率，支援貨幣轉換。
 * 使用 ExchangeRate-API 作為匯率來源。
 */
@Injectable()
export class ExchangeRateService implements OnModuleInit {
  private readonly logger = new Logger(ExchangeRateService.name);

  // 記憶體快取（加速查詢）
  private rateCache: Map<string, { rate: number; fetchedAt: Date }> = new Map();
  private readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 小時

  // ExchangeRate-API 設定
  private readonly API_BASE_URL = 'https://v6.exchangerate-api.com/v6';
  private readonly API_KEY = process.env.EXCHANGE_RATE_API_KEY || '';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 模組初始化時載入快取
   */
  async onModuleInit() {
    await this.loadCacheFromDatabase();
  }

  /**
   * 從資料庫載入匯率到記憶體快取
   */
  private async loadCacheFromDatabase() {
    try {
      const rates = await this.prisma.exchangeRate.findMany();
      for (const rate of rates) {
        const key = this.getCacheKey(rate.baseCurrency, rate.targetCurrency);
        this.rateCache.set(key, {
          rate: Number(rate.rate),
          fetchedAt: rate.fetchedAt,
        });
      }
      this.logger.log(`已載入 ${rates.length} 筆匯率到記憶體快取`);
    } catch (error) {
      this.logger.error('載入匯率快取失敗', error);
    }
  }

  /**
   * 取得快取鍵值
   */
  private getCacheKey(from: Currency, to: Currency): string {
    return `${from}_${to}`;
  }

  /**
   * 取得匯率（優先使用快取）
   */
  async getRate(from: Currency, to: Currency): Promise<RateResponse> {
    // 同幣種直接回傳 1
    if (from === to) {
      return {
        baseCurrency: from,
        targetCurrency: to,
        rate: 1,
        fetchedAt: new Date(),
      };
    }

    const cacheKey = this.getCacheKey(from, to);

    // 1. 檢查記憶體快取
    const cached = this.rateCache.get(cacheKey);
    if (cached && this.isCacheValid(cached.fetchedAt)) {
      return {
        baseCurrency: from,
        targetCurrency: to,
        rate: cached.rate,
        fetchedAt: cached.fetchedAt,
      };
    }

    // 2. 檢查資料庫快取
    const dbRate = await this.prisma.exchangeRate.findUnique({
      where: {
        baseCurrency_targetCurrency: {
          baseCurrency: from,
          targetCurrency: to,
        },
      },
    });

    if (dbRate && this.isCacheValid(dbRate.fetchedAt)) {
      // 更新記憶體快取
      this.rateCache.set(cacheKey, {
        rate: Number(dbRate.rate),
        fetchedAt: dbRate.fetchedAt,
      });
      return {
        baseCurrency: from,
        targetCurrency: to,
        rate: Number(dbRate.rate),
        fetchedAt: dbRate.fetchedAt,
      };
    }

    // 3. 從 API 取得最新匯率
    const freshRate = await this.fetchRateFromApi(from, to);

    // 4. 儲存到資料庫和記憶體快取
    await this.saveRate(from, to, freshRate);

    return {
      baseCurrency: from,
      targetCurrency: to,
      rate: freshRate,
      fetchedAt: new Date(),
    };
  }

  /**
   * 檢查快取是否有效
   */
  private isCacheValid(fetchedAt: Date): boolean {
    return Date.now() - fetchedAt.getTime() < this.CACHE_TTL_MS;
  }

  /**
   * 從 API 取得匯率
   * 注意：避免在日誌中暴露 API 金鑰
   */
  private async fetchRateFromApi(from: Currency, to: Currency): Promise<number> {
    if (!this.API_KEY) {
      this.logger.warn('未設定 EXCHANGE_RATE_API_KEY，使用預設匯率');
      return this.getDefaultRate(from, to);
    }

    try {
      const url = `${this.API_BASE_URL}/${this.API_KEY}/pair/${from}/${to}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API 回應錯誤: ${response.status}`);
      }

      const data = await response.json();

      if (data.result !== 'success') {
        throw new Error(`API 錯誤: ${data['error-type']}`);
      }

      return data.conversion_rate;
    } catch (error) {
      // 只記錄錯誤訊息，不記錄完整錯誤物件（可能包含 URL 中的 API 金鑰）
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`取得匯率失敗 (${from} -> ${to}): ${errorMessage}`);

      // 嘗試從資料庫取得舊匯率
      const oldRate = await this.prisma.exchangeRate.findUnique({
        where: {
          baseCurrency_targetCurrency: {
            baseCurrency: from,
            targetCurrency: to,
          },
        },
      });
      if (oldRate) {
        this.logger.warn(`使用舊匯率: ${Number(oldRate.rate)}`);
        return Number(oldRate.rate);
      }
      // 使用預設匯率
      return this.getDefaultRate(from, to);
    }
  }

  /**
   * 取得預設匯率（當 API 不可用時）
   */
  private getDefaultRate(from: Currency, to: Currency): number {
    // 預設匯率表（相對於 USD）
    const ratesVsUsd: Record<Currency, number> = {
      TWD: 32.0,
      USD: 1.0,
      JPY: 150.0,
      EUR: 0.92,
      KRW: 1350.0,
      CNY: 7.2,
      HKD: 7.8,
      GBP: 0.79,
      THB: 35.0,
      VND: 24500.0,
      SGD: 1.35,
      MYR: 4.7,
      PHP: 56.0,
      IDR: 15800.0,
      AUD: 1.55,
    };

    // 計算交叉匯率
    const fromToUsd = 1 / ratesVsUsd[from];
    const usdToTo = ratesVsUsd[to];
    return fromToUsd * usdToTo;
  }

  /**
   * 儲存匯率到資料庫和快取
   */
  private async saveRate(from: Currency, to: Currency, rate: number): Promise<void> {
    const now = new Date();

    try {
      await this.prisma.exchangeRate.upsert({
        where: {
          baseCurrency_targetCurrency: {
            baseCurrency: from,
            targetCurrency: to,
          },
        },
        update: {
          rate: rate,
          fetchedAt: now,
        },
        create: {
          baseCurrency: from,
          targetCurrency: to,
          rate: rate,
          fetchedAt: now,
        },
      });

      // 更新記憶體快取
      this.rateCache.set(this.getCacheKey(from, to), {
        rate,
        fetchedAt: now,
      });
    } catch (error) {
      this.logger.error('儲存匯率失敗', error);
    }
  }

  /**
   * 轉換金額
   */
  async convert(amount: number, from: Currency, to: Currency): Promise<ConvertResponse> {
    const rateInfo = await this.getRate(from, to);
    const convertedAmount = amount * rateInfo.rate;

    // 根據目標貨幣的小數位數進行四捨五入
    const decimalPlaces = CURRENCY_INFO[to].decimalPlaces;
    const roundedAmount = Math.round(convertedAmount * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces);

    return {
      originalAmount: amount,
      originalCurrency: from,
      convertedAmount: roundedAmount,
      targetCurrency: to,
      rate: rateInfo.rate,
      fetchedAt: rateInfo.fetchedAt,
    };
  }

  /**
   * 取得所有支援的貨幣
   */
  getSupportedCurrencies() {
    return Object.values(CURRENCY_INFO);
  }

  /**
   * 取得所有快取的匯率
   */
  async getAllRates(baseCurrency: Currency = Currency.TWD) {
    const rates: RateResponse[] = [];

    for (const currency of Object.values(Currency)) {
      if (currency !== baseCurrency) {
        const rate = await this.getRate(baseCurrency, currency);
        rates.push(rate);
      }
    }

    return rates;
  }

  /**
   * 每小時更新匯率快取（排程任務）
   */
  @Cron(CronExpression.EVERY_HOUR)
  async refreshRates() {
    this.logger.log('開始更新匯率快取...');

    const baseCurrencies: Currency[] = [Currency.TWD, Currency.USD];

    for (const base of baseCurrencies) {
      for (const target of Object.values(Currency)) {
        if (base !== target) {
          try {
            await this.getRate(base, target);
          } catch (error) {
            this.logger.error(`更新匯率失敗 (${base} -> ${target})`, error);
          }
        }
      }
    }

    this.logger.log('匯率快取更新完成');
  }
}
