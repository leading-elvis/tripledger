import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MemberRole } from '@prisma/client';

interface CreateUserData {
  email?: string;
  name: string;
  avatarUrl?: string;
  lineId?: string;
  googleId?: string;
  discordId?: string;
  appleId?: string;
}

interface UpdateUserData {
  name?: string;
  avatarUrl?: string;
  googleId?: string;
  lineId?: string;
  discordId?: string;
  appleId?: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserData) {
    return this.prisma.user.create({
      data,
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findByLineId(lineId: string) {
    return this.prisma.user.findUnique({
      where: { lineId },
    });
  }

  async findByGoogleId(googleId: string) {
    return this.prisma.user.findUnique({
      where: { googleId },
    });
  }

  async findByDiscordId(discordId: string) {
    return this.prisma.user.findUnique({
      where: { discordId },
    });
  }

  async findByAppleId(appleId: string) {
    return this.prisma.user.findUnique({
      where: { appleId },
    });
  }

  async update(id: string, data: UpdateUserData) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return this.prisma.user.delete({
      where: { id },
    });
  }

  /**
   * 檢查兩個用戶是否共享至少一個旅程
   * 用於限制用戶只能查看有關聯的其他用戶資訊
   */
  async hasSharedTrip(userId1: string, userId2: string): Promise<boolean> {
    if (userId1 === userId2) return true;

    const sharedTrip = await this.prisma.tripMember.findFirst({
      where: {
        userId: userId1,
        trip: {
          members: {
            some: {
              userId: userId2,
            },
          },
        },
      },
    });

    return !!sharedTrip;
  }

  /**
   * 刪除用戶帳號
   * 策略：
   * 1. 檢查用戶是否為任何旅程的唯一管理者
   * 2. 匿名化財務記錄（Bill、BillShare、Settlement 的 userId 設為 NULL）
   * 3. 刪除用戶資料（會自動級聯刪除 TripMember、Notification 等）
   *
   * 注意：這是不可逆操作
   */
  async deleteAccount(userId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // 1. 檢查用戶是否存在
      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('用戶不存在');
      }

      // 2. 檢查是否為任何旅程的唯一 OWNER
      const ownedTrips = await tx.tripMember.findMany({
        where: {
          userId,
          role: MemberRole.OWNER,
        },
        include: {
          trip: {
            include: {
              members: true,
            },
          },
        },
      });

      for (const membership of ownedTrips) {
        const otherAdmins = membership.trip.members.filter(
          (m) =>
            m.userId !== userId &&
            (m.role === MemberRole.OWNER || m.role === MemberRole.ADMIN),
        );

        if (otherAdmins.length === 0 && membership.trip.members.length > 1) {
          throw new BadRequestException(
            `您是旅程「${membership.trip.name}」的唯一管理者。請先轉移管理權或刪除旅程後再刪除帳號。`,
          );
        }
      }

      // 3. 匿名化財務記錄（將 userId 設為 NULL）
      // Bill 的 payerId
      await tx.bill.updateMany({
        where: { payerId: userId },
        data: { payerId: null },
      });

      // BillShare 的 userId
      await tx.billShare.updateMany({
        where: { userId },
        data: { userId: null },
      });

      // BillItemShare 的 userId
      await tx.billItemShare.updateMany({
        where: { userId },
        data: { userId: null },
      });

      // Settlement 的 payerId 和 receiverId
      await tx.settlement.updateMany({
        where: { payerId: userId },
        data: { payerId: null },
      });
      await tx.settlement.updateMany({
        where: { receiverId: userId },
        data: { receiverId: null },
      });

      // 4. 刪除用戶（會自動級聯刪除以下資料）
      // - TripMember
      // - Notification
      // - DeviceToken
      // - RefreshToken
      // - Purchase
      // - UserBrandMapping
      await tx.user.delete({
        where: { id: userId },
      });
    });
  }
}
