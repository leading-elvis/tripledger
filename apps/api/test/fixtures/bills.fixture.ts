/**
 * 帳單測試資料固定值
 */

import { BillCategory, SplitType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { createSimpleUserFixture, testUser1, testUser2, testUser3 } from './users.fixture';

export interface BillShareFixture {
  id: string;
  billId: string;
  userId: string;
  amount: Decimal | number;
  user?: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

export interface BillItemFixture {
  id: string;
  billId: string;
  name: string;
  amount: Decimal | number;
  shares?: BillItemShareFixture[];
}

export interface BillItemShareFixture {
  id: string;
  billItemId: string;
  userId: string;
  amount: Decimal | number;
  user?: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

export interface BillFixture {
  id: string;
  tripId: string;
  payerId: string;
  title: string;
  amount: Decimal | number;
  category: BillCategory;
  splitType: SplitType;
  receiptImage: string | null;
  note: string | null;
  paidAt: Date;
  createdAt: Date;
  updatedAt: Date;
  payer?: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  shares?: BillShareFixture[];
  items?: BillItemFixture[];
  // 用於測試時包含旅程資訊
  trip?: {
    id: string;
    name: string;
    members: { userId: string; role?: string }[];
  };
}

/**
 * 建立帳單 Fixture
 */
export const createBillFixture = (overrides: Partial<BillFixture> = {}): BillFixture => ({
  id: 'bill-uuid-1',
  tripId: 'trip-uuid-1',
  payerId: 'user-uuid-1',
  title: '晚餐',
  amount: new Decimal(1000),
  category: BillCategory.FOOD,
  splitType: SplitType.EQUAL,
  receiptImage: null,
  note: null,
  paidAt: new Date('2024-01-15'),
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-15'),
  payer: createSimpleUserFixture(),
  shares: [],
  ...overrides,
});

/**
 * 建立帳單分攤 Fixture
 */
export const createBillShareFixture = (
  overrides: Partial<BillShareFixture> = {},
): BillShareFixture => ({
  id: 'share-uuid-1',
  billId: 'bill-uuid-1',
  userId: 'user-uuid-1',
  amount: new Decimal(333.33),
  user: createSimpleUserFixture(),
  ...overrides,
});

/**
 * 建立帳單品項 Fixture
 */
export const createBillItemFixture = (
  overrides: Partial<BillItemFixture> = {},
): BillItemFixture => ({
  id: 'item-uuid-1',
  billId: 'bill-uuid-1',
  name: '牛排',
  amount: new Decimal(500),
  shares: [],
  ...overrides,
});

// ====================================
// 測試場景 Fixtures
// ====================================

/**
 * 場景：三人平均分攤 1000 元
 * 預期：每人 333.33，第一人 333.34（餘數）
 */
export const equalSplitBill = createBillFixture({
  id: 'equal-split-bill',
  title: '三人聚餐',
  amount: new Decimal(1000),
  splitType: SplitType.EQUAL,
  payerId: testUser1.id,
  payer: { id: testUser1.id, name: testUser1.name, avatarUrl: testUser1.avatarUrl },
  shares: [
    createBillShareFixture({
      id: 'share-1',
      billId: 'equal-split-bill',
      userId: testUser1.id,
      amount: new Decimal(333.34),
      user: { id: testUser1.id, name: testUser1.name, avatarUrl: testUser1.avatarUrl },
    }),
    createBillShareFixture({
      id: 'share-2',
      billId: 'equal-split-bill',
      userId: testUser2.id,
      amount: new Decimal(333.33),
      user: { id: testUser2.id, name: testUser2.name, avatarUrl: testUser2.avatarUrl },
    }),
    createBillShareFixture({
      id: 'share-3',
      billId: 'equal-split-bill',
      userId: testUser3.id,
      amount: new Decimal(333.33),
      user: { id: testUser3.id, name: testUser3.name, avatarUrl: testUser3.avatarUrl },
    }),
  ],
});

/**
 * 場景：精確金額分攤
 * 總額 1000 元：A=500, B=300, C=200
 */
export const exactSplitBill = createBillFixture({
  id: 'exact-split-bill',
  title: '分項付款',
  amount: new Decimal(1000),
  splitType: SplitType.EXACT,
  payerId: testUser1.id,
  payer: { id: testUser1.id, name: testUser1.name, avatarUrl: testUser1.avatarUrl },
  shares: [
    createBillShareFixture({
      id: 'share-1',
      billId: 'exact-split-bill',
      userId: testUser1.id,
      amount: new Decimal(500),
      user: { id: testUser1.id, name: testUser1.name, avatarUrl: testUser1.avatarUrl },
    }),
    createBillShareFixture({
      id: 'share-2',
      billId: 'exact-split-bill',
      userId: testUser2.id,
      amount: new Decimal(300),
      user: { id: testUser2.id, name: testUser2.name, avatarUrl: testUser2.avatarUrl },
    }),
    createBillShareFixture({
      id: 'share-3',
      billId: 'exact-split-bill',
      userId: testUser3.id,
      amount: new Decimal(200),
      user: { id: testUser3.id, name: testUser3.name, avatarUrl: testUser3.avatarUrl },
    }),
  ],
});

/**
 * 場景：百分比分攤
 * 總額 1000 元：A=50%, B=30%, C=20%
 */
export const percentageSplitBill = createBillFixture({
  id: 'percentage-split-bill',
  title: '百分比分攤',
  amount: new Decimal(1000),
  splitType: SplitType.PERCENTAGE,
  payerId: testUser1.id,
  payer: { id: testUser1.id, name: testUser1.name, avatarUrl: testUser1.avatarUrl },
  shares: [
    createBillShareFixture({
      id: 'share-1',
      billId: 'percentage-split-bill',
      userId: testUser1.id,
      amount: new Decimal(500),
      user: { id: testUser1.id, name: testUser1.name, avatarUrl: testUser1.avatarUrl },
    }),
    createBillShareFixture({
      id: 'share-2',
      billId: 'percentage-split-bill',
      userId: testUser2.id,
      amount: new Decimal(300),
      user: { id: testUser2.id, name: testUser2.name, avatarUrl: testUser2.avatarUrl },
    }),
    createBillShareFixture({
      id: 'share-3',
      billId: 'percentage-split-bill',
      userId: testUser3.id,
      amount: new Decimal(200),
      user: { id: testUser3.id, name: testUser3.name, avatarUrl: testUser3.avatarUrl },
    }),
  ],
});

/**
 * 場景：份數分攤
 * 總額 1000 元：A=2份, B=1份, C=1份（共4份）
 * 預期：A=500, B=250, C=250
 */
export const sharesSplitBill = createBillFixture({
  id: 'shares-split-bill',
  title: '份數分攤',
  amount: new Decimal(1000),
  splitType: SplitType.SHARES,
  payerId: testUser1.id,
  payer: { id: testUser1.id, name: testUser1.name, avatarUrl: testUser1.avatarUrl },
  shares: [
    createBillShareFixture({
      id: 'share-1',
      billId: 'shares-split-bill',
      userId: testUser1.id,
      amount: new Decimal(500),
      user: { id: testUser1.id, name: testUser1.name, avatarUrl: testUser1.avatarUrl },
    }),
    createBillShareFixture({
      id: 'share-2',
      billId: 'shares-split-bill',
      userId: testUser2.id,
      amount: new Decimal(250),
      user: { id: testUser2.id, name: testUser2.name, avatarUrl: testUser2.avatarUrl },
    }),
    createBillShareFixture({
      id: 'share-3',
      billId: 'shares-split-bill',
      userId: testUser3.id,
      amount: new Decimal(250),
      user: { id: testUser3.id, name: testUser3.name, avatarUrl: testUser3.avatarUrl },
    }),
  ],
});

/**
 * 建立帳單輸入資料（用於 create/update 測試）
 */
export const createBillInputFixture = (splitType: SplitType = SplitType.EQUAL) => {
  const base = {
    tripId: 'trip-1',
    title: '測試帳單',
    amount: 1000,
    category: BillCategory.FOOD,
    splitType,
    participants: [
      { userId: testUser1.id },
      { userId: testUser2.id },
      { userId: testUser3.id },
    ],
  };

  switch (splitType) {
    case SplitType.EQUAL:
      return base;
    case SplitType.EXACT:
      return {
        ...base,
        participants: [
          { userId: testUser1.id, amount: 500 },
          { userId: testUser2.id, amount: 300 },
          { userId: testUser3.id, amount: 200 },
        ],
      };
    case SplitType.PERCENTAGE:
      return {
        ...base,
        participants: [
          { userId: testUser1.id, percentage: 50 },
          { userId: testUser2.id, percentage: 30 },
          { userId: testUser3.id, percentage: 20 },
        ],
      };
    case SplitType.SHARES:
      return {
        ...base,
        participants: [
          { userId: testUser1.id, shares: 2 },
          { userId: testUser2.id, shares: 1 },
          { userId: testUser3.id, shares: 1 },
        ],
      };
    case SplitType.ITEMIZED:
      return {
        ...base,
        items: [
          {
            name: '牛排',
            amount: 600,
            participantIds: [testUser1.id, testUser2.id],
          },
          {
            name: '沙拉',
            amount: 400,
            participantIds: [testUser2.id, testUser3.id],
          },
        ],
      };
    default:
      return base;
  }
};
