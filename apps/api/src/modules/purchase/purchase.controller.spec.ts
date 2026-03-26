import { Test, TestingModule } from '@nestjs/testing';
import { PurchaseController } from './purchase.controller';
import { PurchaseService, PRODUCTS } from './purchase.service';
import { PlatformDto } from './dto/purchase.dto';
import { ThrottlerModule } from '@nestjs/throttler';

describe('PurchaseController', () => {
  let controller: PurchaseController;
  let purchaseService: jest.Mocked<PurchaseService>;

  const mockUser = { id: 'user-1', name: '測試用戶', email: 'test@example.com' } as any;
  const mockPurchase = {
    id: 'purchase-1',
    userId: 'user-1',
    productId: 'tripledger.premium.30days',
    productType: 'TRIP_PREMIUM',
    tripId: 'trip-1',
    daysGranted: 30,
    purchasedAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  } as any;

  beforeEach(async () => {
    const mockPurchaseService = {
      verifyAndRecordPurchase: jest.fn(),
      getPurchaseHistory: jest.fn(),
      restorePurchases: jest.fn(),
      validateTripMembership: jest.fn(),
      getTripPremiumStatus: jest.fn(),
      getAdFreeStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          { name: 'short', ttl: 10000, limit: 5 },
          { name: 'default', ttl: 60000, limit: 10 },
        ]),
      ],
      controllers: [PurchaseController],
      providers: [
        { provide: PurchaseService, useValue: mockPurchaseService },
      ],
    }).compile();

    controller = module.get<PurchaseController>(PurchaseController);
    purchaseService = module.get(PurchaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProducts', () => {
    it('應返回產品清單', () => {
      const result = controller.getProducts();

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(PRODUCTS.length);
      expect(result[0]).toHaveProperty('productId');
      expect(result[0]).toHaveProperty('productType');
      expect(result[0]).toHaveProperty('displayName');
    });
  });

  describe('verifyPurchase', () => {
    it('應驗證並記錄購買', async () => {
      purchaseService.verifyAndRecordPurchase.mockResolvedValue(mockPurchase);

      const dto = {
        platform: PlatformDto.IOS,
        productId: 'tripledger.premium.30days',
        receiptData: 'mock-receipt-data',
        transactionId: 'txn-123',
        tripId: 'trip-1',
      };

      const result = await controller.verifyPurchase(mockUser, dto);

      expect(purchaseService.verifyAndRecordPurchase).toHaveBeenCalledWith(mockUser.id, dto);
      expect(result.id).toBe(mockPurchase.id);
      expect(result.productId).toBe(mockPurchase.productId);
      expect(result.tripId).toBe(mockPurchase.tripId);
    });
  });

  describe('getPurchaseHistory', () => {
    it('應返回購買歷史', async () => {
      purchaseService.getPurchaseHistory.mockResolvedValue([mockPurchase]);

      const result = await controller.getPurchaseHistory(mockUser);

      expect(purchaseService.getPurchaseHistory).toHaveBeenCalledWith(mockUser.id);
      expect(result).toHaveLength(1);
    });
  });

  describe('restorePurchase', () => {
    it('應恢復購買', async () => {
      const restoreResult = {
        restored: 1,
        skipped: 0,
        failed: 0,
        details: [{ productId: 'tripledger.ad_free', status: 'restored' }],
      } as any;
      purchaseService.restorePurchases.mockResolvedValue(restoreResult);

      const dto = {
        platform: PlatformDto.IOS,
        receiptDataList: ['receipt-1', 'receipt-2'],
      };

      const result = await controller.restorePurchase(mockUser, dto);

      expect(purchaseService.restorePurchases).toHaveBeenCalledWith(
        mockUser.id,
        dto.platform,
        dto.receiptDataList,
      );
      expect((result as any).restored).toBe(1);
    });
  });

  describe('getTripPremiumStatus', () => {
    it('應返回旅程進階狀態', async () => {
      const premiumStatus = {
        isPremium: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        daysRemaining: 30,
      } as any;
      purchaseService.validateTripMembership.mockResolvedValue(undefined);
      purchaseService.getTripPremiumStatus.mockResolvedValue(premiumStatus);

      const result = await controller.getTripPremiumStatus(mockUser, 'trip-1');

      expect(purchaseService.validateTripMembership).toHaveBeenCalledWith(mockUser.id, 'trip-1');
      expect(purchaseService.getTripPremiumStatus).toHaveBeenCalledWith('trip-1');
      expect(result.isPremium).toBe(true);
    });
  });

  describe('getAdFreeStatus', () => {
    it('應返回去廣告狀態', async () => {
      const adFreeStatus = {
        isAdFree: true,
        expiresAt: null,
      } as any;
      purchaseService.getAdFreeStatus.mockResolvedValue(adFreeStatus);

      const result = await controller.getAdFreeStatus(mockUser);

      expect(purchaseService.getAdFreeStatus).toHaveBeenCalledWith(mockUser.id);
      expect(result.isAdFree).toBe(true);
    });

    it('應返回非去廣告狀態', async () => {
      const adFreeStatus = {
        isAdFree: false,
        expiresAt: null,
      } as any;
      purchaseService.getAdFreeStatus.mockResolvedValue(adFreeStatus);

      const result = await controller.getAdFreeStatus(mockUser);

      expect(result.isAdFree).toBe(false);
    });
  });
});
