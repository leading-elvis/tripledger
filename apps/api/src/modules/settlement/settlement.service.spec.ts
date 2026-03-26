import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SettlementStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { SettlementService } from './settlement.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TripsService } from '../trips/trips.service';
import { NotificationsService } from '../notifications/notifications.service';
import { createPrismaMock, PrismaMock } from '../../../test/mocks/prisma.mock';
import {
  createTripsServiceMock,
  createNotificationsServiceMock,
  TripsServiceMock,
  NotificationsServiceMock,
} from '../../../test/mocks/services.mock';
import { testUser1, testUser2, testUser3, testUser4 } from '../../../test/fixtures/users.fixture';
import { testTrip1, createTripWithMembersFixture, createTripMemberFixture } from '../../../test/fixtures/trips.fixture';
import { createBillFixture, createBillShareFixture } from '../../../test/fixtures/bills.fixture';
import {
  createSettlementFixture,
  pendingSettlement,
  confirmedSettlement,
  simpleTwoPersonScenario,
  threePersonScenario,
  circularDebtScenario,
  complexFourPersonScenario,
} from '../../../test/fixtures/settlements.fixture';
import { MemberRole } from '@prisma/client';

describe('SettlementService', () => {
  let service: SettlementService;
  let prismaMock: PrismaMock;
  let tripsServiceMock: TripsServiceMock;
  let notificationsServiceMock: NotificationsServiceMock;

  beforeEach(async () => {
    prismaMock = createPrismaMock();
    tripsServiceMock = createTripsServiceMock();
    notificationsServiceMock = createNotificationsServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettlementService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: TripsService, useValue: tripsServiceMock },
        { provide: NotificationsService, useValue: notificationsServiceMock },
      ],
    }).compile();

    service = module.get<SettlementService>(SettlementService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateBalances - 餘額計算', () => {
    it('應計算簡單雙人餘額', async () => {
      // 設定旅程有兩個成員
      const trip = createTripWithMembersFixture(
        { id: 'trip-1' },
        [
          createTripMemberFixture({
            userId: testUser1.id,
            role: MemberRole.OWNER,
            user: { id: testUser1.id, name: testUser1.name, avatarUrl: testUser1.avatarUrl },
          }),
          createTripMemberFixture({
            userId: testUser2.id,
            role: MemberRole.MEMBER,
            user: { id: testUser2.id, name: testUser2.name, avatarUrl: testUser2.avatarUrl },
          }),
        ],
      );
      tripsServiceMock.findById.mockResolvedValue(trip);

      // 設定一張帳單：A 付了 1000，A 和 B 各分攤 500
      prismaMock.bill.findMany.mockResolvedValue([
        createBillFixture({
          id: 'bill-1',
          payerId: testUser1.id,
          amount: new Decimal(1000),
          payer: { id: testUser1.id, name: testUser1.name, avatarUrl: testUser1.avatarUrl },
          shares: [
            createBillShareFixture({
              userId: testUser1.id,
              amount: new Decimal(500),
              user: { id: testUser1.id, name: testUser1.name, avatarUrl: null },
            }),
            createBillShareFixture({
              userId: testUser2.id,
              amount: new Decimal(500),
              user: { id: testUser2.id, name: testUser2.name, avatarUrl: null },
            }),
          ],
        }),
      ]);

      const result = await service.calculateBalances('trip-1', testUser1.id);

      expect(result).toHaveLength(2);

      const user1Balance = result.find((b) => b.userId === testUser1.id);
      const user2Balance = result.find((b) => b.userId === testUser2.id);

      // A: paid 1000, owed 500 -> balance = +500
      expect(user1Balance?.paid).toBe(1000);
      expect(user1Balance?.owed).toBe(500);
      expect(user1Balance?.balance).toBe(500);

      // B: paid 0, owed 500 -> balance = -500
      expect(user2Balance?.paid).toBe(0);
      expect(user2Balance?.owed).toBe(500);
      expect(user2Balance?.balance).toBe(-500);
    });

    it('應處理無帳單的旅程', async () => {
      const trip = createTripWithMembersFixture({ id: 'trip-1' });
      tripsServiceMock.findById.mockResolvedValue(trip);
      prismaMock.bill.findMany.mockResolvedValue([]);

      const result = await service.calculateBalances('trip-1', testUser1.id);

      expect(result).toHaveLength(3); // 三個成員
      result.forEach((balance) => {
        expect(balance.paid).toBe(0);
        expect(balance.owed).toBe(0);
        expect(balance.balance).toBe(0);
      });
    });

    it('應處理多人付款多人分攤', async () => {
      // 三人場景
      const trip = createTripWithMembersFixture({ id: 'trip-1' });
      tripsServiceMock.findById.mockResolvedValue(trip);

      // A 付 1500，B 付 500，均分給三人
      prismaMock.bill.findMany.mockResolvedValue([
        createBillFixture({
          id: 'bill-1',
          payerId: testUser1.id,
          amount: new Decimal(1500),
          payer: { id: testUser1.id, name: testUser1.name, avatarUrl: null },
          shares: [
            createBillShareFixture({ userId: testUser1.id, amount: new Decimal(500), user: { id: testUser1.id, name: testUser1.name, avatarUrl: null } }),
            createBillShareFixture({ userId: testUser2.id, amount: new Decimal(500), user: { id: testUser2.id, name: testUser2.name, avatarUrl: null } }),
            createBillShareFixture({ userId: testUser3.id, amount: new Decimal(500), user: { id: testUser3.id, name: testUser3.name, avatarUrl: null } }),
          ],
        }),
        createBillFixture({
          id: 'bill-2',
          payerId: testUser2.id,
          amount: new Decimal(500),
          payer: { id: testUser2.id, name: testUser2.name, avatarUrl: null },
          shares: [
            createBillShareFixture({ userId: testUser1.id, amount: new Decimal(166.67), user: { id: testUser1.id, name: testUser1.name, avatarUrl: null } }),
            createBillShareFixture({ userId: testUser2.id, amount: new Decimal(166.67), user: { id: testUser2.id, name: testUser2.name, avatarUrl: null } }),
            createBillShareFixture({ userId: testUser3.id, amount: new Decimal(166.66), user: { id: testUser3.id, name: testUser3.name, avatarUrl: null } }),
          ],
        }),
      ]);

      const result = await service.calculateBalances('trip-1', testUser1.id);

      const user1 = result.find((b) => b.userId === testUser1.id);
      const user2 = result.find((b) => b.userId === testUser2.id);
      const user3 = result.find((b) => b.userId === testUser3.id);

      // A: paid 1500, owed 666.67 -> balance ≈ +833.33
      expect(user1?.paid).toBe(1500);
      expect(user1?.owed).toBeCloseTo(666.67, 1);
      expect(user1?.balance).toBeCloseTo(833.33, 1);

      // B: paid 500, owed 666.67 -> balance ≈ -166.67
      expect(user2?.paid).toBe(500);
      expect(user2?.owed).toBeCloseTo(666.67, 1);

      // C: paid 0, owed 666.66 -> balance ≈ -666.66
      expect(user3?.paid).toBe(0);
    });
  });

  describe('calculateOptimizedSettlements - 最佳化還款演算法', () => {
    // 為了測試演算法，我們需要 mock calculateBalances 的結果
    let calculateBalancesSpy: jest.SpyInstance;

    beforeEach(() => {
      tripsServiceMock.findById.mockResolvedValue(testTrip1);
    });

    it('應最小化交易次數（簡單雙人）', async () => {
      // 直接 mock calculateBalances 方法
      jest.spyOn(service, 'calculateBalances').mockResolvedValue(
        simpleTwoPersonScenario.balances,
      );

      const result = await service.calculateOptimizedSettlements('trip-1', testUser1.id);

      expect(result).toHaveLength(1);
      expect(result[0].from.id).toBe(testUser2.id);
      expect(result[0].to.id).toBe(testUser1.id);
      expect(result[0].amount).toBe(500);
    });

    it('應處理環形債務抵消', async () => {
      jest.spyOn(service, 'calculateBalances').mockResolvedValue(
        circularDebtScenario.balances,
      );

      const result = await service.calculateOptimizedSettlements('trip-1', testUser1.id);

      // 所有人餘額為 0，無需結算
      expect(result).toHaveLength(0);
    });

    it('應處理三人複雜債務', async () => {
      jest.spyOn(service, 'calculateBalances').mockResolvedValue(
        threePersonScenario.balances,
      );

      const result = await service.calculateOptimizedSettlements('trip-1', testUser1.id);

      // 應該有 2 筆交易
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.length).toBeLessThanOrEqual(2);

      // 驗證總金額正確
      // A: +833.33, B: -166.67, C: -666.67
      // 總結算金額 = 166.67 + 666.67 = 833.34 (債務人總額)
      const totalSettled = result.reduce((sum, s) => sum + s.amount, 0);
      expect(totalSettled).toBeCloseTo(833.34, 0);
    });

    it('應處理四人複雜債務網路', async () => {
      jest.spyOn(service, 'calculateBalances').mockResolvedValue(
        complexFourPersonScenario.balances,
      );

      const result = await service.calculateOptimizedSettlements('trip-1', testUser1.id);

      // 驗證交易次數最小化（應該是 3 筆或更少）
      expect(result.length).toBeLessThanOrEqual(3);

      // 驗證總金額正確 (600 + 200 = 800)
      const totalSettled = result.reduce((sum, s) => sum + s.amount, 0);
      expect(totalSettled).toBeCloseTo(800, 0);

      // 驗證所有 from 都是債務人，所有 to 都是債權人
      const debtorIds = [testUser3.id, testUser4.id];
      const creditorIds = [testUser1.id, testUser2.id];

      result.forEach((settlement) => {
        expect(debtorIds).toContain(settlement.from.id);
        expect(creditorIds).toContain(settlement.to.id);
      });
    });

    it('應忽略極小金額（< 0.01）', async () => {
      jest.spyOn(service, 'calculateBalances').mockResolvedValue([
        {
          userId: testUser1.id,
          isVirtual: false,
          userName: testUser1.name,
          userAvatar: null,
          paid: 100,
          owed: 100.005,
          balance: -0.005, // 極小金額
        },
        {
          userId: testUser2.id,
          isVirtual: false,
          userName: testUser2.name,
          userAvatar: null,
          paid: 100.005,
          owed: 100,
          balance: 0.005, // 極小金額
        },
      ]);

      const result = await service.calculateOptimizedSettlements('trip-1', testUser1.id);

      // 極小金額應該被忽略
      expect(result).toHaveLength(0);
    });

    it('應正確排序債權人和債務人', async () => {
      // 測試貪婪演算法的排序：金額大的優先
      jest.spyOn(service, 'calculateBalances').mockResolvedValue([
        { userId: 'small-creditor', userName: 'A', userAvatar: null, isVirtual: false, paid: 200, owed: 100, balance: 100 },
        { userId: 'large-creditor', userName: 'B', userAvatar: null, isVirtual: false, paid: 400, owed: 100, balance: 300 },
        { userId: 'small-debtor', userName: 'C', userAvatar: null, isVirtual: false, paid: 0, owed: 150, balance: -150 },
        { userId: 'large-debtor', userName: 'D', userAvatar: null, isVirtual: false, paid: 0, owed: 250, balance: -250 },
      ]);

      const result = await service.calculateOptimizedSettlements('trip-1', testUser1.id);

      // 第一筆交易應該是最大債務人 -> 最大債權人
      if (result.length > 0) {
        expect(result[0].from.id).toBe('large-debtor');
        expect(result[0].to.id).toBe('large-creditor');
      }
    });
  });

  describe('createSettlement - 建立結算', () => {
    beforeEach(() => {
      tripsServiceMock.findById.mockResolvedValue(testTrip1);
      prismaMock.user.findUnique.mockResolvedValue(testUser1);
      prismaMock.settlement.create.mockResolvedValue(
        createSettlementFixture({
          id: 'new-settlement',
          payerId: testUser1.id,
          receiverId: testUser2.id,
        }),
      );
    });

    it('應成功建立結算記錄', async () => {
      const result = await service.createSettlement(
        'trip-1',
        testUser1.id,
        testUser2.id,
        500,
        testUser1.id,
      );

      expect(result).toBeDefined();
      expect(prismaMock.settlement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tripId: 'trip-1',
            payerId: testUser1.id,
            receiverId: testUser2.id,
            amount: 500,
            status: SettlementStatus.PENDING,
          }),
        }),
      );
    });

    it('應拒絕非付款人建立結算', async () => {
      await expect(
        service.createSettlement('trip-1', testUser1.id, testUser2.id, 500, testUser2.id),
      ).rejects.toThrow(ForbiddenException);
    });

    it('應發送通知給收款方', async () => {
      await service.createSettlement('trip-1', testUser1.id, testUser2.id, 500, testUser1.id);

      expect(notificationsServiceMock.notifySettlementCreated).toHaveBeenCalled();
    });
  });

  describe('confirmSettlement - 確認結算', () => {
    it('收款方應可以確認結算', async () => {
      prismaMock.settlement.findUnique.mockResolvedValue({
        ...pendingSettlement,
        receiverId: testUser1.id,
      });
      prismaMock.settlement.update.mockResolvedValue({
        ...pendingSettlement,
        status: SettlementStatus.CONFIRMED,
      });

      const result = await service.confirmSettlement('settlement-1', testUser1.id);

      expect(prismaMock.settlement.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: SettlementStatus.CONFIRMED,
          }),
        }),
      );
    });

    it('應拒絕非收款方確認', async () => {
      prismaMock.settlement.findUnique.mockResolvedValue({
        ...pendingSettlement,
        receiverId: testUser2.id, // 收款方是 user2
      });

      await expect(
        service.confirmSettlement('settlement-1', testUser1.id), // user1 嘗試確認
      ).rejects.toThrow(ForbiddenException);
    });

    it('應拒絕確認不存在的結算', async () => {
      prismaMock.settlement.findUnique.mockResolvedValue(null);

      await expect(
        service.confirmSettlement('non-existent', testUser1.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('應拒絕確認已處理的結算', async () => {
      prismaMock.settlement.findUnique.mockResolvedValue({
        ...confirmedSettlement,
        receiverId: testUser1.id,
      });

      await expect(
        service.confirmSettlement('settlement-1', testUser1.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('應發送確認通知給付款方', async () => {
      prismaMock.settlement.findUnique.mockResolvedValue({
        ...pendingSettlement,
        receiverId: testUser1.id,
      });
      prismaMock.settlement.update.mockResolvedValue({
        ...pendingSettlement,
        status: SettlementStatus.CONFIRMED,
      });

      await service.confirmSettlement('settlement-1', testUser1.id);

      expect(notificationsServiceMock.notifySettlementConfirmed).toHaveBeenCalled();
    });
  });

  describe('cancelSettlement - 取消結算', () => {
    it('付款方應可以取消 PENDING 結算', async () => {
      prismaMock.settlement.findUnique.mockResolvedValue({
        ...pendingSettlement,
        payerId: testUser1.id,
      });
      prismaMock.settlement.update.mockResolvedValue({
        ...pendingSettlement,
        status: SettlementStatus.CANCELLED,
      });

      const result = await service.cancelSettlement('settlement-1', testUser1.id);

      expect(prismaMock.settlement.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: SettlementStatus.CANCELLED },
        }),
      );
    });

    it('收款方應可以取消 PENDING 結算', async () => {
      prismaMock.settlement.findUnique.mockResolvedValue({
        ...pendingSettlement,
        receiverId: testUser1.id,
      });
      prismaMock.settlement.update.mockResolvedValue({
        ...pendingSettlement,
        status: SettlementStatus.CANCELLED,
      });

      await service.cancelSettlement('settlement-1', testUser1.id);

      expect(prismaMock.settlement.update).toHaveBeenCalled();
    });

    it('應拒絕非相關人員取消', async () => {
      prismaMock.settlement.findUnique.mockResolvedValue({
        ...pendingSettlement,
        payerId: testUser1.id,
        receiverId: testUser2.id,
      });

      await expect(
        service.cancelSettlement('settlement-1', testUser3.id), // user3 無關
      ).rejects.toThrow(ForbiddenException);
    });

    it('應拒絕取消已確認的結算', async () => {
      prismaMock.settlement.findUnique.mockResolvedValue({
        ...confirmedSettlement,
        payerId: testUser1.id,
      });

      await expect(
        service.cancelSettlement('settlement-1', testUser1.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('應拒絕取消不存在的結算', async () => {
      prismaMock.settlement.findUnique.mockResolvedValue(null);

      await expect(
        service.cancelSettlement('non-existent', testUser1.id),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSettlementsByTrip - 取得旅程結算記錄', () => {
    it('應返回旅程的所有結算記錄', async () => {
      tripsServiceMock.findById.mockResolvedValue(testTrip1);
      prismaMock.settlement.findMany.mockResolvedValue([
        pendingSettlement,
        confirmedSettlement,
      ]);

      const result = await service.getSettlementsByTrip('trip-1', testUser1.id);

      expect(result).toHaveLength(2);
      expect(prismaMock.settlement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tripId: 'trip-1' },
        }),
      );
    });

    it('應驗證用戶是旅程成員', async () => {
      tripsServiceMock.findById.mockRejectedValue(
        new ForbiddenException('您不是此旅程的成員'),
      );

      await expect(
        service.getSettlementsByTrip('trip-1', 'non-member'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getPendingSettlements - 取得待確認結算', () => {
    it('應返回用戶待確認的結算', async () => {
      prismaMock.settlement.findMany.mockResolvedValue([pendingSettlement]);

      const result = await service.getPendingSettlements(testUser1.id);

      expect(result).toHaveLength(1);
      expect(prismaMock.settlement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            receiverId: testUser1.id,
            status: SettlementStatus.PENDING,
          },
        }),
      );
    });
  });

  describe('getTripSummary - 旅程總結', () => {
    it('應返回完整的旅程總結', async () => {
      // Mock calculateBalances
      jest.spyOn(service, 'calculateBalances').mockResolvedValue(
        simpleTwoPersonScenario.balances,
      );
      // Mock calculateOptimizedSettlements
      jest.spyOn(service, 'calculateOptimizedSettlements').mockResolvedValue(
        simpleTwoPersonScenario.expectedSettlements,
      );

      prismaMock.settlement.findMany.mockResolvedValue([confirmedSettlement]);
      prismaMock.bill.findMany.mockResolvedValue([
        createBillFixture({ amount: new Decimal(1000) }),
        createBillFixture({ amount: new Decimal(500) }),
      ]);

      const result = await service.getTripSummary('trip-1', testUser1.id);

      expect(result.totalSpent).toBe(1500);
      expect(result.billCount).toBe(2);
      expect(result.memberCount).toBe(2);
      expect(result.balances).toEqual(simpleTwoPersonScenario.balances);
      expect(result.suggestedSettlements).toEqual(simpleTwoPersonScenario.expectedSettlements);
    });
  });
});
