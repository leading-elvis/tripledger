import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PurchaseService, PRODUCTS } from './purchase.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@prisma/client';
import {
  VerifyPurchaseDto,
  RestorePurchaseDto,
  PurchaseResponseDto,
  TripPremiumStatusDto,
  AdFreeStatusDto,
  RestoreResponseDto,
} from './dto/purchase.dto';

@ApiTags('內購 (Purchase)')
@Controller('purchase')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  /**
   * 取得可購買的產品清單
   */
  @Get('products')
  @ApiOperation({ summary: '取得產品清單' })
  @ApiResponse({ status: 200, description: '產品清單' })
  getProducts() {
    return PRODUCTS.map((p) => ({
      productId: p.productId,
      productType: p.productType,
      displayName: p.displayName,
      daysGranted: p.daysGranted,
    }));
  }

  /**
   * 驗證購買收據
   * Rate Limit: 每分鐘最多 10 次，防止收據驗證濫用
   */
  @Post('verify')
  @Throttle({ short: { ttl: 10000, limit: 5 }, default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: '驗證購買收據' })
  @ApiResponse({ status: 200, description: '購買成功', type: PurchaseResponseDto })
  @ApiResponse({ status: 400, description: '驗證失敗' })
  async verifyPurchase(
    @CurrentUser() user: User,
    @Body() dto: VerifyPurchaseDto,
  ): Promise<PurchaseResponseDto> {
    const purchase = await this.purchaseService.verifyAndRecordPurchase(user.id, dto);

    return {
      id: purchase.id,
      productId: purchase.productId,
      productType: purchase.productType,
      tripId: purchase.tripId ?? undefined,
      daysGranted: purchase.daysGranted ?? undefined,
      purchasedAt: purchase.purchasedAt,
      expiresAt: purchase.expiresAt ?? undefined,
    };
  }

  /**
   * 取得購買歷史
   */
  @Get('history')
  @ApiOperation({ summary: '取得購買歷史' })
  @ApiResponse({ status: 200, description: '購買歷史列表' })
  async getPurchaseHistory(@CurrentUser() user: User) {
    return this.purchaseService.getPurchaseHistory(user.id);
  }

  /**
   * 恢復購買（非消耗型）
   * Rate Limit: 每分鐘最多 5 次，恢復購買不需要頻繁操作
   */
  @Post('restore')
  @Throttle({ short: { ttl: 10000, limit: 3 }, default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: '恢復購買' })
  @ApiResponse({ status: 200, description: '恢復結果', type: RestoreResponseDto })
  async restorePurchase(
    @CurrentUser() user: User,
    @Body() dto: RestorePurchaseDto,
  ): Promise<RestoreResponseDto> {
    return this.purchaseService.restorePurchases(
      user.id,
      dto.platform,
      dto.receiptDataList,
    );
  }

  /**
   * 取得旅程進階狀態
   * 需驗證用戶為旅程成員
   */
  @Get('trip/:tripId/status')
  @ApiOperation({ summary: '取得旅程進階狀態' })
  @ApiResponse({ status: 200, description: '進階狀態', type: TripPremiumStatusDto })
  @ApiResponse({ status: 403, description: '非旅程成員' })
  @ApiResponse({ status: 404, description: '旅程不存在' })
  async getTripPremiumStatus(
    @CurrentUser() user: User,
    @Param('tripId') tripId: string,
  ): Promise<TripPremiumStatusDto> {
    // 驗證用戶是否為旅程成員
    await this.purchaseService.validateTripMembership(user.id, tripId);
    return this.purchaseService.getTripPremiumStatus(tripId);
  }

  /**
   * 取得用戶去廣告狀態
   */
  @Get('ad-free-status')
  @ApiOperation({ summary: '取得去廣告狀態' })
  @ApiResponse({ status: 200, description: '去廣告狀態', type: AdFreeStatusDto })
  async getAdFreeStatus(@CurrentUser() user: User): Promise<AdFreeStatusDto> {
    return this.purchaseService.getAdFreeStatus(user.id);
  }
}
