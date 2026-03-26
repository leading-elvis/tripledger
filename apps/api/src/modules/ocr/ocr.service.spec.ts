import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { BillCategory } from '@prisma/client';
import { TextParserService } from './services/text-parser.service';
import { BrandLookupService } from './services/brand-lookup.service';
import { VisionOcrService } from './services/vision-ocr.service';

// Mock S3Service to avoid AWS SDK and uuid dependency issues
jest.mock('../../common/s3/s3.service', () => ({
  S3Service: jest.fn().mockImplementation(() => ({
    isEnabled: jest.fn(),
    uploadFile: jest.fn(),
  })),
}));

import { OcrService } from './ocr.service';
import { S3Service } from '../../common/s3/s3.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LineItemParserService } from './services/line-item-parser.service';

describe('OcrService', () => {
  let service: OcrService;
  let textParser: jest.Mocked<TextParserService>;
  let brandLookup: jest.Mocked<BrandLookupService>;
  let visionOcr: jest.Mocked<VisionOcrService>;
  let s3Service: jest.Mocked<S3Service>;

  const mockUserId = 'user-1';

  const mockParsedResult = {
    companyName: '統一超商股份有限公司',
    taxId: '22556677',
    invoiceNumber: 'AB12345678',
    amount: 150,
    date: new Date('2024-01-15'),
  };

  const mockBrandResult = {
    brandName: '7-ELEVEN',
    category: BillCategory.SHOPPING,
    source: 'MAPPING_TABLE',
    confidence: 0.9,
  } as any;

  beforeEach(async () => {
    const mockTextParser = {
      parseReceipt: jest.fn(),
      extractFranchiseName: jest.fn(),
      extractAmount: jest.fn(),
      extractCompanyName: jest.fn(),
    };

    const mockBrandLookup = {
      lookup: jest.fn(),
      learnMapping: jest.fn(),
    };

    const mockVisionOcr = {
      isEnabled: jest.fn(),
      recognizeFromBuffer: jest.fn(),
    };

    const mockS3Service = {
      isEnabled: jest.fn(),
      uploadFile: jest.fn(),
    };

    const mockLineItemParser = {
      parseLineItems: jest.fn().mockResolvedValue(null),
    };

    const mockPrismaService = {
      ocrScanQuota: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OcrService,
        { provide: TextParserService, useValue: mockTextParser },
        { provide: BrandLookupService, useValue: mockBrandLookup },
        { provide: VisionOcrService, useValue: mockVisionOcr },
        { provide: S3Service, useValue: mockS3Service },
        { provide: LineItemParserService, useValue: mockLineItemParser },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<OcrService>(OcrService);
    textParser = module.get(TextParserService);
    brandLookup = module.get(BrandLookupService);
    visionOcr = module.get(VisionOcrService);
    s3Service = module.get(S3Service);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('parseReceipt', () => {
    const rawText = '統一超商股份有限公司\n統編: 22556677\n金額: 150\n2024/01/15';

    it('應解析收據文字並返回結果', async () => {
      textParser.parseReceipt.mockReturnValue(mockParsedResult);
      brandLookup.lookup.mockResolvedValue(mockBrandResult);

      const result = await service.parseReceipt(rawText, mockUserId);

      expect(textParser.parseReceipt).toHaveBeenCalledWith(rawText, undefined);
      expect(brandLookup.lookup).toHaveBeenCalledWith(mockParsedResult.companyName, mockUserId);
      expect(result.companyName).toBe(mockParsedResult.companyName);
      expect(result.brandName).toBe('7-ELEVEN');
      expect(result.amount).toBe(150);
      expect(result.suggestedCategory).toBe(BillCategory.SHOPPING);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('應在找不到公司名稱時跳過品牌查詢', async () => {
      textParser.parseReceipt.mockReturnValue({
        ...mockParsedResult,
        companyName: undefined,
      });

      const result = await service.parseReceipt(rawText, mockUserId);

      expect(brandLookup.lookup).not.toHaveBeenCalled();
      expect(result.brandName).toBeUndefined();
    });

    it('應在找不到品牌對照時使用公司名稱', async () => {
      textParser.parseReceipt.mockReturnValue(mockParsedResult);
      brandLookup.lookup.mockResolvedValue(null as any);

      const result = await service.parseReceipt(rawText, mockUserId);

      expect(result.brandName).toBe(mockParsedResult.companyName);
      expect(result.suggestedCategory).toBeUndefined();
    });

    it('應正確計算信心度', async () => {
      // 有完整資訊的情況
      textParser.parseReceipt.mockReturnValue(mockParsedResult);
      brandLookup.lookup.mockResolvedValue(mockBrandResult);

      const result = await service.parseReceipt(rawText, mockUserId);

      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('應在資訊不完整時降低信心度', async () => {
      textParser.parseReceipt.mockReturnValue({
        companyName: undefined,
        taxId: undefined,
        invoiceNumber: undefined,
        amount: undefined,
        date: undefined,
      });

      const result = await service.parseReceipt(rawText, mockUserId);

      expect(result.confidence).toBe(0);
    });
  });

  describe('parseReceiptFromImage', () => {
    const mockImageBuffer = Buffer.from('fake-image-data');

    const mockVisionResult = {
      fullText: '統一超商\n金額: 150',
      blocks: [],
      textBlocks: [],
      structuredRegions: { header: [], body: [], footer: [] },
    };

    it('應使用 Vision API 解析圖片', async () => {
      visionOcr.isEnabled.mockReturnValue(true);
      visionOcr.recognizeFromBuffer.mockResolvedValue(mockVisionResult);
      textParser.parseReceipt.mockReturnValue(mockParsedResult);
      brandLookup.lookup.mockResolvedValue(mockBrandResult);

      const result = await service.parseReceiptFromImage(mockImageBuffer, mockUserId);

      expect(visionOcr.isEnabled).toHaveBeenCalled();
      expect(visionOcr.recognizeFromBuffer).toHaveBeenCalledWith(mockImageBuffer);
      expect(result.brandName).toBe('7-ELEVEN');
    });

    it('應在 Vision API 失敗時使用備援文字', async () => {
      visionOcr.isEnabled.mockReturnValue(true);
      visionOcr.recognizeFromBuffer.mockRejectedValue(new Error('Vision API error'));
      textParser.parseReceipt.mockReturnValue(mockParsedResult);
      brandLookup.lookup.mockResolvedValue(mockBrandResult);

      const result = await service.parseReceiptFromImage(
        mockImageBuffer,
        mockUserId,
        '備援文字',
      );

      expect(textParser.parseReceipt).toHaveBeenCalledWith('備援文字', undefined);
      expect(result).toBeDefined();
    });

    it('應在 Vision API 失敗且無備援文字時拋出錯誤', async () => {
      visionOcr.isEnabled.mockReturnValue(true);
      visionOcr.recognizeFromBuffer.mockRejectedValue(new Error('Vision API error'));

      await expect(service.parseReceiptFromImage(mockImageBuffer, mockUserId))
        .rejects.toThrow(BadRequestException);
    });

    it('應在 Vision API 未設定時使用備援文字', async () => {
      visionOcr.isEnabled.mockReturnValue(false);
      textParser.parseReceipt.mockReturnValue(mockParsedResult);
      brandLookup.lookup.mockResolvedValue(mockBrandResult);

      const result = await service.parseReceiptFromImage(
        mockImageBuffer,
        mockUserId,
        '備援文字',
      );

      expect(visionOcr.recognizeFromBuffer).not.toHaveBeenCalled();
      expect(textParser.parseReceipt).toHaveBeenCalledWith('備援文字', undefined);
    });

    it('應在 Vision API 未設定且無備援文字時拋出錯誤', async () => {
      visionOcr.isEnabled.mockReturnValue(false);

      await expect(service.parseReceiptFromImage(mockImageBuffer, mockUserId))
        .rejects.toThrow(BadRequestException);
    });

    it('應在 saveImage 為 true 時上傳圖片到 S3', async () => {
      visionOcr.isEnabled.mockReturnValue(true);
      visionOcr.recognizeFromBuffer.mockResolvedValue(mockVisionResult);
      s3Service.isEnabled.mockReturnValue(true);
      s3Service.uploadFile.mockResolvedValue('https://s3.example.com/receipt.jpg');
      textParser.parseReceipt.mockReturnValue(mockParsedResult);
      brandLookup.lookup.mockResolvedValue(mockBrandResult);

      await service.parseReceiptFromImage(mockImageBuffer, mockUserId, undefined, true);

      expect(s3Service.uploadFile).toHaveBeenCalled();
    });

    it('應在 S3 未設定時跳過圖片上傳', async () => {
      visionOcr.isEnabled.mockReturnValue(true);
      visionOcr.recognizeFromBuffer.mockResolvedValue(mockVisionResult);
      s3Service.isEnabled.mockReturnValue(false);
      textParser.parseReceipt.mockReturnValue(mockParsedResult);
      brandLookup.lookup.mockResolvedValue(mockBrandResult);

      await service.parseReceiptFromImage(mockImageBuffer, mockUserId, undefined, true);

      expect(s3Service.uploadFile).not.toHaveBeenCalled();
    });

    it('應在圖片上傳失敗時繼續解析流程', async () => {
      visionOcr.isEnabled.mockReturnValue(true);
      visionOcr.recognizeFromBuffer.mockResolvedValue(mockVisionResult);
      s3Service.isEnabled.mockReturnValue(true);
      s3Service.uploadFile.mockRejectedValue(new Error('S3 upload error'));
      textParser.parseReceipt.mockReturnValue(mockParsedResult);
      brandLookup.lookup.mockResolvedValue(mockBrandResult);

      const result = await service.parseReceiptFromImage(
        mockImageBuffer,
        mockUserId,
        undefined,
        true,
      );

      // 即使上傳失敗，仍應返回解析結果
      expect(result).toBeDefined();
      expect(result.brandName).toBe('7-ELEVEN');
    });
  });

  describe('detectCurrency (透過 parseReceipt 間接測試)', () => {
    it('應在日文收據中偵測 JPY', async () => {
      textParser.parseReceipt.mockReturnValue({ ...mockParsedResult, amount: 1980 });
      brandLookup.lookup.mockResolvedValue(mockBrandResult);

      const result = await service.parseReceipt('合計 ¥1,980', mockUserId, 'ja');

      expect(result.detectedLanguage).toBe('ja');
      expect(result.currencyResult).toBeDefined();
      expect(result.currencyResult!.currency).toBe('JPY');
      expect(result.currencyResult!.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('應在韓文收據中偵測 KRW（₩ 符號）', async () => {
      textParser.parseReceipt.mockReturnValue({ ...mockParsedResult, amount: 50000 });
      brandLookup.lookup.mockResolvedValue(mockBrandResult);

      const result = await service.parseReceipt('합계 ₩50,000', mockUserId, 'ko');

      expect(result.currencyResult!.currency).toBe('KRW');
      expect(result.currencyResult!.confidence).toBe(0.95);
    });

    it('應在韓文收據中偵測 KRW（원 後綴）', async () => {
      textParser.parseReceipt.mockReturnValue({ ...mockParsedResult, amount: 110000 });
      brandLookup.lookup.mockResolvedValue(mockBrandResult);

      const result = await service.parseReceipt('합계금액 110,000원', mockUserId, 'ko');

      expect(result.currencyResult!.currency).toBe('KRW');
      expect(result.currencyResult!.confidence).toBe(0.9);
    });

    it('應用語言消歧 ¥（ja → JPY, zh → CNY）', async () => {
      textParser.parseReceipt.mockReturnValue(mockParsedResult);
      brandLookup.lookup.mockResolvedValue(mockBrandResult);

      const jaResult = await service.parseReceipt('合計 ¥440', mockUserId, 'ja');
      expect(jaResult.currencyResult!.currency).toBe('JPY');

      const zhResult = await service.parseReceipt('合計 ¥440', mockUserId, 'zh-TW');
      expect(zhResult.currencyResult!.currency).toBe('CNY');
    });

    it('應偵測 NT$ 為 TWD', async () => {
      textParser.parseReceipt.mockReturnValue(mockParsedResult);
      brandLookup.lookup.mockResolvedValue(mockBrandResult);

      const result = await service.parseReceipt('合計 NT$350', mockUserId);

      expect(result.currencyResult!.currency).toBe('TWD');
      expect(result.currencyResult!.confidence).toBe(0.95);
    });

    it('$ 符號不應單獨推斷（無語言時）', async () => {
      textParser.parseReceipt.mockReturnValue(mockParsedResult);
      brandLookup.lookup.mockResolvedValue(mockBrandResult);

      const result = await service.parseReceipt('Total $50', mockUserId);

      expect(result.currencyResult).toBeUndefined();
    });

    it('無貨幣線索時用語言推斷', async () => {
      textParser.parseReceipt.mockReturnValue(mockParsedResult);
      brandLookup.lookup.mockResolvedValue(mockBrandResult);

      const result = await service.parseReceipt('합계금액 110,000', mockUserId, 'ko');

      expect(result.currencyResult!.currency).toBe('KRW');
      expect(result.currencyResult!.confidence).toBe(0.7);
    });
  });

  describe('learnBrandMapping', () => {
    it('應學習新的品牌對照', async () => {
      brandLookup.learnMapping.mockResolvedValue(undefined);

      await service.learnBrandMapping(mockUserId, '統一超商', '7-11');

      expect(brandLookup.learnMapping).toHaveBeenCalledWith(
        mockUserId,
        '統一超商',
        '7-11',
      );
    });
  });
});
