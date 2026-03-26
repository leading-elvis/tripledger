import { Test, TestingModule } from '@nestjs/testing';
import { SettlementController } from './settlement.controller';
import { SettlementService } from './settlement.service';
import { SettlementStatus } from '@prisma/client';

describe('SettlementController', () => {
  let controller: SettlementController;
  let settlementService: jest.Mocked<SettlementService>;

  const mockUser = { id: 'user-1' };
  const mockSettlement = {
    id: 'settlement-1',
    tripId: 'trip-1',
    payerId: 'user-1',
    receiverId: 'user-2',
    amount: 500,
    status: SettlementStatus.PENDING,
    createdAt: new Date(),
    settledAt: null,
    payer: { id: 'user-1', name: '付款人', avatarUrl: null },
    receiver: { id: 'user-2', name: '收款人', avatarUrl: null },
    trip: { id: 'trip-1', name: '旅程' },
  } as any;

  beforeEach(async () => {
    const mockSettlementService = {
      calculateBalances: jest.fn(),
      calculateOptimizedSettlements: jest.fn(),
      getSettlementsByTrip: jest.fn(),
      getTripPendingSettlements: jest.fn(),
      getTripSummary: jest.fn(),
      createSettlement: jest.fn(),
      confirmSettlement: jest.fn(),
      cancelSettlement: jest.fn(),
      getPendingSettlements: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettlementController],
      providers: [
        { provide: SettlementService, useValue: mockSettlementService },
      ],
    }).compile();

    controller = module.get<SettlementController>(SettlementController);
    settlementService = module.get(SettlementService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBalances', () => {
    it('應返回旅程成員餘額', async () => {
      const balances = [
        { userId: 'user-1', userName: '用戶1', balance: 500, paid: 1000, owed: 500 },
        { userId: 'user-2', userName: '用戶2', balance: -500, paid: 0, owed: 500 },
      ] as any;
      settlementService.calculateBalances.mockResolvedValue(balances);

      const result = await controller.getBalances('trip-1', mockUser);

      expect(settlementService.calculateBalances).toHaveBeenCalledWith('trip-1', mockUser.id);
      expect(result).toEqual(balances);
    });
  });

  describe('getSuggestedSettlements', () => {
    it('應返回最佳化還款路徑', async () => {
      const suggestions = [
        { from: { id: 'user-2', name: '用戶2' }, to: { id: 'user-1', name: '用戶1' }, amount: 500 },
      ] as any;
      settlementService.calculateOptimizedSettlements.mockResolvedValue(suggestions);

      const result = await controller.getSuggestedSettlements('trip-1', mockUser);

      expect(settlementService.calculateOptimizedSettlements).toHaveBeenCalledWith('trip-1', mockUser.id);
      expect(result).toEqual(suggestions);
    });
  });

  describe('getSettlementsByTrip', () => {
    it('應返回旅程結算記錄', async () => {
      settlementService.getSettlementsByTrip.mockResolvedValue([mockSettlement]);

      const result = await controller.getSettlementsByTrip('trip-1', mockUser);

      expect(settlementService.getSettlementsByTrip).toHaveBeenCalledWith('trip-1', mockUser.id);
      expect(result).toHaveLength(1);
    });
  });

  describe('getTripPendingSettlements', () => {
    it('應返回待處理結算', async () => {
      settlementService.getTripPendingSettlements.mockResolvedValue([mockSettlement]);

      const result = await controller.getTripPendingSettlements('trip-1', mockUser);

      expect(settlementService.getTripPendingSettlements).toHaveBeenCalledWith('trip-1', mockUser.id);
      expect(result).toHaveLength(1);
    });
  });

  describe('getTripSummary', () => {
    it('應返回旅程結算總結', async () => {
      const summary = {
        totalSpent: 10000,
        memberCount: 3,
        billCount: 5,
        settledAmount: 3000,
        balances: [],
        suggestedSettlements: [],
      } as any;
      settlementService.getTripSummary.mockResolvedValue(summary);

      const result = await controller.getTripSummary('trip-1', mockUser);

      expect(settlementService.getTripSummary).toHaveBeenCalledWith('trip-1', mockUser.id);
      expect(result).toEqual(summary);
    });
  });

  describe('createSettlement', () => {
    it('應建立結算記錄', async () => {
      settlementService.createSettlement.mockResolvedValue(mockSettlement);

      const dto = {
        tripId: 'trip-1',
        receiverId: 'user-2',
        amount: 500,
      };

      const result = await controller.createSettlement(mockUser, dto);

      expect(settlementService.createSettlement).toHaveBeenCalledWith(
        'trip-1',
        mockUser.id,
        'user-2',
        500,
        mockUser.id,
      );
      expect(result).toEqual(mockSettlement);
    });
  });

  describe('confirmSettlement', () => {
    it('應確認結算', async () => {
      const confirmedSettlement = {
        ...mockSettlement,
        status: SettlementStatus.CONFIRMED,
        settledAt: new Date(),
      } as any;
      settlementService.confirmSettlement.mockResolvedValue(confirmedSettlement);

      const result = await controller.confirmSettlement('settlement-1', mockUser);

      expect(settlementService.confirmSettlement).toHaveBeenCalledWith('settlement-1', mockUser.id);
      expect(result.status).toBe(SettlementStatus.CONFIRMED);
    });
  });

  describe('cancelSettlement', () => {
    it('應取消結算', async () => {
      const cancelledSettlement = {
        ...mockSettlement,
        status: SettlementStatus.CANCELLED,
      } as any;
      settlementService.cancelSettlement.mockResolvedValue(cancelledSettlement);

      const result = await controller.cancelSettlement('settlement-1', mockUser);

      expect(settlementService.cancelSettlement).toHaveBeenCalledWith('settlement-1', mockUser.id);
      expect(result.status).toBe(SettlementStatus.CANCELLED);
    });
  });

  describe('getPendingSettlements', () => {
    it('應返回待確認的結算', async () => {
      settlementService.getPendingSettlements.mockResolvedValue([mockSettlement]);

      const result = await controller.getPendingSettlements(mockUser);

      expect(settlementService.getPendingSettlements).toHaveBeenCalledWith(mockUser.id);
      expect(result).toHaveLength(1);
    });
  });
});
