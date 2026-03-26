import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MemberRole } from '@prisma/client';
import { TripsService } from './trips.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { createPrismaMock, PrismaMock } from '../../../test/mocks/prisma.mock';
import { createNotificationsServiceMock, NotificationsServiceMock } from '../../../test/mocks/services.mock';
import { testUser1, testUser2, testUser3 } from '../../../test/fixtures/users.fixture';
import {
  testTrip1,
  createTripFixture,
  createTripMemberFixture,
  createTripWithMembersFixture,
} from '../../../test/fixtures/trips.fixture';

describe('TripsService', () => {
  let service: TripsService;
  let prismaMock: PrismaMock;
  let notificationsServiceMock: NotificationsServiceMock;

  beforeEach(async () => {
    prismaMock = createPrismaMock();
    notificationsServiceMock = createNotificationsServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TripsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: NotificationsService, useValue: notificationsServiceMock },
      ],
    }).compile();

    service = module.get<TripsService>(TripsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('應建立旅程並將創建者設為 OWNER', async () => {
      const newTrip = createTripWithMembersFixture(
        { id: 'new-trip', name: '新旅程' },
        [
          createTripMemberFixture({
            userId: testUser1.id,
            role: MemberRole.OWNER,
            user: { id: testUser1.id, name: testUser1.name, avatarUrl: testUser1.avatarUrl },
          }),
        ],
      );
      prismaMock.trip.create.mockResolvedValue(newTrip);

      const result = await service.create(testUser1.id, {
        name: '新旅程',
        description: '旅程描述',
      });

      expect(prismaMock.trip.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: '新旅程',
            description: '旅程描述',
            members: {
              create: {
                userId: testUser1.id,
                role: MemberRole.OWNER,
              },
            },
          }),
        }),
      );
      expect(result.members[0].role).toBe(MemberRole.OWNER);
    });
  });

  describe('findAllByUser', () => {
    it('應返回用戶所有旅程', async () => {
      prismaMock.trip.findMany.mockResolvedValue([testTrip1]);

      const result = await service.findAllByUser(testUser1.id);

      expect(prismaMock.trip.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            members: {
              some: { userId: testUser1.id },
            },
          },
        }),
      );
      expect(result).toHaveLength(1);
    });

    it('應返回空陣列當用戶無旅程', async () => {
      prismaMock.trip.findMany.mockResolvedValue([]);

      const result = await service.findAllByUser('user-with-no-trips');

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('應返回旅程詳情（成員）', async () => {
      prismaMock.trip.findUnique.mockResolvedValue(testTrip1);

      const result = await service.findById('trip-1', testUser1.id);

      expect(result).toEqual(testTrip1);
    });

    it('應拒絕不存在的旅程', async () => {
      prismaMock.trip.findUnique.mockResolvedValue(null);

      await expect(service.findById('non-existent', testUser1.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('應拒絕非成員存取', async () => {
      const tripWithOtherMembers = createTripWithMembersFixture(
        { id: 'trip-1' },
        [
          createTripMemberFixture({
            userId: 'other-user',
            role: MemberRole.OWNER,
            user: { id: 'other-user', name: 'Other', avatarUrl: null },
          }),
        ],
      );
      prismaMock.trip.findUnique.mockResolvedValue(tripWithOtherMembers);

      await expect(service.findById('trip-1', testUser1.id)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    it('OWNER 可以更新旅程', async () => {
      const ownerTrip = createTripWithMembersFixture(
        { id: 'trip-1' },
        [
          createTripMemberFixture({
            userId: testUser1.id,
            role: MemberRole.OWNER,
            user: { id: testUser1.id, name: testUser1.name, avatarUrl: testUser1.avatarUrl },
          }),
        ],
      );
      prismaMock.trip.findUnique.mockResolvedValue(ownerTrip);
      prismaMock.trip.update.mockResolvedValue({ ...ownerTrip, name: '新名字' });

      const result = await service.update('trip-1', testUser1.id, { name: '新名字' });

      expect(prismaMock.trip.update).toHaveBeenCalled();
      expect(result.name).toBe('新名字');
    });

    it('ADMIN 可以更新旅程', async () => {
      const trip = createTripWithMembersFixture(
        { id: 'trip-1' },
        [
          createTripMemberFixture({
            userId: 'owner-id',
            role: MemberRole.OWNER,
            user: { id: 'owner-id', name: 'Owner', avatarUrl: null },
          }),
          createTripMemberFixture({
            userId: testUser1.id,
            role: MemberRole.ADMIN,
            user: { id: testUser1.id, name: testUser1.name, avatarUrl: testUser1.avatarUrl },
          }),
        ],
      );
      prismaMock.trip.findUnique.mockResolvedValue(trip);
      prismaMock.trip.update.mockResolvedValue({ ...trip, name: '新名字' });

      await service.update('trip-1', testUser1.id, { name: '新名字' });

      expect(prismaMock.trip.update).toHaveBeenCalled();
    });

    it('MEMBER 不能更新旅程', async () => {
      const trip = createTripWithMembersFixture(
        { id: 'trip-1' },
        [
          createTripMemberFixture({
            userId: 'owner-id',
            role: MemberRole.OWNER,
            user: { id: 'owner-id', name: 'Owner', avatarUrl: null },
          }),
          createTripMemberFixture({
            userId: testUser1.id,
            role: MemberRole.MEMBER,
            user: { id: testUser1.id, name: testUser1.name, avatarUrl: testUser1.avatarUrl },
          }),
        ],
      );
      prismaMock.trip.findUnique.mockResolvedValue(trip);

      await expect(
        service.update('trip-1', testUser1.id, { name: '新名字' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('delete', () => {
    it('OWNER 可以刪除旅程', async () => {
      const ownerTrip = createTripWithMembersFixture(
        { id: 'trip-1' },
        [
          createTripMemberFixture({
            userId: testUser1.id,
            role: MemberRole.OWNER,
            user: { id: testUser1.id, name: testUser1.name, avatarUrl: testUser1.avatarUrl },
          }),
        ],
      );
      prismaMock.trip.findUnique.mockResolvedValue(ownerTrip);
      prismaMock.trip.delete.mockResolvedValue(ownerTrip);

      await service.delete('trip-1', testUser1.id);

      expect(prismaMock.trip.delete).toHaveBeenCalledWith({
        where: { id: 'trip-1' },
      });
    });

    it('ADMIN 不能刪除旅程', async () => {
      const trip = createTripWithMembersFixture(
        { id: 'trip-1' },
        [
          createTripMemberFixture({
            userId: 'owner-id',
            role: MemberRole.OWNER,
            user: { id: 'owner-id', name: 'Owner', avatarUrl: null },
          }),
          createTripMemberFixture({
            userId: testUser1.id,
            role: MemberRole.ADMIN,
            user: { id: testUser1.id, name: testUser1.name, avatarUrl: testUser1.avatarUrl },
          }),
        ],
      );
      prismaMock.trip.findUnique.mockResolvedValue(trip);

      await expect(service.delete('trip-1', testUser1.id)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('MEMBER 不能刪除旅程', async () => {
      prismaMock.trip.findUnique.mockResolvedValue(testTrip1);

      await expect(service.delete('trip-1', testUser2.id)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('joinByInviteCode', () => {
    it('應透過邀請碼加入旅程', async () => {
      const tripWithOneOwner = createTripWithMembersFixture(
        { id: 'trip-1', inviteCode: 'VALID123' },
        [
          createTripMemberFixture({
            userId: testUser2.id,
            role: MemberRole.OWNER,
            user: { id: testUser2.id, name: testUser2.name, avatarUrl: testUser2.avatarUrl },
          }),
        ],
      );

      // joinByInviteCode 內部會呼叫 findUnique 兩次：
      // 1. 查找 inviteCode 的旅程
      // 2. findById 驗證成員權限（加入後）
      const tripWithNewMember = {
        ...tripWithOneOwner,
        members: [
          ...tripWithOneOwner.members,
          createTripMemberFixture({
            userId: testUser1.id,
            role: MemberRole.MEMBER,
            user: { id: testUser1.id, name: testUser1.name, avatarUrl: testUser1.avatarUrl },
          }),
        ],
      };

      prismaMock.trip.findUnique
        .mockResolvedValueOnce(tripWithOneOwner) // joinByInviteCode 查詢邀請碼
        .mockResolvedValueOnce(tripWithNewMember); // findById 驗證（此時用戶已是成員）

      prismaMock.user.findUnique.mockResolvedValue(testUser1);
      prismaMock.tripMember.create.mockResolvedValue(
        createTripMemberFixture({ userId: testUser1.id }),
      );

      await service.joinByInviteCode('VALID123', testUser1.id);

      expect(prismaMock.tripMember.create).toHaveBeenCalledWith({
        data: {
          tripId: 'trip-1',
          userId: testUser1.id,
          role: MemberRole.MEMBER,
        },
      });
      expect(notificationsServiceMock.notifyMemberJoined).toHaveBeenCalled();
    });

    it('應拒絕無效邀請碼', async () => {
      prismaMock.trip.findUnique.mockResolvedValue(null);

      await expect(
        service.joinByInviteCode('INVALID', testUser1.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('應拒絕重複加入', async () => {
      prismaMock.trip.findUnique.mockResolvedValue(testTrip1);

      await expect(
        service.joinByInviteCode('TOKYO123', testUser1.id), // testUser1 已是成員
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMembers', () => {
    it('應返回旅程所有成員', async () => {
      prismaMock.trip.findUnique.mockResolvedValue(testTrip1);
      prismaMock.tripMember.findMany.mockResolvedValue(testTrip1.members);

      const result = await service.getMembers('trip-1', testUser1.id);

      expect(result).toEqual(testTrip1.members);
    });
  });

  describe('removeMember', () => {
    const tripWithAllRoles = createTripWithMembersFixture(
      { id: 'trip-1' },
      [
        createTripMemberFixture({
          userId: testUser1.id,
          role: MemberRole.OWNER,
          user: { id: testUser1.id, name: testUser1.name, avatarUrl: testUser1.avatarUrl },
        }),
        createTripMemberFixture({
          userId: testUser2.id,
          role: MemberRole.ADMIN,
          user: { id: testUser2.id, name: testUser2.name, avatarUrl: testUser2.avatarUrl },
        }),
        createTripMemberFixture({
          userId: testUser3.id,
          role: MemberRole.MEMBER,
          user: { id: testUser3.id, name: testUser3.name, avatarUrl: testUser3.avatarUrl },
        }),
      ],
    );

    it('OWNER 可以移除 MEMBER', async () => {
      prismaMock.trip.findUnique.mockResolvedValue(tripWithAllRoles);
      prismaMock.user.findUnique
        .mockResolvedValueOnce(testUser1)
        .mockResolvedValueOnce(testUser3);
      prismaMock.tripMember.delete.mockResolvedValue({ id: 'member-3' });

      await service.removeMember('trip-1', testUser3.id, testUser1.id);

      expect(prismaMock.tripMember.delete).toHaveBeenCalled();
      expect(notificationsServiceMock.notifyMemberRemoved).toHaveBeenCalled();
    });

    it('ADMIN 可以移除 MEMBER', async () => {
      prismaMock.trip.findUnique.mockResolvedValue(tripWithAllRoles);
      prismaMock.user.findUnique
        .mockResolvedValueOnce(testUser2)
        .mockResolvedValueOnce(testUser3);
      prismaMock.tripMember.delete.mockResolvedValue({ id: 'member-3' });

      await service.removeMember('trip-1', testUser3.id, testUser2.id);

      expect(prismaMock.tripMember.delete).toHaveBeenCalled();
    });

    it('MEMBER 不能移除他人', async () => {
      prismaMock.trip.findUnique.mockResolvedValue(tripWithAllRoles);

      await expect(
        service.removeMember('trip-1', testUser2.id, testUser3.id),
      ).rejects.toThrow(ForbiddenException);
    });

    it('不能移除 OWNER', async () => {
      prismaMock.trip.findUnique.mockResolvedValue(tripWithAllRoles);

      await expect(
        service.removeMember('trip-1', testUser1.id, testUser2.id),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('leave', () => {
    it('MEMBER 可以離開旅程', async () => {
      prismaMock.trip.findUnique.mockResolvedValue(testTrip1);
      prismaMock.user.findUnique.mockResolvedValue(testUser2);
      prismaMock.tripMember.delete.mockResolvedValue({ id: 'member-2' });

      await service.leave('trip-1', testUser2.id);

      expect(prismaMock.tripMember.delete).toHaveBeenCalled();
      expect(notificationsServiceMock.notifyMemberLeft).toHaveBeenCalled();
    });

    it('OWNER 不能離開旅程', async () => {
      prismaMock.trip.findUnique.mockResolvedValue(testTrip1);

      await expect(service.leave('trip-1', testUser1.id)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('regenerateInviteCode', () => {
    it('OWNER 可以重新產生邀請碼', async () => {
      const ownerTrip = createTripWithMembersFixture(
        { id: 'trip-1' },
        [
          createTripMemberFixture({
            userId: testUser1.id,
            role: MemberRole.OWNER,
            user: { id: testUser1.id, name: testUser1.name, avatarUrl: testUser1.avatarUrl },
          }),
        ],
      );
      prismaMock.trip.findUnique.mockResolvedValue(ownerTrip);
      prismaMock.trip.update.mockResolvedValue({ ...ownerTrip, inviteCode: 'NEW123' });

      const result = await service.regenerateInviteCode('trip-1', testUser1.id);

      expect(prismaMock.trip.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            inviteCode: expect.any(String),
          }),
        }),
      );
    });

    it('ADMIN 可以重新產生邀請碼', async () => {
      const adminTrip = createTripWithMembersFixture(
        { id: 'trip-1' },
        [
          createTripMemberFixture({
            userId: 'owner-id',
            role: MemberRole.OWNER,
            user: { id: 'owner-id', name: 'Owner', avatarUrl: null },
          }),
          createTripMemberFixture({
            userId: testUser1.id,
            role: MemberRole.ADMIN,
            user: { id: testUser1.id, name: testUser1.name, avatarUrl: testUser1.avatarUrl },
          }),
        ],
      );
      prismaMock.trip.findUnique.mockResolvedValue(adminTrip);
      prismaMock.trip.update.mockResolvedValue({ ...adminTrip, inviteCode: 'NEW123' });

      await service.regenerateInviteCode('trip-1', testUser1.id);

      expect(prismaMock.trip.update).toHaveBeenCalled();
    });

    it('MEMBER 不能重新產生邀請碼', async () => {
      prismaMock.trip.findUnique.mockResolvedValue(testTrip1);

      await expect(
        service.regenerateInviteCode('trip-1', testUser2.id),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
