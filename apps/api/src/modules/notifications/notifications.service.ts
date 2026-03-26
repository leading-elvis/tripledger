import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FirebaseService, PushNotificationPayload } from '../../common/firebase/firebase.service';
import { NotificationType, Prisma } from '@prisma/client';
import { CreateNotificationDto } from './dto/notification.dto';
import { PaginationDto, createPaginatedResponse } from '../../common/dto/pagination.dto';

/**
 * 帳單資訊（用於通知）
 */
interface BillNotificationData {
  id: string;
  title: string;
  amount: number;
  tripId: string;
  tripName: string;
  payerId: string;
  payerName: string;
}

/**
 * 結算資訊（用於通知）
 */
interface SettlementNotificationData {
  id: string;
  tripId: string;
  tripName: string;
  payerId: string;
  payerName: string;
  receiverId: string;
  receiverName: string;
  amount: number;
}

/**
 * 成員資訊（用於通知）
 */
interface MemberNotificationData {
  id: string;
  name: string;
}

/**
 * 旅程資訊（用於通知）
 */
interface TripNotificationData {
  id: string;
  name: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly firebaseService: FirebaseService,
  ) {}

  /**
   * 取得用戶所有通知（支援分頁）
   */
  async findAllByUser(userId: string, pagination?: PaginationDto) {
    const limit = pagination?.limit ?? 20;
    const offset = pagination?.offset ?? 0;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    const data = notifications.map((n) => ({
      ...n,
      amount: n.amount ? Number(n.amount) : null,
    }));

    return createPaginatedResponse(data, total, limit, offset);
  }

  /**
   * 取得用戶未讀通知數量
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * 標記單一通知為已讀
   * 使用複合條件查詢防止時間差攻擊（無論 ID 是否存在都執行相同操作）
   */
  async markAsRead(id: string, userId: string) {
    // 使用單一查詢同時驗證 ID 和 userId，防止時間差資訊洩露
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('通知不存在');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  /**
   * 標記用戶所有通知為已讀
   */
  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  /**
   * 刪除通知
   * 使用複合條件查詢防止時間差攻擊
   */
  async delete(id: string, userId: string) {
    // 使用單一查詢同時驗證 ID 和 userId，防止時間差資訊洩露
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('通知不存在');
    }

    return this.prisma.notification.delete({
      where: { id },
    });
  }

  /**
   * 創建通知（內部方法）
   */
  async createNotification(data: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        tripId: data.tripId,
        tripName: data.tripName,
        billId: data.billId,
        settlementId: data.settlementId,
        fromUserId: data.fromUserId,
        fromUserName: data.fromUserName,
        amount: data.amount ? new Prisma.Decimal(data.amount) : null,
        currency: data.currency,
      },
    });

    // 發送推播通知
    await this.sendPushNotification(data.userId, {
      title: data.title,
      body: data.message,
      data: this.buildPushData(data),
    });

    return notification;
  }

  /**
   * 批量創建通知（內部方法）
   */
  async createManyNotifications(notifications: CreateNotificationDto[]) {
    const result = await this.prisma.notification.createMany({
      data: notifications.map((n) => ({
        userId: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
        tripId: n.tripId,
        tripName: n.tripName,
        billId: n.billId,
        settlementId: n.settlementId,
        fromUserId: n.fromUserId,
        fromUserName: n.fromUserName,
        amount: n.amount ? new Prisma.Decimal(n.amount) : null,
        currency: n.currency,
      })),
    });

    // 批量發送推播通知
    await this.sendBatchPushNotifications(notifications);

    return result;
  }

  // ============================================
  // 推播通知方法
  // ============================================

  /**
   * 發送推播通知到單一用戶
   */
  private async sendPushNotification(
    userId: string,
    payload: PushNotificationPayload,
  ): Promise<void> {
    try {
      const tokens = await this.getUserFcmTokens(userId);
      if (tokens.length === 0) return;

      const result = await this.firebaseService.sendToDevices(tokens, payload);

      // 停用無效的 Token
      if (result.invalidTokens.length > 0) {
        await this.deactivateInvalidTokens(result.invalidTokens);
      }
    } catch (error) {
      // 記錄詳細錯誤資訊以便除錯
      this.logger.error(
        `推播通知發送失敗: userId=${userId}, error=${error instanceof Error ? error.message : String(error)}`,
      );
      // 不拋出錯誤，避免影響主要業務流程
    }
  }

  /**
   * 批量發送推播通知
   */
  private async sendBatchPushNotifications(
    notifications: CreateNotificationDto[],
  ): Promise<void> {
    // 按用戶分組
    const userNotifications = new Map<string, CreateNotificationDto>();
    for (const n of notifications) {
      // 每個用戶只發送一次推播（取最新的通知）
      userNotifications.set(n.userId, n);
    }

    // 並行發送推播
    const sendPromises = Array.from(userNotifications.entries()).map(
      async ([userId, data]) => {
        await this.sendPushNotification(userId, {
          title: data.title,
          body: data.message,
          data: this.buildPushData(data),
        });
        return userId; // 返回用戶 ID 以便追蹤
      },
    );

    const results = await Promise.allSettled(sendPromises);

    // 統計並記錄失敗的推播
    const failures = results.filter(
      (r): r is PromiseRejectedResult => r.status === 'rejected',
    );

    if (failures.length > 0) {
      this.logger.warn(
        `批量推播完成: 成功=${results.length - failures.length}, 失敗=${failures.length}`,
      );
    }
  }

  /**
   * 構建推播通知的 data 欄位
   */
  private buildPushData(data: CreateNotificationDto): Record<string, string> {
    const result: Record<string, string> = {
      type: data.type,
    };

    if (data.tripId) result.tripId = data.tripId;
    if (data.billId) result.billId = data.billId;
    if (data.settlementId) result.settlementId = data.settlementId;

    return result;
  }

  /**
   * 取得用戶的所有有效 FCM Token
   */
  private async getUserFcmTokens(userId: string): Promise<string[]> {
    const tokens = await this.prisma.deviceToken.findMany({
      where: {
        userId,
        isActive: true,
      },
      select: {
        token: true,
      },
    });
    return tokens.map((t) => t.token);
  }

  /**
   * 停用無效的 FCM Token
   */
  private async deactivateInvalidTokens(tokens: string[]): Promise<void> {
    if (tokens.length === 0) return;

    await this.prisma.deviceToken.updateMany({
      where: {
        token: {
          in: tokens,
        },
      },
      data: {
        isActive: false,
      },
    });

    this.logger.log(`Deactivated ${tokens.length} invalid FCM tokens`);
  }

  // ============================================
  // 業務邏輯通知方法
  // ============================================

  /**
   * 通知：新帳單創建
   * @param bill 帳單資訊
   * @param memberIds 要通知的成員 ID（不包含創建者）
   */
  async notifyBillCreated(
    bill: BillNotificationData,
    memberIds: string[],
  ) {
    const notifications: CreateNotificationDto[] = memberIds.map((userId) => ({
      userId,
      type: NotificationType.NEW_BILL,
      title: '新帳單',
      message: `${bill.payerName} 新增了一筆帳單「${bill.title}」`,
      tripId: bill.tripId,
      tripName: bill.tripName,
      billId: bill.id,
      fromUserId: bill.payerId,
      fromUserName: bill.payerName,
      amount: bill.amount,
    }));

    if (notifications.length > 0) {
      await this.createManyNotifications(notifications);
    }
  }

  /**
   * 通知：帳單更新
   * @param bill 帳單資訊
   * @param updaterId 更新者 ID
   * @param updaterName 更新者名稱
   * @param memberIds 要通知的成員 ID（不包含更新者）
   */
  async notifyBillUpdated(
    bill: BillNotificationData,
    updaterId: string,
    updaterName: string,
    memberIds: string[],
  ) {
    const notifications: CreateNotificationDto[] = memberIds.map((userId) => ({
      userId,
      type: NotificationType.BILL_UPDATED,
      title: '帳單更新',
      message: `${updaterName} 更新了帳單「${bill.title}」`,
      tripId: bill.tripId,
      tripName: bill.tripName,
      billId: bill.id,
      fromUserId: updaterId,
      fromUserName: updaterName,
      amount: bill.amount,
    }));

    if (notifications.length > 0) {
      await this.createManyNotifications(notifications);
    }
  }

  /**
   * 通知：帳單刪除
   * @param billTitle 帳單標題
   * @param tripId 旅程 ID
   * @param tripName 旅程名稱
   * @param deleterId 刪除者 ID
   * @param deleterName 刪除者名稱
   * @param memberIds 要通知的成員 ID（不包含刪除者）
   */
  async notifyBillDeleted(
    billTitle: string,
    tripId: string,
    tripName: string,
    deleterId: string,
    deleterName: string,
    memberIds: string[],
  ) {
    const notifications: CreateNotificationDto[] = memberIds.map((userId) => ({
      userId,
      type: NotificationType.BILL_DELETED,
      title: '帳單刪除',
      message: `${deleterName} 刪除了帳單「${billTitle}」`,
      tripId,
      tripName,
      fromUserId: deleterId,
      fromUserName: deleterName,
    }));

    if (notifications.length > 0) {
      await this.createManyNotifications(notifications);
    }
  }

  /**
   * 通知：結算請求創建
   * @param settlement 結算資訊
   */
  async notifySettlementCreated(settlement: SettlementNotificationData) {
    await this.createNotification({
      userId: settlement.receiverId,
      type: NotificationType.SETTLEMENT_REQUEST,
      title: '結算請求',
      message: `${settlement.payerName} 向你發起了結算請求`,
      tripId: settlement.tripId,
      tripName: settlement.tripName,
      settlementId: settlement.id,
      fromUserId: settlement.payerId,
      fromUserName: settlement.payerName,
      amount: settlement.amount,
    });
  }

  /**
   * 通知：結算確認
   * @param settlement 結算資訊
   */
  async notifySettlementConfirmed(settlement: SettlementNotificationData) {
    await this.createNotification({
      userId: settlement.payerId,
      type: NotificationType.SETTLEMENT_CONFIRMED,
      title: '結算確認',
      message: `${settlement.receiverName} 已確認收到你的付款`,
      tripId: settlement.tripId,
      tripName: settlement.tripName,
      settlementId: settlement.id,
      fromUserId: settlement.receiverId,
      fromUserName: settlement.receiverName,
      amount: settlement.amount,
    });
  }

  /**
   * 通知：新成員加入旅程
   * @param trip 旅程資訊
   * @param newMember 新成員資訊
   * @param existingMemberIds 現有成員 ID（不包含新成員）
   */
  async notifyMemberJoined(
    trip: TripNotificationData,
    newMember: MemberNotificationData,
    existingMemberIds: string[],
  ) {
    const notifications: CreateNotificationDto[] = existingMemberIds.map(
      (userId) => ({
        userId,
        type: NotificationType.MEMBER_JOINED,
        title: '成員加入',
        message: `${newMember.name} 加入了旅程「${trip.name}」`,
        tripId: trip.id,
        tripName: trip.name,
        fromUserId: newMember.id,
        fromUserName: newMember.name,
      }),
    );

    if (notifications.length > 0) {
      await this.createManyNotifications(notifications);
    }
  }

  /**
   * 通知：成員離開旅程
   * @param trip 旅程資訊
   * @param leftMember 離開的成員資訊
   * @param remainingMemberIds 剩餘成員 ID
   */
  async notifyMemberLeft(
    trip: TripNotificationData,
    leftMember: MemberNotificationData,
    remainingMemberIds: string[],
  ) {
    const notifications: CreateNotificationDto[] = remainingMemberIds.map(
      (userId) => ({
        userId,
        type: NotificationType.MEMBER_LEFT,
        title: '成員離開',
        message: `${leftMember.name} 離開了旅程「${trip.name}」`,
        tripId: trip.id,
        tripName: trip.name,
        fromUserId: leftMember.id,
        fromUserName: leftMember.name,
      }),
    );

    if (notifications.length > 0) {
      await this.createManyNotifications(notifications);
    }
  }

  /**
   * 通知：成員被移除
   * @param trip 旅程資訊
   * @param removedMember 被移除的成員資訊
   * @param removerId 移除者 ID
   * @param removerName 移除者名稱
   */
  async notifyMemberRemoved(
    trip: TripNotificationData,
    removedMember: MemberNotificationData,
    removerId: string,
    removerName: string,
  ) {
    // 通知被移除的成員
    await this.createNotification({
      userId: removedMember.id,
      type: NotificationType.MEMBER_LEFT,
      title: '已被移除',
      message: `你已被 ${removerName} 從旅程「${trip.name}」移除`,
      tripId: trip.id,
      tripName: trip.name,
      fromUserId: removerId,
      fromUserName: removerName,
    });
  }

  /**
   * 通知：旅程邀請
   * @param trip 旅程資訊
   * @param inviterId 邀請者 ID
   * @param inviterName 邀請者名稱
   * @param inviteeId 被邀請者 ID
   */
  async notifyTripInvite(
    trip: TripNotificationData,
    inviterId: string,
    inviterName: string,
    inviteeId: string,
  ) {
    await this.createNotification({
      userId: inviteeId,
      type: NotificationType.TRIP_INVITE,
      title: '旅程邀請',
      message: `${inviterName} 邀請你加入旅程「${trip.name}」`,
      tripId: trip.id,
      tripName: trip.name,
      fromUserId: inviterId,
      fromUserName: inviterName,
    });
  }

  /**
   * 通知：結算提醒
   * @param trip 旅程資訊
   * @param userId 要提醒的用戶 ID
   * @param pendingCount 待結算數量
   * @param totalAmount 待結算總金額
   */
  async notifySettlementReminder(
    trip: TripNotificationData,
    userId: string,
    pendingCount: number,
    totalAmount?: number,
  ) {
    await this.createNotification({
      userId,
      type: NotificationType.REMINDER,
      title: '結算提醒',
      message: `「${trip.name}」還有 ${pendingCount} 筆待結算款項`,
      tripId: trip.id,
      tripName: trip.name,
      amount: totalAmount,
    });
  }

  /**
   * 批量發送結算提醒
   * @param trip 旅程資訊
   * @param reminders 提醒資訊列表
   */
  async notifySettlementReminders(
    trip: TripNotificationData,
    reminders: { userId: string; pendingCount: number; totalAmount?: number }[],
  ) {
    const notifications: CreateNotificationDto[] = reminders.map((r) => ({
      userId: r.userId,
      type: NotificationType.REMINDER,
      title: '結算提醒',
      message: `「${trip.name}」還有 ${r.pendingCount} 筆待結算款項`,
      tripId: trip.id,
      tripName: trip.name,
      amount: r.totalAmount,
    }));

    if (notifications.length > 0) {
      await this.createManyNotifications(notifications);
    }
  }
}
