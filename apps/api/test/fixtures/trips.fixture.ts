/**
 * 旅程測試資料固定值
 */

import { MemberRole } from '@prisma/client';
import { createSimpleUserFixture, testUser1, testUser2, testUser3 } from './users.fixture';

export interface TripFixture {
  id: string;
  name: string;
  description: string | null;
  coverImage: string | null;
  inviteCode: string;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TripMemberFixture {
  id: string;
  tripId: string;
  userId: string;
  nickname: string | null;
  role: MemberRole;
  joinedAt: Date;
  user?: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

export interface TripWithMembersFixture extends TripFixture {
  members: TripMemberFixture[];
}

/**
 * 建立旅程 Fixture
 */
export const createTripFixture = (overrides: Partial<TripFixture> = {}): TripFixture => ({
  id: 'trip-uuid-1',
  name: '東京旅行',
  description: '2024 年東京五日遊',
  coverImage: null,
  inviteCode: 'ABC123',
  startDate: new Date('2024-03-01'),
  endDate: new Date('2024-03-05'),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

/**
 * 建立旅程成員 Fixture
 */
export const createTripMemberFixture = (
  overrides: Partial<TripMemberFixture> = {},
): TripMemberFixture => ({
  id: 'member-uuid-1',
  tripId: 'trip-uuid-1',
  userId: 'user-uuid-1',
  nickname: null,
  role: MemberRole.MEMBER,
  joinedAt: new Date('2024-01-01'),
  user: createSimpleUserFixture(),
  ...overrides,
});

/**
 * 建立帶成員的旅程 Fixture
 */
export const createTripWithMembersFixture = (
  tripOverrides: Partial<TripFixture> = {},
  members?: TripMemberFixture[],
): TripWithMembersFixture => ({
  ...createTripFixture(tripOverrides),
  members: members || [
    createTripMemberFixture({
      id: 'member-1',
      userId: testUser1.id,
      role: MemberRole.OWNER,
      user: { id: testUser1.id, name: testUser1.name, avatarUrl: testUser1.avatarUrl },
    }),
    createTripMemberFixture({
      id: 'member-2',
      userId: testUser2.id,
      role: MemberRole.MEMBER,
      user: { id: testUser2.id, name: testUser2.name, avatarUrl: testUser2.avatarUrl },
    }),
    createTripMemberFixture({
      id: 'member-3',
      userId: testUser3.id,
      role: MemberRole.MEMBER,
      user: { id: testUser3.id, name: testUser3.name, avatarUrl: testUser3.avatarUrl },
    }),
  ],
});

// 預設測試旅程
export const testTrip1 = createTripWithMembersFixture({
  id: 'trip-1',
  name: '東京旅行',
  inviteCode: 'TOKYO123',
});

export const testTrip2 = createTripWithMembersFixture(
  {
    id: 'trip-2',
    name: '大阪旅行',
    inviteCode: 'OSAKA456',
  },
  [
    createTripMemberFixture({
      id: 'member-4',
      tripId: 'trip-2',
      userId: testUser2.id,
      role: MemberRole.OWNER,
      user: { id: testUser2.id, name: testUser2.name, avatarUrl: testUser2.avatarUrl },
    }),
  ],
);
