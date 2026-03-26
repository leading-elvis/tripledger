/**
 * 台灣電子發票 QR Code 解析工具
 *
 * 電子發票左側 QR Code 資料格式：
 * - 位置 0-1 (2碼): 字軌（英文）
 * - 位置 2-9 (8碼): 號碼
 * - 位置 10-12 (3碼): 民國年
 * - 位置 13-14 (2碼): 月
 * - 位置 15-16 (2碼): 日
 * - 位置 17-20 (4碼): 隨機碼
 * - 位置 21-28 (8碼): 銷售額（16進位）
 * - 位置 29-36 (8碼): 總額（16進位）
 * - 位置 37-44 (8碼): 買方統編
 * - 位置 45-52 (8碼): 賣方統編
 * - 位置 53+: 加密驗證資料
 */

export interface EInvoiceData {
  /** 發票號碼 (AB-12345678) */
  invoiceNumber: string;
  /** 發票日期 */
  invoiceDate: Date;
  /** 銷售額 */
  salesAmount: number;
  /** 總額（含稅） */
  totalAmount: number;
  /** 買方統編（一般消費者為 00000000） */
  buyerTaxId: string;
  /** 賣方統編 */
  sellerTaxId: string;
  /** 隨機碼 */
  randomCode: string;
  /** 加密資料（可選） */
  encryptedData?: string;
}

export interface ParseResult {
  success: boolean;
  data?: EInvoiceData;
  error?: string;
}

/**
 * 解析電子發票 QR Code
 * @param qrData QR Code 原始字串
 * @returns 解析結果
 */
export function parseEInvoiceQR(qrData: string): ParseResult {
  // 最短長度檢查（至少需要 53 碼）
  if (!qrData || qrData.length < 53) {
    return {
      success: false,
      error: 'QR Code 資料長度不足，可能不是有效的電子發票',
    };
  }

  try {
    // 字軌（2 碼英文）
    const track = qrData.substring(0, 2);
    if (!/^[A-Z]{2}$/.test(track)) {
      return {
        success: false,
        error: '發票字軌格式錯誤',
      };
    }

    // 號碼（8 碼數字）
    const number = qrData.substring(2, 10);
    if (!/^\d{8}$/.test(number)) {
      return {
        success: false,
        error: '發票號碼格式錯誤',
      };
    }

    // 民國年（3 碼）
    const rocYear = parseInt(qrData.substring(10, 13), 10);
    if (isNaN(rocYear) || rocYear < 100 || rocYear > 200) {
      return {
        success: false,
        error: '發票年份格式錯誤',
      };
    }

    // 月（2 碼）
    const month = parseInt(qrData.substring(13, 15), 10);
    if (isNaN(month) || month < 1 || month > 12) {
      return {
        success: false,
        error: '發票月份格式錯誤',
      };
    }

    // 日（2 碼）
    const day = parseInt(qrData.substring(15, 17), 10);
    if (isNaN(day) || day < 1 || day > 31) {
      return {
        success: false,
        error: '發票日期格式錯誤',
      };
    }

    // 隨機碼（4 碼）
    const randomCode = qrData.substring(17, 21);

    // 銷售額（8 碼，16 進位）
    const salesAmountHex = qrData.substring(21, 29);
    const salesAmount = parseInt(salesAmountHex, 16);
    if (isNaN(salesAmount)) {
      return {
        success: false,
        error: '銷售額格式錯誤',
      };
    }

    // 總額（8 碼，16 進位）
    const totalAmountHex = qrData.substring(29, 37);
    const totalAmount = parseInt(totalAmountHex, 16);
    if (isNaN(totalAmount)) {
      return {
        success: false,
        error: '總額格式錯誤',
      };
    }

    // 買方統編（8 碼）
    const buyerTaxId = qrData.substring(37, 45);

    // 賣方統編（8 碼）
    const sellerTaxId = qrData.substring(45, 53);
    if (!/^\d{8}$/.test(sellerTaxId)) {
      return {
        success: false,
        error: '賣方統編格式錯誤',
      };
    }

    // 加密資料（可選）
    const encryptedData = qrData.length > 53 ? qrData.substring(53) : undefined;

    // 民國年轉西元年
    const year = rocYear + 1911;

    // 建立日期物件
    const invoiceDate = new Date(year, month - 1, day);

    // 驗證日期合理性
    if (invoiceDate.getTime() > Date.now()) {
      return {
        success: false,
        error: '發票日期不能是未來日期',
      };
    }

    return {
      success: true,
      data: {
        invoiceNumber: `${track}-${number}`,
        invoiceDate,
        salesAmount,
        totalAmount,
        buyerTaxId,
        sellerTaxId,
        randomCode,
        encryptedData,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `解析失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
    };
  }
}

/**
 * 檢查是否為電子發票 QR Code 格式
 * @param qrData QR Code 原始字串
 * @returns 是否為電子發票格式
 */
export function isEInvoiceQR(qrData: string): boolean {
  if (!qrData || qrData.length < 53) {
    return false;
  }

  // 檢查字軌格式（前兩碼為大寫英文）
  const track = qrData.substring(0, 2);
  if (!/^[A-Z]{2}$/.test(track)) {
    return false;
  }

  // 檢查號碼格式（8 碼數字）
  const number = qrData.substring(2, 10);
  if (!/^\d{8}$/.test(number)) {
    return false;
  }

  // 檢查賣方統編（8 碼數字）
  const sellerTaxId = qrData.substring(45, 53);
  if (!/^\d{8}$/.test(sellerTaxId)) {
    return false;
  }

  return true;
}
