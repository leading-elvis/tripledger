import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SettlementService } from './settlement.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateSettlementDto } from './dto/settlement.dto';

@ApiTags('settlements')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SettlementController {
  constructor(private readonly settlementService: SettlementService) {}

  @Get('trips/:tripId/balances')
  @ApiOperation({ summary: '取得旅程成員餘額' })
  async getBalances(
    @Param('tripId') tripId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.settlementService.calculateBalances(tripId, user.id);
  }

  @Get('trips/:tripId/settlements/suggested')
  @ApiOperation({ summary: '取得建議的最佳化還款路徑' })
  async getSuggestedSettlements(
    @Param('tripId') tripId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.settlementService.calculateOptimizedSettlements(tripId, user.id);
  }

  @Get('trips/:tripId/settlements')
  @ApiOperation({ summary: '取得旅程的結算記錄' })
  async getSettlementsByTrip(
    @Param('tripId') tripId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.settlementService.getSettlementsByTrip(tripId, user.id);
  }

  @Get('trips/:tripId/settlements/pending')
  @ApiOperation({ summary: '取得旅程的待處理結算' })
  async getTripPendingSettlements(
    @Param('tripId') tripId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.settlementService.getTripPendingSettlements(tripId, user.id);
  }

  @Get('trips/:tripId/summary')
  @ApiOperation({ summary: '取得旅程結算總結' })
  async getTripSummary(
    @Param('tripId') tripId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.settlementService.getTripSummary(tripId, user.id);
  }

  @Post('settlements')
  @ApiOperation({ summary: '建立結算記錄' })
  async createSettlement(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateSettlementDto,
  ) {
    return this.settlementService.createSettlement(
      dto.tripId,
      dto.virtualPayerId ? null : user.id,
      dto.receiverId || null,
      dto.amount,
      user.id,
      dto.virtualPayerId,
      dto.virtualReceiverId,
    );
  }

  @Put('settlements/:id/confirm')
  @ApiOperation({ summary: '確認結算（收款方確認）' })
  async confirmSettlement(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.settlementService.confirmSettlement(id, user.id);
  }

  @Put('settlements/:id/cancel')
  @ApiOperation({ summary: '取消結算' })
  async cancelSettlement(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.settlementService.cancelSettlement(id, user.id);
  }

  @Get('settlements/pending')
  @ApiOperation({ summary: '取得待確認的結算（需要我確認收款的）' })
  async getPendingSettlements(@CurrentUser() user: { id: string }) {
    return this.settlementService.getPendingSettlements(user.id);
  }
}
