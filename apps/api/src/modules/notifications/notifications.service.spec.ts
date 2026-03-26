import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../../test/mocks/prisma.mock';
import { testUser1, testUser2, testUser3 } from '../../../test/fixtures/users.fixture';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prismaMock: PrismaMock;

  const mockNotification = {
    id: 'notification-1',
    userId: testUser1.id,
    type: NotificationType.NEW_BILL,
    title: '新帳單',
    message: '小華 新增了一筆帳單「晚餐」',
    tripId: 'trip-1',
    tripName: '東京旅行',
    billId: 'bill-1',
    settlementId: null,
    fromUserId: testUser2.id,
    fromUserName: testUser2.name,
    amount: 1000,
    isRead: false,
    createdAt: new Date('2024-01-15'),
  };

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAllByUser', () => {
    it('應返回用戶所有通知（分頁格式）', async () => {
      prismaMock.notification.findMany.mockResolvedValue([mockNotification]);
      prismaMock.notification.count.mockResolvedValue(1);

      const result = await service.findAllByUser(testUser1.id);

      expect(prismaMock.notification.findMany).toHaveBeenCalledWith({
        where: { userId: testUser1.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0,
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].amount).toBe(1000); // 應轉換為數字
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.hasMore).toBe(false);
    });

    it('應返回空陣列當無通知', async () => {
      prismaMock.notification.findMany.mockResolvedValue([]);
      prismaMock.notification.count.mockResolvedValue(0);

      const result = await service.findAllByUser(testUser1.id);

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('getUnreadCount', () => {
    it('應返回未讀通知數量', async () => {
      prismaMock.notification.count.mockResolvedValue(5);

      const result = await service.getUnreadCount(testUser1.id);

      expect(prismaMock.notification.count).toHaveBeenCalledWith({
        where: { userId: testUser1.id, isRead: false },
      });
      expect(result).toBe(5);
    });

    it('應返回 0 當無未讀通知', async () => {
      prismaMock.notification.count.mockResolvedValue(0);

      const result = await service.getUnreadCount(testUser1.id);

      expect(result).toBe(0);
    });
  });

  describe('markAsRead', () => {
    it('應標記通知為已讀', async () => {
      prismaMock.notification.findUnique.mockResolvedValue(mockNotification);
      prismaMock.notification.update.mockResolvedValue({
        ...mockNotification,
        isRead: true,
      });

      const result = await service.markAsRead('notification-1', testUser1.id);

      expect(prismaMock.notification.update).toHaveBeenCalledWith({
        where: { id: 'notification-1' },
        data: { isRead: true },
      });
      expect(result.isRead).toBe(true);
    });

    it('應拒絕標記不存在的通知', async () => {
      prismaMock.notification.findUnique.mockResolvedValue(null);

      await expect(
        service.markAsRead('non-existent', testUser1.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('應拒絕標記其他用戶的通知', async () => {
      prismaMock.notification.findUnique.mockResolvedValue({
        ...mockNotification,
        userId: testUser2.id, // 不是 testUser1
      });

      await expect(
        service.markAsRead('notification-1', testUser1.id),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAllAsRead', () => {
    it('應標記用戶所有未讀通知為已讀', async () => {
      prismaMock.notification.updateMany.mockResolvedValue({ count: 3 });

      await service.markAllAsRead(testUser1.id);

      expect(prismaMock.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: testUser1.id, isRead: false },
        data: { isRead: true },
      });
    });
  });

  describe('delete', () => {
    it('應刪除通知', async () => {
      prismaMock.notification.findUnique.mockResolvedValue(mockNotification);
      prismaMock.notification.delete.mockResolvedValue(mockNotification);

      const result = await service.delete('notification-1', testUser1.id);

      expect(prismaMock.notification.delete).toHaveBeenCalledWith({
        where: { id: 'notification-1' },
      });
      expect(result).toEqual(mockNotification);
    });

    it('應拒絕刪除不存在的通知', async () => {
      prismaMock.notification.findUnique.mockResolvedValue(null);

      await expect(
        service.delete('non-existent', testUser1.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('應拒絕刪除其他用戶的通知', async () => {
      prismaMock.notification.findUnique.mockResolvedValue({
        ...mockNotification,
        userId: testUser2.id,
      });

      await expect(
        service.delete('notification-1', testUser1.id),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createNotification', () => {
    it('應建立通知', async () => {
      prismaMock.notification.create.mockResolvedValue(mockNotification);

      const result = await service.createNotification({
        userId: testUser1.id,
        type: NotificationType.NEW_BILL,
        title: '新帳單',
        message: '測試訊息',
        tripId: 'trip-1',
        tripName: '東京旅行',
        billId: 'bill-1',
        fromUserId: testUser2.id,
        fromUserName: testUser2.name,
        amount: 1000,
      });

      expect(prismaMock.notification.create).toHaveBeenCalled();
      expect(result).toEqual(mockNotification);
    });
  });

  describe('createManyNotifications', () => {
    it('應批量建立通知', async () => {
      prismaMock.notification.createMany.mockResolvedValue({ count: 2 });

      await service.createManyNotifications([
        {
          userId: testUser1.id,
          type: NotificationType.NEW_BILL,
          title: '新帳單',
          message: '測試訊息',
        },
        {
          userId: testUser2.id,
          type: NotificationType.NEW_BILL,
          title: '新帳單',
          message: '測試訊息',
        },
      ]);

      expect(prismaMock.notification.createMany).toHaveBeenCalled();
      const call = prismaMock.notification.createMany.mock.calls[0][0];
      expect(call.data).toHaveLength(2);
    });
  });

  describe('notifyBillCreated', () => {
    it('應發送帳單建立通知給所有成員', async () => {
      prismaMock.notification.createMany.mockResolvedValue({ count: 2 });

      await service.notifyBillCreated(
        {
          id: 'bill-1',
          title: '晚餐',
          amount: 1000,
          tripId: 'trip-1',
          tripName: '東京旅行',
          payerId: testUser1.id,
          payerName: testUser1.name,
        },
        [testUser2.id, testUser3.id],
      );

      expect(prismaMock.notification.createMany).toHaveBeenCalled();
      const call = prismaMock.notification.createMany.mock.calls[0][0];
      expect(call.data).toHaveLength(2);
      expect(call.data[0].type).toBe(NotificationType.NEW_BILL);
    });

    it('不應發送通知當成員列表為空', async () => {
      await service.notifyBillCreated(
        {
          id: 'bill-1',
          title: '晚餐',
          amount: 1000,
          tripId: 'trip-1',
          tripName: '東京旅行',
          payerId: testUser1.id,
          payerName: testUser1.name,
        },
        [],
      );

      expect(prismaMock.notification.createMany).not.toHaveBeenCalled();
    });
  });

  describe('notifySettlementCreated', () => {
    it('應發送結算請求通知給收款方', async () => {
      prismaMock.notification.create.mockResolvedValue(mockNotification);

      await service.notifySettlementCreated({
        id: 'settlement-1',
        tripId: 'trip-1',
        tripName: '東京旅行',
        payerId: testUser1.id,
        payerName: testUser1.name,
        receiverId: testUser2.id,
        receiverName: testUser2.name,
        amount: 500,
      });

      expect(prismaMock.notification.create).toHaveBeenCalled();
      const call = prismaMock.notification.create.mock.calls[0][0];
      expect(call.data.userId).toBe(testUser2.id);
      expect(call.data.type).toBe(NotificationType.SETTLEMENT_REQUEST);
    });
  });

  describe('notifySettlementConfirmed', () => {
    it('應發送結算確認通知給付款方', async () => {
      prismaMock.notification.create.mockResolvedValue(mockNotification);

      await service.notifySettlementConfirmed({
        id: 'settlement-1',
        tripId: 'trip-1',
        tripName: '東京旅行',
        payerId: testUser1.id,
        payerName: testUser1.name,
        receiverId: testUser2.id,
        receiverName: testUser2.name,
        amount: 500,
      });

      expect(prismaMock.notification.create).toHaveBeenCalled();
      const call = prismaMock.notification.create.mock.calls[0][0];
      expect(call.data.userId).toBe(testUser1.id); // 通知付款方
      expect(call.data.type).toBe(NotificationType.SETTLEMENT_CONFIRMED);
    });
  });

  describe('notifyMemberJoined', () => {
    it('應發送成員加入通知給現有成員', async () => {
      prismaMock.notification.createMany.mockResolvedValue({ count: 2 });

      await service.notifyMemberJoined(
        { id: 'trip-1', name: '東京旅行' },
        { id: testUser3.id, name: testUser3.name },
        [testUser1.id, testUser2.id],
      );

      expect(prismaMock.notification.createMany).toHaveBeenCalled();
      const call = prismaMock.notification.createMany.mock.calls[0][0];
      expect(call.data).toHaveLength(2);
      expect(call.data[0].type).toBe(NotificationType.MEMBER_JOINED);
    });
  });

  describe('notifyMemberLeft', () => {
    it('應發送成員離開通知給剩餘成員', async () => {
      prismaMock.notification.createMany.mockResolvedValue({ count: 2 });

      await service.notifyMemberLeft(
        { id: 'trip-1', name: '東京旅行' },
        { id: testUser3.id, name: testUser3.name },
        [testUser1.id, testUser2.id],
      );

      expect(prismaMock.notification.createMany).toHaveBeenCalled();
      const call = prismaMock.notification.createMany.mock.calls[0][0];
      expect(call.data[0].type).toBe(NotificationType.MEMBER_LEFT);
    });
  });

  describe('notifyMemberRemoved', () => {
    it('應發送被移除通知給被移除的成員', async () => {
      prismaMock.notification.create.mockResolvedValue(mockNotification);

      await service.notifyMemberRemoved(
        { id: 'trip-1', name: '東京旅行' },
        { id: testUser3.id, name: testUser3.name },
        testUser1.id,
        testUser1.name,
      );

      expect(prismaMock.notification.create).toHaveBeenCalled();
      const call = prismaMock.notification.create.mock.calls[0][0];
      expect(call.data.userId).toBe(testUser3.id);
      expect(call.data.message).toContain('已被');
    });
  });
});
