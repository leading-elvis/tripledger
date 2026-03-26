import { Test, TestingModule } from '@nestjs/testing';
import { Currency } from '@prisma/client';
import { ExchangeRateService } from './exchange-rate.service';
import { PrismaService } from '../../common/prisma/prisma.service';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('ExchangeRateService', () => {
  let service: ExchangeRateService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrismaService = {
      exchangeRate: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExchangeRateService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ExchangeRateService>(ExchangeRateService);
    prisma = module.get(PrismaService);

    // Reset fetch mock
    mockFetch.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getRate', () => {
    it('應返回 1 當貨幣相同', async () => {
      const result = await service.getRate(Currency.TWD, Currency.TWD);

      expect(result.rate).toBe(1);
      expect(result.baseCurrency).toBe(Currency.TWD);
      expect(result.targetCurrency).toBe(Currency.TWD);
    });

    it('應從資料庫快取返回匯率', async () => {
      const cachedRate = {
        baseCurrency: Currency.TWD,
        targetCurrency: Currency.USD,
        rate: 0.031,
        fetchedAt: new Date(), // 新鮮的快取
      };
      (prisma.exchangeRate.findUnique as jest.Mock).mockResolvedValue(cachedRate);

      const result = await service.getRate(Currency.TWD, Currency.USD);

      expect(result.rate).toBe(0.031);
      expect(prisma.exchangeRate.findUnique).toHaveBeenCalled();
    });

    it('應使用預設匯率當 API 金鑰未設定', async () => {
      // 資料庫無快取
      (prisma.exchangeRate.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.exchangeRate.upsert as jest.Mock).mockResolvedValue({});

      // 沒有 API 金鑰時會使用預設匯率
      const result = await service.getRate(Currency.TWD, Currency.USD);

      expect(result.rate).toBeGreaterThan(0);
      expect(result.baseCurrency).toBe(Currency.TWD);
      expect(result.targetCurrency).toBe(Currency.USD);
    });
  });

  describe('convert', () => {
    it('應正確轉換金額', async () => {
      // Mock getRate to return a fixed rate
      jest.spyOn(service, 'getRate').mockResolvedValue({
        baseCurrency: Currency.TWD,
        targetCurrency: Currency.USD,
        rate: 0.031,
        fetchedAt: new Date(),
      });

      const result = await service.convert(1000, Currency.TWD, Currency.USD);

      expect(result.originalAmount).toBe(1000);
      expect(result.originalCurrency).toBe(Currency.TWD);
      expect(result.convertedAmount).toBe(31); // 1000 * 0.031 = 31
      expect(result.targetCurrency).toBe(Currency.USD);
      expect(result.rate).toBe(0.031);
    });

    it('應同幣種轉換返回相同金額', async () => {
      const result = await service.convert(1000, Currency.TWD, Currency.TWD);

      expect(result.originalAmount).toBe(1000);
      expect(result.convertedAmount).toBe(1000);
      expect(result.rate).toBe(1);
    });
  });

  describe('getSupportedCurrencies', () => {
    it('應返回所有支援的貨幣', () => {
      const currencies = service.getSupportedCurrencies();

      expect(currencies).toBeInstanceOf(Array);
      expect(currencies.length).toBeGreaterThan(0);
      expect(currencies.some(c => c.code === 'TWD')).toBe(true);
      expect(currencies.some(c => c.code === 'USD')).toBe(true);
      expect(currencies.some(c => c.code === 'JPY')).toBe(true);
    });
  });

  describe('getAllRates', () => {
    it('應返回基準貨幣對所有其他貨幣的匯率', async () => {
      // Mock getRate
      jest.spyOn(service, 'getRate').mockImplementation(async (from, to) => ({
        baseCurrency: from,
        targetCurrency: to,
        rate: from === to ? 1 : 0.031,
        fetchedAt: new Date(),
      }));

      const rates = await service.getAllRates(Currency.TWD);

      expect(rates).toBeInstanceOf(Array);
      // 應該不包含 TWD -> TWD
      expect(rates.some(r => r.targetCurrency === Currency.TWD)).toBe(false);
    });
  });

  describe('onModuleInit', () => {
    it('應從資料庫載入快取', async () => {
      const mockRates = [
        { baseCurrency: Currency.TWD, targetCurrency: Currency.USD, rate: 0.031, fetchedAt: new Date() },
        { baseCurrency: Currency.TWD, targetCurrency: Currency.JPY, rate: 4.69, fetchedAt: new Date() },
      ];
      (prisma.exchangeRate.findMany as jest.Mock).mockResolvedValue(mockRates);

      await service.onModuleInit();

      expect(prisma.exchangeRate.findMany).toHaveBeenCalled();
    });
  });
});
