import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../../test/mocks/prisma.mock';
import {
  testUser1,
  testUser2,
  lineUser,
  googleUser,
  createUserFixture,
} from '../../../test/fixtures/users.fixture';

describe('UsersService', () => {
  let service: UsersService;
  let prismaMock: PrismaMock;

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('應建立新用戶', async () => {
      const newUser = createUserFixture({ id: 'new-user-id', name: '新用戶' });
      prismaMock.user.create.mockResolvedValue(newUser);

      const result = await service.create({
        name: '新用戶',
        email: 'new@example.com',
      });

      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          name: '新用戶',
          email: 'new@example.com',
        },
      });
      expect(result).toEqual(newUser);
    });

    it('應建立帶有社交登入 ID 的用戶', async () => {
      prismaMock.user.create.mockResolvedValue(lineUser);

      await service.create({
        name: 'LINE 用戶',
        lineId: 'line-id-12345',
      });

      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          name: 'LINE 用戶',
          lineId: 'line-id-12345',
        },
      });
    });
  });

  describe('findById', () => {
    it('應返回存在的用戶', async () => {
      prismaMock.user.findUnique.mockResolvedValue(testUser1);

      const result = await service.findById(testUser1.id);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: testUser1.id },
      });
      expect(result).toEqual(testUser1);
    });

    it('應返回 null 當用戶不存在', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const result = await service.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('應返回匹配 email 的用戶', async () => {
      prismaMock.user.findUnique.mockResolvedValue(testUser1);

      const result = await service.findByEmail(testUser1.email!);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: testUser1.email },
      });
      expect(result).toEqual(testUser1);
    });

    it('應返回 null 當 email 不存在', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findByLineId', () => {
    it('應返回匹配 LINE ID 的用戶', async () => {
      prismaMock.user.findUnique.mockResolvedValue(lineUser);

      const result = await service.findByLineId('line-id-12345');

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { lineId: 'line-id-12345' },
      });
      expect(result).toEqual(lineUser);
    });
  });

  describe('findByGoogleId', () => {
    it('應返回匹配 Google ID 的用戶', async () => {
      prismaMock.user.findUnique.mockResolvedValue(googleUser);

      const result = await service.findByGoogleId('google-id-12345');

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { googleId: 'google-id-12345' },
      });
      expect(result).toEqual(googleUser);
    });
  });

  describe('findByDiscordId', () => {
    it('應返回匹配 Discord ID 的用戶', async () => {
      const discordUser = createUserFixture({
        id: 'discord-user',
        name: 'Discord 用戶',
        discordId: 'discord-id-12345',
      });
      prismaMock.user.findUnique.mockResolvedValue(discordUser);

      const result = await service.findByDiscordId('discord-id-12345');

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { discordId: 'discord-id-12345' },
      });
      expect(result).toEqual(discordUser);
    });
  });

  describe('update', () => {
    it('應更新用戶資料', async () => {
      const updatedUser = { ...testUser1, name: '新名字' };
      prismaMock.user.update.mockResolvedValue(updatedUser);

      const result = await service.update(testUser1.id, { name: '新名字' });

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: testUser1.id },
        data: { name: '新名字' },
      });
      expect(result.name).toBe('新名字');
    });

    it('應更新頭像 URL', async () => {
      const newAvatarUrl = 'https://example.com/new-avatar.jpg';
      const updatedUser = { ...testUser1, avatarUrl: newAvatarUrl };
      prismaMock.user.update.mockResolvedValue(updatedUser);

      const result = await service.update(testUser1.id, { avatarUrl: newAvatarUrl });

      expect(result.avatarUrl).toBe(newAvatarUrl);
    });

    it('應連結社交登入帳號', async () => {
      const updatedUser = { ...testUser1, googleId: 'google-id-new' };
      prismaMock.user.update.mockResolvedValue(updatedUser);

      const result = await service.update(testUser1.id, { googleId: 'google-id-new' });

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: testUser1.id },
        data: { googleId: 'google-id-new' },
      });
      expect(result.googleId).toBe('google-id-new');
    });
  });

  describe('delete', () => {
    it('應刪除用戶', async () => {
      prismaMock.user.delete.mockResolvedValue(testUser1);

      const result = await service.delete(testUser1.id);

      expect(prismaMock.user.delete).toHaveBeenCalledWith({
        where: { id: testUser1.id },
      });
      expect(result).toEqual(testUser1);
    });
  });
});
