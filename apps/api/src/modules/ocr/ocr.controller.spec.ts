import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { BillCategory } from '@prisma/client';
import { OcrController } from './ocr.controller';
import { BrandLookupService } from './services/brand-lookup.service';
import { PrismaService } from '../../common/prisma/prisma.service';

// Mock OcrService to avoid S3Service and uuid dependency issues
jest.mock('./ocr.service', () => ({
  OcrService: jest.fn().mockImplementation(() => ({
    parseReceipt: jest.fn(),
    parseReceiptFromImage: jest.fn(),
    learnBrandMapping: jest.fn(),
  })),
}));

import { OcrService } from './ocr.service';

describe('OcrController', () => {
  let controller: OcrController;
  let ocrService: jest.Mocked<OcrService>;
  let brandLookupService: jest.Mocked<BrandLookupService>;

  const mockUser = { id: 'user-1' };

  const mockParseResult = {
    companyName: '統一超商',
    brandName: '7-ELEVEN',
    taxId: '12345678',
    invoiceNumber: 'AB12345678',
    amount: 150,
    date: new Date('2024-01-15'),
    suggestedCategory: BillCategory.SHOPPING,
    confidence: 0.85,
    rawText: '統一超商\n金額: 150\n2024/01/15',
    brandSource: 'system',
  } as any;

  const mockBrandLookupResult = {
    brandName: '7-ELEVEN',
    category: BillCategory.SHOPPING,
    source: 'system',
    confidence: 0.9,
  } as any;

  beforeEach(async () => {
    const mockOcrService = {
      parseReceipt: jest.fn(),
      parseReceiptFromImage: jest.fn(),
      learnBrandMapping: jest.fn(),
      checkAndIncrementQuota: jest.fn().mockResolvedValue(true),
    };

    const mockBrandLookupService = {
      lookup: jest.fn(),
      learnMapping: jest.fn(),
    };

    const mockPrismaService = {
      trip: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OcrController],
      providers: [
        { provide: OcrService, useValue: mockOcrService },
        { provide: BrandLookupService, useValue: mockBrandLookupService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    controller = module.get<OcrController>(OcrController);
    ocrService = module.get(OcrService);
    brandLookupService = module.get(BrandLookupService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('scanReceipt', () => {
    it('應解析收據文字並返回結果', async () => {
      ocrService.parseReceipt.mockResolvedValue(mockParseResult);

      const dto = { rawText: '統一超商\n金額: 150\n2024/01/15' };
      const result = await controller.scanReceipt(mockUser, dto);

      expect(ocrService.parseReceipt).toHaveBeenCalledWith(dto.rawText, mockUser.id);
      expect(result).toEqual(mockParseResult);
      expect(result.brandName).toBe('7-ELEVEN');
      expect(result.amount).toBe(150);
    });

    it('應處理空白文字', async () => {
      ocrService.parseReceipt.mockResolvedValue({
        ...mockParseResult,
        companyName: null,
        brandName: null,
        amount: null,
        confidence: 0,
      } as any);

      const dto = { rawText: '' };
      const result = await controller.scanReceipt(mockUser, dto);

      expect(ocrService.parseReceipt).toHaveBeenCalledWith('', mockUser.id);
      expect(result.confidence).toBe(0);
    });
  });

  describe('scanReceiptImage', () => {
    const mockFile = {
      fieldname: 'receiptImage',
      originalname: 'receipt.jpg',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('fake-image'),
      size: 1024,
    } as Express.Multer.File;

    it('應從圖片解析收據', async () => {
      ocrService.parseReceiptFromImage.mockResolvedValue(mockParseResult);

      const dto = {
        tripId: 'trip-1',
        mlKitFallbackText: '備援文字',
        saveImage: false,
      };

      const result = await controller.scanReceiptImage(mockUser, mockFile, dto);

      expect(ocrService.parseReceiptFromImage).toHaveBeenCalledWith(
        mockFile.buffer,
        mockUser.id,
        dto.mlKitFallbackText,
        dto.saveImage,
      );
      expect(result).toEqual(mockParseResult);
    });

    it('應在沒有上傳檔案時拋出錯誤', async () => {
      const dto = { tripId: 'trip-1' };

      await expect(
        controller.scanReceiptImage(mockUser, undefined as any, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('應支援儲存圖片到 S3', async () => {
      ocrService.parseReceiptFromImage.mockResolvedValue(mockParseResult);

      const dto = {
        tripId: 'trip-1',
        saveImage: true,
      };

      await controller.scanReceiptImage(mockUser, mockFile, dto);

      expect(ocrService.parseReceiptFromImage).toHaveBeenCalledWith(
        mockFile.buffer,
        mockUser.id,
        undefined,
        true,
      );
    });
  });

  describe('getCompanyMapping', () => {
    it('應返回品牌對照結果', async () => {
      brandLookupService.lookup.mockResolvedValue(mockBrandLookupResult);

      const dto = { companyName: '統一超商' };
      const result = await controller.getCompanyMapping(dto, mockUser);

      expect(brandLookupService.lookup).toHaveBeenCalledWith(dto.companyName, mockUser.id);
      expect(result).toEqual(mockBrandLookupResult);
      expect(result.brandName).toBe('7-ELEVEN');
    });

    it('應處理找不到對照的情況', async () => {
      brandLookupService.lookup.mockResolvedValue({
        brandName: '未知商家',
        category: BillCategory.OTHER,
        source: 'none' as any,
        confidence: 0,
      });

      const dto = { companyName: '不存在的公司' };
      const result = await controller.getCompanyMapping(dto, mockUser);

      expect(result.confidence).toBe(0);
      expect(result.source).toBe('none');
    });
  });

  describe('learnMapping', () => {
    it('應學習新的品牌對照', async () => {
      ocrService.learnBrandMapping.mockResolvedValue(undefined);

      const dto = {
        companyName: '統一超商',
        customBrandName: '7-11',
      };

      const result = await controller.learnMapping(mockUser, dto);

      expect(ocrService.learnBrandMapping).toHaveBeenCalledWith(
        mockUser.id,
        dto.companyName,
        dto.customBrandName,
      );
      expect(result).toEqual({ success: true });
    });

    it('應處理學習失敗的情況', async () => {
      ocrService.learnBrandMapping.mockRejectedValue(new Error('Database error'));

      const dto = {
        companyName: '統一超商',
        customBrandName: '7-11',
      };

      await expect(controller.learnMapping(mockUser, dto)).rejects.toThrow('Database error');
    });
  });
});
