import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import {
  createUsersServiceMock,
  createJwtServiceMock,
  createConfigServiceMock,
  UsersServiceMock,
} from '../../../test/mocks/services.mock';
import { testUser1, lineUser, googleUser } from '../../../test/fixtures/users.fixture';

describe('AuthService', () => {
  let service: AuthService;
  let usersServiceMock: UsersServiceMock;
  let jwtServiceMock: ReturnType<typeof createJwtServiceMock>;
  let configServiceMock: ReturnType<typeof createConfigServiceMock>;

  beforeEach(async () => {
    usersServiceMock = createUsersServiceMock();
    jwtServiceMock = createJwtServiceMock();
    configServiceMock = createConfigServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersServiceMock },
        { provide: JwtService, useValue: jwtServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('loginWithLine', () => {
    const lineProfile = {
      name: 'LINE 用戶',
      avatarUrl: 'https://example.com/avatar.jpg',
    };

    it('應為新用戶建立帳號並返回 tokens', async () => {
      usersServiceMock.findByLineId.mockResolvedValue(null);
      usersServiceMock.create.mockResolvedValue(lineUser);

      const result = await service.loginWithLine('line-id-12345', lineProfile);

      expect(usersServiceMock.findByLineId).toHaveBeenCalledWith('line-id-12345');
      expect(usersServiceMock.create).toHaveBeenCalledWith({
        lineId: 'line-id-12345',
        name: lineProfile.name,
        avatarUrl: lineProfile.avatarUrl,
      });
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
    });

    it('應為現有用戶直接返回 tokens', async () => {
      usersServiceMock.findByLineId.mockResolvedValue(lineUser);

      const result = await service.loginWithLine('line-id-12345', lineProfile);

      expect(usersServiceMock.findByLineId).toHaveBeenCalledWith('line-id-12345');
      expect(usersServiceMock.create).not.toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken');
      expect(result.user.id).toBe(lineUser.id);
    });

    it('應產生有效的 JWT tokens', async () => {
      usersServiceMock.findByLineId.mockResolvedValue(lineUser);

      const result = await service.loginWithLine('line-id-12345', lineProfile);

      expect(jwtServiceMock.sign).toHaveBeenCalled();
      expect(result.accessToken).toBe('mock-jwt-token');
    });
  });

  describe('loginWithGoogle', () => {
    const googleProfile = {
      email: 'google@gmail.com',
      name: 'Google 用戶',
      avatarUrl: 'https://example.com/google-avatar.jpg',
    };

    it('應為新用戶建立帳號', async () => {
      usersServiceMock.findByGoogleId.mockResolvedValue(null);
      usersServiceMock.findByEmail.mockResolvedValue(null);
      usersServiceMock.create.mockResolvedValue(googleUser);

      const result = await service.loginWithGoogle('google-id-12345', googleProfile);

      expect(usersServiceMock.findByGoogleId).toHaveBeenCalledWith('google-id-12345');
      expect(usersServiceMock.findByEmail).toHaveBeenCalledWith(googleProfile.email);
      expect(usersServiceMock.create).toHaveBeenCalledWith({
        googleId: 'google-id-12345',
        email: googleProfile.email,
        name: googleProfile.name,
        avatarUrl: googleProfile.avatarUrl,
      });
      expect(result.user.email).toBe(googleProfile.email);
    });

    it('應將 Google 帳號連結到相同 email 的現有用戶', async () => {
      const existingUserWithEmail = {
        ...testUser1,
        email: googleProfile.email,
        googleId: null,
      };
      const updatedUser = { ...existingUserWithEmail, googleId: 'google-id-12345' };

      usersServiceMock.findByGoogleId.mockResolvedValue(null);
      usersServiceMock.findByEmail.mockResolvedValue(existingUserWithEmail);
      usersServiceMock.update.mockResolvedValue(updatedUser);

      const result = await service.loginWithGoogle('google-id-12345', googleProfile);

      expect(usersServiceMock.update).toHaveBeenCalledWith(existingUserWithEmail.id, {
        googleId: 'google-id-12345',
      });
      expect(usersServiceMock.create).not.toHaveBeenCalled();
      expect(result.user.id).toBe(existingUserWithEmail.id);
    });

    it('應為現有 Google 用戶直接登入', async () => {
      usersServiceMock.findByGoogleId.mockResolvedValue(googleUser);

      const result = await service.loginWithGoogle('google-id-12345', googleProfile);

      expect(usersServiceMock.findByGoogleId).toHaveBeenCalledWith('google-id-12345');
      expect(usersServiceMock.findByEmail).not.toHaveBeenCalled();
      expect(usersServiceMock.create).not.toHaveBeenCalled();
      expect(result.user.id).toBe(googleUser.id);
    });
  });

  describe('refreshToken', () => {
    it('應使用有效 refresh token 換發新 tokens', async () => {
      (jwtServiceMock.verify as jest.Mock).mockReturnValue({
        sub: testUser1.id,
        name: testUser1.name,
      });
      usersServiceMock.findById.mockResolvedValue(testUser1);

      const result = await service.refreshToken('valid-refresh-token');

      expect(jwtServiceMock.verify).toHaveBeenCalledWith('valid-refresh-token', {
        secret: 'test-refresh-secret',
      });
      expect(usersServiceMock.findById).toHaveBeenCalledWith(testUser1.id);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('應拒絕無效的 refresh token', async () => {
      (jwtServiceMock.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('應拒絕不存在用戶的 token', async () => {
      (jwtServiceMock.verify as jest.Mock).mockReturnValue({
        sub: 'non-existent-user',
        name: 'Test',
      });
      usersServiceMock.findById.mockResolvedValue(null);

      await expect(service.refreshToken('valid-but-user-deleted')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('validateUser', () => {
    it('應返回有效 payload 的用戶', async () => {
      usersServiceMock.findById.mockResolvedValue(testUser1);

      const result = await service.validateUser({
        sub: testUser1.id,
        name: testUser1.name,
      });

      expect(usersServiceMock.findById).toHaveBeenCalledWith(testUser1.id);
      expect(result).toEqual(testUser1);
    });

    it('應返回 null 當用戶不存在', async () => {
      usersServiceMock.findById.mockResolvedValue(null);

      const result = await service.validateUser({
        sub: 'non-existent',
        name: 'Test',
      });

      expect(result).toBeNull();
    });
  });
});
