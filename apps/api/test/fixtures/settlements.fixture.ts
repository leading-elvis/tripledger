/**
 * 結算測試資料固定值
 */

import { SettlementStatus, Currency } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { testUser1, testUser2, testUser3, testUser4 } from './users.fixture';

export interface SettlementFixture {
  id: string;
  tripId: string;
  payerId: string;
  receiverId: string;
  amount: Decimal | number;
  status: SettlementStatus;
  settledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  payer?: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  receiver?: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  trip?: {
    id: string;
    name: string;
    members?: { userId: string }[];
  };
}

export interface BalanceInfoFixture {
  userId: string;
  virtualMemberId?: string;
  isVirtual: boolean;
  userName: string;
  userAvatar: string | null;
  paid: number;
  owed: number;
  balance: number;
}

/**
 * 建立結算 Fixture
 */
export const createSettlementFixture = (
  overrides: Partial<SettlementFixture> = {},
): SettlementFixture => ({
  id: 'settlement-uuid-1',
  tripId: 'trip-uuid-1',
  payerId: 'user-uuid-1',
  receiverId: 'user-uuid-2',
  amount: new Decimal(500),
  status: SettlementStatus.PENDING,
  settledAt: null,
  createdAt: new Date('2024-01-20'),
  updatedAt: new Date('2024-01-20'),
  payer: { id: 'user-uuid-1', name: '付款人', avatarUrl: null },
  receiver: { id: 'user-uuid-2', name: '收款人', avatarUrl: null },
  ...overrides,
});

/**
 * 建立餘額資訊 Fixture
 */
export const createBalanceInfoFixture = (
  overrides: Partial<BalanceInfoFixture> = {},
): BalanceInfoFixture => ({
  userId: 'user-uuid-1',
  isVirtual: false,
  userName: '測試用戶',
  userAvatar: null,
  paid: 0,
  owed: 0,
  balance: 0,
  ...overrides,
});

// ====================================
// 測試場景 Fixtures
// ====================================

/**
 * 場景：簡單雙人債務
 * A paid 1000, owes 500 -> balance = +500
 * B paid 0, owes 500 -> balance = -500
 * 預期結算：B -> A 500
 */
export const simpleTwoPersonScenario = {
  balances: [
    createBalanceInfoFixture({
      userId: testUser1.id,
      userName: testUser1.name,
      paid: 1000,
      owed: 500,
      balance: 500,
    }),
    createBalanceInfoFixture({
      userId: testUser2.id,
      userName: testUser2.name,
      paid: 0,
      owed: 500,
      balance: -500,
    }),
  ],
  expectedSettlements: [
    {
      from: { id: testUser2.id, name: testUser2.name, avatarUrl: testUser2.avatarUrl },
      to: { id: testUser1.id, name: testUser1.name, avatarUrl: testUser1.avatarUrl },
      amount: 500,
      currency: Currency.TWD,
    },
  ],
};

/**
 * 場景：三人複雜債務
 * A paid 1500, owes 666.67 -> balance = +833.33
 * B paid 500, owes 666.67 -> balance = -166.67
 * C paid 0, owes 666.67 -> balance = -666.67
 *
 * 最佳化結算：
 * C -> A 666.67
 * B -> A 166.67 (剩餘)
 */
export const threePersonScenario = {
  balances: [
    createBalanceInfoFixture({
      userId: testUser1.id,
      userName: testUser1.name,
      paid: 1500,
      owed: 666.67,
      balance: 833.33,
    }),
    createBalanceInfoFixture({
      userId: testUser2.id,
      userName: testUser2.name,
      paid: 500,
      owed: 666.67,
      balance: -166.67,
    }),
    createBalanceInfoFixture({
      userId: testUser3.id,
      userName: testUser3.name,
      paid: 0,
      owed: 666.67,
      balance: -666.67,
    }),
  ],
};

/**
 * 場景：環形債務抵消
 * A -> B 100, B -> C 100, C -> A 100
 * 淨額計算後，所有人餘額為 0，無需結算
 */
export const circularDebtScenario = {
  balances: [
    createBalanceInfoFixture({
      userId: testUser1.id,
      userName: testUser1.name,
      paid: 100,
      owed: 100,
      balance: 0,
    }),
    createBalanceInfoFixture({
      userId: testUser2.id,
      userName: testUser2.name,
      paid: 100,
      owed: 100,
      balance: 0,
    }),
    createBalanceInfoFixture({
      userId: testUser3.id,
      userName: testUser3.name,
      paid: 100,
      owed: 100,
      balance: 0,
    }),
  ],
  expectedSettlements: [],
};

/**
 * 場景：四人複雜債務網路
 * A: balance = +600 (債權人)
 * B: balance = +200 (債權人)
 * C: balance = -300 (債務人)
 * D: balance = -500 (債務人)
 *
 * 貪婪演算法預期結果：
 * 1. D(-500) -> A(+600) = 500, A剩100, D結清
 * 2. C(-300) -> A(+100) = 100, A結清, C剩200
 * 3. C(-200) -> B(+200) = 200, B結清, C結清
 *
 * 總共 3 筆交易
 */
export const complexFourPersonScenario = {
  balances: [
    createBalanceInfoFixture({
      userId: testUser1.id,
      userName: testUser1.name,
      paid: 1200,
      owed: 600,
      balance: 600,
    }),
    createBalanceInfoFixture({
      userId: testUser2.id,
      userName: testUser2.name,
      paid: 800,
      owed: 600,
      balance: 200,
    }),
    createBalanceInfoFixture({
      userId: testUser3.id,
      userName: testUser3.name,
      paid: 300,
      owed: 600,
      balance: -300,
    }),
    createBalanceInfoFixture({
      userId: testUser4.id,
      userName: testUser4.name,
      paid: 100,
      owed: 600,
      balance: -500,
    }),
  ],
};

// 預設測試結算記錄
export const pendingSettlement = createSettlementFixture({
  id: 'pending-settlement-1',
  payerId: testUser2.id,
  receiverId: testUser1.id,
  amount: new Decimal(500),
  status: SettlementStatus.PENDING,
  payer: { id: testUser2.id, name: testUser2.name, avatarUrl: testUser2.avatarUrl },
  receiver: { id: testUser1.id, name: testUser1.name, avatarUrl: testUser1.avatarUrl },
  trip: {
    id: 'trip-1',
    name: '東京旅行',
    members: [{ userId: testUser1.id }, { userId: testUser2.id }],
  },
});

export const confirmedSettlement = createSettlementFixture({
  id: 'confirmed-settlement-1',
  payerId: testUser2.id,
  receiverId: testUser1.id,
  amount: new Decimal(300),
  status: SettlementStatus.CONFIRMED,
  settledAt: new Date('2024-01-21'),
  payer: { id: testUser2.id, name: testUser2.name, avatarUrl: testUser2.avatarUrl },
  receiver: { id: testUser1.id, name: testUser1.name, avatarUrl: testUser1.avatarUrl },
});

export const cancelledSettlement = createSettlementFixture({
  id: 'cancelled-settlement-1',
  payerId: testUser2.id,
  receiverId: testUser1.id,
  amount: new Decimal(200),
  status: SettlementStatus.CANCELLED,
  payer: { id: testUser2.id, name: testUser2.name, avatarUrl: testUser2.avatarUrl },
  receiver: { id: testUser1.id, name: testUser1.name, avatarUrl: testUser1.avatarUrl },
});
