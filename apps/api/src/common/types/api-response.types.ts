/**
 * API 回應型別定義
 *
 * 統一的 API 回應格式，便於前端處理
 */

/**
 * 分頁資訊
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * 分頁回應
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * 成功回應（帶訊息）
 */
export interface SuccessResponse {
  message: string;
}

/**
 * 錯誤回應
 */
export interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  code?: string; // 自訂錯誤代碼
}

/**
 * 用戶基本資訊
 */
export interface UserBasicInfo {
  id: string;
  name: string;
  avatarUrl: string | null;
}

/**
 * 旅程基本資訊
 */
export interface TripBasicInfo {
  id: string;
  name: string;
}

/**
 * 旅程成員資訊
 */
export interface TripMemberInfo {
  id: string;
  userId: string;
  tripId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  nickname: string | null;
  joinedAt: Date;
  user: UserBasicInfo;
}

/**
 * 帳單分攤資訊
 */
export interface BillShareInfo {
  id: string;
  userId: string;
  amount: number;
  user: UserBasicInfo;
}

/**
 * 帳單細項資訊
 */
export interface BillItemInfo {
  id: string;
  name: string;
  amount: number;
  shares: BillShareInfo[];
}

/**
 * 帳單回應
 */
export interface BillResponse {
  id: string;
  tripId: string;
  payerId: string;
  title: string;
  amount: number;
  category: string;
  splitType: string;
  receiptImage: string | null;
  note: string | null;
  paidAt: Date;
  createdAt: Date;
  updatedAt: Date;
  payer: UserBasicInfo;
  shares: BillShareInfo[];
  items?: BillItemInfo[];
}

/**
 * 結算回應
 */
export interface SettlementResponse {
  id: string;
  tripId: string;
  payerId: string;
  receiverId: string;
  amount: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  settledAt: Date | null;
  createdAt: Date;
  payer: UserBasicInfo;
  receiver: UserBasicInfo;
  trip?: TripBasicInfo;
}

/**
 * 餘額資訊
 */
export interface BalanceInfo {
  userId?: string;
  virtualMemberId?: string;
  isVirtual: boolean;
  userName: string;
  userAvatar?: string | null;
  paid: number;
  owed: number;
  balance: number;
}

/**
 * 建議結算
 */
export interface SuggestedSettlement {
  from: UserBasicInfo;
  to: UserBasicInfo;
  amount: number;
}

/**
 * 旅程結算摘要
 */
export interface TripSettlementSummary {
  totalSpent: number;
  billCount: number;
  memberCount: number;
  balances: BalanceInfo[];
  suggestedSettlements: SuggestedSettlement[];
  settledAmount: number;
}
