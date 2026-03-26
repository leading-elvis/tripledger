import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

/**
 * Google Play Developer API 驗證服務
 *
 * 參考文件:
 * - https://developers.google.com/android-publisher/api-ref/rest
 * - https://developer.android.com/google/play/billing/security
 */

export interface GooglePurchaseInfo {
  // 產品購買資訊
  kind: string;
  purchaseTimeMillis: string;
  purchaseState: number; // 0: 已購買, 1: 已取消, 2: 待處理
  consumptionState: number; // 0: 未消耗, 1: 已消耗
  developerPayload?: string;
  orderId: string;
  purchaseType?: number; // 0: 測試購買, 1: 促銷碼
  acknowledgementState: number; // 0: 未確認, 1: 已確認
  productId: string;
  quantity?: number;
  obfuscatedExternalAccountId?: string;
  obfuscatedExternalProfileId?: string;
  regionCode?: string;
}

export interface GoogleVerificationResult {
  isValid: boolean;
  purchaseInfo?: GooglePurchaseInfo;
  error?: string;
}

@Injectable()
export class GoogleVerificationService {
  private readonly logger = new Logger(GoogleVerificationService.name);

  // Google API 端點
  private readonly GOOGLE_OAUTH_URL = 'https://oauth2.googleapis.com/token';
  private readonly ANDROID_PUBLISHER_API = 'https://androidpublisher.googleapis.com/androidpublisher/v3';

  // Access Token 快取
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(private readonly configService: ConfigService) {}

  /**
   * 驗證 Google Play 購買
   *
   * @param purchaseToken - Google Play 購買 Token
   * @param expectedProductId - 預期的產品 ID
   * @param isSubscription - 是否為訂閱
   * @returns 驗證結果
   */
  async verifyPurchase(
    purchaseToken: string,
    expectedProductId: string,
    isSubscription: boolean = false,
  ): Promise<GoogleVerificationResult> {
    try {
      const packageName = this.configService.get<string>('GOOGLE_PACKAGE_NAME');
      if (!packageName) {
        throw new Error('GOOGLE_PACKAGE_NAME 未設定');
      }

      // 取得 Access Token
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        throw new Error('無法取得 Google API Access Token');
      }

      // 根據類型選擇 API
      const endpoint = isSubscription
        ? `${this.ANDROID_PUBLISHER_API}/applications/${packageName}/purchases/subscriptions/${expectedProductId}/tokens/${purchaseToken}`
        : `${this.ANDROID_PUBLISHER_API}/applications/${packageName}/purchases/products/${expectedProductId}/tokens/${purchaseToken}`;

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json() as { error?: { message?: string } };
        throw new Error(
          `Google API 驗證失敗: ${response.status} - ${errorData.error?.message || '未知錯誤'}`,
        );
      }

      const purchaseInfo = await response.json() as GooglePurchaseInfo;
      purchaseInfo.productId = expectedProductId;

      // 驗證購買狀態
      if (purchaseInfo.purchaseState !== 0) {
        const stateMessages: Record<number, string> = {
          1: '購買已取消',
          2: '購買待處理',
        };
        return {
          isValid: false,
          error: stateMessages[purchaseInfo.purchaseState] || '無效的購買狀態',
        };
      }

      // 對於非消耗型產品，確保已確認
      if (purchaseInfo.acknowledgementState !== 1) {
        // 自動確認購買
        await this.acknowledgePurchase(
          packageName,
          expectedProductId,
          purchaseToken,
          isSubscription,
          accessToken,
        );
      }

      this.logger.log(
        `Google 購買驗證成功: 產品=${expectedProductId}, 訂單=${purchaseInfo.orderId}`,
      );

      return {
        isValid: true,
        purchaseInfo,
      };
    } catch (error) {
      this.logger.error('Google 購買驗證失敗:', error);
      return {
        isValid: false,
        error: error instanceof Error ? error.message : '驗證失敗',
      };
    }
  }

  /**
   * 確認購買（防止退款）
   */
  private async acknowledgePurchase(
    packageName: string,
    productId: string,
    purchaseToken: string,
    isSubscription: boolean,
    accessToken: string,
  ): Promise<boolean> {
    try {
      const endpoint = isSubscription
        ? `${this.ANDROID_PUBLISHER_API}/applications/${packageName}/purchases/subscriptions/${productId}/tokens/${purchaseToken}:acknowledge`
        : `${this.ANDROID_PUBLISHER_API}/applications/${packageName}/purchases/products/${productId}/tokens/${purchaseToken}:acknowledge`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        this.logger.warn(`確認購買失敗: ${response.status}`);
        return false;
      }

      this.logger.log(`購買已確認: ${productId}`);
      return true;
    } catch (error) {
      this.logger.error('確認購買時發生錯誤:', error);
      return false;
    }
  }

  /**
   * 消耗購買（消耗型產品）
   */
  async consumePurchase(
    productId: string,
    purchaseToken: string,
  ): Promise<boolean> {
    try {
      const packageName = this.configService.get<string>('GOOGLE_PACKAGE_NAME');
      if (!packageName) {
        throw new Error('GOOGLE_PACKAGE_NAME 未設定');
      }

      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        throw new Error('無法取得 Access Token');
      }

      const endpoint = `${this.ANDROID_PUBLISHER_API}/applications/${packageName}/purchases/products/${productId}/tokens/${purchaseToken}:consume`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        this.logger.warn(`消耗購買失敗: ${response.status}`);
        return false;
      }

      this.logger.log(`購買已消耗: ${productId}`);
      return true;
    } catch (error) {
      this.logger.error('消耗購買時發生錯誤:', error);
      return false;
    }
  }

  /**
   * 取得 Google API Access Token
   * 使用 Service Account JWT 認證
   */
  private async getAccessToken(): Promise<string | null> {
    // 檢查快取
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      // 取得 Service Account 憑證
      const serviceAccountJson = this.configService.get<string>(
        'GOOGLE_SERVICE_ACCOUNT_JSON',
      );

      if (!serviceAccountJson) {
        // 開發環境：嘗試使用個別環境變數
        return this.getAccessTokenFromEnvVars();
      }

      const serviceAccount = JSON.parse(serviceAccountJson) as {
        client_email: string;
        private_key: string;
        token_uri?: string;
      };

      // 建立 JWT
      const jwtToken = this.createServiceAccountJWT(
        serviceAccount.client_email,
        serviceAccount.private_key,
      );

      // 交換 Access Token
      const response = await fetch(this.GOOGLE_OAUTH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwtToken,
        }),
      });

      if (!response.ok) {
        throw new Error(`Token 交換失敗: ${response.status}`);
      }

      const tokenData = await response.json() as {
        access_token: string;
        expires_in: number;
      };

      // 更新快取（提前 5 分鐘過期）
      this.accessToken = tokenData.access_token;
      this.tokenExpiry = now + (tokenData.expires_in - 300) * 1000;

      return this.accessToken;
    } catch (error) {
      this.logger.error('取得 Google Access Token 失敗:', error);
      return null;
    }
  }

  /**
   * 從環境變數取得 Access Token（開發用）
   */
  private async getAccessTokenFromEnvVars(): Promise<string | null> {
    const clientEmail = this.configService.get<string>(
      'GOOGLE_SERVICE_ACCOUNT_EMAIL',
    );
    const privateKey = this.configService.get<string>(
      'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
    );

    if (!clientEmail || !privateKey) {
      this.logger.warn('Google Service Account 憑證未設定');
      return null;
    }

    try {
      // 處理私鑰換行符號
      const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

      const jwtToken = this.createServiceAccountJWT(
        clientEmail,
        formattedPrivateKey,
      );

      const response = await fetch(this.GOOGLE_OAUTH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwtToken,
        }),
      });

      if (!response.ok) {
        throw new Error(`Token 交換失敗: ${response.status}`);
      }

      const tokenData = await response.json() as {
        access_token: string;
        expires_in: number;
      };

      this.accessToken = tokenData.access_token;
      this.tokenExpiry = Date.now() + (tokenData.expires_in - 300) * 1000;

      return this.accessToken;
    } catch (error) {
      this.logger.error('從環境變數取得 Token 失敗:', error);
      return null;
    }
  }

  /**
   * 建立 Service Account JWT
   */
  private createServiceAccountJWT(
    clientEmail: string,
    privateKey: string,
  ): string {
    const now = Math.floor(Date.now() / 1000);

    const payload = {
      iss: clientEmail,
      sub: clientEmail,
      aud: this.GOOGLE_OAUTH_URL,
      iat: now,
      exp: now + 3600, // 1 小時有效期
      scope: 'https://www.googleapis.com/auth/androidpublisher',
    };

    return jwt.sign(payload, privateKey, { algorithm: 'RS256' });
  }

  // 所有非消耗型產品 ID（用於恢復購買）
  private readonly NON_CONSUMABLE_PRODUCTS = ['remove_ads_forever'];

  /**
   * 驗證收據並提取購買資訊（用於恢復購買）
   * 返回產品 ID 和交易 ID
   *
   * @param purchaseToken - Google Play 購買 Token
   * @param productIdHint - 可選的產品 ID 提示，如果提供則優先嘗試
   */
  async verifyAndExtractPurchaseInfo(
    purchaseToken: string,
    productIdHint?: string,
  ): Promise<{ productId: string; transactionId: string; isValid: boolean } | null> {
    // 建立嘗試順序：優先嘗試提示的產品 ID
    const productsToTry = productIdHint
      ? [productIdHint, ...this.NON_CONSUMABLE_PRODUCTS.filter(p => p !== productIdHint)]
      : this.NON_CONSUMABLE_PRODUCTS;

    for (const productId of productsToTry) {
      try {
        const result = await this.verifyPurchase(purchaseToken, productId, false);

        if (result.isValid && result.purchaseInfo) {
          return {
            productId: result.purchaseInfo.productId,
            transactionId: result.purchaseInfo.orderId,
            isValid: true,
          };
        }
      } catch (error) {
        // 嘗試下一個產品
        this.logger.debug(`嘗試驗證產品 ${productId} 失敗，繼續嘗試其他產品`);
      }
    }

    this.logger.warn('Google 收據提取失敗：所有產品驗證都失敗');
    return null;
  }

  /**
   * 驗證訂閱狀態（目前專案不使用訂閱，保留供未來擴展）
   */
  async verifySubscription(
    subscriptionId: string,
    purchaseToken: string,
  ): Promise<GoogleVerificationResult> {
    return this.verifyPurchase(purchaseToken, subscriptionId, true);
  }

  /**
   * 取消訂閱（目前專案不使用訂閱）
   */
  async cancelSubscription(
    subscriptionId: string,
    purchaseToken: string,
  ): Promise<boolean> {
    try {
      const packageName = this.configService.get<string>('GOOGLE_PACKAGE_NAME');
      if (!packageName) {
        throw new Error('GOOGLE_PACKAGE_NAME 未設定');
      }

      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        throw new Error('無法取得 Access Token');
      }

      const endpoint = `${this.ANDROID_PUBLISHER_API}/applications/${packageName}/purchases/subscriptions/${subscriptionId}/tokens/${purchaseToken}:cancel`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.ok;
    } catch (error) {
      this.logger.error('取消訂閱失敗:', error);
      return false;
    }
  }
}
