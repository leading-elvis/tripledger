import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProductType, PurchasePlatform } from '@prisma/client';
import { VerifyPurchaseDto, PlatformDto } from './dto/purchase.dto';
import { AppleVerificationService } from './services/apple-verification.service';
import { GoogleVerificationService } from './services/google-verification.service';

// 產品定義
export interface ProductDefinition {
  productId: string;
  productType: ProductType;
  daysGranted?: number; // 消耗型專用
  displayName: string;
}

// 產品清單
export const PRODUCTS: ProductDefinition[] = [
  {
    productId: 'trip_premium_3d',
    productType: ProductType.CONSUMABLE,
    daysGranted: 3,
    displayName: '旅程進階 3 天',
  },
  {
    productId: 'trip_premium_7d',
    productType: ProductType.CONSUMABLE,
    daysGranted: 7,
    displayName: '旅程進階 7 天',
  },
  {
    productId: 'trip_premium_30d',
    productType: ProductType.CONSUMABLE,
    daysGranted: 30,
    displayName: '旅程進階 30 天',
  },
  {
    productId: 'remove_ads_forever',
    productType: ProductType.NON_CONSUMABLE,
    displayName: '永久去廣告',
  },
];

@Injectable()
export class PurchaseService {
  private readonly logger = new Logger(PurchaseService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly appleVerification: AppleVerificationService,
    private readonly googleVerification: GoogleVerificationService,
  ) {}

  /**
   * 取得產品定義
   */
  getProductDefinition(productId: string): ProductDefinition | undefined {
    return PRODUCTS.find((p) => p.productId === productId);
  }

  /**
   * 驗證並記錄購買
   */
  async verifyAndRecordPurchase(userId: string, dto: VerifyPurchaseDto) {
    const product = this.getProductDefinition(dto.productId);
    if (!product) {
      throw new BadRequestException('無效的產品 ID');
    }

    // 檢查消耗型產品是否有提供 tripId
    if (
      product.productType === ProductType.CONSUMABLE &&
      !dto.tripId
    ) {
      throw new BadRequestException('消耗型產品需要提供 tripId');
    }

    // 檢查是否已存在相同交易
    const existingPurchase = await this.prisma.purchase.findUnique({
      where: { transactionId: dto.transactionId },
    });
    if (existingPurchase) {
      // 驗證用戶是否匹配（防止收據重複使用攻擊）
      if (existingPurchase.userId !== userId) {
        // 僅記錄事件類型，不記錄完整 ID 以保護隱私
        this.logger.error('交易 ID 重複使用嘗試：用戶不匹配');
        throw new BadRequestException('此交易已被處理');
      }
      this.logger.warn('處理重複的交易請求');
      return existingPurchase;
    }

    // 驗證收據（根據平台）
    const isValid = await this.verifyReceipt(dto.platform, dto.receiptData, dto.productId);
    if (!isValid) {
      throw new BadRequestException('收據驗證失敗');
    }

    // 計算到期時間（消耗型）
    let expiresAt: Date | null = null;
    if (product.productType === ProductType.CONSUMABLE && product.daysGranted) {
      // 檢查旅程是否存在
      if (dto.tripId) {
        const trip = await this.prisma.trip.findUnique({
          where: { id: dto.tripId },
          include: {
            members: {
              where: { userId },
              select: { role: true },
            },
          },
        });
        if (!trip) {
          throw new NotFoundException('旅程不存在');
        }

        // 檢查是否為旅程成員
        if (trip.members.length === 0) {
          throw new ForbiddenException('您不是此旅程的成員');
        }

        // 檢查是否有權限購買進階版（只有 OWNER 或 ADMIN 可以）
        const memberRole = trip.members[0].role;
        if (memberRole !== 'OWNER' && memberRole !== 'ADMIN') {
          throw new ForbiddenException('只有旅程擁有者或管理員可以購買進階版');
        }

        // 如果旅程已有進階功能，延長時間
        const baseDate = trip.premiumExpiresAt && trip.premiumExpiresAt > new Date()
          ? trip.premiumExpiresAt
          : new Date();

        expiresAt = new Date(baseDate);
        expiresAt.setDate(expiresAt.getDate() + product.daysGranted);
      }
    }

    // 使用交易確保一致性
    const result = await this.prisma.$transaction(async (tx) => {
      // 建立購買記錄
      const purchase = await tx.purchase.create({
        data: {
          userId,
          productId: dto.productId,
          productType: product.productType,
          tripId: dto.tripId,
          daysGranted: product.daysGranted,
          platform: dto.platform === PlatformDto.IOS
            ? PurchasePlatform.IOS
            : PurchasePlatform.ANDROID,
          receiptData: dto.receiptData,
          transactionId: dto.transactionId,
          expiresAt,
        },
      });

      // 更新相關狀態
      if (product.productType === ProductType.NON_CONSUMABLE) {
        // 去廣告：更新用戶狀態
        await tx.user.update({
          where: { id: userId },
          data: {
            isAdFree: true,
            adFreeSince: new Date(),
          },
        });
      } else if (product.productType === ProductType.CONSUMABLE && dto.tripId) {
        // 旅程進階：更新旅程狀態
        await tx.trip.update({
          where: { id: dto.tripId },
          data: {
            premiumExpiresAt: expiresAt,
          },
        });
      }

      return purchase;
    });

    this.logger.log(`購買成功: 產品=${dto.productId}`);

    return result;
  }

  /**
   * 驗證收據
   */
  private async verifyReceipt(
    platform: PlatformDto,
    receiptData: string,
    productId: string,
  ): Promise<boolean> {
    try {
      if (platform === PlatformDto.IOS) {
        // Apple App Store 驗證
        const result = await this.appleVerification.verifyReceipt(
          receiptData,
          productId,
        );
        if (!result.isValid) {
          this.logger.warn(`Apple 收據驗證失敗: ${result.error}`);
        }
        return result.isValid;
      } else {
        // Google Play 驗證
        // 判斷是否為非消耗型（目前只有 remove_ads_forever 是非消耗型）
        const isNonConsumable = productId === 'remove_ads_forever';

        const result = await this.googleVerification.verifyPurchase(
          receiptData,
          productId,
          false, // 非訂閱
        );

        if (!result.isValid) {
          this.logger.warn(`Google 收據驗證失敗: ${result.error}`);
          return false;
        }

        // 消耗型產品需要消耗
        if (!isNonConsumable) {
          const consumed = await this.googleVerification.consumePurchase(productId, receiptData);
          if (!consumed) {
            this.logger.error(`Google 消耗購買失敗: ${productId}`);
            // 消耗失敗仍然返回成功，因為用戶已經付款
            // 但記錄錯誤以便後續處理
            // 注意：這裡不返回 false，因為交易已經完成，用戶已付款
            // 後續可以通過排程任務重試消耗
          }
        }

        return true;
      }
    } catch (error) {
      this.logger.error(`收據驗證例外: ${error instanceof Error ? error.message : '未知錯誤'}`);
      return false;
    }
  }

  /**
   * 取得用戶購買歷史
   * 注意：不返回 receiptData 以保護敏感資料
   */
  async getPurchaseHistory(userId: string) {
    return this.prisma.purchase.findMany({
      where: { userId },
      orderBy: { purchasedAt: 'desc' },
      select: {
        id: true,
        productId: true,
        productType: true,
        platform: true,
        transactionId: true,
        tripId: true,
        daysGranted: true,
        purchasedAt: true,
        expiresAt: true,
        createdAt: true,
        // 排除 receiptData - 敏感資料不應返回給客戶端
        trip: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * 恢復購買（非消耗型）
   * 1. 先檢查本地資料庫中的購買記錄
   * 2. 驗證客戶端提供的收據並恢復有效的購買
   */
  async restorePurchases(userId: string, platform: PlatformDto, receiptDataList: string[]) {
    let adFreeRestored = false;
    let restoredCount = 0;
    const restoredProducts: string[] = [];

    // 1. 檢查本地資料庫中是否有去廣告的購買記錄
    const existingAdFreePurchase = await this.prisma.purchase.findFirst({
      where: {
        userId,
        productType: ProductType.NON_CONSUMABLE,
        productId: 'remove_ads_forever',
      },
    });

    if (existingAdFreePurchase) {
      // 確保用戶狀態已更新
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (user && !user.isAdFree) {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            isAdFree: true,
            adFreeSince: existingAdFreePurchase.purchasedAt,
          },
        });
        adFreeRestored = true;
        restoredCount++;
        restoredProducts.push('remove_ads_forever');
      }
    }

    // 2. 驗證客戶端提供的收據
    if (receiptDataList && receiptDataList.length > 0) {
      for (const receiptData of receiptDataList) {
        try {
          const restoreResult = await this.verifyAndRestoreReceipt(
            userId,
            platform,
            receiptData,
          );

          if (restoreResult.restored) {
            restoredCount++;
            if (restoreResult.productId) {
              restoredProducts.push(restoreResult.productId);
              if (restoreResult.productId === 'remove_ads_forever') {
                adFreeRestored = true;
              }
            }
          }
        } catch (error) {
          // 單一收據驗證失敗不應中斷整個恢復流程
          this.logger.warn(
            `恢復購買時收據驗證失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
          );
        }
      }
    }

    this.logger.log(
      `恢復購買完成: 平台=${platform}, 數量=${restoredCount}, 產品=${restoredProducts.join(', ') || '無'}`,
    );

    return {
      hasRestoredPurchases: restoredCount > 0,
      adFreeRestored,
      restoredCount,
      restoredProducts,
    };
  }

  /**
   * 驗證並恢復單一收據
   */
  private async verifyAndRestoreReceipt(
    userId: string,
    platform: PlatformDto,
    receiptData: string,
  ): Promise<{ restored: boolean; productId?: string }> {
    // 根據平台驗證收據並提取購買資訊
    let purchaseInfo: {
      productId: string;
      transactionId: string;
      isValid: boolean;
    } | null = null;

    try {
      if (platform === PlatformDto.IOS) {
        // Apple 收據驗證
        purchaseInfo = await this.appleVerification.verifyAndExtractPurchaseInfo(receiptData);
      } else {
        // Google 收據驗證
        purchaseInfo = await this.googleVerification.verifyAndExtractPurchaseInfo(receiptData);
      }
    } catch (error) {
      this.logger.warn(
        `收據驗證失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
      );
      return { restored: false };
    }

    if (!purchaseInfo || !purchaseInfo.isValid) {
      return { restored: false };
    }

    // 檢查產品是否為非消耗型
    const product = this.getProductDefinition(purchaseInfo.productId);
    if (!product || product.productType !== ProductType.NON_CONSUMABLE) {
      // 只恢復非消耗型產品
      return { restored: false };
    }

    // 檢查是否已有此交易記錄
    const existingPurchase = await this.prisma.purchase.findUnique({
      where: { transactionId: purchaseInfo.transactionId },
    });

    if (existingPurchase) {
      // 交易已存在，檢查是否屬於此用戶
      if (existingPurchase.userId === userId) {
        // 確保用戶狀態已更新
        if (product.productId === 'remove_ads_forever') {
          await this.prisma.user.update({
            where: { id: userId },
            data: {
              isAdFree: true,
              adFreeSince: existingPurchase.purchasedAt,
            },
          });
        }
        return { restored: true, productId: product.productId };
      }
      // 交易屬於其他用戶
      this.logger.warn('恢復購買時發現交易 ID 屬於其他用戶');
      return { restored: false };
    }

    // 建立新的購買記錄
    await this.prisma.$transaction(async (tx) => {
      await tx.purchase.create({
        data: {
          userId,
          productId: product.productId,
          productType: product.productType,
          platform: platform === PlatformDto.IOS
            ? PurchasePlatform.IOS
            : PurchasePlatform.ANDROID,
          receiptData,
          transactionId: purchaseInfo!.transactionId,
        },
      });

      // 更新用戶狀態
      if (product.productId === 'remove_ads_forever') {
        await tx.user.update({
          where: { id: userId },
          data: {
            isAdFree: true,
            adFreeSince: new Date(),
          },
        });
      }
    });

    this.logger.log(`成功恢復購買: 產品=${product.productId}, 交易=${purchaseInfo.transactionId}`);
    return { restored: true, productId: product.productId };
  }

  /**
   * 驗證用戶是否為旅程成員
   */
  async validateTripMembership(userId: string, tripId: string): Promise<void> {
    const membership = await this.prisma.tripMember.findUnique({
      where: {
        tripId_userId: {
          tripId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('您不是此旅程的成員');
    }
  }

  /**
   * 取得旅程進階狀態
   */
  async getTripPremiumStatus(tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        premiumExpiresAt: true,
      },
    });

    if (!trip) {
      throw new NotFoundException('旅程不存在');
    }

    const now = new Date();
    const isPremium = trip.premiumExpiresAt && trip.premiumExpiresAt > now;

    let remainingDays: number | undefined;
    if (isPremium && trip.premiumExpiresAt) {
      const diffTime = trip.premiumExpiresAt.getTime() - now.getTime();
      remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    return {
      isPremium: !!isPremium,
      expiresAt: trip.premiumExpiresAt,
      remainingDays,
    };
  }

  /**
   * 取得用戶去廣告狀態
   */
  async getAdFreeStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        isAdFree: true,
        adFreeSince: true,
      },
    });

    if (!user) {
      throw new NotFoundException('用戶不存在');
    }

    return {
      isAdFree: user.isAdFree,
      purchasedAt: user.adFreeSince,
    };
  }

  /**
   * 檢查旅程是否為進階版（供其他服務使用）
   */
  async isTripPremium(tripId: string): Promise<boolean> {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: { premiumExpiresAt: true },
    });

    if (!trip) return false;

    return trip.premiumExpiresAt ? trip.premiumExpiresAt > new Date() : false;
  }

  /**
   * 檢查用戶是否去廣告（供其他服務使用）
   */
  async isUserAdFree(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isAdFree: true },
    });

    return user?.isAdFree ?? false;
  }
}
