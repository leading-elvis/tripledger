/**
 * 錯誤訊息常數
 *
 * 集中管理所有錯誤訊息，便於未來實作國際化 (i18n)
 * 目前使用繁體中文，可透過 i18n 框架（如 nestjs-i18n）擴展多語系支援
 */

export const ErrorMessages = {
  // 通用錯誤
  COMMON: {
    NOT_FOUND: '資源不存在',
    FORBIDDEN: '您沒有權限執行此操作',
    UNAUTHORIZED: '請先登入',
    BAD_REQUEST: '請求格式錯誤',
    INTERNAL_ERROR: '系統錯誤，請稍後再試',
  },

  // 驗證錯誤
  VALIDATION: {
    REQUIRED: '此欄位為必填',
    INVALID_FORMAT: '格式不正確',
    STRING_TOO_LONG: '字串長度超過限制',
    NUMBER_TOO_LARGE: '數值超過上限',
    NUMBER_TOO_SMALL: '數值低於下限',
    INVALID_DATE_RANGE: '結束日期必須晚於或等於開始日期',
    INVALID_EMAIL: 'Email 格式不正確',
    INVALID_ENUM: '無效的選項',
  },

  // 認證相關
  AUTH: {
    TOKEN_EXPIRED: '登入已過期，請重新登入',
    INVALID_TOKEN: '無效的認證資訊',
    REFRESH_TOKEN_INVALID: 'Refresh Token 無效或已過期',
    DEMO_LOGIN_DISABLED: 'Demo 登入目前未開放',
    SOCIAL_LOGIN_FAILED: '社群登入失敗',
  },

  // 用戶相關
  USER: {
    NOT_FOUND: '用戶不存在',
    ALREADY_EXISTS: '用戶已存在',
  },

  // 旅程相關
  TRIP: {
    NOT_FOUND: '旅程不存在',
    ALREADY_MEMBER: '您已經是此旅程的成員',
    NOT_MEMBER: '您不是此旅程的成員',
    INVALID_INVITE_CODE: '邀請碼無效或已過期',
    OWNER_CANNOT_LEAVE: '旅程建立者無法離開旅程，請先轉移擁有權或刪除旅程',
    CANNOT_REMOVE_OWNER: '無法移除旅程建立者',
    FREE_MEMBER_LIMIT: '免費版旅程最多只能有 {limit} 位成員',
  },

  // 帳單相關
  BILL: {
    NOT_FOUND: '帳單不存在',
    FREE_BILL_LIMIT: '免費版旅程最多只能有 {limit} 筆帳單',
    INVALID_SPLIT: '分攤設定不正確',
    PARTICIPANTS_REQUIRED: '至少需要一位參與者',
    SPLIT_AMOUNT_MISMATCH: '分攤金額總和與帳單金額不符',
  },

  // 結算相關
  SETTLEMENT: {
    NOT_FOUND: '結算記錄不存在',
    ONLY_PAYER_CAN_CREATE: '只能建立自己的付款記錄',
    ONLY_RECEIVER_CAN_CONFIRM: '只有收款方可以確認結算',
    ALREADY_PROCESSED: '此結算記錄已處理',
    CANNOT_CANCEL_CONFIRMED: '已確認的結算無法取消',
    NO_PERMISSION: '您沒有取消此結算的權限',
  },

  // 購買相關
  PURCHASE: {
    INVALID_PRODUCT: '無效的產品 ID',
    TRIP_ID_REQUIRED: '消耗型產品需要提供 tripId',
    TRANSACTION_ALREADY_USED: '此交易已被處理',
    RECEIPT_VERIFICATION_FAILED: '收據驗證失敗',
    TRIP_NOT_FOUND: '旅程不存在',
  },

  // 檔案上傳相關
  FILE: {
    REQUIRED: '請上傳檔案',
    TOO_LARGE: '檔案大小超過限制',
    INVALID_TYPE: '不支援的檔案類型',
    UPLOAD_FAILED: '檔案上傳失敗',
    IMAGE_ONLY: '只支援 JPEG, PNG, GIF, WebP 格式的圖片',
  },

  // OCR 相關
  OCR: {
    PARSE_FAILED: '收據解析失敗',
    VISION_API_ERROR: 'Vision API 錯誤',
    NO_TEXT_DETECTED: '無法辨識收據內容',
  },
} as const;

/**
 * 替換訊息中的參數
 * @example formatMessage(ErrorMessages.TRIP.FREE_MEMBER_LIMIT, { limit: 5 })
 */
export function formatMessage(
  message: string,
  params: Record<string, string | number>,
): string {
  let result = message;
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(`{${key}}`, String(value));
  }
  return result;
}
