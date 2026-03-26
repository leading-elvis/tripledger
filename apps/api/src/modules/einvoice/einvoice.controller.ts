import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EinvoiceService } from './einvoice.service';
import { ParseQrDto } from './dto/parse-qr.dto';
import { ConvertToBillDto, BatchConvertToBillDto } from './dto/convert-to-bill.dto';
import { SplitType } from '@prisma/client';

interface UserPayload {
  id: string;
  email?: string;
}

/**
 * 電子發票模組 Controller
 *
 * 提供電子發票 QR Code 解析、發票匯入、轉換帳單等功能
 */
@ApiTags('電子發票 (E-Invoice)')
@ApiBearerAuth()
@Controller('einvoice')
@UseGuards(JwtAuthGuard)
export class EinvoiceController {
  constructor(private readonly einvoiceService: EinvoiceService) {}

  /**
   * 解析電子發票 QR Code
   * 回傳發票資訊、品牌名稱、建議分類
   */
  @Post('parse-qr')
  @ApiOperation({ summary: '解析電子發票 QR Code' })
  async parseQR(
    @CurrentUser() user: UserPayload,
    @Body() dto: ParseQrDto,
  ) {
    const result = await this.einvoiceService.parseQR(dto.qrData, user.id);

    return {
      success: true,
      invoice: {
        invoiceNumber: result.invoice.invoiceNumber,
        date: result.invoice.invoiceDate.toISOString().split('T')[0],
        totalAmount: result.invoice.totalAmount,
        salesAmount: result.invoice.salesAmount,
        sellerTaxId: result.invoice.sellerTaxId,
        buyerTaxId: result.invoice.buyerTaxId,
      },
      brandName: result.brandName,
      suggestedCategory: result.suggestedCategory,
      isAlreadyImported: result.isAlreadyImported,
      existingBillId: result.existingBillId,
    };
  }

  /**
   * 儲存已解析的發票（尚未轉換為帳單）
   */
  @Post('save')
  @ApiOperation({ summary: '儲存已解析的發票' })
  async saveInvoice(
    @CurrentUser() user: UserPayload,
    @Body() dto: ParseQrDto,
  ) {
    // 先解析
    const parsed = await this.einvoiceService.parseQR(dto.qrData, user.id);

    if (parsed.isAlreadyImported) {
      return {
        success: false,
        message: '此發票已匯入過',
        existingBillId: parsed.existingBillId,
      };
    }

    // 儲存
    const saved = await this.einvoiceService.saveImportedInvoice(
      parsed.invoice,
      user.id,
      parsed.brandName,
    );

    return {
      success: true,
      invoiceId: saved.id,
      invoiceNumber: saved.invoiceNumber,
    };
  }

  /**
   * 將發票轉換為帳單
   */
  @Post('convert-to-bill')
  @ApiOperation({ summary: '將發票轉換為帳單' })
  async convertToBill(
    @CurrentUser() user: UserPayload,
    @Body() dto: ConvertToBillDto,
  ) {
    const result = await this.einvoiceService.convertToBill(dto, user.id);

    return {
      success: true,
      bill: result,
    };
  }

  /**
   * 批量將發票轉換為帳單
   */
  @Post('batch-convert')
  @ApiOperation({ summary: '批量將發票轉換為帳單' })
  async batchConvertToBill(
    @CurrentUser() user: UserPayload,
    @Body() dto: BatchConvertToBillDto,
  ) {
    const result = await this.einvoiceService.batchConvertToBill(dto, user.id);

    return {
      success: true,
      successCount: result.successCount,
      failedCount: result.failedCount,
      bills: result.bills,
    };
  }

  /**
   * 快速掃描並建立帳單（一步完成）
   */
  @Post('quick-scan')
  @ApiOperation({ summary: '快速掃描並建立帳單' })
  async quickScan(
    @CurrentUser() user: UserPayload,
    @Body()
    body: {
      qrData: string;
      tripId: string;
      payerId?: string;
      splitType?: SplitType;
      participantIds?: string[];
    },
  ) {
    const result = await this.einvoiceService.quickScanAndCreateBill(
      body.qrData,
      body.tripId,
      user.id,
      {
        payerId: body.payerId,
        splitType: body.splitType,
        participantIds: body.participantIds,
      },
    );

    return {
      success: true,
      billId: result.billId,
      title: result.title,
      amount: result.amount,
      invoiceNumber: result.invoiceNumber,
    };
  }

  /**
   * 取得已匯入的發票列表
   */
  @Get('list')
  @ApiOperation({ summary: '取得已匯入的發票列表' })
  @ApiQuery({ name: 'startDate', required: false, description: '起始日期 (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: '結束日期 (YYYY-MM-DD)' })
  @ApiQuery({ name: 'onlyUnconverted', required: false, description: '僅顯示未轉換的發票' })
  async getImportedInvoices(
    @CurrentUser() user: UserPayload,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('onlyUnconverted') onlyUnconverted?: string,
  ) {
    const invoices = await this.einvoiceService.getImportedInvoices(user.id, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      onlyUnconverted: onlyUnconverted === 'true',
    });

    return {
      success: true,
      invoices: invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        date: inv.invoiceDate.toISOString().split('T')[0],
        sellerName: inv.sellerName,
        sellerTaxId: inv.sellerTaxId,
        totalAmount: inv.totalAmount,
        isConverted: !!inv.billId,
        bill: inv.bill
          ? {
              id: inv.bill.id,
              title: inv.bill.title,
              tripId: inv.bill.tripId,
            }
          : null,
        createdAt: inv.createdAt,
      })),
      total: invoices.length,
    };
  }

  /**
   * 刪除已匯入的發票
   */
  @Delete(':invoiceId')
  @ApiOperation({ summary: '刪除已匯入的發票' })
  async deleteInvoice(
    @CurrentUser() user: UserPayload,
    @Param('invoiceId') invoiceId: string,
  ) {
    await this.einvoiceService.deleteImportedInvoice(invoiceId, user.id);

    return {
      success: true,
      message: '發票已刪除',
    };
  }
}
