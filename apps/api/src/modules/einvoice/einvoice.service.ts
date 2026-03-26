import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BrandLookupService } from '../ocr/services/brand-lookup.service';
import { BillsService, CreateBillData } from '../bills/bills.service';
import { TripsService } from '../trips/trips.service';
import {
  parseEInvoiceQR,
  isEInvoiceQR,
  EInvoiceData,
} from './utils/qr-parser.util';
import { ConvertToBillDto, BatchConvertToBillDto } from './dto/convert-to-bill.dto';
import { BillCategory, SplitType, ImportSource } from '@prisma/client';

export interface ParsedInvoiceResult {
  invoice: EInvoiceData;
  brandName: string;
  suggestedCategory: BillCategory;
  isAlreadyImported: boolean;
  existingBillId?: string;
}

@Injectable()
export class EinvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly brandLookupService: BrandLookupService,
    private readonly billsService: BillsService,
    private readonly tripsService: TripsService,
  ) {}

  /**
   * 解析電子發票 QR Code
   */
  async parseQR(qrData: string, userId: string): Promise<ParsedInvoiceResult> {
    // 檢查是否為電子發票格式
    if (!isEInvoiceQR(qrData)) {
      throw new BadRequestException('無效的電子發票 QR Code 格式');
    }

    // 解析 QR Code
    const parseResult = parseEInvoiceQR(qrData);
    if (!parseResult.success || !parseResult.data) {
      throw new BadRequestException(parseResult.error || '解析電子發票失敗');
    }

    const invoice = parseResult.data;

    // 檢查是否已匯入
    const existingInvoice = await this.prisma.importedInvoice.findUnique({
      where: { invoiceNumber: invoice.invoiceNumber },
      include: { bill: true },
    });

    // 透過統編查詢品牌名稱
    const brandResult = await this.lookupBrandByTaxId(
      invoice.sellerTaxId,
      userId,
    );

    return {
      invoice,
      brandName: brandResult.brandName,
      suggestedCategory: brandResult.category || BillCategory.OTHER,
      isAlreadyImported: !!existingInvoice,
      existingBillId: existingInvoice?.billId || undefined,
    };
  }

  /**
   * 透過統編查詢品牌名稱
   */
  private async lookupBrandByTaxId(
    taxId: string,
    userId: string,
  ): Promise<{ brandName: string; category: BillCategory | null }> {
    // 先查詢企業對照表
    const mapping = await this.prisma.companyBrandMapping.findUnique({
      where: { taxId },
    });

    if (mapping) {
      return {
        brandName: mapping.brandName,
        category: mapping.category,
      };
    }

    // 若找不到，回傳統編作為預設名稱
    return {
      brandName: `商家(${taxId})`,
      category: null,
    };
  }

  /**
   * 儲存已解析的發票（尚未轉換為帳單）
   */
  async saveImportedInvoice(
    invoice: EInvoiceData,
    userId: string,
    brandName: string,
  ): Promise<{ id: string; invoiceNumber: string }> {
    // 檢查是否已存在
    const existing = await this.prisma.importedInvoice.findUnique({
      where: { invoiceNumber: invoice.invoiceNumber },
    });

    if (existing) {
      throw new ConflictException('此發票已匯入過');
    }

    const importedInvoice = await this.prisma.importedInvoice.create({
      data: {
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        sellerTaxId: invoice.sellerTaxId,
        sellerName: brandName,
        totalAmount: invoice.totalAmount,
        importedBy: userId,
        importSource: ImportSource.QR_SCAN,
        rawData: {
          salesAmount: invoice.salesAmount,
          buyerTaxId: invoice.buyerTaxId,
          randomCode: invoice.randomCode,
        },
      },
    });

    return {
      id: importedInvoice.id,
      invoiceNumber: importedInvoice.invoiceNumber,
    };
  }

  /**
   * 將發票轉換為帳單
   */
  async convertToBill(
    dto: ConvertToBillDto,
    userId: string,
  ): Promise<{ billId: string; title: string; amount: number }> {
    // 查詢已匯入的發票
    const importedInvoice = await this.prisma.importedInvoice.findUnique({
      where: { invoiceNumber: dto.invoiceNumber },
    });

    if (!importedInvoice) {
      throw new NotFoundException('找不到此發票，請先掃描發票 QR Code');
    }

    if (importedInvoice.billId) {
      throw new ConflictException('此發票已轉換為帳單');
    }

    // 驗證用戶是旅程成員並取得旅程資訊
    const trip = await this.tripsService.findById(dto.tripId, userId);

    // 決定參與者
    let participantIds = dto.participantIds;
    if (!participantIds || participantIds.length === 0) {
      // 預設為全員
      participantIds = trip.members.map((m: { userId: string }) => m.userId);
    }

    // 透過統編查詢分類
    const mapping = await this.prisma.companyBrandMapping.findUnique({
      where: { taxId: importedInvoice.sellerTaxId },
    });

    // 建立帳單資料
    const billData: CreateBillData = {
      tripId: dto.tripId,
      title: importedInvoice.sellerName,
      amount: importedInvoice.totalAmount,
      category: mapping?.category || BillCategory.OTHER,
      splitType: dto.splitType || SplitType.EQUAL,
      paidAt: importedInvoice.invoiceDate,
      note: `發票號碼: ${importedInvoice.invoiceNumber}`,
      participants: participantIds.map((id) => ({ userId: id })),
    };

    // 建立帳單（使用指定付款人或當前用戶）
    const payerId = dto.payerId || userId;
    const bill = await this.billsService.create(payerId, billData);

    // 更新發票關聯
    await this.prisma.importedInvoice.update({
      where: { id: importedInvoice.id },
      data: { billId: bill.id },
    });

    return {
      billId: bill.id,
      title: bill.title,
      amount: Number(bill.amount),
    };
  }

  /**
   * 批量將發票轉換為帳單
   */
  async batchConvertToBill(
    dto: BatchConvertToBillDto,
    userId: string,
  ): Promise<{ successCount: number; failedCount: number; bills: { billId: string; title: string; amount: number }[] }> {
    const results: { billId: string; title: string; amount: number }[] = [];
    let failedCount = 0;

    for (const invoiceNumber of dto.invoiceNumbers) {
      try {
        const result = await this.convertToBill(
          {
            tripId: dto.tripId,
            invoiceNumber,
            payerId: dto.payerId,
            splitType: dto.splitType,
            participantIds: dto.participantIds,
          },
          userId,
        );
        results.push(result);
      } catch {
        failedCount++;
      }
    }

    return {
      successCount: results.length,
      failedCount,
      bills: results,
    };
  }

  /**
   * 取得用戶已匯入的發票列表
   */
  async getImportedInvoices(
    userId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      onlyUnconverted?: boolean;
    },
  ) {
    const where: {
      importedBy: string;
      invoiceDate?: { gte?: Date; lte?: Date };
      billId?: null;
    } = {
      importedBy: userId,
    };

    if (options?.startDate || options?.endDate) {
      where.invoiceDate = {};
      if (options.startDate) {
        where.invoiceDate.gte = options.startDate;
      }
      if (options.endDate) {
        where.invoiceDate.lte = options.endDate;
      }
    }

    if (options?.onlyUnconverted) {
      where.billId = null;
    }

    return this.prisma.importedInvoice.findMany({
      where,
      orderBy: { invoiceDate: 'desc' },
      include: {
        bill: {
          select: {
            id: true,
            title: true,
            tripId: true,
          },
        },
      },
    });
  }

  /**
   * 刪除已匯入的發票
   */
  async deleteImportedInvoice(invoiceId: string, userId: string): Promise<void> {
    const invoice = await this.prisma.importedInvoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException('找不到此發票');
    }

    if (invoice.importedBy !== userId) {
      throw new BadRequestException('只能刪除自己匯入的發票');
    }

    if (invoice.billId) {
      throw new BadRequestException('此發票已轉換為帳單，無法刪除');
    }

    await this.prisma.importedInvoice.delete({
      where: { id: invoiceId },
    });
  }

  /**
   * 快速掃描並建立帳單（一步完成）
   */
  async quickScanAndCreateBill(
    qrData: string,
    tripId: string,
    userId: string,
    options?: {
      payerId?: string;
      splitType?: SplitType;
      participantIds?: string[];
    },
  ): Promise<{ billId: string; title: string; amount: number; invoiceNumber: string }> {
    // 解析發票
    const parsed = await this.parseQR(qrData, userId);

    if (parsed.isAlreadyImported) {
      throw new ConflictException('此發票已匯入過');
    }

    // 儲存發票
    await this.saveImportedInvoice(parsed.invoice, userId, parsed.brandName);

    // 轉換為帳單
    const bill = await this.convertToBill(
      {
        tripId,
        invoiceNumber: parsed.invoice.invoiceNumber,
        payerId: options?.payerId,
        splitType: options?.splitType,
        participantIds: options?.participantIds,
      },
      userId,
    );

    return {
      ...bill,
      invoiceNumber: parsed.invoice.invoiceNumber,
    };
  }
}
