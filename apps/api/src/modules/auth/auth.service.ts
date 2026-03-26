import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import * as appleSignin from 'apple-signin-auth';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { randomUUID, timingSafeEqual } from 'crypto';

export interface JwtPayload {
  sub: string;
  email?: string;
  name: string;
  jti?: string; // JWT ID for refresh token tracking
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email?: string;
    name: string;
    avatarUrl?: string;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
  ) {
    this.googleClient = new OAuth2Client(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
    );
  }

  /**
   * LINE 登入處理
   * 安全性：使用 access token 向 LINE API 驗證並取得真實用戶資訊
   */
  async loginWithLine(
    accessToken: string,
    profile: { name: string; avatarUrl?: string },
  ): Promise<TokenResponse> {
    // 伺服器端驗證：呼叫 LINE Profile API 取得真實 userId
    let lineId: string;
    try {
      const response = await fetch('https://api.line.me/v2/profile', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        this.logger.warn(`LINE token 驗證失敗: HTTP ${response.status}`);
        throw new UnauthorizedException('LINE 登入驗證失敗：無效的 access token');
      }

      const lineProfile = await response.json();
      lineId = lineProfile.userId;

      if (!lineId) {
        throw new UnauthorizedException('LINE 登入驗證失敗：無法取得用戶 ID');
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`LINE API 呼叫失敗: ${error}`);
      throw new UnauthorizedException('LINE 登入驗證失敗');
    }

    let user = await this.usersService.findByLineId(lineId);

    if (!user) {
      user = await this.usersService.create({
        lineId,
        name: profile.name,
        avatarUrl: profile.avatarUrl,
      });
    }

    return this.generateTokens(user);
  }

  /**
   * Google 登入處理
   * 安全性：使用 Google Auth Library 驗證 ID Token 並取得真實用戶資訊
   */
  async loginWithGoogle(
    idToken: string,
    profile: { name: string; avatarUrl?: string },
  ): Promise<TokenResponse> {
    // 伺服器端驗證：使用 google-auth-library 驗證 ID Token
    let googleId: string;
    let email: string | undefined;
    try {
      const googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: googleClientId,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.sub) {
        throw new UnauthorizedException('Google 登入驗證失敗：無效的 token payload');
      }

      googleId = payload.sub;
      email = payload.email;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Google token 驗證失敗: ${error}`);
      throw new UnauthorizedException('Google 登入驗證失敗：無效的 ID Token');
    }

    let user = await this.usersService.findByGoogleId(googleId);

    if (!user) {
      // 檢查是否有相同 email 的用戶
      if (email) {
        const existingUser = await this.usersService.findByEmail(email);
        if (existingUser) {
          // 連結 Google 帳號到現有用戶
          user = await this.usersService.update(existingUser.id, { googleId });
        }
      }

      if (!user) {
        user = await this.usersService.create({
          googleId,
          email,
          name: profile.name,
          avatarUrl: profile.avatarUrl,
        });
      }
    }

    return this.generateTokens(user);
  }

  /**
   * Apple 登入處理
   * 安全性：使用 apple-signin-auth 驗證 identityToken 的 JWT 簽名
   *
   * 注意：Apple 只在用戶首次授權時提供 email 和 name
   * 後續登入不會再提供這些資訊，需依賴 userIdentifier (appleId)
   */
  async loginWithApple(
    appleId: string,
    identityToken: string,
    profile: { email?: string; name: string },
  ): Promise<TokenResponse> {
    // 使用 apple-signin-auth 驗證 Apple Identity Token（含 JWT 簽名驗證）
    try {
      const expectedBundleId = this.configService.get<string>('APPLE_CLIENT_ID') || 'com.leadinginstr.tripledger';

      // verifyIdToken 會：
      // 1. 從 Apple JWKS 取得公鑰
      // 2. 驗證 JWT 簽名
      // 3. 驗證 iss, aud, exp 等 claims
      const payload = await appleSignin.verifyIdToken(identityToken, {
        audience: expectedBundleId,
      });

      // 驗證 token 中的 sub 與傳入的 appleId 一致
      if (payload.sub !== appleId) {
        throw new UnauthorizedException('Apple ID 驗證失敗：ID 不符');
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Apple Token 驗證失敗: ${error}`);
      throw new UnauthorizedException('Apple 登入驗證失敗');
    }

    // 查找或建立用戶
    let user = await this.usersService.findByAppleId(appleId);

    if (!user) {
      // 如果有 email，檢查是否有相同 email 的用戶
      if (profile.email) {
        const existingUser = await this.usersService.findByEmail(profile.email);
        if (existingUser) {
          // 連結 Apple 帳號到現有用戶
          user = await this.usersService.update(existingUser.id, { appleId });
        }
      }

      if (!user) {
        user = await this.usersService.create({
          appleId,
          email: profile.email,
          name: profile.name || 'Apple User',
        });
      }
    }

    return this.generateTokens(user);
  }

  /**
   * 刷新 Token（使用 Token 輪換機制）
   * 安全性：
   * 1. 驗證 JWT 簽名
   * 2. 檢查 Token 是否存在於資料庫且未被撤銷
   * 3. 撤銷舊 Token 並產生新 Token
   * 4. 如果偵測到已撤銷的 Token 被重複使用，撤銷該用戶所有 Token（可能被盜用）
   */
  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    let payload: JwtPayload;

    // 1. 驗證 JWT 簽名
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('無效的 Refresh Token');
    }

    const tokenId = payload.jti;

    // 2. 如果有 jti，檢查資料庫中的 Token 狀態
    if (tokenId) {
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: tokenId },
      });

      if (!storedToken) {
        throw new UnauthorizedException('無效的 Refresh Token');
      }

      // 檢查是否已被撤銷
      if (storedToken.isRevoked) {
        // 偵測到 Token 重複使用，可能被盜用
        // 撤銷該用戶所有的 Refresh Token
        this.logger.warn(`偵測到已撤銷 Token 重複使用，撤銷用戶所有 Token: userId=${payload.sub}`);
        await this.revokeAllUserTokens(payload.sub);
        throw new UnauthorizedException('Token 已被撤銷，請重新登入');
      }

      // 檢查是否過期
      if (storedToken.expiresAt < new Date()) {
        throw new UnauthorizedException('Refresh Token 已過期');
      }

      // 3. 撤銷舊 Token
      await this.prisma.refreshToken.update({
        where: { token: tokenId },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
        },
      });
    }

    // 4. 驗證用戶是否存在
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('用戶不存在');
    }

    // 5. 產生新的 Token
    return this.generateTokens(user);
  }

  /**
   * 產生 Access Token 和 Refresh Token
   * Refresh Token 會存入資料庫以支援輪換機制
   */
  private async generateTokens(user: {
    id: string;
    email?: string | null;
    name: string;
    avatarUrl?: string | null;
  }): Promise<TokenResponse> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email || undefined,
      name: user.name,
    };

    const accessToken = this.jwtService.sign(payload);

    // 產生唯一的 Token ID 用於追蹤
    const tokenId = randomUUID();
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '30d';

    // 計算過期時間
    const expiresAt = this.calculateExpiresAt(refreshExpiresIn);

    const refreshPayload: JwtPayload = {
      ...payload,
      jti: tokenId, // JWT ID for tracking
    };

    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: refreshExpiresIn,
    });

    // 將 Refresh Token 存入資料庫
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: tokenId,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email || undefined,
        name: user.name,
        avatarUrl: user.avatarUrl || undefined,
      },
    };
  }

  /**
   * 計算 Token 過期時間
   */
  private calculateExpiresAt(expiresIn: string): Date {
    const now = new Date();
    const match = expiresIn.match(/^(\d+)([smhd])$/);

    if (!match) {
      // 預設 30 天
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return new Date(now.getTime() + value * 1000);
      case 'm':
        return new Date(now.getTime() + value * 60 * 1000);
      case 'h':
        return new Date(now.getTime() + value * 60 * 60 * 1000);
      case 'd':
        return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * 撤銷用戶所有的 Refresh Token
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });
  }

  /**
   * Demo 登入處理 (供 Apple 審核使用)
   * 安全控制：
   * 1. 只在明確啟用時允許 (ALLOW_DEMO_LOGIN=true)
   * 2. 需要驗證帳號密碼 (DEMO_USERNAME, DEMO_PASSWORD)
   */
  async loginWithDemo(username: string, password: string): Promise<TokenResponse> {
    const isProduction = process.env.NODE_ENV === 'production';
    // 使用更安全的旗標名稱，降低誤啟用風險
    const allowDemoLogin = process.env.ALLOW_DEMO_LOGIN_FOR_APP_REVIEW === 'ENABLED_FOR_APPLE_REVIEW';

    // 檢查是否允許 Demo 登入
    if (!allowDemoLogin) {
      throw new UnauthorizedException('Demo 登入目前未開放');
    }

    // 生產環境啟用 Demo 登入時記錄警告
    if (isProduction) {
      this.logger.warn('⚠️ Demo 登入在生產環境已啟用 - 僅供 App Store 審核使用');
    }

    // 驗證帳號密碼（必須從環境變數設定，不提供預設值以避免安全風險）
    const expectedUsername = process.env.DEMO_USERNAME;
    const expectedPassword = process.env.DEMO_PASSWORD;

    if (!expectedUsername || !expectedPassword) {
      this.logger.error('Demo 登入環境變數未設定 (DEMO_USERNAME, DEMO_PASSWORD)');
      throw new UnauthorizedException('Demo 登入配置錯誤');
    }

    // 使用時序安全比較防止時序攻擊
    const usernameMatch = this.timingSafeCompare(username, expectedUsername);
    const passwordMatch = this.timingSafeCompare(password, expectedPassword);

    if (!usernameMatch || !passwordMatch) {
      this.logger.warn(`Demo 登入失敗：帳號或密碼錯誤 (username=${username})`);
      throw new UnauthorizedException('帳號或密碼錯誤');
    }

    this.logger.log('Demo 登入成功');

    const DEMO_USER_ID = 'demo-user-for-apple-review';
    const DEMO_LINE_ID = 'demo_apple_reviewer';

    let user = await this.usersService.findByLineId(DEMO_LINE_ID);

    if (!user) {
      // 建立 Demo 用戶
      user = await this.prisma.user.create({
        data: {
          id: DEMO_USER_ID,
          lineId: DEMO_LINE_ID,
          name: 'Demo User',
          avatarUrl: 'https://ui-avatars.com/api/?name=Demo+User&background=6366F1&color=fff',
        },
      });

      // 建立 Demo 資料
      await this.createDemoData(user.id);
    }

    return this.generateTokens(user);
  }

  /**
   * 建立 Demo 測試資料
   */
  private async createDemoData(userId: string): Promise<void> {
    // 建立 Demo 成員 (模擬其他旅伴)
    const member2 = await this.prisma.user.create({
      data: {
        id: 'demo-member-2',
        lineId: 'demo_member_2',
        name: '小明',
        avatarUrl: 'https://ui-avatars.com/api/?name=小明&background=10B981&color=fff',
      },
    });

    const member3 = await this.prisma.user.create({
      data: {
        id: 'demo-member-3',
        lineId: 'demo_member_3',
        name: '小華',
        avatarUrl: 'https://ui-avatars.com/api/?name=小華&background=F59E0B&color=fff',
      },
    });

    // 建立 Demo 旅程
    const trip = await this.prisma.trip.create({
      data: {
        name: '東京五日遊',
        description: '2024 年春季東京賞櫻之旅',
        startDate: new Date('2024-03-20'),
        endDate: new Date('2024-03-25'),
        inviteCode: 'DEMO2024',
        members: {
          create: [
            { userId: userId, role: 'OWNER' },
            { userId: member2.id, role: 'MEMBER' },
            { userId: member3.id, role: 'MEMBER' },
          ],
        },
      },
    });

    // 建立 Demo 帳單
    const bills = [
      {
        tripId: trip.id,
        payerId: userId,
        title: '機票費用',
        amount: 15000,
        category: 'TRANSPORT' as const,
        splitType: 'EQUAL' as const,
        date: new Date('2024-03-20'),
      },
      {
        tripId: trip.id,
        payerId: member2.id,
        title: '淺草寺午餐',
        amount: 3600,
        category: 'FOOD' as const,
        splitType: 'EQUAL' as const,
        date: new Date('2024-03-21'),
      },
      {
        tripId: trip.id,
        payerId: member3.id,
        title: '新宿飯店',
        amount: 24000,
        category: 'ACCOMMODATION' as const,
        splitType: 'EQUAL' as const,
        date: new Date('2024-03-20'),
      },
      {
        tripId: trip.id,
        payerId: userId,
        title: '迪士尼門票',
        amount: 27000,
        category: 'ATTRACTION' as const,
        splitType: 'EQUAL' as const,
        date: new Date('2024-03-22'),
      },
      {
        tripId: trip.id,
        payerId: member2.id,
        title: '藥妝店採購',
        amount: 8500,
        category: 'SHOPPING' as const,
        splitType: 'EQUAL' as const,
        date: new Date('2024-03-23'),
      },
    ];

    for (const billData of bills) {
      const bill = await this.prisma.bill.create({
        data: billData,
      });

      // 為每個帳單建立均分的份額
      const shareAmount = Math.round(billData.amount / 3);
      await this.prisma.billShare.createMany({
        data: [
          { billId: bill.id, userId: userId, amount: shareAmount },
          { billId: bill.id, userId: member2.id, amount: shareAmount },
          { billId: bill.id, userId: member3.id, amount: billData.amount - shareAmount * 2 },
        ],
      });
    }
  }

  /**
   * 驗證 JWT Token
   */
  async validateUser(payload: JwtPayload) {
    return this.usersService.findById(payload.sub);
  }

  /**
   * 註冊 FCM 裝置 Token
   */
  async registerFcmToken(
    userId: string,
    token: string,
    platform: string,
  ): Promise<void> {
    await this.prisma.deviceToken.upsert({
      where: { token },
      update: {
        userId,
        platform,
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        userId,
        token,
        platform,
        isActive: true,
      },
    });
  }

  /**
   * 移除 FCM 裝置 Token
   */
  async removeFcmToken(userId: string, token: string): Promise<void> {
    await this.prisma.deviceToken.updateMany({
      where: {
        userId,
        token,
      },
      data: {
        isActive: false,
      },
    });
  }

  /**
   * 取得用戶的所有有效 FCM Token
   */
  async getUserFcmTokens(userId: string): Promise<string[]> {
    const tokens = await this.prisma.deviceToken.findMany({
      where: {
        userId,
        isActive: true,
      },
      select: {
        token: true,
      },
    });
    return tokens.map((t) => t.token);
  }

  /**
   * 停用無效的 FCM Token
   */
  async deactivateInvalidTokens(tokens: string[]): Promise<void> {
    if (tokens.length === 0) return;

    await this.prisma.deviceToken.updateMany({
      where: {
        token: {
          in: tokens,
        },
      },
      data: {
        isActive: false,
      },
    });
  }

  /**
   * 清理過期的 Refresh Token
   * 建議定期執行（例如每天一次）
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          {
            isRevoked: true,
            revokedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // 保留 7 天的撤銷記錄
          },
        ],
      },
    });

    if (result.count > 0) {
      this.logger.log(`清理了 ${result.count} 個過期的 Refresh Token`);
    }

    return result.count;
  }

  /**
   * 登出：撤銷指定的 Refresh Token
   */
  async logout(refreshToken: string): Promise<void> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      if (payload.jti) {
        await this.prisma.refreshToken.update({
          where: { token: payload.jti },
          data: {
            isRevoked: true,
            revokedAt: new Date(),
          },
        });
      }
    } catch {
      // Token 無效也視為登出成功
    }
  }

  /**
   * 時序安全的字串比較
   * 防止透過比較時間差異來猜測密碼（時序攻擊）
   */
  private timingSafeCompare(a: string, b: string): boolean {
    const aBuffer = Buffer.from(a, 'utf8');
    const bBuffer = Buffer.from(b, 'utf8');

    // 如果長度不同，仍要進行比較以保持時序一致
    if (aBuffer.length !== bBuffer.length) {
      // 使用 a 與自己比較，確保時序一致
      timingSafeEqual(aBuffer, aBuffer);
      return false;
    }

    return timingSafeEqual(aBuffer, bBuffer);
  }
}
