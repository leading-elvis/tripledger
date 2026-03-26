import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { EinvoiceService } from './einvoice.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BrandLookupService } from '../ocr/services/brand-lookup.service';
import { BillsService } from '../bills/bills.service';
import { TripsService } from '../trips/trips.service';
import { BillCategory, SplitType, ImportSource } from '@prisma/client';

// Mock QR parser utilities
jest.mock('./utils/qr-parser.util', () => ({
  isEInvoiceQR: jest.fn(),
  parseEInvoiceQR: jest.fn(),
}));

import { isEInvoiceQR, parseEInvoiceQR } from './utils/qr-parser.util';

describe('EinvoiceService', () => {
  let service: EinvoiceService;
  let prisma: jest.Mocked<PrismaService>;
  let brandLookupService: jest.Mocked<BrandLookupService>;
  let billsService: jest.Mocked<BillsService>;
  let tripsService: jest.Mocked<TripsService>;

  const mockUserId = 'user-1';

  const mockInvoiceData = {
    invoiceNumber: 'AB12345678',
    invoiceDate: new Date('2024-01-15'),
    sellerTaxId: '12345678',
    totalAmount: 1500,
    salesAmount: 1429,
    buyerTaxId: '',
    randomCode: '1234',
  };

  const mockImportedInvoice = {
    id: 'invoice-1',
    invoiceNumber: 'AB12345678',
    invoiceDate: new Date('2024-01-15'),
    sellerTaxId: '12345678',
    sellerName: '統一超商',
    totalAmount: 1500,
    importedBy: mockUserId,
    importSource: ImportSource.QR_SCAN,
    billId: null,
    rawData: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTrip = {
    id: 'trip-1',
    name: '日本旅行',
    members: [
      { userId: 'user-1' },
      { userId: 'user-2' },
    ],
  };

  const mockBill = {
    id: 'bill-1',
    title: '統一超商',
    amount: 1500,
    tripId: 'trip-1',
  };

  beforeEach(async () => {
    const mockPrismaService = {
      importedInvoice: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      companyBrandMapping: {
        findUnique: jest.fn(),
      },
    };

    const mockBrandLookupService = {
      lookup: jest.fn(),
    };

    const mockBillsService = {
      create: jest.fn(),
    };

    const mockTripsService = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EinvoiceService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: BrandLookupService, useValue: mockBrandLookupService },
        { provide: BillsService, useValue: mockBillsService },
        { provide: TripsService, useValue: mockTripsService },
      ],
    }).compile();

    service = module.get<EinvoiceService>(EinvoiceService);
    prisma = module.get(PrismaService);
    brandLookupService = module.get(BrandLookupService);
    billsService = module.get(BillsService);
    tripsService = module.get(TripsService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('parseQR', () => {
    const validQrData = 'AB123456780240115...';

    it('應成功解析有效的電子發票 QR Code', async () => {
      (isEInvoiceQR as jest.Mock).mockReturnValue(true);
      (parseEInvoiceQR as jest.Mock).mockReturnValue({
        success: true,
        data: mockInvoiceData,
      });
      (prisma.importedInvoice.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.companyBrandMapping.findUnique as jest.Mock).mockResolvedValue({
        brandName: '7-ELEVEN',
        category: BillCategory.SHOPPING,
      });

      const result = await service.parseQR(validQrData, mockUserId);

      expect(isEInvoiceQR).toHaveBeenCalledWith(validQrData);
      expect(result.invoice).toEqual(mockInvoiceData);
      expect(result.brandName).toBe('7-ELEVEN');
      expect(result.suggestedCategory).toBe(BillCategory.SHOPPING);
      expect(result.isAlreadyImported).toBe(false);
    });

    it('應在 QR Code 格式無效時拋出錯誤', async () => {
      (isEInvoiceQR as jest.Mock).mockReturnValue(false);

      await expect(service.parseQR('invalid', mockUserId))
        .rejects.toThrow(BadRequestException);
    });

    it('應在解析失敗時拋出錯誤', async () => {
      (isEInvoiceQR as jest.Mock).mockReturnValue(true);
      (parseEInvoiceQR as jest.Mock).mockReturnValue({
        success: false,
        error: '解析失敗',
      });

      await expect(service.parseQR(validQrData, mockUserId))
        .rejects.toThrow(BadRequestException);
    });

    it('應檢測已匯入的發票', async () => {
      (isEInvoiceQR as jest.Mock).mockReturnValue(true);
      (parseEInvoiceQR as jest.Mock).mockReturnValue({
        success: true,
        data: mockInvoiceData,
      });
      (prisma.importedInvoice.findUnique as jest.Mock).mockResolvedValue({
        ...mockImportedInvoice,
        billId: 'bill-1',
        bill: { id: 'bill-1' },
      });
      (prisma.companyBrandMapping.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.parseQR(validQrData, mockUserId);

      expect(result.isAlreadyImported).toBe(true);
      expect(result.existingBillId).toBe('bill-1');
    });

    it('應在找不到品牌對照時使用預設名稱', async () => {
      (isEInvoiceQR as jest.Mock).mockReturnValue(true);
      (parseEInvoiceQR as jest.Mock).mockReturnValue({
        success: true,
        data: mockInvoiceData,
      });
      (prisma.importedInvoice.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.companyBrandMapping.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.parseQR(validQrData, mockUserId);

      expect(result.brandName).toBe(`商家(${mockInvoiceData.sellerTaxId})`);
      expect(result.suggestedCategory).toBe(BillCategory.OTHER);
    });
  });

  describe('saveImportedInvoice', () => {
    it('應成功儲存發票', async () => {
      (prisma.importedInvoice.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.importedInvoice.create as jest.Mock).mockResolvedValue(mockImportedInvoice);

      const result = await service.saveImportedInvoice(
        mockInvoiceData,
        mockUserId,
        '統一超商',
      );

      expect(prisma.importedInvoice.create).toHaveBeenCalled();
      expect(result.invoiceNumber).toBe(mockInvoiceData.invoiceNumber);
    });

    it('應在發票已存在時拋出錯誤', async () => {
      (prisma.importedInvoice.findUnique as jest.Mock).mockResolvedValue(mockImportedInvoice);

      await expect(
        service.saveImportedInvoice(mockInvoiceData, mockUserId, '統一超商'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('convertToBill', () => {
    const dto = {
      tripId: 'trip-1',
      invoiceNumber: 'AB12345678',
    };

    it('應成功將發票轉換為帳單', async () => {
      (prisma.importedInvoice.findUnique as jest.Mock).mockResolvedValue(mockImportedInvoice);
      (tripsService.findById as jest.Mock).mockResolvedValue(mockTrip);
      (prisma.companyBrandMapping.findUnique as jest.Mock).mockResolvedValue({
        category: BillCategory.SHOPPING,
      });
      (billsService.create as jest.Mock).mockResolvedValue(mockBill);
      (prisma.importedInvoice.update as jest.Mock).mockResolvedValue({});

      const result = await service.convertToBill(dto, mockUserId);

      expect(billsService.create).toHaveBeenCalled();
      expect(result.billId).toBe('bill-1');
      expect(result.amount).toBe(1500);
    });

    it('應在發票不存在時拋出錯誤', async () => {
      (prisma.importedInvoice.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.convertToBill(dto, mockUserId))
        .rejects.toThrow(NotFoundException);
    });

    it('應在發票已轉換時拋出錯誤', async () => {
      (prisma.importedInvoice.findUnique as jest.Mock).mockResolvedValue({
        ...mockImportedInvoice,
        billId: 'existing-bill',
      });

      await expect(service.convertToBill(dto, mockUserId))
        .rejects.toThrow(ConflictException);
    });

    it('應支援指定付款人和分帳方式', async () => {
      (prisma.importedInvoice.findUnique as jest.Mock).mockResolvedValue(mockImportedInvoice);
      (tripsService.findById as jest.Mock).mockResolvedValue(mockTrip);
      (prisma.companyBrandMapping.findUnique as jest.Mock).mockResolvedValue(null);
      (billsService.create as jest.Mock).mockResolvedValue(mockBill);
      (prisma.importedInvoice.update as jest.Mock).mockResolvedValue({});

      const customDto = {
        ...dto,
        payerId: 'user-2',
        splitType: SplitType.EXACT,
        participantIds: ['user-1'],
      };

      await service.convertToBill(customDto, mockUserId);

      expect(billsService.create).toHaveBeenCalledWith(
        'user-2',
        expect.objectContaining({
          splitType: SplitType.EXACT,
          participants: [{ userId: 'user-1' }],
        }),
      );
    });
  });

  describe('batchConvertToBill', () => {
    it('應批量轉換發票為帳單', async () => {
      const dto = {
        tripId: 'trip-1',
        invoiceNumbers: ['AB12345678', 'CD87654321'],
      };

      // First invoice succeeds
      (prisma.importedInvoice.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockImportedInvoice)
        .mockResolvedValueOnce({ ...mockImportedInvoice, invoiceNumber: 'CD87654321' });
      (tripsService.findById as jest.Mock).mockResolvedValue(mockTrip);
      (prisma.companyBrandMapping.findUnique as jest.Mock).mockResolvedValue(null);
      (billsService.create as jest.Mock)
        .mockResolvedValueOnce(mockBill)
        .mockResolvedValueOnce({ ...mockBill, id: 'bill-2' });
      (prisma.importedInvoice.update as jest.Mock).mockResolvedValue({});

      const result = await service.batchConvertToBill(dto, mockUserId);

      expect(result.successCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(result.bills).toHaveLength(2);
    });

    it('應記錄失敗的轉換數量', async () => {
      const dto = {
        tripId: 'trip-1',
        invoiceNumbers: ['AB12345678', 'invalid'],
      };

      (prisma.importedInvoice.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockImportedInvoice)
        .mockResolvedValueOnce(null); // Second invoice not found
      (tripsService.findById as jest.Mock).mockResolvedValue(mockTrip);
      (prisma.companyBrandMapping.findUnique as jest.Mock).mockResolvedValue(null);
      (billsService.create as jest.Mock).mockResolvedValue(mockBill);
      (prisma.importedInvoice.update as jest.Mock).mockResolvedValue({});

      const result = await service.batchConvertToBill(dto, mockUserId);

      expect(result.successCount).toBe(1);
      expect(result.failedCount).toBe(1);
    });
  });

  describe('getImportedInvoices', () => {
    it('應返回用戶的發票列表', async () => {
      (prisma.importedInvoice.findMany as jest.Mock).mockResolvedValue([mockImportedInvoice]);

      const result = await service.getImportedInvoices(mockUserId);

      expect(prisma.importedInvoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { importedBy: mockUserId },
        }),
      );
      expect(result).toHaveLength(1);
    });

    it('應支援日期範圍篩選', async () => {
      (prisma.importedInvoice.findMany as jest.Mock).mockResolvedValue([]);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      await service.getImportedInvoices(mockUserId, { startDate, endDate });

      expect(prisma.importedInvoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            invoiceDate: { gte: startDate, lte: endDate },
          }),
        }),
      );
    });

    it('應支援只顯示未轉換的發票', async () => {
      (prisma.importedInvoice.findMany as jest.Mock).mockResolvedValue([]);

      await service.getImportedInvoices(mockUserId, { onlyUnconverted: true });

      expect(prisma.importedInvoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            billId: null,
          }),
        }),
      );
    });
  });

  describe('deleteImportedInvoice', () => {
    it('應成功刪除發票', async () => {
      (prisma.importedInvoice.findUnique as jest.Mock).mockResolvedValue(mockImportedInvoice);
      (prisma.importedInvoice.delete as jest.Mock).mockResolvedValue({});

      await service.deleteImportedInvoice('invoice-1', mockUserId);

      expect(prisma.importedInvoice.delete).toHaveBeenCalledWith({
        where: { id: 'invoice-1' },
      });
    });

    it('應在發票不存在時拋出錯誤', async () => {
      (prisma.importedInvoice.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteImportedInvoice('invoice-1', mockUserId))
        .rejects.toThrow(NotFoundException);
    });

    it('應在刪除他人發票時拋出錯誤', async () => {
      (prisma.importedInvoice.findUnique as jest.Mock).mockResolvedValue({
        ...mockImportedInvoice,
        importedBy: 'other-user',
      });

      await expect(service.deleteImportedInvoice('invoice-1', mockUserId))
        .rejects.toThrow(BadRequestException);
    });

    it('應在發票已轉換為帳單時拋出錯誤', async () => {
      (prisma.importedInvoice.findUnique as jest.Mock).mockResolvedValue({
        ...mockImportedInvoice,
        billId: 'bill-1',
      });

      await expect(service.deleteImportedInvoice('invoice-1', mockUserId))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('quickScanAndCreateBill', () => {
    const qrData = 'AB123456780240115...';

    it('應一步完成掃描和建立帳單', async () => {
      (isEInvoiceQR as jest.Mock).mockReturnValue(true);
      (parseEInvoiceQR as jest.Mock).mockReturnValue({
        success: true,
        data: mockInvoiceData,
      });
      // parseQR checks
      (prisma.importedInvoice.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // parseQR check
        .mockResolvedValueOnce(null) // saveImportedInvoice check
        .mockResolvedValueOnce(mockImportedInvoice); // convertToBill check
      (prisma.companyBrandMapping.findUnique as jest.Mock)
        .mockResolvedValueOnce({ brandName: '7-ELEVEN', category: BillCategory.SHOPPING })
        .mockResolvedValueOnce({ category: BillCategory.SHOPPING });
      (prisma.importedInvoice.create as jest.Mock).mockResolvedValue(mockImportedInvoice);
      (tripsService.findById as jest.Mock).mockResolvedValue(mockTrip);
      (billsService.create as jest.Mock).mockResolvedValue(mockBill);
      (prisma.importedInvoice.update as jest.Mock).mockResolvedValue({});

      const result = await service.quickScanAndCreateBill(qrData, 'trip-1', mockUserId);

      expect(result.billId).toBe('bill-1');
      expect(result.invoiceNumber).toBe(mockInvoiceData.invoiceNumber);
    });

    it('應在發票已匯入時拋出錯誤', async () => {
      (isEInvoiceQR as jest.Mock).mockReturnValue(true);
      (parseEInvoiceQR as jest.Mock).mockReturnValue({
        success: true,
        data: mockInvoiceData,
      });
      (prisma.importedInvoice.findUnique as jest.Mock).mockResolvedValue({
        ...mockImportedInvoice,
        bill: { id: 'bill-1' },
      });
      (prisma.companyBrandMapping.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.quickScanAndCreateBill(qrData, 'trip-1', mockUserId))
        .rejects.toThrow(ConflictException);
    });
  });
});
