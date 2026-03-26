import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

/**
 * Apple App Store 驗證服務
 *
 * 支援兩種驗證方式:
 * 1. 傳統 verifyReceipt API（Flutter in_app_purchase 使用）
 * 2. App Store Server API v2（StoreKit 2 使用）
 *
 * 參考文件:
 * - https://developer.apple.com/documentation/appstorereceipts/verifyreceipt
 * - https://developer.apple.com/documentation/appstoreserverapi
 */

export interface AppleTransactionInfo {
  transactionId: string;
  originalTransactionId: string;
  bundleId: string;
  productId: string;
  purchaseDate: number;
  originalPurchaseDate: number;
  expiresDate?: number;
  type: 'Auto-Renewable Subscription' | 'Non-Consumable' | 'Consumable' | 'Non-Renewing Subscription';
  inAppOwnershipType: 'PURCHASED' | 'FAMILY_SHARED';
  environment: 'Production' | 'Sandbox';
}

// 傳統 verifyReceipt API 的回應格式
interface LegacyReceiptResponse {
  status: number;
  environment?: 'Production' | 'Sandbox';
  receipt?: {
    bundle_id: string;
    application_version: string;
    in_app?: Array<{
      product_id: string;
      transaction_id: string;
      original_transaction_id: string;
      purchase_date_ms: string;
      original_purchase_date_ms: string;
      expires_date_ms?: string;
    }>;
  };
  latest_receipt_info?: Array<{
    product_id: string;
    transaction_id: string;
    original_transaction_id: string;
    purchase_date_ms: string;
    original_purchase_date_ms: string;
    expires_date_ms?: string;
  }>;
}

export interface AppleVerificationResult {
  isValid: boolean;
  transactionInfo?: AppleTransactionInfo;
  error?: string;
}

@Injectable()
export class AppleVerificationService {
  private readonly logger = new Logger(AppleVerificationService.name);

  // Apple 公鑰快取
  private applePublicKeysCache: Map<string, crypto.KeyObject> = new Map();
  private cacheExpiry: number = 0;

  // App Store Server API 端點 (StoreKit 2)
  private readonly PRODUCTION_URL = 'https://api.storekit.itunes.apple.com';
  private readonly SANDBOX_URL = 'https://api.storekit-sandbox.itunes.apple.com';

  // 傳統 verifyReceipt API 端點
  private readonly LEGACY_PRODUCTION_URL = 'https://buy.itunes.apple.com/verifyReceipt';
  private readonly LEGACY_SANDBOX_URL = 'https://sandbox.itunes.apple.com/verifyReceipt';

  // Apple 公鑰端點
  private readonly APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys';

  constructor(private readonly configService: ConfigService) {}

  /**
   * 驗證 Apple 收據/交易
   *
   * 策略：優先使用傳統 verifyReceipt API（Flutter in_app_purchase 的預設格式）
   * 只有當明確是 JWS 格式時才使用 StoreKit 2 驗證
   *
   * @param receiptData - 收據資料
   * @param expectedProductId - 預期的產品 ID
   * @returns 驗證結果
   */
  async verifyReceipt(
    receiptData: string,
    expectedProductId: string,
  ): Promise<AppleVerificationResult> {
    try {
      // 偵測收據格式（更嚴格的檢查，要求 alg 和 kid 都存在）
      const jwsInfo = this.parseJwsHeader(receiptData);

      if (jwsInfo.isValidJws) {
        this.logger.log(`收據格式: JWS (StoreKit 2), alg=${jwsInfo.alg}, kid=${jwsInfo.kid || 'N/A'}, x5c=${jwsInfo.x5c ? '有' : '無'}`);
        // StoreKit 2 JWS 格式
        const result = await this.verifyJwsReceipt(receiptData, expectedProductId);

        // 如果 JWS 驗證失敗，嘗試用傳統方式（以防萬一）
        if (!result.isValid) {
          this.logger.log('JWS 驗證失敗，嘗試傳統驗證...');
          return await this.verifyLegacyReceipt(receiptData, expectedProductId);
        }
        return result;
      } else {
        this.logger.log('收據格式: 傳統格式 (Flutter in_app_purchase)');
        // 傳統 base64 收據格式
        return await this.verifyLegacyReceipt(receiptData, expectedProductId);
      }
    } catch (error) {
      this.logger.error('Apple 收據驗證失敗:', error);
      return {
        isValid: false,
        error: error instanceof Error ? error.message : '驗證失敗',
      };
    }
  }

  /**
   * 解析 JWS header 資訊
   * Apple 的 JWS 可以使用 kid 或 x5c（憑證鏈）
   */
  private parseJwsHeader(data: string): { isValidJws: boolean; alg?: string; kid?: string; x5c?: string[] } {
    // JWS 格式: 由三段以 '.' 分隔的 base64url 字串組成
    const parts = data.split('.');
    if (parts.length !== 3) {
      return { isValidJws: false };
    }

    try {
      // 嘗試解碼 header
      const headerJson = Buffer.from(parts[0], 'base64url').toString('utf8');
      const header = JSON.parse(headerJson);

      const alg = header.alg;
      const kid = header.kid;
      const x5c = header.x5c;

      // Apple JWS 必須有 alg，且有 kid 或 x5c 其中之一
      if (typeof alg === 'string' && (typeof kid === 'string' || Array.isArray(x5c))) {
        return { isValidJws: true, alg, kid, x5c };
      }

      return { isValidJws: false };
    } catch {
      return { isValidJws: false };
    }
  }

  /**
   * 驗證傳統格式收據 (Flutter in_app_purchase 使用)
   */
  private async verifyLegacyReceipt(
    receiptData: string,
    expectedProductId: string,
  ): Promise<AppleVerificationResult> {
    const appSharedSecret = this.configService.get<string>('APPLE_SHARED_SECRET');

    // 診斷日誌（僅記錄長度和格式，不記錄實際內容以保護敏感資料）
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (isDevelopment) {
      this.logger.debug(`收據長度: ${receiptData?.length || 0}`);
      this.logger.debug(`收據是否為有效 base64: ${this.isValidBase64(receiptData)}`);
    }

    // 如果收據看起來是 URL 編碼的，嘗試解碼
    let cleanReceiptData = receiptData;
    if (receiptData?.includes('%')) {
      try {
        cleanReceiptData = decodeURIComponent(receiptData);
        this.logger.log('收據已進行 URL 解碼');
      } catch {
        this.logger.warn('URL 解碼失敗，使用原始資料');
      }
    }

    // 移除可能的空白和換行
    cleanReceiptData = cleanReceiptData?.trim()?.replace(/\s/g, '') || '';

    // 先嘗試 Production，如果返回 21007 則改用 Sandbox
    let response = await this.callLegacyVerifyEndpoint(
      this.LEGACY_PRODUCTION_URL,
      cleanReceiptData,
      appSharedSecret,
    );

    // 21007 = 收據來自 Sandbox 環境
    if (response?.status === 21007) {
      this.logger.log('收據來自 Sandbox 環境，切換到 Sandbox 驗證');
      response = await this.callLegacyVerifyEndpoint(
        this.LEGACY_SANDBOX_URL,
        cleanReceiptData,
        appSharedSecret,
      );
    }

    if (!response) {
      return { isValid: false, error: '無法連接 Apple 伺服器' };
    }

    // 檢查狀態碼
    if (response.status !== 0) {
      const errorMessage = this.getLegacyStatusError(response.status);
      this.logger.warn(`Apple 驗證失敗: status=${response.status}, ${errorMessage}`);
      return { isValid: false, error: errorMessage };
    }

    // 驗證 Bundle ID
    const expectedBundleId = this.configService.get<string>('APPLE_BUNDLE_ID');
    if (expectedBundleId && response.receipt?.bundle_id !== expectedBundleId) {
      this.logger.warn(
        `Bundle ID 不符: 預期=${expectedBundleId}, 實際=${response.receipt?.bundle_id}`,
      );
      return { isValid: false, error: 'Bundle ID 不符' };
    }

    // 尋找對應的購買記錄
    const purchases = response.receipt?.in_app || response.latest_receipt_info || [];
    const matchingPurchase = purchases.find(p => p.product_id === expectedProductId);

    if (!matchingPurchase) {
      this.logger.warn(`找不到產品購買記錄: ${expectedProductId}`);
      return { isValid: false, error: '找不到產品購買記錄' };
    }

    this.logger.log(
      `Apple 傳統收據驗證成功: 產品=${matchingPurchase.product_id}, 交易=${matchingPurchase.transaction_id}`,
    );

    // 轉換為統一格式
    const transactionInfo: AppleTransactionInfo = {
      transactionId: matchingPurchase.transaction_id,
      originalTransactionId: matchingPurchase.original_transaction_id,
      bundleId: response.receipt?.bundle_id || '',
      productId: matchingPurchase.product_id,
      purchaseDate: parseInt(matchingPurchase.purchase_date_ms, 10),
      originalPurchaseDate: parseInt(matchingPurchase.original_purchase_date_ms, 10),
      expiresDate: matchingPurchase.expires_date_ms
        ? parseInt(matchingPurchase.expires_date_ms, 10)
        : undefined,
      type: 'Consumable', // 從傳統 API 無法直接得知類型
      inAppOwnershipType: 'PURCHASED',
      environment: response.environment || 'Production',
    };

    return {
      isValid: true,
      transactionInfo,
    };
  }

  /**
   * 呼叫傳統 verifyReceipt 端點
   */
  private async callLegacyVerifyEndpoint(
    url: string,
    receiptData: string,
    password?: string,
  ): Promise<LegacyReceiptResponse | null> {
    try {
      const body: { 'receipt-data': string; password?: string } = {
        'receipt-data': receiptData,
      };
      if (password) {
        body.password = password;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        this.logger.error(`Apple API 請求失敗: ${response.status}`);
        return null;
      }

      return await response.json() as LegacyReceiptResponse;
    } catch (error) {
      this.logger.error('呼叫 Apple verifyReceipt 失敗:', error);
      return null;
    }
  }

  /**
   * 檢查字串是否為有效的 base64
   */
  private isValidBase64(str: string): boolean {
    if (!str || str.length === 0) return false;
    try {
      // 標準 base64 或 base64url
      const base64Regex = /^[A-Za-z0-9+/=_-]+$/;
      return base64Regex.test(str) && str.length > 100;
    } catch {
      return false;
    }
  }

  /**
   * 取得傳統 API 狀態碼的錯誤訊息
   */
  private getLegacyStatusError(status: number): string {
    const statusMessages: Record<number, string> = {
      21000: 'App Store 無法讀取收據',
      21002: '收據資料格式錯誤',
      21003: '收據無法驗證',
      21004: 'Shared Secret 不符',
      21005: 'Apple 伺服器暫時無法使用',
      21006: '訂閱已過期',
      21007: '收據來自 Sandbox (應使用 Sandbox 驗證)',
      21008: '收據來自 Production (應使用 Production 驗證)',
      21009: '內部資料存取錯誤',
      21010: '用戶帳號找不到或已刪除',
    };
    return statusMessages[status] || `未知錯誤 (${status})`;
  }

  /**
   * 驗證 JWS 格式收據 (StoreKit 2)
   */
  private async verifyJwsReceipt(
    receiptData: string,
    expectedProductId: string,
  ): Promise<AppleVerificationResult> {
    // 解析 JWS (JSON Web Signature)
    const transactionInfo = await this.decodeSignedTransaction(receiptData);

    if (!transactionInfo) {
      return { isValid: false, error: '無法解析交易資訊' };
    }

    // 驗證產品 ID
    if (transactionInfo.productId !== expectedProductId) {
      this.logger.warn(
        `產品 ID 不符: 預期=${expectedProductId}, 實際=${transactionInfo.productId}`,
      );
      return { isValid: false, error: '產品 ID 不符' };
    }

    // 驗證 Bundle ID
    const expectedBundleId = this.configService.get<string>('APPLE_BUNDLE_ID');
    if (expectedBundleId && transactionInfo.bundleId !== expectedBundleId) {
      this.logger.warn(
        `Bundle ID 不符: 預期=${expectedBundleId}, 實際=${transactionInfo.bundleId}`,
      );
      return { isValid: false, error: 'Bundle ID 不符' };
    }

    // 檢查購買類型
    if (transactionInfo.inAppOwnershipType !== 'PURCHASED') {
      this.logger.warn(`非購買類型: ${transactionInfo.inAppOwnershipType}`);
      return { isValid: false, error: '非有效購買' };
    }

    this.logger.log(
      `Apple JWS 收據驗證成功: 產品=${transactionInfo.productId}, 交易=${transactionInfo.transactionId}`,
    );

    return {
      isValid: true,
      transactionInfo,
    };
  }

  /**
   * 解碼 Apple 簽名的交易資訊 (JWS)
   * 支援兩種格式:
   * 1. kid 模式: 使用 Apple 公鑰庫驗證
   * 2. x5c 模式: 使用內嵌憑證鏈驗證 (StoreKit 2 交易)
   */
  private async decodeSignedTransaction(
    signedTransaction: string,
  ): Promise<AppleTransactionInfo | null> {
    try {
      // JWS 格式: header.payload.signature
      const parts = signedTransaction.split('.');
      if (parts.length !== 3) {
        throw new Error('無效的 JWS 格式');
      }

      // 解碼 header
      const headerJson = Buffer.from(parts[0], 'base64url').toString('utf8');
      const header = JSON.parse(headerJson);
      const kid = header.kid;
      const x5c = header.x5c;

      let publicKey: string | null = null;

      if (x5c && Array.isArray(x5c) && x5c.length > 0) {
        // x5c 模式: 從憑證鏈提取公鑰
        this.logger.log('使用 x5c 憑證鏈驗證');
        publicKey = this.extractPublicKeyFromX5c(x5c[0]);
      } else if (kid) {
        // kid 模式: 從 Apple 公鑰庫獲取
        this.logger.log(`使用 kid 驗證: ${kid}`);
        publicKey = await this.getApplePublicKey(kid);
      }

      if (!publicKey) {
        // 生產環境：無法獲取公鑰時拒絕驗證
        const isProduction = process.env.NODE_ENV === 'production';
        if (isProduction) {
          this.logger.error('無法獲取公鑰，生產環境拒絕無驗證解碼');
          return null;
        }
        // 開發環境：允許無驗證解碼以便測試
        this.logger.warn('開發環境：無法獲取公鑰，使用無驗證解碼');
        return this.decodeWithoutVerification(signedTransaction);
      }

      // 驗證簽名並解碼
      const decoded = jwt.verify(signedTransaction, publicKey, {
        algorithms: ['ES256'],
      }) as AppleTransactionInfo;

      return decoded;
    } catch (error) {
      this.logger.error('解碼 Apple 交易失敗:', error);

      // 生產環境：驗證失敗時拒絕
      const isProduction = process.env.NODE_ENV === 'production';
      if (isProduction) {
        this.logger.error('生產環境拒絕無驗證解碼');
        return null;
      }
      // 開發環境：允許無驗證解碼以便測試
      this.logger.warn('開發環境：嘗試無驗證解碼...');
      return this.decodeWithoutVerification(signedTransaction);
    }
  }

  /**
   * 從 x5c 憑證提取公鑰
   */
  private extractPublicKeyFromX5c(certBase64: string): string | null {
    try {
      // x5c 中的憑證是 DER 格式的 base64 編碼
      const certPem = `-----BEGIN CERTIFICATE-----\n${certBase64}\n-----END CERTIFICATE-----`;

      // 使用 crypto 從憑證提取公鑰
      const cert = crypto.createPublicKey({
        key: certPem,
        format: 'pem',
      });

      return cert.export({ type: 'spki', format: 'pem' }) as string;
    } catch (error) {
      this.logger.error('從 x5c 提取公鑰失敗:', error);
      return null;
    }
  }

  /**
   * 無驗證解碼（僅開發環境使用）
   */
  private decodeWithoutVerification(
    signedTransaction: string,
  ): AppleTransactionInfo | null {
    try {
      const parts = signedTransaction.split('.');
      if (parts.length !== 3) return null;

      const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
      return JSON.parse(payloadJson) as AppleTransactionInfo;
    } catch {
      return null;
    }
  }

  /**
   * 獲取 Apple 公鑰
   */
  private async getApplePublicKey(kid: string): Promise<string | null> {
    try {
      // 檢查快取
      const now = Date.now();
      if (this.applePublicKeysCache.has(kid) && now < this.cacheExpiry) {
        const key = this.applePublicKeysCache.get(kid);
        return key ? key.export({ type: 'spki', format: 'pem' }) as string : null;
      }

      // 獲取 Apple 公鑰列表
      const response = await fetch(this.APPLE_KEYS_URL);
      if (!response.ok) {
        throw new Error(`獲取 Apple 公鑰失敗: ${response.status}`);
      }

      const keysData = await response.json() as { keys: Array<{ kid: string; kty: string; use: string; alg: string; n?: string; e?: string; x?: string; y?: string; crv?: string }> };

      // 更新快取
      this.applePublicKeysCache.clear();
      this.cacheExpiry = now + 24 * 60 * 60 * 1000; // 24 小時

      for (const keyData of keysData.keys) {
        const publicKey = this.jwkToPublicKey(keyData);
        if (publicKey) {
          this.applePublicKeysCache.set(keyData.kid, publicKey);
        }
      }

      // 返回請求的公鑰
      const requestedKey = this.applePublicKeysCache.get(kid);
      return requestedKey
        ? requestedKey.export({ type: 'spki', format: 'pem' }) as string
        : null;
    } catch (error) {
      this.logger.error('獲取 Apple 公鑰失敗:', error);
      return null;
    }
  }

  /**
   * 將 JWK 轉換為公鑰
   */
  private jwkToPublicKey(jwk: {
    kty: string;
    x?: string;
    y?: string;
    crv?: string;
    n?: string;
    e?: string;
  }): crypto.KeyObject | null {
    try {
      if (jwk.kty === 'EC' && jwk.x && jwk.y && jwk.crv) {
        return crypto.createPublicKey({
          key: {
            kty: jwk.kty,
            crv: jwk.crv,
            x: jwk.x,
            y: jwk.y,
          },
          format: 'jwk',
        });
      } else if (jwk.kty === 'RSA' && jwk.n && jwk.e) {
        return crypto.createPublicKey({
          key: {
            kty: jwk.kty,
            n: jwk.n,
            e: jwk.e,
          },
          format: 'jwk',
        });
      }
      return null;
    } catch (error) {
      this.logger.error('JWK 轉換失敗:', error);
      return null;
    }
  }

  /**
   * 驗證收據並提取購買資訊（用於恢復購買）
   * 返回產品 ID 和交易 ID
   */
  async verifyAndExtractPurchaseInfo(
    receiptData: string,
  ): Promise<{ productId: string; transactionId: string; isValid: boolean } | null> {
    try {
      // 嘗試驗證收據（不指定特定產品 ID）
      // 先嘗試驗證非消耗型產品
      const result = await this.verifyReceipt(receiptData, 'remove_ads_forever');

      if (result.isValid && result.transactionInfo) {
        return {
          productId: result.transactionInfo.productId,
          transactionId: result.transactionInfo.transactionId,
          isValid: true,
        };
      }

      // 如果是 JWS 格式，嘗試解碼以提取產品資訊
      const jwsInfo = this.parseJwsHeader(receiptData);
      if (jwsInfo.isValidJws) {
        const transactionInfo = await this.decodeSignedTransaction(receiptData);
        if (transactionInfo) {
          return {
            productId: transactionInfo.productId,
            transactionId: transactionInfo.transactionId,
            isValid: true,
          };
        }
      }

      return null;
    } catch (error) {
      this.logger.error('Apple 收據提取失敗:', error);
      return null;
    }
  }

  /**
   * 使用 App Store Server API 查詢交易歷史
   * (需要 App Store Connect API 金鑰)
   */
  async getTransactionHistory(
    originalTransactionId: string,
    useSandbox: boolean = false,
  ): Promise<AppleTransactionInfo[]> {
    try {
      const baseUrl = useSandbox ? this.SANDBOX_URL : this.PRODUCTION_URL;
      const token = await this.generateAppStoreToken();

      if (!token) {
        throw new Error('無法生成 App Store API Token');
      }

      const response = await fetch(
        `${baseUrl}/inApps/v1/history/${originalTransactionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`App Store API 請求失敗: ${response.status}`);
      }

      const data = await response.json() as {
        signedTransactions?: string[];
      };
      const transactions: AppleTransactionInfo[] = [];

      for (const signedTransaction of data.signedTransactions || []) {
        const info = await this.decodeSignedTransaction(signedTransaction);
        if (info) {
          transactions.push(info);
        }
      }

      return transactions;
    } catch (error) {
      this.logger.error('獲取交易歷史失敗:', error);
      return [];
    }
  }

  /**
   * 生成 App Store Server API JWT Token
   */
  private async generateAppStoreToken(): Promise<string | null> {
    try {
      const issuerId = this.configService.get<string>('APPSTORE_ISSUER_ID');
      const keyId = this.configService.get<string>('APPSTORE_KEY_ID');
      const privateKey = this.configService.get<string>('APPSTORE_PRIVATE_KEY');
      const bundleId = this.configService.get<string>('APPLE_BUNDLE_ID');

      if (!issuerId || !keyId || !privateKey || !bundleId) {
        this.logger.warn('App Store API 設定不完整');
        return null;
      }

      const now = Math.floor(Date.now() / 1000);
      const payload = {
        iss: issuerId,
        iat: now,
        exp: now + 60 * 20, // 20 分鐘有效期
        aud: 'appstoreconnect-v1',
        bid: bundleId,
      };

      const token = jwt.sign(payload, privateKey, {
        algorithm: 'ES256',
        keyid: keyId,
      });

      return token;
    } catch (error) {
      this.logger.error('生成 App Store Token 失敗:', error);
      return null;
    }
  }
}
