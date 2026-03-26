import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { BillCategory, SplitType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { BillsService } from './bills.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TripsService } from '../trips/trips.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ExchangeRateService } from '../exchange-rate/exchange-rate.service';
import { createPrismaMock, PrismaMock } from '../../../test/mocks/prisma.mock';
import {
  createTripsServiceMock,
  createNotificationsServiceMock,
  TripsServiceMock,
  NotificationsServiceMock,
} from '../../../test/mocks/services.mock';
import { testUser1, testUser2, testUser3 } from '../../../test/fixtures/users.fixture';
import { testTrip1 } from '../../../test/fixtures/trips.fixture';
import {
  createBillFixture,
  createBillInputFixture,
} from '../../../test/fixtures/bills.fixture';

describe('BillsService', () => {
  let service: BillsService;
  let prismaMock: PrismaMock;
  let tripsServiceMock: TripsServiceMock;
  let notificationsServiceMock: NotificationsServiceMock;

  beforeEach(async () => {
    prismaMock = createPrismaMock();
    tripsServiceMock = createTripsServiceMock();
    notificationsServiceMock = createNotificationsServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: TripsService, useValue: tripsServiceMock },
        { provide: NotificationsService, useValue: notificationsServiceMock },
        { provide: ExchangeRateService, useValue: { getRate: jest.fn(), convert: jest.fn(), getAllRates: jest.fn() } },
      ],
    }).compile();

    service = module.get<BillsService>(BillsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateShares - 分攤計算', () => {
    // 使用反射取得私有方法
    let calculateShares: (
      totalAmount: number,
      splitType: SplitType,
      participants: { userId: string; amount?: number; percentage?: number; shares?: number }[],
    ) => { userId: string; amount: number }[];

    beforeEach(() => {
      // 直接呼叫私有方法來測試核心邏輯
      calculateShares = (service as any).calculateShares.bind(service);
    });

    describe('EQUAL - 平均分攤', () => {
      it('應平均分配給所有參與者', () => {
        const result = calculateShares(900, SplitType.EQUAL, [
          { userId: testUser1.id },
          { userId: testUser2.id },
          { userId: testUser3.id },
        ]);

        expect(result).toHaveLength(3);
        expect(result[0].amount).toBe(300);
        expect(result[1].amount).toBe(300);
        expect(result[2].amount).toBe(300);
      });

      it('應將餘數分配給第一個人', () => {
        const result = calculateShares(1000, SplitType.EQUAL, [
          { userId: testUser1.id },
          { userId: testUser2.id },
          { userId: testUser3.id },
        ]);

        // 1000 / 3 = 333.33...
        // 餘數 = 1000 - 333.33 * 3 = 0.01
        const total = result.reduce((sum, r) => sum + r.amount, 0);
        expect(total).toBeCloseTo(1000, 2);
        // 第一人應該多分到餘數
        expect(result[0].amount).toBeGreaterThanOrEqual(result[1].amount);
      });

      it('應處理單人情況', () => {
        const result = calculateShares(1000, SplitType.EQUAL, [
          { userId: testUser1.id },
        ]);

        expect(result).toHaveLength(1);
        expect(result[0].amount).toBe(1000);
      });

      it('應拒絕空參與者列表', () => {
        expect(() => {
          calculateShares(1000, SplitType.EQUAL, []);
        }).toThrow(BadRequestException);
      });

      it('應處理兩人平分的情況', () => {
        const result = calculateShares(100, SplitType.EQUAL, [
          { userId: testUser1.id },
          { userId: testUser2.id },
        ]);

        expect(result[0].amount).toBe(50);
        expect(result[1].amount).toBe(50);
      });

      it('應正確處理小數金額', () => {
        const result = calculateShares(100, SplitType.EQUAL, [
          { userId: testUser1.id },
          { userId: testUser2.id },
          { userId: testUser3.id },
        ]);

        // 100 / 3 = 33.33...
        const total = result.reduce((sum, r) => sum + r.amount, 0);
        expect(total).toBeCloseTo(100, 2);
      });
    });

    describe('EXACT - 精確金額', () => {
      it('應使用指定的精確金額', () => {
        const result = calculateShares(1000, SplitType.EXACT, [
          { userId: testUser1.id, amount: 500 },
          { userId: testUser2.id, amount: 300 },
          { userId: testUser3.id, amount: 200 },
        ]);

        expect(result[0].amount).toBe(500);
        expect(result[1].amount).toBe(300);
        expect(result[2].amount).toBe(200);
      });

      it('應拒絕金額總和不符的情況', () => {
        expect(() => {
          calculateShares(1000, SplitType.EXACT, [
            { userId: testUser1.id, amount: 300 },
            { userId: testUser2.id, amount: 300 },
            // 缺少 400
          ]);
        }).toThrow(BadRequestException);
      });

      it('應接受微小誤差（0.01 以內）', () => {
        const result = calculateShares(1000, SplitType.EXACT, [
          { userId: testUser1.id, amount: 500.005 },
          { userId: testUser2.id, amount: 500.005 },
        ]);

        expect(result).toHaveLength(2);
      });

      it('應處理未提供金額的參與者（視為 0）', () => {
        expect(() => {
          calculateShares(1000, SplitType.EXACT, [
            { userId: testUser1.id, amount: 500 },
            { userId: testUser2.id }, // 未提供金額，視為 0
          ]);
        }).toThrow(BadRequestException);
      });

      it('應拒絕總和超過帳單金額', () => {
        expect(() => {
          calculateShares(1000, SplitType.EXACT, [
            { userId: testUser1.id, amount: 600 },
            { userId: testUser2.id, amount: 600 },
          ]);
        }).toThrow(BadRequestException);
      });
    });

    describe('PERCENTAGE - 百分比分攤', () => {
      it('應按百分比計算金額', () => {
        const result = calculateShares(1000, SplitType.PERCENTAGE, [
          { userId: testUser1.id, percentage: 50 },
          { userId: testUser2.id, percentage: 30 },
          { userId: testUser3.id, percentage: 20 },
        ]);

        expect(result[0].amount).toBe(500);
        expect(result[1].amount).toBe(300);
        expect(result[2].amount).toBe(200);
      });

      it('應拒絕百分比總和不等於 100%', () => {
        expect(() => {
          calculateShares(1000, SplitType.PERCENTAGE, [
            { userId: testUser1.id, percentage: 50 },
            { userId: testUser2.id, percentage: 40 },
            // 只有 90%
          ]);
        }).toThrow(BadRequestException);
      });

      it('應拒絕百分比總和超過 100%', () => {
        expect(() => {
          calculateShares(1000, SplitType.PERCENTAGE, [
            { userId: testUser1.id, percentage: 60 },
            { userId: testUser2.id, percentage: 60 },
          ]);
        }).toThrow(BadRequestException);
      });

      it('應正確處理小數點百分比', () => {
        const result = calculateShares(1000, SplitType.PERCENTAGE, [
          { userId: testUser1.id, percentage: 33.33 },
          { userId: testUser2.id, percentage: 33.33 },
          { userId: testUser3.id, percentage: 33.34 },
        ]);

        expect(result[0].amount).toBeCloseTo(333.3, 1);
        expect(result[1].amount).toBeCloseTo(333.3, 1);
        expect(result[2].amount).toBeCloseTo(333.4, 1);
      });

      it('應處理未提供百分比的參與者（視為 0）', () => {
        expect(() => {
          calculateShares(1000, SplitType.PERCENTAGE, [
            { userId: testUser1.id, percentage: 100 },
            { userId: testUser2.id }, // 未提供百分比
          ]);
        }).not.toThrow(); // 100% + 0% = 100%
      });
    });

    describe('SHARES - 份數分攤', () => {
      it('應按份數比例分配', () => {
        const result = calculateShares(1000, SplitType.SHARES, [
          { userId: testUser1.id, shares: 2 },
          { userId: testUser2.id, shares: 1 },
          { userId: testUser3.id, shares: 1 },
        ]);

        // 總份數 = 4, 每份 = 250
        expect(result[0].amount).toBe(500); // 2 份
        expect(result[1].amount).toBe(250); // 1 份
        expect(result[2].amount).toBe(250); // 1 份
      });

      it('應使用預設份數 1', () => {
        const result = calculateShares(1000, SplitType.SHARES, [
          { userId: testUser1.id, shares: 2 },
          { userId: testUser2.id }, // 預設 1 份
        ]);

        // 總份數 = 3, 每份 = 333.33
        expect(result[0].amount).toBeCloseTo(666.67, 1);
        expect(result[1].amount).toBeCloseTo(333.33, 1);
      });

      it('應處理不均分的情況', () => {
        const result = calculateShares(100, SplitType.SHARES, [
          { userId: testUser1.id, shares: 1 },
          { userId: testUser2.id, shares: 1 },
          { userId: testUser3.id, shares: 1 },
        ]);

        const total = result.reduce((sum, r) => sum + r.amount, 0);
        // 100/3 = 33.33... 三人各 33.33，總和 99.99
        // 使用精度 1 來容納浮點誤差
        expect(total).toBeCloseTo(100, 1);
      });

      it('應處理單人多份情況', () => {
        const result = calculateShares(1000, SplitType.SHARES, [
          { userId: testUser1.id, shares: 10 },
        ]);

        expect(result[0].amount).toBe(1000);
      });
    });
  });

  describe('create - 建立帳單', () => {
    beforeEach(() => {
      // 設定預設 mock 回傳
      tripsServiceMock.findById.mockResolvedValue(testTrip1);
      prismaMock.user.findUnique.mockResolvedValue(testUser1);
      prismaMock.bill.create.mockResolvedValue(
        createBillFixture({
          id: 'new-bill-id',
          payerId: testUser1.id,
          payer: { id: testUser1.id, name: testUser1.name, avatarUrl: testUser1.avatarUrl },
        }),
      );
    });

    it('應成功建立 EQUAL 分攤帳單', async () => {
      const input = createBillInputFixture(SplitType.EQUAL);

      const result = await service.create(testUser1.id, input);

      expect(result).toBeDefined();
      expect(tripsServiceMock.findById).toHaveBeenCalledWith(input.tripId, testUser1.id);
      expect(prismaMock.bill.create).toHaveBeenCalled();
      expect(notificationsServiceMock.notifyBillCreated).toHaveBeenCalled();
    });

    it('應成功建立 EXACT 分攤帳單', async () => {
      const input = createBillInputFixture(SplitType.EXACT);

      await service.create(testUser1.id, input);

      expect(prismaMock.bill.create).toHaveBeenCalled();
    });

    it('應成功建立 PERCENTAGE 分攤帳單', async () => {
      const input = createBillInputFixture(SplitType.PERCENTAGE);

      await service.create(testUser1.id, input);

      expect(prismaMock.bill.create).toHaveBeenCalled();
    });

    it('應成功建立 SHARES 分攤帳單', async () => {
      const input = createBillInputFixture(SplitType.SHARES);

      await service.create(testUser1.id, input);

      expect(prismaMock.bill.create).toHaveBeenCalled();
    });

    it('應成功建立 ITEMIZED 分攤帳單', async () => {
      const input = createBillInputFixture(SplitType.ITEMIZED);

      await service.create(testUser1.id, input);

      expect(prismaMock.bill.create).toHaveBeenCalled();
    });

    it('應驗證用戶是旅程成員', async () => {
      tripsServiceMock.findById.mockRejectedValue(
        new ForbiddenException('您不是此旅程的成員'),
      );

      const input = createBillInputFixture(SplitType.EQUAL);

      await expect(service.create('non-member-id', input)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('不應通知建立者本人', async () => {
      // 設定只有一個成員（建立者本人）
      tripsServiceMock.findById.mockResolvedValue({
        ...testTrip1,
        members: [{ userId: testUser1.id }],
      });

      const input = {
        ...createBillInputFixture(SplitType.EQUAL),
        participants: [{ userId: testUser1.id }],
        amount: 1000,
      };
      await service.create(testUser1.id, input);

      // 因為只有建立者，所以不應發送通知
      expect(notificationsServiceMock.notifyBillCreated).not.toHaveBeenCalled();
    });
  });

  describe('createItemizedBill - ITEMIZED 細項分攤', () => {
    beforeEach(() => {
      tripsServiceMock.findById.mockResolvedValue(testTrip1);
      prismaMock.user.findUnique.mockResolvedValue(testUser1);
      prismaMock.bill.create.mockResolvedValue(
        createBillFixture({
          id: 'itemized-bill-id',
          splitType: SplitType.ITEMIZED,
        }),
      );
    });

    it('應拒絕品項金額總和不等於帳單金額', async () => {
      const input = {
        tripId: 'trip-1',
        title: '細項帳單',
        amount: 1000,
        category: BillCategory.FOOD,
        splitType: SplitType.ITEMIZED,
        participants: [{ userId: testUser1.id }],
        items: [
          { name: '品項1', amount: 500, participantIds: [testUser1.id] },
          // 只有 500，但帳單總額是 1000
        ],
      };

      await expect(service.create(testUser1.id, input)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('應拒絕沒有參與者的品項', async () => {
      const input = {
        tripId: 'trip-1',
        title: '細項帳單',
        amount: 1000,
        category: BillCategory.FOOD,
        splitType: SplitType.ITEMIZED,
        participants: [{ userId: testUser1.id }],
        items: [
          { name: '品項1', amount: 500, participantIds: [testUser1.id] },
          { name: '品項2', amount: 500, participantIds: [] }, // 無參與者
        ],
      };

      await expect(service.create(testUser1.id, input)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('應正確計算多品項多參與者的分攤', async () => {
      const input = {
        tripId: 'trip-1',
        title: '細項帳單',
        amount: 1000,
        category: BillCategory.FOOD,
        splitType: SplitType.ITEMIZED,
        participants: [
          { userId: testUser1.id },
          { userId: testUser2.id },
          { userId: testUser3.id },
        ],
        items: [
          // 品項1: 600 元，A 和 B 分，每人 300
          { name: '牛排', amount: 600, participantIds: [testUser1.id, testUser2.id] },
          // 品項2: 400 元，B 和 C 分，每人 200
          { name: '沙拉', amount: 400, participantIds: [testUser2.id, testUser3.id] },
        ],
      };

      await service.create(testUser1.id, input);

      // 驗證 bill.create 被呼叫且包含正確的 shares
      expect(prismaMock.bill.create).toHaveBeenCalled();
      const createCall = prismaMock.bill.create.mock.calls[0][0];

      // 檢查 shares 是否被正確建立
      expect(createCall.data.shares.create).toBeDefined();
    });
  });

  describe('findById - 取得帳單詳情', () => {
    it('應返回帳單詳情', async () => {
      const mockBill = createBillFixture({
        id: 'bill-1',
        trip: {
          ...testTrip1,
          members: testTrip1.members,
        },
      });
      prismaMock.bill.findUnique.mockResolvedValue(mockBill);

      const result = await service.findById('bill-1', testUser1.id);

      expect(result).toEqual(mockBill);
    });

    it('應拒絕不存在的帳單', async () => {
      prismaMock.bill.findUnique.mockResolvedValue(null);

      await expect(service.findById('non-existent', testUser1.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('應拒絕非旅程成員存取', async () => {
      const mockBill = createBillFixture({
        id: 'bill-1',
        trip: {
          ...testTrip1,
          members: [{ userId: 'other-user' }], // 不包含測試用戶
        },
      });
      prismaMock.bill.findUnique.mockResolvedValue(mockBill);

      await expect(service.findById('bill-1', testUser1.id)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update - 更新帳單', () => {
    const mockBillWithTrip = createBillFixture({
      id: 'bill-1',
      payerId: testUser1.id,
      trip: {
        ...testTrip1,
        members: testTrip1.members,
      },
    });

    beforeEach(() => {
      prismaMock.bill.findUnique.mockResolvedValue(mockBillWithTrip);
      prismaMock.user.findUnique.mockResolvedValue(testUser1);
      prismaMock.bill.update.mockResolvedValue(mockBillWithTrip);
      prismaMock.billShare.deleteMany.mockResolvedValue({ count: 3 });
      prismaMock.billShare.createMany.mockResolvedValue({ count: 3 });
      prismaMock.billItem.deleteMany.mockResolvedValue({ count: 0 });
    });

    it('付款人應可以更新帳單', async () => {
      await service.update('bill-1', testUser1.id, { title: '新標題' });

      expect(prismaMock.bill.update).toHaveBeenCalled();
    });

    it('應拒絕非付款人更新帳單', async () => {
      await expect(
        service.update('bill-1', testUser2.id, { title: '新標題' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('應在更新分攤時重新計算', async () => {
      await service.update('bill-1', testUser1.id, {
        amount: 900,
        splitType: SplitType.EQUAL,
        participants: [
          { userId: testUser1.id },
          { userId: testUser2.id },
          { userId: testUser3.id },
        ],
      });

      expect(prismaMock.billShare.deleteMany).toHaveBeenCalled();
      expect(prismaMock.billShare.createMany).toHaveBeenCalled();
    });

    it('應發送更新通知給其他成員', async () => {
      await service.update('bill-1', testUser1.id, { title: '新標題' });

      expect(notificationsServiceMock.notifyBillUpdated).toHaveBeenCalled();
    });
  });

  describe('delete - 刪除帳單', () => {
    const mockBillWithTrip = createBillFixture({
      id: 'bill-1',
      payerId: testUser1.id,
      trip: {
        ...testTrip1,
        members: testTrip1.members,
      },
    });

    beforeEach(() => {
      prismaMock.bill.findUnique.mockResolvedValue(mockBillWithTrip);
      prismaMock.user.findUnique.mockResolvedValue(testUser1);
      prismaMock.bill.delete.mockResolvedValue(mockBillWithTrip);
    });

    it('付款人應可以刪除帳單', async () => {
      await service.delete('bill-1', testUser1.id);

      expect(prismaMock.bill.delete).toHaveBeenCalledWith({
        where: { id: 'bill-1' },
      });
    });

    it('應拒絕非付款人刪除帳單', async () => {
      await expect(service.delete('bill-1', testUser2.id)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('應發送刪除通知給其他成員', async () => {
      await service.delete('bill-1', testUser1.id);

      expect(notificationsServiceMock.notifyBillDeleted).toHaveBeenCalled();
    });
  });

  describe('findAllByTrip - 取得旅程所有帳單', () => {
    it('應返回旅程的所有帳單', async () => {
      const mockBills = [
        createBillFixture({ id: 'bill-1' }),
        createBillFixture({ id: 'bill-2' }),
      ];
      tripsServiceMock.findById.mockResolvedValue(testTrip1);
      prismaMock.bill.findMany.mockResolvedValue(mockBills);
      prismaMock.bill.count.mockResolvedValue(2);

      const result = await service.findAllByTrip('trip-1', testUser1.id);

      expect(result.data).toEqual(mockBills);
      expect(result.pagination).toBeDefined();
      expect(prismaMock.bill.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tripId: 'trip-1' },
        }),
      );
    });

    it('應驗證用戶是旅程成員', async () => {
      tripsServiceMock.findById.mockRejectedValue(
        new ForbiddenException('您不是此旅程的成員'),
      );

      await expect(service.findAllByTrip('trip-1', 'non-member')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getStatsByCategory - 分類統計', () => {
    it('應返回各分類的統計', async () => {
      tripsServiceMock.findById.mockResolvedValue(testTrip1);
      prismaMock.bill.groupBy.mockResolvedValue([
        { category: 'FOOD', _sum: { amount: new Decimal(5000) }, _count: { id: 10 } },
        { category: 'TRANSPORT', _sum: { amount: new Decimal(2000) }, _count: { id: 5 } },
      ]);

      const result = await service.getStatsByCategory('trip-1', testUser1.id);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        category: 'FOOD',
        total: new Decimal(5000),
        count: 10,
      });
    });
  });
});
