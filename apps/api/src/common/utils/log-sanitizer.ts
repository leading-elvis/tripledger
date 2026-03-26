/**
 * 日誌敏感資料過濾工具
 *
 * 在記錄日誌時自動遮蔽敏感資料，防止敏感資訊外洩
 */

// 需要遮蔽的敏感欄位名稱（不區分大小寫）
const SENSITIVE_FIELDS = [
  'password',
  'secret',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'apikey',
  'privatekey',
  'receipt',
  'receiptdata',
  'credential',
  'creditcard',
  'cardnumber',
  'cvv',
  'ssn',
  'taxid',
];

// 需要部分遮蔽的欄位（顯示前後幾個字元）
const PARTIAL_MASK_FIELDS = [
  'email',
  'phone',
  'transactionid',
];

/**
 * 遮蔽字串（全部替換為 ***）
 */
function maskFull(value: unknown): string {
  if (typeof value === 'string' && value.length > 0) {
    return '***REDACTED***';
  }
  return '***';
}

/**
 * 部分遮蔽字串（保留前後字元）
 * @example "user@example.com" -> "us***@***.com"
 */
function maskPartial(value: unknown): string {
  if (typeof value !== 'string' || value.length < 4) {
    return '***';
  }

  // Email 特殊處理
  if (value.includes('@')) {
    const [local, domain] = value.split('@');
    const maskedLocal = local.length > 2
      ? local.substring(0, 2) + '***'
      : '***';
    const domainParts = domain.split('.');
    const maskedDomain = domainParts.length > 1
      ? '***.' + domainParts[domainParts.length - 1]
      : '***';
    return `${maskedLocal}@${maskedDomain}`;
  }

  // 一般字串：保留前 2 後 2 字元
  const visibleChars = 2;
  if (value.length <= visibleChars * 2) {
    return '***';
  }
  return value.substring(0, visibleChars) + '***' + value.substring(value.length - visibleChars);
}

/**
 * 檢查欄位名稱是否為敏感欄位
 */
function isSensitiveField(fieldName: string): boolean {
  const lowerField = fieldName.toLowerCase();
  return SENSITIVE_FIELDS.some(sf => lowerField.includes(sf));
}

/**
 * 檢查欄位名稱是否需要部分遮蔽
 */
function isPartialMaskField(fieldName: string): boolean {
  const lowerField = fieldName.toLowerCase();
  return PARTIAL_MASK_FIELDS.some(pf => lowerField.includes(pf));
}

/**
 * 遞迴清理物件中的敏感資料
 */
export function sanitizeForLog(obj: unknown, depth = 0): unknown {
  // 防止無限遞迴
  if (depth > 10) {
    return '[MAX_DEPTH_EXCEEDED]';
  }

  // 處理 null/undefined
  if (obj === null || obj === undefined) {
    return obj;
  }

  // 處理基本類型
  if (typeof obj !== 'object') {
    return obj;
  }

  // 處理陣列
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForLog(item, depth + 1));
  }

  // 處理物件
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (isSensitiveField(key)) {
      sanitized[key] = maskFull(value);
    } else if (isPartialMaskField(key)) {
      sanitized[key] = maskPartial(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForLog(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * 建立安全的日誌訊息
 * 將物件轉換為字串，同時過濾敏感資料
 */
export function safeStringify(obj: unknown): string {
  try {
    return JSON.stringify(sanitizeForLog(obj), null, 2);
  } catch {
    return '[STRINGIFY_ERROR]';
  }
}

/**
 * 遮蔽 URL 中的敏感查詢參數
 */
export function sanitizeUrl(url: string): string {
  try {
    const urlObj = new URL(url, 'http://localhost');
    const sensitiveParams = ['token', 'key', 'secret', 'password', 'auth'];

    for (const param of sensitiveParams) {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.set(param, '***');
      }
    }

    // 移除 base URL（如果是相對路徑）
    return url.startsWith('http')
      ? urlObj.toString()
      : urlObj.pathname + urlObj.search;
  } catch {
    return url;
  }
}

/**
 * 遮蔽 Authorization header
 */
export function sanitizeAuthHeader(header: string): string {
  if (!header) return header;

  if (header.toLowerCase().startsWith('bearer ')) {
    const token = header.substring(7);
    return `Bearer ${token.substring(0, 10)}...***`;
  }

  if (header.toLowerCase().startsWith('basic ')) {
    return 'Basic ***';
  }

  return '***';
}
