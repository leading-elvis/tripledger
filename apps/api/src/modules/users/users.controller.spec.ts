import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;

  const mockUser = { id: 'user-1' };
  const mockUserData = {
    id: 'user-1',
    name: '測試用戶',
    email: 'test@example.com',
    avatarUrl: 'https://example.com/avatar.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  beforeEach(async () => {
    const mockUsersService = {
      findById: jest.fn(),
      update: jest.fn(),
      hasSharedTrip: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMe', () => {
    it('應返回當前用戶資訊', async () => {
      usersService.findById.mockResolvedValue(mockUserData);

      const result = await controller.getMe(mockUser);

      expect(usersService.findById).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(mockUserData);
    });
  });

  describe('updateMe', () => {
    it('應更新當前用戶資訊', async () => {
      const updatedUser = { ...mockUserData, name: '新名稱' };
      usersService.update.mockResolvedValue(updatedUser);

      const dto = { name: '新名稱' };
      const result = await controller.updateMe(mockUser, dto);

      expect(usersService.update).toHaveBeenCalledWith(mockUser.id, dto);
      expect(result.name).toBe('新名稱');
    });

    it('應更新用戶頭像', async () => {
      const updatedUser = { ...mockUserData, avatarUrl: 'https://new-avatar.jpg' };
      usersService.update.mockResolvedValue(updatedUser);

      const dto = { avatarUrl: 'https://new-avatar.jpg' };
      const result = await controller.updateMe(mockUser, dto);

      expect(usersService.update).toHaveBeenCalledWith(mockUser.id, dto);
      expect(result.avatarUrl).toBe('https://new-avatar.jpg');
    });
  });

  describe('getUser', () => {
    it('應返回共享旅程的用戶資訊', async () => {
      usersService.hasSharedTrip.mockResolvedValue(true);
      usersService.findById.mockResolvedValue(mockUserData);

      const result = await controller.getUser('user-2', mockUser);

      expect(usersService.hasSharedTrip).toHaveBeenCalledWith(mockUser.id, 'user-2');
      expect(usersService.findById).toHaveBeenCalledWith('user-2');
      expect(result).toEqual({
        id: mockUserData.id,
        name: mockUserData.name,
        avatarUrl: mockUserData.avatarUrl,
      });
    });

    it('應拒絕未共享旅程的用戶查看', async () => {
      usersService.hasSharedTrip.mockResolvedValue(false);

      await expect(controller.getUser('user-2', mockUser)).rejects.toThrow(ForbiddenException);
      expect(usersService.hasSharedTrip).toHaveBeenCalledWith(mockUser.id, 'user-2');
      expect(usersService.findById).not.toHaveBeenCalled();
    });

    it('應返回 404 當用戶不存在', async () => {
      usersService.hasSharedTrip.mockResolvedValue(true);
      usersService.findById.mockResolvedValue(null);

      await expect(controller.getUser('nonexistent', mockUser)).rejects.toThrow(NotFoundException);
    });
  });
});
