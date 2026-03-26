import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TripsService } from '../trips/trips.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ExchangeRateService } from '../exchange-rate/exchange-rate.service';
import { BillCategory, SplitType, Currency } from '@prisma/client';
import { PaginationDto, createPaginatedResponse } from '../../common/dto/pagination.dto';

export { BillCategory, SplitType };

interface BillShareInput {
  userId?: string;
  virtualMemberId?: string;
  amount?: number;
  percentage?: number;
  shares?: number;
}

interface BillItemInput {
  name: string;
  amount: number;
  participantIds: string[];             // 真實用戶 ID
  virtualParticipantIds?: string[];     // 虛擬人員 ID
}

export interface CreateBillData {
  tripId: string;
  payerId?: string;                     // 真實用戶付款者（預設為當前用戶）
  virtualPayerId?: string;             // 虛擬人員付款者
  title: string;
  amount: number;
  category: BillCategory;
  splitType: SplitType;
  receiptImage?: string;
  note?: string;
  paidAt?: Date | string;
  currency?: Currency;
  participants: BillShareInput[];
  items?: BillItemInput[];
}

export interface UpdateBillData {
  title?: string;
  amount?: number;
  category?: BillCategory;
  splitType?: SplitType;
  receiptImage?: string;
  note?: string;
  paidAt?: Date | string;
  currency?: Currency;
  payerId?: string;
  virtualPayerId?: string;
  participants?: BillShareInput[];
  items?: BillItemInput[];
}

@Injectable()
export class BillsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tripsService: TripsService,
    private readonly notificationsService: NotificationsService,
    private readonly exchangeRateService: ExchangeRateService,
  ) {}

  /**
   * 建立帳單
   */
  async create(userId: string, data: CreateBillData) {
    // 驗證用戶是否為旅程成員並取得旅程資訊
    const trip = await this.tripsService.findById(data.tripId, userId);

    // 取得旅程虛擬人員
    const virtualMembers = trip.virtualMembers || [];

    // 驗證所有參與者都是旅程成員或虛擬人員
    this.validateParticipants(data.participants, trip.members, virtualMembers, data.items);

    // 如果帳單涉及虛擬人員，檢查 Premium 狀態
    if (this.hasVirtualParticipants(data.participants, data.virtualPayerId, data.items)) {
      const isPremium = trip.premiumExpiresAt && trip.premiumExpiresAt > new Date();
      if (!isPremium) {
        throw new ForbiddenException('使用虛擬人員需要旅程進階方案');
      }
    }

    // 取得用戶資訊
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    });

    // 判斷付款者
    const payerId = data.virtualPayerId ? null : (data.payerId || userId);
    const virtualPayerId = data.virtualPayerId || null;

    // 貨幣處理：使用帳單貨幣或旅程預設貨幣
    const billCurrency = data.currency || trip.defaultCurrency;
    const tripCurrency = trip.defaultCurrency;

    // 計算匯率和 baseAmount（如果幣別不同）
    let exchangeRate: number | null = null;
    let baseAmount: number | null = null;

    if (billCurrency !== tripCurrency) {
      const rateInfo = await this.exchangeRateService.getRate(billCurrency, tripCurrency);
      exchangeRate = rateInfo.rate;
      baseAmount = Math.round(data.amount * exchangeRate * 100) / 100;
    }

    // ITEMIZED 模式的特殊處理
    if (data.splitType === SplitType.ITEMIZED && data.items) {
      return this.createItemizedBill(userId, data, trip, user, {
        currency: billCurrency,
        exchangeRate,
        baseAmount,
      });
    }

    // 計算每個人的分攤金額
    const shares = this.calculateShares(
      data.amount,
      data.splitType,
      data.participants,
    );

    // 使用交易確保帳單數量檢查和建立的原子性，防止競態條件
    const FREE_BILL_LIMIT = 50;

    const bill = await this.prisma.$transaction(async (tx) => {
      // 在交易中重新查詢 premium 狀態，避免競態條件
      const currentTrip = await tx.trip.findUnique({
        where: { id: data.tripId },
        select: { premiumExpiresAt: true },
      });
      const isPremium = currentTrip?.premiumExpiresAt && currentTrip.premiumExpiresAt > new Date();

      // 在交易中檢查帳單數量限制
      if (!isPremium) {
        const billCount = await tx.bill.count({
          where: { tripId: data.tripId },
        });

        if (billCount >= FREE_BILL_LIMIT) {
          throw new ForbiddenException({
            statusCode: 403,
            error: 'Forbidden',
            code: 'BILL_LIMIT_REACHED',
            message: `免費版最多 ${FREE_BILL_LIMIT} 筆帳單，請升級進階版`,
          });
        }
      }

      // 在同一交易中建立帳單
      return tx.bill.create({
        data: {
          tripId: data.tripId,
          payerId,
          virtualPayerId,
          title: data.title,
          amount: data.amount,
          category: data.category,
          splitType: data.splitType,
          receiptImage: data.receiptImage,
          note: data.note,
          paidAt: data.paidAt || new Date(),
          currency: billCurrency,
          exchangeRate: exchangeRate,
          baseAmount: baseAmount,
          shares: {
            create: shares.map((share) => ({
              userId: share.userId || null,
              virtualMemberId: share.virtualMemberId || null,
              amount: share.amount,
            })),
          },
        },
        include: {
          payer: {
            select: { id: true, name: true, avatarUrl: true },
          },
          virtualPayer: {
            select: { id: true, name: true },
          },
          shares: {
            include: {
              user: {
                select: { id: true, name: true, avatarUrl: true },
              },
              virtualMember: {
                select: { id: true, name: true },
              },
            },
          },
        },
      });
    });

    // 發送通知給其他旅程成員（虛擬人員不會收到通知）
    const otherMemberIds = trip.members
      .map((m: { userId: string }) => m.userId)
      .filter((id: string) => id !== userId);

    if (otherMemberIds.length > 0) {
      await this.notificationsService.notifyBillCreated(
        {
          id: bill.id,
          title: bill.title,
          amount: Number(bill.amount),
          tripId: trip.id,
          tripName: trip.name,
          payerId: userId,
          payerName: user?.name || '未知用戶',
        },
        otherMemberIds,
      );
    }

    return bill;
  }

  /**
   * 建立細項分攤帳單
   */
  private async createItemizedBill(
    userId: string,
    data: CreateBillData,
    trip: { id: string; name: string; members: { userId: string }[] },
    user: { id: string; name: string } | null,
    currencyInfo: { currency: Currency; exchangeRate: number | null; baseAmount: number | null },
  ) {
    const items = data.items!;

    // 判斷付款者
    const payerId = data.virtualPayerId ? null : (data.payerId || userId);
    const virtualPayerId = data.virtualPayerId || null;

    // 驗證品項金額總和 = 帳單總額
    const itemsTotal = items.reduce((sum, item) => sum + item.amount, 0);
    if (Math.abs(itemsTotal - data.amount) > 0.01) {
      throw new BadRequestException('品項金額總和必須等於帳單金額');
    }

    // 驗證每個品項至少有一個參與者
    for (const item of items) {
      const totalParticipants = item.participantIds.length + (item.virtualParticipantIds?.length || 0);
      if (totalParticipants === 0) {
        throw new BadRequestException(`品項「${item.name}」至少需要一個參與者`);
      }
    }

    // 計算每人總分攤金額
    const shares = this.calculateItemizedShares(items);

    const bill = await this.prisma.bill.create({
      data: {
        tripId: data.tripId,
        payerId,
        virtualPayerId,
        title: data.title,
        amount: data.amount,
        category: data.category,
        splitType: data.splitType,
        receiptImage: data.receiptImage,
        note: data.note,
        paidAt: data.paidAt || new Date(),
        currency: currencyInfo.currency,
        exchangeRate: currencyInfo.exchangeRate,
        baseAmount: currencyInfo.baseAmount,
        shares: {
          create: shares.map((share) => ({
            userId: share.userId || null,
            virtualMemberId: share.virtualMemberId || null,
            amount: share.amount,
          })),
        },
        items: {
          create: items.map((item) => {
            const allParticipants = [
              ...item.participantIds.map((id) => ({ userId: id, virtualMemberId: null as string | null })),
              ...(item.virtualParticipantIds || []).map((id) => ({ userId: null as string | null, virtualMemberId: id })),
            ];
            const totalCount = allParticipants.length;
            return {
              name: item.name,
              amount: item.amount,
              shares: {
                create: allParticipants.map((p) => ({
                  userId: p.userId,
                  virtualMemberId: p.virtualMemberId,
                  amount: Math.round((item.amount / totalCount) * 100) / 100,
                })),
              },
            };
          }),
        },
      },
      include: {
        payer: {
          select: { id: true, name: true, avatarUrl: true },
        },
        virtualPayer: {
          select: { id: true, name: true },
        },
        shares: {
          include: {
            user: {
              select: { id: true, name: true, avatarUrl: true },
            },
            virtualMember: {
              select: { id: true, name: true },
            },
          },
        },
        items: {
          include: {
            shares: {
              include: {
                user: {
                  select: { id: true, name: true, avatarUrl: true },
                },
                virtualMember: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
    });

    // 發送通知給其他旅程成員
    const otherMemberIds = trip.members
      .map((m: { userId: string }) => m.userId)
      .filter((id: string) => id !== userId);

    if (otherMemberIds.length > 0) {
      await this.notificationsService.notifyBillCreated(
        {
          id: bill.id,
          title: bill.title,
          amount: Number(bill.amount),
          tripId: trip.id,
          tripName: trip.name,
          payerId: userId,
          payerName: user?.name || '未知用戶',
        },
        otherMemberIds,
      );
    }

    return bill;
  }

  /**
   * 計算細項分攤金額（支援虛擬人員）
   */
  private calculateItemizedShares(
    items: BillItemInput[],
  ): { userId?: string; virtualMemberId?: string; amount: number }[] {
    // 使用前綴區分真實用戶和虛擬人員
    const memberAmounts = new Map<string, { userId?: string; virtualMemberId?: string; amount: number }>();

    for (const item of items) {
      const allIds = [
        ...item.participantIds.map((id) => ({ key: `u_${id}`, userId: id, virtualMemberId: undefined as string | undefined })),
        ...(item.virtualParticipantIds || []).map((id) => ({ key: `vm_${id}`, userId: undefined as string | undefined, virtualMemberId: id })),
      ];
      const totalCount = allIds.length;
      const perPerson = item.amount / totalCount;

      for (const p of allIds) {
        const existing = memberAmounts.get(p.key);
        if (existing) {
          existing.amount += perPerson;
        } else {
          memberAmounts.set(p.key, {
            userId: p.userId,
            virtualMemberId: p.virtualMemberId,
            amount: perPerson,
          });
        }
      }
    }

    return Array.from(memberAmounts.values()).map((entry) => ({
      ...entry,
      amount: Math.round(entry.amount * 100) / 100,
    }));
  }

  /**
   * 取得旅程的所有帳單（支援分頁）
   */
  async findAllByTrip(tripId: string, userId: string, pagination?: PaginationDto) {
    // 驗證權限
    await this.tripsService.findById(tripId, userId);

    const limit = pagination?.limit ?? 20;
    const offset = pagination?.offset ?? 0;

    const [bills, total] = await Promise.all([
      this.prisma.bill.findMany({
        where: { tripId },
        include: {
          payer: {
            select: { id: true, name: true, avatarUrl: true },
          },
          virtualPayer: {
            select: { id: true, name: true },
          },
          shares: {
            include: {
              user: {
                select: { id: true, name: true, avatarUrl: true },
              },
              virtualMember: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: {
          paidAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      this.prisma.bill.count({ where: { tripId } }),
    ]);

    return createPaginatedResponse(bills, total, limit, offset);
  }

  /**
   * 取得帳單詳情
   */
  async findById(id: string, userId: string) {
    const bill = await this.prisma.bill.findUnique({
      where: { id },
      include: {
        trip: {
          include: {
            members: true,
          },
        },
        payer: {
          select: { id: true, name: true, avatarUrl: true },
        },
        virtualPayer: {
          select: { id: true, name: true },
        },
        shares: {
          include: {
            user: {
              select: { id: true, name: true, avatarUrl: true },
            },
            virtualMember: {
              select: { id: true, name: true },
            },
          },
        },
        items: {
          include: {
            shares: {
              include: {
                user: {
                  select: { id: true, name: true, avatarUrl: true },
                },
                virtualMember: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
    });

    if (!bill) {
      throw new NotFoundException('帳單不存在');
    }

    // 驗證用戶是否為旅程成員
    const isMember = bill.trip.members.some((m: { userId: string }) => m.userId === userId);
    if (!isMember) {
      throw new ForbiddenException('您不是此旅程的成員');
    }

    return bill;
  }

  /**
   * 更新帳單
   */
  async update(id: string, userId: string, data: UpdateBillData) {
    const bill = await this.findById(id, userId);

    // 只有付款人可以編輯帳單
    if (bill.payerId !== userId) {
      throw new ForbiddenException('只有付款人可以編輯帳單');
    }

    // 取得用戶資訊
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    });

    const splitType = data.splitType || bill.splitType;
    const amount = data.amount || Number(bill.amount);

    // 貨幣處理：計算匯率和 baseAmount
    const billCurrency = data.currency || bill.currency;
    const tripCurrency = bill.trip.defaultCurrency;
    let exchangeRate: number | null = null;
    let baseAmount: number | null = null;

    if (billCurrency !== tripCurrency) {
      const rateInfo = await this.exchangeRateService.getRate(billCurrency, tripCurrency);
      exchangeRate = rateInfo.rate;
      baseAmount = Math.round(amount * exchangeRate * 100) / 100;
    }

    // 處理付款者變更
    const updatePayerData: { payerId?: string | null; virtualPayerId?: string | null } = {};
    if (data.virtualPayerId) {
      updatePayerData.payerId = null;
      updatePayerData.virtualPayerId = data.virtualPayerId;
    } else if (data.payerId) {
      updatePayerData.payerId = data.payerId;
      updatePayerData.virtualPayerId = null;
    }

    // ITEMIZED 模式的特殊處理
    if (splitType === SplitType.ITEMIZED && data.items) {
      // 驗證品項金額總和
      const itemsTotal = data.items.reduce((sum, item) => sum + item.amount, 0);
      if (Math.abs(itemsTotal - amount) > 0.01) {
        throw new BadRequestException('品項金額總和必須等於帳單金額');
      }

      // 驗證每個品項至少有一個參與者
      for (const item of data.items) {
        const totalParticipants = item.participantIds.length + (item.virtualParticipantIds?.length || 0);
        if (totalParticipants === 0) {
          throw new BadRequestException(`品項「${item.name}」至少需要一個參與者`);
        }
      }

      // 計算每人總分攤金額
      const shares = this.calculateItemizedShares(data.items);

      // 使用交易確保資料一致性
      await this.prisma.$transaction(async (tx) => {
        await tx.billShare.deleteMany({ where: { billId: id } });
        await tx.billItem.deleteMany({ where: { billId: id } });

        await tx.billShare.createMany({
          data: shares.map((share) => ({
            billId: id,
            userId: share.userId || null,
            virtualMemberId: share.virtualMemberId || null,
            amount: share.amount,
          })),
        });

        for (const item of data.items!) {
          const allParticipants = [
            ...item.participantIds.map((pid) => ({ userId: pid, virtualMemberId: null as string | null })),
            ...(item.virtualParticipantIds || []).map((vmid) => ({ userId: null as string | null, virtualMemberId: vmid })),
          ];
          const totalCount = allParticipants.length;
          await tx.billItem.create({
            data: {
              billId: id,
              name: item.name,
              amount: item.amount,
              shares: {
                create: allParticipants.map((p) => ({
                  userId: p.userId,
                  virtualMemberId: p.virtualMemberId,
                  amount: Math.round((item.amount / totalCount) * 100) / 100,
                })),
              },
            },
          });
        }
      });
    } else if (data.participants && (data.amount || data.splitType)) {
      // 非 ITEMIZED 模式
      const shares = this.calculateShares(amount, splitType, data.participants);

      await this.prisma.$transaction(async (tx) => {
        await tx.billShare.deleteMany({ where: { billId: id } });
        await tx.billItem.deleteMany({ where: { billId: id } });

        await tx.billShare.createMany({
          data: shares.map((share) => ({
            billId: id,
            userId: share.userId || null,
            virtualMemberId: share.virtualMemberId || null,
            amount: share.amount,
          })),
        });
      });
    }

    const updatedBill = await this.prisma.bill.update({
      where: { id },
      data: {
        title: data.title,
        amount: data.amount,
        category: data.category,
        splitType: data.splitType,
        receiptImage: data.receiptImage,
        note: data.note,
        paidAt: data.paidAt,
        currency: data.currency,
        exchangeRate: exchangeRate,
        baseAmount: baseAmount,
        ...updatePayerData,
      },
      include: {
        payer: {
          select: { id: true, name: true, avatarUrl: true },
        },
        virtualPayer: {
          select: { id: true, name: true },
        },
        shares: {
          include: {
            user: {
              select: { id: true, name: true, avatarUrl: true },
            },
            virtualMember: {
              select: { id: true, name: true },
            },
          },
        },
        items: {
          include: {
            shares: {
              include: {
                user: {
                  select: { id: true, name: true, avatarUrl: true },
                },
                virtualMember: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
    });

    // 發送通知給其他旅程成員
    const otherMemberIds = bill.trip.members
      .map((m: { userId: string }) => m.userId)
      .filter((memberId: string) => memberId !== userId);

    if (otherMemberIds.length > 0) {
      await this.notificationsService.notifyBillUpdated(
        {
          id: updatedBill.id,
          title: updatedBill.title,
          amount: Number(updatedBill.amount),
          tripId: bill.trip.id,
          tripName: bill.trip.name,
          payerId: userId,
          payerName: user?.name || '未知用戶',
        },
        userId,
        user?.name || '未知用戶',
        otherMemberIds,
      );
    }

    return updatedBill;
  }

  /**
   * 刪除帳單
   */
  async delete(id: string, userId: string) {
    const bill = await this.findById(id, userId);

    // 只有付款人可以刪除帳單
    if (bill.payerId !== userId) {
      throw new ForbiddenException('只有付款人可以刪除帳單');
    }

    // 取得用戶資訊
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    });

    // 儲存通知所需資訊（刪除前）
    const billTitle = bill.title;
    const tripId = bill.trip.id;
    const tripName = bill.trip.name;
    const otherMemberIds = bill.trip.members
      .map((m: { userId: string }) => m.userId)
      .filter((memberId: string) => memberId !== userId);

    const result = await this.prisma.bill.delete({
      where: { id },
    });

    // 發送通知給其他旅程成員
    if (otherMemberIds.length > 0) {
      await this.notificationsService.notifyBillDeleted(
        billTitle,
        tripId,
        tripName,
        userId,
        user?.name || '未知用戶',
        otherMemberIds,
      );
    }

    return result;
  }

  /**
   * 驗證所有參與者都是旅程成員或虛擬人員
   */
  private validateParticipants(
    participants: BillShareInput[],
    tripMembers: { userId: string }[],
    virtualMembers: { id: string }[],
    items?: BillItemInput[],
  ): void {
    const memberIds = new Set(tripMembers.map((m) => m.userId));
    const vmIds = new Set(virtualMembers.map((vm) => vm.id));

    // 驗證一般參與者
    for (const participant of participants) {
      if (participant.userId && !memberIds.has(participant.userId)) {
        throw new BadRequestException('部分參與者不是此旅程的成員');
      }
      if (participant.virtualMemberId && !vmIds.has(participant.virtualMemberId)) {
        throw new BadRequestException('部分虛擬人員不屬於此旅程');
      }
      if (!participant.userId && !participant.virtualMemberId) {
        throw new BadRequestException('參與者必須指定 userId 或 virtualMemberId');
      }
    }

    // 驗證細項模式的參與者
    if (items) {
      for (const item of items) {
        for (const participantId of item.participantIds) {
          if (!memberIds.has(participantId)) {
            throw new BadRequestException('部分參與者不是此旅程的成員');
          }
        }
        if (item.virtualParticipantIds) {
          for (const vmId of item.virtualParticipantIds) {
            if (!vmIds.has(vmId)) {
              throw new BadRequestException('部分虛擬人員不屬於此旅程');
            }
          }
        }
      }
    }
  }

  /**
   * 檢查參與者中是否包含虛擬人員
   */
  private hasVirtualParticipants(
    participants: BillShareInput[],
    virtualPayerId?: string,
    items?: BillItemInput[],
  ): boolean {
    if (virtualPayerId) return true;
    if (participants.some((p) => p.virtualMemberId)) return true;
    if (items?.some((item) => item.virtualParticipantIds && item.virtualParticipantIds.length > 0)) return true;
    return false;
  }

  /**
   * 計算分攤金額（支援真實用戶和虛擬人員）
   */
  private calculateShares(
    totalAmount: number,
    splitType: SplitType,
    participants: BillShareInput[],
  ): { userId?: string; virtualMemberId?: string; amount: number }[] {
    if (participants.length === 0) {
      throw new BadRequestException('至少需要一個參與者');
    }

    const mapParticipant = (p: BillShareInput, amount: number) => ({
      ...(p.userId ? { userId: p.userId } : {}),
      ...(p.virtualMemberId ? { virtualMemberId: p.virtualMemberId } : {}),
      amount,
    });

    switch (splitType) {
      case SplitType.EQUAL: {
        const perPerson = Math.round((totalAmount / participants.length) * 100) / 100;
        const remainder = totalAmount - perPerson * participants.length;

        return participants.map((p, index) =>
          mapParticipant(p, index === 0 ? perPerson + remainder : perPerson),
        );
      }

      case SplitType.EXACT: {
        const total = participants.reduce((sum, p) => sum + (p.amount || 0), 0);
        if (Math.abs(total - totalAmount) > 0.01) {
          throw new BadRequestException('分攤金額總和必須等於帳單金額');
        }
        return participants.map((p) => mapParticipant(p, p.amount || 0));
      }

      case SplitType.PERCENTAGE: {
        const totalPercentage = participants.reduce(
          (sum, p) => sum + (p.percentage || 0),
          0,
        );
        if (Math.abs(totalPercentage - 100) > 0.01) {
          throw new BadRequestException('百分比總和必須等於 100%');
        }
        return participants.map((p) =>
          mapParticipant(p, Math.round((totalAmount * (p.percentage || 0)) / 100 * 100) / 100),
        );
      }

      case SplitType.SHARES: {
        const totalShares = participants.reduce(
          (sum, p) => sum + (p.shares || 1),
          0,
        );
        const perShare = totalAmount / totalShares;
        return participants.map((p) =>
          mapParticipant(p, Math.round(perShare * (p.shares || 1) * 100) / 100),
        );
      }

      default:
        throw new BadRequestException('不支援的分攤方式');
    }
  }

  /**
   * 取得帳單統計（依分類）
   */
  async getStatsByCategory(tripId: string, userId: string) {
    await this.tripsService.findById(tripId, userId);

    const stats = await this.prisma.bill.groupBy({
      by: ['category'],
      where: { tripId },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    return stats.map((s: { category: string; _sum: { amount: unknown }; _count: { id: number } }) => ({
      category: s.category,
      total: s._sum.amount,
      count: s._count.id,
    }));
  }
}
