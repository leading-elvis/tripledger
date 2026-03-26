import { Module } from '@nestjs/common';
import { EinvoiceController } from './einvoice.controller';
import { EinvoiceService } from './einvoice.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { OcrModule } from '../ocr/ocr.module';
import { BillsModule } from '../bills/bills.module';
import { TripsModule } from '../trips/trips.module';

/**
 * 電子發票模組
 *
 * 提供台灣電子發票 QR Code 解析、發票匯入、轉換帳單等功能
 * - 解析電子發票左側 QR Code
 * - 整合企業品牌對照表
 * - 支援發票轉換為帳單
 */
@Module({
  imports: [PrismaModule, OcrModule, BillsModule, TripsModule],
  controllers: [EinvoiceController],
  providers: [EinvoiceService],
  exports: [EinvoiceService],
})
export class EinvoiceModule {}
