import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TripsService } from '../trips/trips.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SettlementStatus, Currency } from '@prisma/client';

export { SettlementStatus };

export interface BalanceInfo {
  userId?: string;
  virtualMemberId?: string;
  isVirtual: boolean;
  userName: string;
  userAvatar?: string | null;
  paid: number;      // 已付金額
  owed: number;      // 應付金額
  balance: number;   // 餘額（正數=應收款，負數=應付款）
}

export interface OptimizedSettlement {
  from: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    isVirtual?: boolean;
    virtualMemberId?: string;
  };
  to: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    isVirtual?: boolean;
    virtualMemberId?: string;
  };
  amount: number;
  currency: Currency;
}

@Injectable()
export class SettlementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tripsService: TripsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * 計算旅程中每個成員的餘額（包含虛擬人員）
   */
  async calculateBalances(tripId: string, userId: string): Promise<BalanceInfo[]> {
    // 驗證權限
    const trip = await this.tripsService.findById(tripId, userId);

    // 取得所有帳單和分攤（包含虛擬人員）
    const bills = await this.prisma.bill.findMany({
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
    });

    // 建立成員餘額 Map（使用前綴區分真實用戶和虛擬人員）
    const balanceMap = new Map<string, BalanceInfo>();

    // 初始化所有真實成員
    for (const member of trip.members) {
      const memberUser = member.user as { id: string; name: string; avatarUrl?: string | null };
      balanceMap.set(`u_${memberUser.id}`, {
        userId: memberUser.id,
        isVirtual: false,
        userName: memberUser.name,
        userAvatar: memberUser.avatarUrl,
        paid: 0,
        owed: 0,
        balance: 0,
      });
    }

    // 初始化所有虛擬人員
    const virtualMembers = trip.virtualMembers || [];
    for (const vm of virtualMembers) {
      balanceMap.set(`vm_${vm.id}`, {
        virtualMemberId: vm.id,
        isVirtual: true,
        userName: vm.name,
        paid: 0,
        owed: 0,
        balance: 0,
      });
    }

    // 計算每個人的付款和應付金額
    for (const bill of bills) {
      const billAmount = bill.baseAmount ? Number(bill.baseAmount) : Number(bill.amount);

      // 處理付款者（真實用戶或虛擬人員）
      if (bill.payer) {
        const payerBalance = balanceMap.get(`u_${bill.payer.id}`);
        if (payerBalance) {
          payerBalance.paid += billAmount;
        }
      } else if (bill.virtualPayer) {
        const payerBalance = balanceMap.get(`vm_${bill.virtualPayer.id}`);
        if (payerBalance) {
          payerBalance.paid += billAmount;
        }
      }

      // 計算每個人的應付金額
      const exchangeRate = bill.exchangeRate ? Number(bill.exchangeRate) : 1;
      for (const share of bill.shares) {
        const shareAmount = Number(share.amount) * exchangeRate;

        if (share.user) {
          const shareBalance = balanceMap.get(`u_${share.user.id}`);
          if (shareBalance) {
            shareBalance.owed += shareAmount;
          }
        } else if (share.virtualMember) {
          const shareBalance = balanceMap.get(`vm_${share.virtualMember.id}`);
          if (shareBalance) {
            shareBalance.owed += shareAmount;
          }
        }
      }
    }

    // 計算餘額
    for (const balance of balanceMap.values()) {
      balance.balance = Math.round(balance.paid - balance.owed);
    }

    return Array.from(balanceMap.values());
  }

  /**
   * 計算最佳化還款路徑（最小化交易次數）
   * 使用貪婪演算法：每次讓最大債務人付給最大債權人
   */
  async calculateOptimizedSettlements(
    tripId: string,
    userId: string,
  ): Promise<OptimizedSettlement[]> {
    // 取得旅程資訊（包含預設貨幣）
    const trip = await this.tripsService.findById(tripId, userId);
    const tripCurrency = trip.defaultCurrency;

    const balances = await this.calculateBalances(tripId, userId);

    // 餘額容差值（TWD 為整數，使用 0.5 作為容差避免浮點誤差）
    const BALANCE_TOLERANCE = 0.5;

    // 分離債權人（balance > 0）和債務人（balance < 0）
    const creditors: { info: BalanceInfo; amount: number }[] = [];
    const debtors: { info: BalanceInfo; amount: number }[] = [];

    for (const balance of balances) {
      if (balance.balance > BALANCE_TOLERANCE) {
        creditors.push({ info: balance, amount: balance.balance });
      } else if (balance.balance < -BALANCE_TOLERANCE) {
        debtors.push({ info: balance, amount: Math.abs(balance.balance) });
      }
    }

    // 排序：金額大的在前（使用整數比較避免浮點問題）
    creditors.sort((a, b) => Math.round(b.amount) - Math.round(a.amount));
    debtors.sort((a, b) => Math.round(b.amount) - Math.round(a.amount));

    const settlements: OptimizedSettlement[] = [];

    // 貪婪配對
    while (creditors.length > 0 && debtors.length > 0) {
      const creditor = creditors[0];
      const debtor = debtors[0];

      const amount = Math.min(creditor.amount, debtor.amount);
      // TWD 為整數單位，直接四捨五入
      const roundedAmount = Math.round(amount);

      if (roundedAmount > 0) {
        settlements.push({
          from: {
            id: debtor.info.userId || debtor.info.virtualMemberId || '',
            name: debtor.info.userName,
            avatarUrl: debtor.info.userAvatar,
            isVirtual: debtor.info.isVirtual,
            virtualMemberId: debtor.info.virtualMemberId,
          },
          to: {
            id: creditor.info.userId || creditor.info.virtualMemberId || '',
            name: creditor.info.userName,
            avatarUrl: creditor.info.userAvatar,
            isVirtual: creditor.info.isVirtual,
            virtualMemberId: creditor.info.virtualMemberId,
          },
          amount: roundedAmount,
          currency: tripCurrency,
        });
      }

      creditor.amount -= amount;
      debtor.amount -= amount;

      // 移除已結清的人（使用容差值）
      if (creditor.amount < BALANCE_TOLERANCE) {
        creditors.shift();
      }
      if (debtor.amount < BALANCE_TOLERANCE) {
        debtors.shift();
      }

      // 重新排序（使用整數比較）
      creditors.sort((a, b) => Math.round(b.amount) - Math.round(a.amount));
      debtors.sort((a, b) => Math.round(b.amount) - Math.round(a.amount));
    }

    return settlements;
  }

  /**
   * 建立結算記錄（支援虛擬人員）
   * 使用交易確保原子性，防止重複建立和競態條件
   */
  async createSettlement(
    tripId: string,
    payerId: string | null,
    receiverId: string | null,
    amount: number,
    userId: string,
    virtualPayerId?: string,
    virtualReceiverId?: string,
  ) {
    const isVirtualPayer = !!virtualPayerId;
    const isVirtualReceiver = !!virtualReceiverId;

    // 驗證付款人身份
    if (!isVirtualPayer && payerId !== userId) {
      throw new ForbiddenException('只能建立自己的付款記錄');
    }

    // 驗證權限
    const trip = await this.tripsService.findById(tripId, userId);

    // 如果涉及虛擬人員，檢查 Premium 狀態
    if (isVirtualPayer || isVirtualReceiver) {
      const isPremium = trip.premiumExpiresAt && trip.premiumExpiresAt > new Date();
      if (!isPremium) {
        throw new ForbiddenException('涉及虛擬人員的結算需要旅程進階方案');
      }
    }

    // 使用交易確保原子性
    const { settlement, payerName, receiverName } = await this.prisma.$transaction(async (tx) => {
      // 驗證收款方（真實用戶或虛擬人員）
      let resolvedReceiverName = '未知用戶';
      if (receiverId) {
        const receiverMembership = await tx.tripMember.findUnique({
          where: { tripId_userId: { tripId, userId: receiverId } },
        });
        if (!receiverMembership) {
          throw new ForbiddenException('收款方必須是此旅程的成員');
        }
        const receiverUser = await tx.user.findUnique({
          where: { id: receiverId },
          select: { name: true },
        });
        resolvedReceiverName = receiverUser?.name || '未知用戶';
      } else if (virtualReceiverId) {
        const vm = await tx.virtualMember.findUnique({
          where: { id: virtualReceiverId },
        });
        if (!vm || vm.tripId !== tripId) {
          throw new ForbiddenException('虛擬收款方不屬於此旅程');
        }
        resolvedReceiverName = vm.name;
      }

      // 驗證付款方（虛擬人員）
      let resolvedPayerName = '未知用戶';
      if (virtualPayerId) {
        const vm = await tx.virtualMember.findUnique({
          where: { id: virtualPayerId },
        });
        if (!vm || vm.tripId !== tripId) {
          throw new ForbiddenException('虛擬付款方不屬於此旅程');
        }
        resolvedPayerName = vm.name;
      } else if (payerId) {
        const payerUser = await tx.user.findUnique({
          where: { id: payerId },
          select: { name: true },
        });
        resolvedPayerName = payerUser?.name || '未知用戶';
      }

      // 檢查是否已存在相同的待處理結算記錄
      const existingSettlement = await tx.settlement.findFirst({
        where: {
          tripId,
          payerId: payerId || null,
          receiverId: receiverId || null,
          virtualPayerId: virtualPayerId || null,
          virtualReceiverId: virtualReceiverId || null,
          status: SettlementStatus.PENDING,
        },
      });

      if (existingSettlement) {
        throw new BadRequestException('已有待處理的結算記錄，請先確認或取消後再建立新的');
      }

      const newSettlement = await tx.settlement.create({
        data: {
          tripId,
          payerId: payerId || null,
          receiverId: receiverId || null,
          virtualPayerId: virtualPayerId || null,
          virtualReceiverId: virtualReceiverId || null,
          amount,
          currency: trip.defaultCurrency,
          status: SettlementStatus.PENDING,
        },
        include: {
          payer: {
            select: { id: true, name: true, avatarUrl: true },
          },
          receiver: {
            select: { id: true, name: true, avatarUrl: true },
          },
          virtualPayer: {
            select: { id: true, name: true },
          },
          virtualReceiver: {
            select: { id: true, name: true },
          },
        },
      });

      return {
        settlement: newSettlement,
        payerName: resolvedPayerName,
        receiverName: resolvedReceiverName,
      };
    });

    // 發送通知給收款方（僅真實用戶，虛擬人員不會收到通知）
    if (receiverId) {
      await this.notificationsService.notifySettlementCreated({
        id: settlement.id,
        tripId: trip.id,
        tripName: trip.name,
        payerId: payerId || userId,
        payerName,
        receiverId,
        receiverName,
        amount,
      });
    }

    return settlement;
  }

  /**
   * 確認結算（收款方確認，或任何真實成員可代虛擬人員確認）
   * 使用交易確保原子性
   */
  async confirmSettlement(id: string, userId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const settlement = await tx.settlement.findUnique({
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
          receiver: {
            select: { id: true, name: true, avatarUrl: true },
          },
          virtualPayer: {
            select: { id: true, name: true },
          },
          virtualReceiver: {
            select: { id: true, name: true },
          },
        },
      });

      if (!settlement) {
        throw new NotFoundException('結算記錄不存在');
      }

      // 驗證用戶權限
      if (settlement.virtualReceiverId) {
        // 虛擬人員收款方：任何真實成員都可代為確認
        const isMember = settlement.trip.members.some(
          (m: { userId: string }) => m.userId === userId,
        );
        if (!isMember) {
          throw new ForbiddenException('您不是此旅程的成員');
        }
      } else if (settlement.receiverId !== userId) {
        throw new ForbiddenException('只有收款方可以確認結算');
      }

      if (settlement.status !== SettlementStatus.PENDING) {
        throw new BadRequestException('此結算記錄已處理');
      }

      const updatedSettlement = await tx.settlement.update({
        where: { id },
        data: {
          status: SettlementStatus.CONFIRMED,
          settledAt: new Date(),
        },
        include: {
          payer: {
            select: { id: true, name: true, avatarUrl: true },
          },
          receiver: {
            select: { id: true, name: true, avatarUrl: true },
          },
          virtualPayer: {
            select: { id: true, name: true },
          },
          virtualReceiver: {
            select: { id: true, name: true },
          },
        },
      });

      return { settlement, updatedSettlement };
    });

    // 發送通知給付款方（僅真實用戶）
    if (result.settlement.payerId && result.settlement.receiverId) {
      await this.notificationsService.notifySettlementConfirmed({
        id: result.settlement.id,
        tripId: result.settlement.trip.id,
        tripName: result.settlement.trip.name,
        payerId: result.settlement.payerId,
        payerName: result.settlement.payer?.name ?? '已刪除用戶',
        receiverId: result.settlement.receiverId,
        receiverName: result.settlement.receiver?.name ?? '已刪除用戶',
        amount: Number(result.settlement.amount),
      });
    }

    return result.updatedSettlement;
  }

  /**
   * 取消結算（付款方/收款方可取消，虛擬人員由任何真實成員代為取消）
   * 使用原子操作避免競態條件
   */
  async cancelSettlement(id: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const settlement = await tx.settlement.findUnique({
        where: { id },
        include: {
          trip: {
            include: { members: true },
          },
        },
      });

      if (!settlement) {
        throw new NotFoundException('結算記錄不存在');
      }

      // 權限檢查
      const isRealParticipant = settlement.payerId === userId || settlement.receiverId === userId;
      const hasVirtualParticipant = !!settlement.virtualPayerId || !!settlement.virtualReceiverId;

      if (!isRealParticipant) {
        if (hasVirtualParticipant) {
          // 涉及虛擬人員：任何真實成員都可代為取消
          const isMember = settlement.trip.members.some(
            (m: { userId: string }) => m.userId === userId,
          );
          if (!isMember) {
            throw new ForbiddenException('您沒有取消此結算的權限');
          }
        } else {
          throw new ForbiddenException('您沒有取消此結算的權限');
        }
      }

      if (settlement.status === SettlementStatus.CONFIRMED) {
        throw new BadRequestException('已確認的結算無法取消');
      }

      if (settlement.status === SettlementStatus.CANCELLED) {
        throw new BadRequestException('此結算已取消');
      }

      return tx.settlement.update({
        where: { id },
        data: {
          status: SettlementStatus.CANCELLED,
        },
      });
    });
  }

  /**
   * 取得旅程的結算記錄
   */
  async getSettlementsByTrip(tripId: string, userId: string) {
    await this.tripsService.findById(tripId, userId);

    return this.prisma.settlement.findMany({
      where: { tripId },
      include: {
        payer: {
          select: { id: true, name: true, avatarUrl: true },
        },
        receiver: {
          select: { id: true, name: true, avatarUrl: true },
        },
        virtualPayer: {
          select: { id: true, name: true },
        },
        virtualReceiver: {
          select: { id: true, name: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * 取得用戶待處理的結算（需要確認收款的）
   */
  async getPendingSettlements(userId: string) {
    return this.prisma.settlement.findMany({
      where: {
        receiverId: userId,
        status: SettlementStatus.PENDING,
      },
      include: {
        trip: {
          select: { id: true, name: true },
        },
        payer: {
          select: { id: true, name: true, avatarUrl: true },
        },
        virtualPayer: {
          select: { id: true, name: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * 取得特定旅程的待處理結算
   */
  async getTripPendingSettlements(tripId: string, userId: string) {
    await this.tripsService.findById(tripId, userId);

    return this.prisma.settlement.findMany({
      where: {
        tripId,
        status: SettlementStatus.PENDING,
      },
      include: {
        trip: {
          select: { id: true, name: true },
        },
        payer: {
          select: { id: true, name: true, avatarUrl: true },
        },
        receiver: {
          select: { id: true, name: true, avatarUrl: true },
        },
        virtualPayer: {
          select: { id: true, name: true },
        },
        virtualReceiver: {
          select: { id: true, name: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * 取得旅程總結
   */
  async getTripSummary(tripId: string, userId: string) {
    const balances = await this.calculateBalances(tripId, userId);
    const optimizedSettlements = await this.calculateOptimizedSettlements(
      tripId,
      userId,
    );

    // 取得已確認的結算
    const confirmedSettlements = await this.prisma.settlement.findMany({
      where: {
        tripId,
        status: SettlementStatus.CONFIRMED,
      },
    });

    // 計算總花費（使用旅程預設貨幣）
    const bills = await this.prisma.bill.findMany({
      where: { tripId },
    });
    const totalSpent = bills.reduce(
      (sum, bill) => {
        // 使用 baseAmount（已轉換金額）或 amount（同幣種時）
        const billAmount = bill.baseAmount ? Number(bill.baseAmount) : Number(bill.amount);
        return sum + billAmount;
      },
      0,
    );

    return {
      totalSpent,
      billCount: bills.length,
      memberCount: balances.length,
      balances,
      suggestedSettlements: optimizedSettlements,
      settledAmount: confirmedSettlements.reduce(
        (sum: number, s: { amount: unknown }) => sum + Number(s.amount),
        0,
      ),
    };
  }
}
