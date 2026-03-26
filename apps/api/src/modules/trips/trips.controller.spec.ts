import { Test, TestingModule } from '@nestjs/testing';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { MemberRole } from '@prisma/client';

describe('TripsController', () => {
  let controller: TripsController;
  let tripsService: jest.Mocked<TripsService>;

  const mockUser = { id: 'user-1' };
  const mockTrip = {
    id: 'trip-1',
    name: '日本旅行',
    description: '東京五日遊',
    coverImage: null,
    startDate: null,
    endDate: null,
    inviteCode: 'ABC123',
    defaultCurrency: 'TWD',
    premiumExpiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    members: [
      {
        id: 'member-1',
        tripId: 'trip-1',
        userId: 'user-1',
        role: MemberRole.OWNER,
        nickname: null,
        joinedAt: new Date(),
        user: { id: 'user-1', name: '測試用戶', avatarUrl: null },
      },
    ],
    _count: { bills: 0 },
  } as any;

  beforeEach(async () => {
    const mockTripsService = {
      create: jest.fn(),
      findAllByUser: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      joinByInviteCode: jest.fn(),
      getMembers: jest.fn(),
      removeMember: jest.fn(),
      leave: jest.fn(),
      regenerateInviteCode: jest.fn(),
      updateMemberNickname: jest.fn(),
      updateMemberRole: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TripsController],
      providers: [
        { provide: TripsService, useValue: mockTripsService },
      ],
    }).compile();

    controller = module.get<TripsController>(TripsController);
    tripsService = module.get(TripsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('應建立新旅程', async () => {
      tripsService.create.mockResolvedValue(mockTrip);

      const dto = { name: '日本旅行', description: '東京五日遊' };
      const result = await controller.create(mockUser, dto);

      expect(tripsService.create).toHaveBeenCalledWith(mockUser.id, dto);
      expect(result).toEqual(mockTrip);
    });
  });

  describe('findAll', () => {
    it('應返回用戶所有旅程', async () => {
      tripsService.findAllByUser.mockResolvedValue([mockTrip]);

      const result = await controller.findAll(mockUser);

      expect(tripsService.findAllByUser).toHaveBeenCalledWith(mockUser.id);
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('應返回旅程詳情', async () => {
      tripsService.findById.mockResolvedValue(mockTrip);

      const result = await controller.findOne('trip-1', mockUser);

      expect(tripsService.findById).toHaveBeenCalledWith('trip-1', mockUser.id);
      expect(result).toEqual(mockTrip);
    });
  });

  describe('update', () => {
    it('應更新旅程', async () => {
      const updatedTrip = { ...mockTrip, name: '更新後名稱' };
      tripsService.update.mockResolvedValue(updatedTrip);

      const dto = { name: '更新後名稱' };
      const result = await controller.update('trip-1', mockUser, dto);

      expect(tripsService.update).toHaveBeenCalledWith('trip-1', mockUser.id, dto);
      expect(result.name).toBe('更新後名稱');
    });
  });

  describe('delete', () => {
    it('應刪除旅程', async () => {
      tripsService.delete.mockResolvedValue(mockTrip);

      const result = await controller.delete('trip-1', mockUser);

      expect(tripsService.delete).toHaveBeenCalledWith('trip-1', mockUser.id);
      expect(result).toEqual({ message: '旅程已刪除' });
    });
  });

  describe('join', () => {
    it('應透過邀請碼加入旅程', async () => {
      tripsService.joinByInviteCode.mockResolvedValue(mockTrip);

      const dto = { inviteCode: 'ABC123' };
      const result = await controller.join(mockUser, dto);

      expect(tripsService.joinByInviteCode).toHaveBeenCalledWith('ABC123', mockUser.id);
      expect(result).toEqual(mockTrip);
    });
  });

  describe('getMembers', () => {
    it('應返回旅程成員', async () => {
      tripsService.getMembers.mockResolvedValue(mockTrip.members);

      const result = await controller.getMembers('trip-1', mockUser);

      expect(tripsService.getMembers).toHaveBeenCalledWith('trip-1', mockUser.id);
      expect(result).toHaveLength(1);
    });
  });

  describe('removeMember', () => {
    it('應移除成員', async () => {
      tripsService.removeMember.mockResolvedValue(mockTrip.members[0]);

      const result = await controller.removeMember('trip-1', 'member-1', mockUser);

      expect(tripsService.removeMember).toHaveBeenCalledWith('trip-1', 'member-1', mockUser.id);
      expect(result).toEqual({ message: '成員已移除' });
    });
  });

  describe('leave', () => {
    it('應離開旅程', async () => {
      tripsService.leave.mockResolvedValue(mockTrip.members[0]);

      const result = await controller.leave('trip-1', mockUser);

      expect(tripsService.leave).toHaveBeenCalledWith('trip-1', mockUser.id);
      expect(result).toEqual({ message: '已離開旅程' });
    });
  });

  describe('regenerateInviteCode', () => {
    it('應重新產生邀請碼', async () => {
      const tripWithNewCode = { ...mockTrip, inviteCode: 'XYZ789' };
      tripsService.regenerateInviteCode.mockResolvedValue(tripWithNewCode);

      const result = await controller.regenerateInviteCode('trip-1', mockUser);

      expect(tripsService.regenerateInviteCode).toHaveBeenCalledWith('trip-1', mockUser.id);
      expect(result.inviteCode).toBe('XYZ789');
    });
  });

  describe('updateMemberNickname', () => {
    it('應更新成員暱稱', async () => {
      const updatedMember = { ...mockTrip.members[0], nickname: '新暱稱' };
      tripsService.updateMemberNickname.mockResolvedValue(updatedMember);

      const dto = { nickname: '新暱稱' };
      const result = await controller.updateMemberNickname('trip-1', 'member-1', mockUser, dto);

      expect(tripsService.updateMemberNickname).toHaveBeenCalledWith('trip-1', 'member-1', mockUser.id, '新暱稱');
      expect(result.nickname).toBe('新暱稱');
    });
  });

  describe('updateMemberRole', () => {
    it('應更新成員角色', async () => {
      const updatedMember = { ...mockTrip.members[0], role: MemberRole.ADMIN };
      tripsService.updateMemberRole.mockResolvedValue(updatedMember);

      const dto = { role: MemberRole.ADMIN };
      const result = await controller.updateMemberRole('trip-1', 'member-1', mockUser, dto);

      expect(tripsService.updateMemberRole).toHaveBeenCalledWith('trip-1', 'member-1', mockUser.id, MemberRole.ADMIN);
      expect(result.role).toBe(MemberRole.ADMIN);
    });
  });
});
