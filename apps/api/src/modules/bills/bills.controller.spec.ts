import { Test, TestingModule } from '@nestjs/testing';
import { BillsController } from './bills.controller';
import { BillsService } from './bills.service';
import { BillCategory, SplitType } from '@prisma/client';

// Mock S3Service to avoid AWS SDK dependency issues
jest.mock('../../common/s3/s3.service', () => ({
  S3Service: jest.fn().mockImplementation(() => ({
    uploadFile: jest.fn(),
    isConfigured: true,
  })),
}));

import { S3Service } from '../../common/s3/s3.service';

describe('BillsController', () => {
  let controller: BillsController;
  let billsService: jest.Mocked<BillsService>;
  let s3Service: jest.Mocked<S3Service>;

  const mockUser = { id: 'user-1' };
  const mockBill = {
    id: 'bill-1',
    tripId: 'trip-1',
    title: '午餐',
    amount: 1000,
    baseAmount: 1000,
    currency: 'TWD',
    exchangeRate: 1,
    category: BillCategory.FOOD,
    splitType: SplitType.EQUAL,
    payerId: 'user-1',
    receiptImage: null,
    note: null,
    paidAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    payer: { id: 'user-1', name: '付款人', avatarUrl: null },
    trip: {
      id: 'trip-1',
      name: '旅程',
      defaultCurrency: 'TWD',
      members: [],
    },
    shares: [
      { id: 'share-1', billId: 'bill-1', userId: 'user-1', amount: 500, user: { id: 'user-1', name: '用戶1', avatarUrl: null } },
      { id: 'share-2', billId: 'bill-1', userId: 'user-2', amount: 500, user: { id: 'user-2', name: '用戶2', avatarUrl: null } },
    ],
    items: [],
  } as any;

  beforeEach(async () => {
    const mockBillsService = {
      create: jest.fn(),
      findAllByTrip: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getStatsByCategory: jest.fn(),
    };

    const mockS3Service = {
      uploadFile: jest.fn(),
      isConfigured: true,
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BillsController],
      providers: [
        { provide: BillsService, useValue: mockBillsService },
        { provide: S3Service, useValue: mockS3Service },
      ],
    }).compile();

    controller = module.get<BillsController>(BillsController);
    billsService = module.get(BillsService);
    s3Service = module.get(S3Service);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('應建立帳單（無圖片）', async () => {
      billsService.create.mockResolvedValue(mockBill);

      const dto = {
        title: '午餐',
        amount: 1000,
        category: BillCategory.FOOD,
        splitType: SplitType.EQUAL,
        payerId: 'user-1',
        participantIds: ['user-1', 'user-2'],
      };

      const result = await controller.create('trip-1', mockUser, dto as any);

      expect(billsService.create).toHaveBeenCalledWith(mockUser.id, {
        ...dto,
        tripId: 'trip-1',
        receiptImage: undefined,
      });
      expect(result).toEqual(mockBill);
    });

    it('應建立帳單並上傳收據圖片', async () => {
      billsService.create.mockResolvedValue(mockBill);
      s3Service.uploadFile.mockResolvedValue('https://s3.example.com/receipt.jpg');

      const dto = {
        title: '午餐',
        amount: 1000,
        category: BillCategory.FOOD,
        splitType: SplitType.EQUAL,
        payerId: 'user-1',
        participantIds: ['user-1', 'user-2'],
      };

      const mockFile = {
        fieldname: 'receiptImage',
        originalname: 'receipt.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('fake-image'),
        size: 1024,
      } as Express.Multer.File;

      const result = await controller.create('trip-1', mockUser, dto as any, mockFile);

      expect(s3Service.uploadFile).toHaveBeenCalledWith(mockFile, 'receipts');
      expect(billsService.create).toHaveBeenCalledWith(mockUser.id, {
        ...dto,
        tripId: 'trip-1',
        receiptImage: 'https://s3.example.com/receipt.jpg',
      });
    });
  });

  describe('findAllByTrip', () => {
    it('應返回旅程所有帳單（分頁格式）', async () => {
      const paginatedResponse = {
        data: [mockBill],
        pagination: { total: 1, limit: 20, offset: 0, hasMore: false },
      };
      billsService.findAllByTrip.mockResolvedValue(paginatedResponse);

      const pagination = { limit: 20, offset: 0 };
      const result = await controller.findAllByTrip('trip-1', mockUser, pagination);

      expect(billsService.findAllByTrip).toHaveBeenCalledWith('trip-1', mockUser.id, pagination);
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('getStats', () => {
    it('應返回帳單統計', async () => {
      const stats = [
        { category: 'FOOD', total: 5000, count: 3 },
        { category: 'TRANSPORT', total: 3000, count: 2 },
      ] as any;
      billsService.getStatsByCategory.mockResolvedValue(stats);

      const result = await controller.getStats('trip-1', mockUser);

      expect(billsService.getStatsByCategory).toHaveBeenCalledWith('trip-1', mockUser.id);
      expect(result).toEqual(stats);
    });
  });

  describe('findOne', () => {
    it('應返回帳單詳情', async () => {
      billsService.findById.mockResolvedValue(mockBill);

      const result = await controller.findOne('bill-1', mockUser);

      expect(billsService.findById).toHaveBeenCalledWith('bill-1', mockUser.id);
      expect(result).toEqual(mockBill);
    });
  });

  describe('update', () => {
    it('應更新帳單', async () => {
      const updatedBill = { ...mockBill, title: '晚餐' };
      billsService.update.mockResolvedValue(updatedBill);

      const dto = { title: '晚餐' };
      const result = await controller.update('bill-1', mockUser, dto as any);

      expect(billsService.update).toHaveBeenCalledWith('bill-1', mockUser.id, {
        ...dto,
        receiptImage: undefined,
      });
      expect(result.title).toBe('晚餐');
    });

    it('應更新帳單並上傳新收據圖片', async () => {
      const updatedBill = { ...mockBill, receiptImage: 'https://s3.example.com/new-receipt.jpg' };
      billsService.update.mockResolvedValue(updatedBill);
      s3Service.uploadFile.mockResolvedValue('https://s3.example.com/new-receipt.jpg');

      const dto = { title: '午餐' };
      const mockFile = {
        fieldname: 'receiptImage',
        originalname: 'new-receipt.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('fake-image'),
        size: 1024,
      } as Express.Multer.File;

      const result = await controller.update('bill-1', mockUser, dto as any, mockFile);

      expect(s3Service.uploadFile).toHaveBeenCalledWith(mockFile, 'receipts');
      expect(result.receiptImage).toBe('https://s3.example.com/new-receipt.jpg');
    });
  });

  describe('delete', () => {
    it('應刪除帳單', async () => {
      billsService.delete.mockResolvedValue(mockBill);

      const result = await controller.delete('bill-1', mockUser);

      expect(billsService.delete).toHaveBeenCalledWith('bill-1', mockUser.id);
      expect(result).toEqual({ message: '帳單已刪除' });
    });
  });
});
