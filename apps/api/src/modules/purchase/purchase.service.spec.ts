import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ProductType, PurchasePlatform } from '@prisma/client';
import { PurchaseService, PRODUCTS } from './purchase.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AppleVerificationService } from './services/apple-verification.service';
import { GoogleVerificationService } from './services/google-verification.service';
import { PlatformDto } from './dto/purchase.dto';

describe('PurchaseService', () => {
  let service: PurchaseService;
  let prisma: jest.Mocked<PrismaService>;
  let appleVerification: jest.Mocked<AppleVerificationService>;
  let googleVerification: jest.Mocked<GoogleVerificationService>;

  const mockUserId = 'user-1';
  const mockTripId = 'trip-1';

  const mockPurchase = {
    id: 'purchase-1',
    userId: mockUserId,
    productId: 'trip_premium_30d',
    productType: ProductType.CONSUMABLE,
    tripId: mockTripId,
    daysGranted: 30,
    platform: PurchasePlatform.IOS,
    receiptData: 'mock-receipt',
    transactionId: 'txn-123',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    purchasedAt: new Date(),
    createdAt: new Date(),
  };

  const mockTrip = {
    id: mockTripId,
    name: '測試旅程',
    premiumExpiresAt: null,
    members: [{ userId: mockUserId, role: 'OWNER' }],
  };

  beforeEach(async () => {
    const mockPrismaService = {
      purchase: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      trip: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      tripMember: {
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const mockAppleVerification = {
      verifyReceipt: jest.fn(),
      verifyAndExtractPurchaseInfo: jest.fn(),
    };

    const mockGoogleVerification = {
      verifyPurchase: jest.fn(),
      consumePurchase: jest.fn(),
      verifyAndExtractPurchaseInfo: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AppleVerificationService, useValue: mockAppleVerification },
        { provide: GoogleVerificationService, useValue: mockGoogleVerification },
      ],
    }).compile();

    service = module.get<PurchaseService>(PurchaseService);
    prisma = module.get(PrismaService);
    appleVerification = module.get(AppleVerificationService);
    googleVerification = module.get(GoogleVerificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProductDefinition', () => {
    it('應返回有效的產品定義', () => {
      const product = service.getProductDefinition('trip_premium_30d');

      expect(product).toBeDefined();
      expect(product?.productId).toBe('trip_premium_30d');
      expect(product?.daysGranted).toBe(30);
    });

    it('應在產品不存在時返回 undefined', () => {
      const product = service.getProductDefinition('invalid_product');

      expect(product).toBeUndefined();
    });
  });

  describe('verifyAndRecordPurchase', () => {
    const validDto = {
      platform: PlatformDto.IOS,
      productId: 'trip_premium_30d',
      receiptData: 'mock-receipt-data',
      transactionId: 'txn-123',
      tripId: mockTripId,
    };

    it('應驗證並記錄購買', async () => {
      (prisma.purchase.findUnique as jest.Mock).mockResolvedValue(null);
      appleVerification.verifyReceipt.mockResolvedValue({ isValid: true });
      (prisma.trip.findUnique as jest.Mock).mockResolvedValue(mockTrip);
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
        return fn({
          purchase: { create: jest.fn().mockResolvedValue(mockPurchase) },
          trip: { update: jest.fn().mockResolvedValue({}) },
        });
      });

      const result = await service.verifyAndRecordPurchase(mockUserId, validDto);

      expect(appleVerification.verifyReceipt).toHaveBeenCalled();
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual(mockPurchase);
    });

    it('應在產品 ID 無效時拋出錯誤', async () => {
      const invalidDto = { ...validDto, productId: 'invalid_product' };

      await expect(service.verifyAndRecordPurchase(mockUserId, invalidDto))
        .rejects.toThrow(BadRequestException);
    });

    it('應在消耗型產品缺少 tripId 時拋出錯誤', async () => {
      const noTripDto = { ...validDto, tripId: undefined };

      await expect(service.verifyAndRecordPurchase(mockUserId, noTripDto))
        .rejects.toThrow(BadRequestException);
    });

    it('應在交易重複時返回現有購買記錄', async () => {
      (prisma.purchase.findUnique as jest.Mock).mockResolvedValue(mockPurchase);

      const result = await service.verifyAndRecordPurchase(mockUserId, validDto);

      expect(result).toEqual(mockPurchase);
      expect(appleVerification.verifyReceipt).not.toHaveBeenCalled();
    });

    it('應在交易 ID 被其他用戶使用時拋出錯誤', async () => {
      (prisma.purchase.findUnique as jest.Mock).mockResolvedValue({
        ...mockPurchase,
        userId: 'other-user',
      });

      await expect(service.verifyAndRecordPurchase(mockUserId, validDto))
        .rejects.toThrow(BadRequestException);
    });

    it('應在收據驗證失敗時拋出錯誤', async () => {
      (prisma.purchase.findUnique as jest.Mock).mockResolvedValue(null);
      appleVerification.verifyReceipt.mockResolvedValue({ isValid: false, error: 'Invalid receipt' });

      await expect(service.verifyAndRecordPurchase(mockUserId, validDto))
        .rejects.toThrow(BadRequestException);
    });

    it('應在旅程不存在時拋出錯誤', async () => {
      (prisma.purchase.findUnique as jest.Mock).mockResolvedValue(null);
      appleVerification.verifyReceipt.mockResolvedValue({ isValid: true });
      (prisma.trip.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.verifyAndRecordPurchase(mockUserId, validDto))
        .rejects.toThrow(NotFoundException);
    });

    it('應在用戶非旅程成員時拋出錯誤', async () => {
      (prisma.purchase.findUnique as jest.Mock).mockResolvedValue(null);
      appleVerification.verifyReceipt.mockResolvedValue({ isValid: true });
      (prisma.trip.findUnique as jest.Mock).mockResolvedValue({
        ...mockTrip,
        members: [], // 沒有成員
      });

      await expect(service.verifyAndRecordPurchase(mockUserId, validDto))
        .rejects.toThrow(ForbiddenException);
    });

    it('應在用戶無權購買進階版時拋出錯誤', async () => {
      (prisma.purchase.findUnique as jest.Mock).mockResolvedValue(null);
      appleVerification.verifyReceipt.mockResolvedValue({ isValid: true });
      (prisma.trip.findUnique as jest.Mock).mockResolvedValue({
        ...mockTrip,
        members: [{ userId: mockUserId, role: 'MEMBER' }], // 普通成員
      });

      await expect(service.verifyAndRecordPurchase(mockUserId, validDto))
        .rejects.toThrow(ForbiddenException);
    });

    it('應使用 Google 驗證處理 Android 購買', async () => {
      const androidDto = { ...validDto, platform: PlatformDto.ANDROID };
      (prisma.purchase.findUnique as jest.Mock).mockResolvedValue(null);
      googleVerification.verifyPurchase.mockResolvedValue({ isValid: true });
      googleVerification.consumePurchase.mockResolvedValue(true);
      (prisma.trip.findUnique as jest.Mock).mockResolvedValue(mockTrip);
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
        return fn({
          purchase: { create: jest.fn().mockResolvedValue(mockPurchase) },
          trip: { update: jest.fn().mockResolvedValue({}) },
        });
      });

      await service.verifyAndRecordPurchase(mockUserId, androidDto);

      expect(googleVerification.verifyPurchase).toHaveBeenCalled();
    });
  });

  describe('getPurchaseHistory', () => {
    it('應返回用戶的購買歷史', async () => {
      (prisma.purchase.findMany as jest.Mock).mockResolvedValue([mockPurchase]);

      const result = await service.getPurchaseHistory(mockUserId);

      expect(prisma.purchase.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        orderBy: { purchasedAt: 'desc' },
        select: expect.objectContaining({
          id: true,
          productId: true,
          // 不應包含 receiptData
        }),
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('restorePurchases', () => {
    it('應恢復非消耗型購買', async () => {
      // 本地資料庫有購買記錄
      (prisma.purchase.findFirst as jest.Mock).mockResolvedValue({
        ...mockPurchase,
        productId: 'remove_ads_forever',
        productType: ProductType.NON_CONSUMABLE,
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: mockUserId,
        isAdFree: false,
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await service.restorePurchases(mockUserId, PlatformDto.IOS, []);

      expect(result.hasRestoredPurchases).toBe(true);
      expect(result.adFreeRestored).toBe(true);
    });

    it('應在沒有購買記錄時返回空結果', async () => {
      (prisma.purchase.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.restorePurchases(mockUserId, PlatformDto.IOS, []);

      expect(result.hasRestoredPurchases).toBe(false);
      expect(result.restoredCount).toBe(0);
    });
  });

  describe('validateTripMembership', () => {
    it('應驗證用戶是旅程成員', async () => {
      (prisma.tripMember.findUnique as jest.Mock).mockResolvedValue({
        tripId: mockTripId,
        userId: mockUserId,
      });

      await expect(service.validateTripMembership(mockUserId, mockTripId))
        .resolves.not.toThrow();
    });

    it('應在用戶非成員時拋出錯誤', async () => {
      (prisma.tripMember.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.validateTripMembership(mockUserId, mockTripId))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('getTripPremiumStatus', () => {
    it('應返回進階狀態（有進階）', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天後
      (prisma.trip.findUnique as jest.Mock).mockResolvedValue({
        id: mockTripId,
        premiumExpiresAt: futureDate,
      });

      const result = await service.getTripPremiumStatus(mockTripId);

      expect(result.isPremium).toBe(true);
      expect(result.expiresAt).toEqual(futureDate);
      expect(result.remainingDays).toBeGreaterThanOrEqual(6);
    });

    it('應返回進階狀態（無進階）', async () => {
      (prisma.trip.findUnique as jest.Mock).mockResolvedValue({
        id: mockTripId,
        premiumExpiresAt: null,
      });

      const result = await service.getTripPremiumStatus(mockTripId);

      expect(result.isPremium).toBe(false);
      expect(result.remainingDays).toBeUndefined();
    });

    it('應在旅程不存在時拋出錯誤', async () => {
      (prisma.trip.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getTripPremiumStatus(mockTripId))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('getAdFreeStatus', () => {
    it('應返回去廣告狀態（已購買）', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: mockUserId,
        isAdFree: true,
        adFreeSince: new Date(),
      });

      const result = await service.getAdFreeStatus(mockUserId);

      expect(result.isAdFree).toBe(true);
      expect(result.purchasedAt).toBeDefined();
    });

    it('應返回去廣告狀態（未購買）', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: mockUserId,
        isAdFree: false,
        adFreeSince: null,
      });

      const result = await service.getAdFreeStatus(mockUserId);

      expect(result.isAdFree).toBe(false);
    });

    it('應在用戶不存在時拋出錯誤', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getAdFreeStatus(mockUserId))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('isTripPremium', () => {
    it('應在旅程為進階版時返回 true', async () => {
      (prisma.trip.findUnique as jest.Mock).mockResolvedValue({
        premiumExpiresAt: new Date(Date.now() + 86400000),
      });

      const result = await service.isTripPremium(mockTripId);

      expect(result).toBe(true);
    });

    it('應在旅程非進階版時返回 false', async () => {
      (prisma.trip.findUnique as jest.Mock).mockResolvedValue({
        premiumExpiresAt: null,
      });

      const result = await service.isTripPremium(mockTripId);

      expect(result).toBe(false);
    });

    it('應在旅程不存在時返回 false', async () => {
      (prisma.trip.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.isTripPremium(mockTripId);

      expect(result).toBe(false);
    });
  });

  describe('isUserAdFree', () => {
    it('應在用戶為去廣告時返回 true', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        isAdFree: true,
      });

      const result = await service.isUserAdFree(mockUserId);

      expect(result).toBe(true);
    });

    it('應在用戶非去廣告時返回 false', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        isAdFree: false,
      });

      const result = await service.isUserAdFree(mockUserId);

      expect(result).toBe(false);
    });

    it('應在用戶不存在時返回 false', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.isUserAdFree(mockUserId);

      expect(result).toBe(false);
    });
  });
});
