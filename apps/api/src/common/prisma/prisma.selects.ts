/**
 * 常用的 Prisma select 物件
 *
 * 集中管理常用的資料選擇模式，減少程式碼重複
 */

/**
 * 用戶基本資訊（頭像列表、成員顯示等）
 */
export const userBasicSelect = {
  id: true,
  name: true,
  avatarUrl: true,
} as const;

/**
 * 用戶簡要資訊（不含頭像）
 */
export const userBriefSelect = {
  id: true,
  name: true,
} as const;

/**
 * 旅程基本資訊
 */
export const tripBasicSelect = {
  id: true,
  name: true,
} as const;

/**
 * 帳單 include 用戶資訊的通用模式
 */
export const billWithUserInclude = {
  payer: {
    select: userBasicSelect,
  },
  shares: {
    include: {
      user: {
        select: userBasicSelect,
      },
    },
  },
} as const;

/**
 * 帳單含細項的完整 include
 */
export const billFullInclude = {
  ...billWithUserInclude,
  items: {
    include: {
      shares: {
        include: {
          user: {
            select: userBasicSelect,
          },
        },
      },
    },
  },
} as const;

/**
 * 結算 include 用戶資訊的通用模式
 */
export const settlementWithUserInclude = {
  payer: {
    select: userBasicSelect,
  },
  receiver: {
    select: userBasicSelect,
  },
} as const;

/**
 * 結算含旅程資訊的 include
 */
export const settlementWithTripInclude = {
  ...settlementWithUserInclude,
  trip: {
    select: tripBasicSelect,
  },
} as const;
