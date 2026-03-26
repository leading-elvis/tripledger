import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MemberRole, Currency } from '@prisma/client';

export { MemberRole };

export interface CreateTripData {
  name: string;
  description?: string;
  coverImage?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  defaultCurrency?: Currency;
}

export interface UpdateTripData {
  name?: string;
  description?: string;
  coverImage?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  defaultCurrency?: Currency;
}

@Injectable()
export class TripsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * 建立新旅程
   */
  async create(userId: string, data: CreateTripData) {
    return this.prisma.trip.create({
      data: {
        ...data,
        members: {
          create: {
            userId,
            role: MemberRole.OWNER,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * 取得用戶所有旅程
   */
  async findAllByUser(userId: string) {
    return this.prisma.trip.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            bills: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * 取得旅程詳情
   */
  async findById(id: string, userId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
        virtualMembers: {
          where: { mergedTo: null },
          orderBy: { createdAt: 'asc' },
        },
        bills: {
          orderBy: {
            paidAt: 'desc',
          },
          include: {
            payer: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
            virtualPayer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!trip) {
      throw new NotFoundException('旅程不存在');
    }

    // 檢查用戶是否為成員
    const isMember = trip.members.some((m: { userId: string }) => m.userId === userId);
    if (!isMember) {
      throw new ForbiddenException('您不是此旅程的成員');
    }

    return trip;
  }

  /**
   * 更新旅程
   */
  async update(id: string, userId: string, data: UpdateTripData) {
    const trip = await this.findById(id, userId);

    // 檢查權限（只有 OWNER 和 ADMIN 可以編輯）
    const member = trip.members.find((m: { userId: string; role: string }) => m.userId === userId);
    if (member?.role === MemberRole.MEMBER) {
      throw new ForbiddenException('您沒有編輯此旅程的權限');
    }

    return this.prisma.trip.update({
      where: { id },
      data,
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * 刪除旅程
   */
  async delete(id: string, userId: string) {
    const trip = await this.findById(id, userId);

    // 只有 OWNER 可以刪除
    const member = trip.members.find((m: { userId: string; role: string }) => m.userId === userId);
    if (member?.role !== MemberRole.OWNER) {
      throw new ForbiddenException('只有旅程建立者可以刪除旅程');
    }

    return this.prisma.trip.delete({
      where: { id },
    });
  }

  /**
   * 透過邀請碼加入旅程
   */
  async joinByInviteCode(inviteCode: string, userId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { inviteCode },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!trip) {
      throw new NotFoundException('無效的邀請碼');
    }

    // 檢查是否已經是成員
    const existingMember = trip.members.find((m: { userId: string }) => m.userId === userId);
    if (existingMember) {
      throw new BadRequestException('您已經是此旅程的成員');
    }

    // 取得新成員資訊
    const newUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    });

    // 儲存現有成員 ID（用於發送通知）
    const existingMemberIds = trip.members.map((m) => m.userId);

    // 使用交易確保成員數量檢查和加入的原子性，防止競態條件
    const FREE_MEMBER_LIMIT = 5;

    await this.prisma.$transaction(async (tx) => {
      // 在交易中重新查詢 premium 狀態，避免競態條件
      const currentTrip = await tx.trip.findUnique({
        where: { id: trip.id },
        select: { premiumExpiresAt: true },
      });
      const isPremium = currentTrip?.premiumExpiresAt && currentTrip.premiumExpiresAt > new Date();

      // 在交易中重新檢查成員數量（使用最新資料）
      if (!isPremium) {
        const currentMemberCount = await tx.tripMember.count({
          where: { tripId: trip.id },
        });

        if (currentMemberCount >= FREE_MEMBER_LIMIT) {
          throw new ForbiddenException({
            statusCode: 403,
            error: 'Forbidden',
            code: 'MEMBER_LIMIT_REACHED',
            message: `免費版最多 ${FREE_MEMBER_LIMIT} 位成員，請升級進階版`,
          });
        }
      }

      // 在同一交易中加入旅程
      await tx.tripMember.create({
        data: {
          tripId: trip.id,
          userId,
          role: MemberRole.MEMBER,
        },
      });
    });

    // 發送通知給現有成員
    if (existingMemberIds.length > 0 && newUser) {
      await this.notificationsService.notifyMemberJoined(
        { id: trip.id, name: trip.name },
        { id: newUser.id, name: newUser.name },
        existingMemberIds,
      );
    }

    return this.findById(trip.id, userId);
  }

  /**
   * 取得旅程成員
   */
  async getMembers(tripId: string, userId: string) {
    await this.findById(tripId, userId); // 驗證權限

    return this.prisma.tripMember.findMany({
      where: { tripId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  /**
   * 移除成員
   */
  async removeMember(tripId: string, memberId: string, userId: string) {
    const trip = await this.findById(tripId, userId);

    // 檢查權限
    const currentMember = trip.members.find((m: { userId: string; role: string }) => m.userId === userId);
    if (currentMember?.role === MemberRole.MEMBER) {
      throw new ForbiddenException('您沒有移除成員的權限');
    }

    // 不能移除 OWNER
    const targetMember = trip.members.find((m: { userId: string; role: string; user?: { id: string; name: string } }) => m.userId === memberId);
    if (targetMember?.role === MemberRole.OWNER) {
      throw new ForbiddenException('無法移除旅程建立者');
    }

    // 取得移除者和被移除者資訊
    const [remover, removedUser] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true },
      }),
      this.prisma.user.findUnique({
        where: { id: memberId },
        select: { id: true, name: true },
      }),
    ]);

    const result = await this.prisma.tripMember.delete({
      where: {
        tripId_userId: {
          tripId,
          userId: memberId,
        },
      },
    });

    // 發送通知給被移除的成員
    if (removedUser && remover) {
      await this.notificationsService.notifyMemberRemoved(
        { id: trip.id, name: trip.name },
        { id: removedUser.id, name: removedUser.name },
        remover.id,
        remover.name,
      );
    }

    return result;
  }

  /**
   * 離開旅程
   */
  async leave(tripId: string, userId: string) {
    const trip = await this.findById(tripId, userId);

    // OWNER 不能離開（必須先轉讓或刪除旅程）
    const member = trip.members.find((m: { userId: string; role: string }) => m.userId === userId);
    if (member?.role === MemberRole.OWNER) {
      throw new ForbiddenException('旅程建立者無法離開，請先刪除旅程或轉讓擁有權');
    }

    // 取得離開的成員資訊
    const leftUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    });

    // 計算剩餘成員 ID（排除離開者）
    const remainingMemberIds = trip.members
      .map((m: { userId: string }) => m.userId)
      .filter((id: string) => id !== userId);

    const result = await this.prisma.tripMember.delete({
      where: {
        tripId_userId: {
          tripId,
          userId,
        },
      },
    });

    // 發送通知給剩餘成員
    if (remainingMemberIds.length > 0 && leftUser) {
      await this.notificationsService.notifyMemberLeft(
        { id: trip.id, name: trip.name },
        { id: leftUser.id, name: leftUser.name },
        remainingMemberIds,
      );
    }

    return result;
  }

  /**
   * 重新產生邀請碼
   */
  async regenerateInviteCode(tripId: string, userId: string) {
    const trip = await this.findById(tripId, userId);

    // 檢查權限
    const member = trip.members.find((m: { userId: string; role: string }) => m.userId === userId);
    if (member?.role === MemberRole.MEMBER) {
      throw new ForbiddenException('您沒有重新產生邀請碼的權限');
    }

    return this.prisma.trip.update({
      where: { id: tripId },
      data: {
        inviteCode: crypto.randomUUID(),
      },
    });
  }

  /**
   * 更新成員暱稱
   * @param tripId 旅程 ID
   * @param targetUserId 要更新的成員的 User ID
   * @param userId 當前用戶 ID
   * @param nickname 新暱稱
   */
  async updateMemberNickname(
    tripId: string,
    targetUserId: string,
    userId: string,
    nickname: string,
  ) {
    const trip = await this.findById(tripId, userId);

    // 檢查權限：只有 OWNER 或 ADMIN 可以更新其他成員的暱稱，成員可以更新自己的暱稱
    const currentMember = trip.members.find(
      (m: { userId: string }) => m.userId === userId,
    );
    const targetMember = trip.members.find(
      (m: { userId: string }) => m.userId === targetUserId,
    );

    if (!targetMember) {
      throw new NotFoundException('成員不存在');
    }

    const isSelf = targetUserId === userId;
    const hasPermission =
      currentMember?.role === MemberRole.OWNER ||
      currentMember?.role === MemberRole.ADMIN;

    if (!isSelf && !hasPermission) {
      throw new ForbiddenException('您沒有更新此成員暱稱的權限');
    }

    // 使用 tripId_userId 複合唯一鍵確保只更新屬於此旅程的成員
    return this.prisma.tripMember.update({
      where: {
        tripId_userId: {
          tripId,
          userId: targetUserId,
        },
      },
      data: { nickname },
    });
  }

  /**
   * 更新成員角色
   * @param tripId 旅程 ID
   * @param targetUserId 要更新的成員的 User ID
   * @param userId 當前用戶 ID
   * @param role 新角色
   */
  async updateMemberRole(
    tripId: string,
    targetUserId: string,
    userId: string,
    role: MemberRole,
  ) {
    const trip = await this.findById(tripId, userId);

    // 檢查權限：只有 OWNER 可以更新角色
    const currentMember = trip.members.find(
      (m: { userId: string }) => m.userId === userId,
    );
    const targetMember = trip.members.find(
      (m: { userId: string }) => m.userId === targetUserId,
    );

    if (!targetMember) {
      throw new NotFoundException('成員不存在');
    }

    if (currentMember?.role !== MemberRole.OWNER) {
      throw new ForbiddenException('只有旅程擁有者可以更改成員角色');
    }

    // 不能將自己降級或更改擁有者的角色
    if (targetUserId === userId) {
      throw new ForbiddenException('不能更改自己的角色');
    }

    // 不能將其他人設為 OWNER
    if (role === MemberRole.OWNER) {
      throw new ForbiddenException('不能將成員設為擁有者');
    }

    // 使用 tripId_userId 複合唯一鍵確保只更新屬於此旅程的成員
    return this.prisma.tripMember.update({
      where: {
        tripId_userId: {
          tripId,
          userId: targetUserId,
        },
      },
      data: { role },
    });
  }

  // ============================================
  // 虛擬人員管理
  // ============================================

  private readonly FREE_VIRTUAL_MEMBER_LIMIT = 5;

  /**
   * 檢查旅程是否有有效的進階方案
   */
  private isTripPremium(premiumExpiresAt: Date | null): boolean {
    return !!premiumExpiresAt && premiumExpiresAt > new Date();
  }

  /**
   * 建立虛擬人員
   */
  async createVirtualMember(tripId: string, userId: string, name: string) {
    const trip = await this.findById(tripId, userId);

    // 檢查 Premium 狀態
    if (!this.isTripPremium(trip.premiumExpiresAt)) {
      throw new ForbiddenException('此功能需要旅程進階方案');
    }

    // 檢查權限
    const member = trip.members.find((m: { userId: string; role: string }) => m.userId === userId);
    if (member?.role === MemberRole.MEMBER) {
      throw new ForbiddenException('您沒有新增虛擬人員的權限');
    }

    // 檢查虛擬人員數量上限
    const vmCount = await this.prisma.virtualMember.count({
      where: { tripId, mergedTo: null },
    });
    if (vmCount >= this.FREE_VIRTUAL_MEMBER_LIMIT) {
      throw new ForbiddenException(
        `虛擬人員最多 ${this.FREE_VIRTUAL_MEMBER_LIMIT} 位`,
      );
    }

    return this.prisma.virtualMember.create({
      data: {
        tripId,
        name,
        createdBy: userId,
      },
    });
  }

  /**
   * 取得旅程虛擬人員列表
   */
  async getVirtualMembers(tripId: string, userId: string) {
    await this.findById(tripId, userId); // 驗證權限

    return this.prisma.virtualMember.findMany({
      where: { tripId, mergedTo: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * 更新虛擬人員名稱
   */
  async updateVirtualMember(
    tripId: string,
    vmId: string,
    userId: string,
    name: string,
  ) {
    const trip = await this.findById(tripId, userId);

    // 檢查 Premium 狀態
    if (!this.isTripPremium(trip.premiumExpiresAt)) {
      throw new ForbiddenException('此功能需要旅程進階方案');
    }

    // 檢查權限
    const member = trip.members.find((m: { userId: string; role: string }) => m.userId === userId);
    if (member?.role === MemberRole.MEMBER) {
      throw new ForbiddenException('您沒有編輯虛擬人員的權限');
    }

    // 驗證虛擬人員存在
    const vm = await this.prisma.virtualMember.findUnique({
      where: { id: vmId },
    });
    if (!vm || vm.tripId !== tripId) {
      throw new NotFoundException('虛擬人員不存在');
    }
    if (vm.mergedTo) {
      throw new BadRequestException('此虛擬人員已合併，無法編輯');
    }

    return this.prisma.virtualMember.update({
      where: { id: vmId },
      data: { name },
    });
  }

  /**
   * 刪除虛擬人員
   */
  async deleteVirtualMember(tripId: string, vmId: string, userId: string) {
    const trip = await this.findById(tripId, userId);

    // 檢查 Premium 狀態
    if (!this.isTripPremium(trip.premiumExpiresAt)) {
      throw new ForbiddenException('此功能需要旅程進階方案');
    }

    // 檢查權限
    const member = trip.members.find((m: { userId: string; role: string }) => m.userId === userId);
    if (member?.role === MemberRole.MEMBER) {
      throw new ForbiddenException('您沒有刪除虛擬人員的權限');
    }

    // 驗證虛擬人員存在
    const vm = await this.prisma.virtualMember.findUnique({
      where: { id: vmId },
    });
    if (!vm || vm.tripId !== tripId) {
      throw new NotFoundException('虛擬人員不存在');
    }
    if (vm.mergedTo) {
      throw new BadRequestException('此虛擬人員已合併，無法刪除');
    }

    return this.prisma.virtualMember.delete({
      where: { id: vmId },
    });
  }

  /**
   * 合併虛擬人員到真實用戶
   */
  async mergeVirtualMember(tripId: string, vmId: string, userId: string) {
    const trip = await this.findById(tripId, userId);

    // 驗證虛擬人員存在且未合併
    const vm = await this.prisma.virtualMember.findUnique({
      where: { id: vmId },
    });
    if (!vm || vm.tripId !== tripId) {
      throw new NotFoundException('虛擬人員不存在');
    }
    if (vm.mergedTo) {
      throw new BadRequestException('此虛擬人員已合併');
    }

    // 驗證當前用戶是旅程成員
    const membership = trip.members.find(
      (m: { userId: string }) => m.userId === userId,
    );
    if (!membership) {
      throw new ForbiddenException('您不是此旅程的成員');
    }

    await this.prisma.$transaction(async (tx) => {
      // 處理 BillShare 衝突：逐筆檢查是否已有同帳單的用戶紀錄
      const vmShares = await tx.billShare.findMany({
        where: { virtualMemberId: vmId },
      });
      for (const vmShare of vmShares) {
        const existingShare = await tx.billShare.findFirst({
          where: { billId: vmShare.billId, userId },
        });
        if (existingShare) {
          // 合併金額
          await tx.billShare.update({
            where: { id: existingShare.id },
            data: { amount: { increment: vmShare.amount } },
          });
          await tx.billShare.delete({ where: { id: vmShare.id } });
        } else {
          await tx.billShare.update({
            where: { id: vmShare.id },
            data: { virtualMemberId: null, userId },
          });
        }
      }

      // 處理 BillItemShare 衝突
      const vmItemShares = await tx.billItemShare.findMany({
        where: { virtualMemberId: vmId },
      });
      for (const vmItemShare of vmItemShares) {
        const existingItemShare = await tx.billItemShare.findFirst({
          where: { billItemId: vmItemShare.billItemId, userId },
        });
        if (existingItemShare) {
          await tx.billItemShare.update({
            where: { id: existingItemShare.id },
            data: { amount: { increment: vmItemShare.amount } },
          });
          await tx.billItemShare.delete({ where: { id: vmItemShare.id } });
        } else {
          await tx.billItemShare.update({
            where: { id: vmItemShare.id },
            data: { virtualMemberId: null, userId },
          });
        }
      }

      // 轉移 Bill.virtualPayerId → payerId
      await tx.bill.updateMany({
        where: { virtualPayerId: vmId },
        data: { virtualPayerId: null, payerId: userId },
      });

      // 轉移 Settlement
      await tx.settlement.updateMany({
        where: { virtualPayerId: vmId },
        data: { virtualPayerId: null, payerId: userId },
      });
      await tx.settlement.updateMany({
        where: { virtualReceiverId: vmId },
        data: { virtualReceiverId: null, receiverId: userId },
      });

      // 標記虛擬人員已合併
      await tx.virtualMember.update({
        where: { id: vmId },
        data: { mergedTo: userId, mergedAt: new Date() },
      });
    });

    return { message: '虛擬人員已成功合併到您的帳號' };
  }
}
