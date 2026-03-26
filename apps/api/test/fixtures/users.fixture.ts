/**
 * 用戶測試資料固定值
 */

export const createUserFixture = (overrides: Partial<UserFixture> = {}): UserFixture => ({
  id: 'user-uuid-1',
  email: 'test@example.com',
  name: '測試用戶',
  avatarUrl: 'https://example.com/avatar.jpg',
  lineId: null,
  googleId: null,
  discordId: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

export interface UserFixture {
  id: string;
  email: string | null;
  name: string;
  avatarUrl: string | null;
  lineId: string | null;
  googleId: string | null;
  discordId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// 預設測試用戶
export const testUser1 = createUserFixture({
  id: 'user-1',
  name: '小明',
  email: 'xiaoming@example.com',
});

export const testUser2 = createUserFixture({
  id: 'user-2',
  name: '小華',
  email: 'xiaohua@example.com',
});

export const testUser3 = createUserFixture({
  id: 'user-3',
  name: '小美',
  email: 'xiaomei@example.com',
});

export const testUser4 = createUserFixture({
  id: 'user-4',
  name: '小強',
  email: 'xiaoqiang@example.com',
});

// LINE 登入用戶
export const lineUser = createUserFixture({
  id: 'line-user-1',
  name: 'LINE 用戶',
  email: null,
  lineId: 'line-id-12345',
});

// Google 登入用戶
export const googleUser = createUserFixture({
  id: 'google-user-1',
  name: 'Google 用戶',
  email: 'google@gmail.com',
  googleId: 'google-id-12345',
});

// 簡化的用戶資訊（用於巢狀資料）
export const createSimpleUserFixture = (overrides: Partial<SimpleUserFixture> = {}): SimpleUserFixture => ({
  id: 'user-uuid-1',
  name: '測試用戶',
  avatarUrl: null,
  ...overrides,
});

export interface SimpleUserFixture {
  id: string;
  name: string;
  avatarUrl: string | null;
}
