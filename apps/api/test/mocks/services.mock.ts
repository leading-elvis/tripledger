/**
 * 服務 Mock 工廠
 * 用於單元測試中模擬其他服務的依賴
 */

import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

/**
 * NotificationsService Mock
 */
export const createNotificationsServiceMock = () => ({
  findAllByUser: jest.fn(),
  getUnreadCount: jest.fn(),
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
  delete: jest.fn(),
  createNotification: jest.fn(),
  createManyNotifications: jest.fn(),
  notifyBillCreated: jest.fn(),
  notifyBillUpdated: jest.fn(),
  notifyBillDeleted: jest.fn(),
  notifySettlementCreated: jest.fn(),
  notifySettlementConfirmed: jest.fn(),
  notifyMemberJoined: jest.fn(),
  notifyMemberLeft: jest.fn(),
  notifyMemberRemoved: jest.fn(),
  notifyTripInvite: jest.fn(),
  notifySettlementReminder: jest.fn(),
  notifySettlementReminders: jest.fn(),
});

export type NotificationsServiceMock = ReturnType<typeof createNotificationsServiceMock>;

/**
 * TripsService Mock
 */
export const createTripsServiceMock = () => ({
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
});

export type TripsServiceMock = ReturnType<typeof createTripsServiceMock>;

/**
 * UsersService Mock
 */
export const createUsersServiceMock = () => ({
  create: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  findByLineId: jest.fn(),
  findByGoogleId: jest.fn(),
  findByDiscordId: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

export type UsersServiceMock = ReturnType<typeof createUsersServiceMock>;

/**
 * JwtService Mock
 */
export const createJwtServiceMock = (): Partial<JwtService> => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
  verify: jest.fn().mockReturnValue({ sub: 'user-id', email: 'test@example.com' }),
  verifyAsync: jest.fn().mockResolvedValue({ sub: 'user-id', email: 'test@example.com' }),
});

export type JwtServiceMock = ReturnType<typeof createJwtServiceMock>;

/**
 * ConfigService Mock
 */
export const createConfigServiceMock = (): Partial<ConfigService> => ({
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      JWT_SECRET: 'test-jwt-secret',
      JWT_EXPIRES_IN: '7d',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      JWT_REFRESH_EXPIRES_IN: '30d',
    };
    return config[key];
  }),
});

export type ConfigServiceMock = ReturnType<typeof createConfigServiceMock>;

/**
 * BillsService Mock
 */
export const createBillsServiceMock = () => ({
  create: jest.fn(),
  findAllByTrip: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  getStatsByCategory: jest.fn(),
});

export type BillsServiceMock = ReturnType<typeof createBillsServiceMock>;

/**
 * SettlementService Mock
 */
export const createSettlementServiceMock = () => ({
  calculateBalances: jest.fn(),
  calculateOptimizedSettlements: jest.fn(),
  createSettlement: jest.fn(),
  confirmSettlement: jest.fn(),
  cancelSettlement: jest.fn(),
  getSettlementsByTrip: jest.fn(),
  getPendingSettlements: jest.fn(),
  getTripSummary: jest.fn(),
});

export type SettlementServiceMock = ReturnType<typeof createSettlementServiceMock>;
