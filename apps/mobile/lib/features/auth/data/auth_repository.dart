import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_line_sdk/flutter_line_sdk.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import '../../../core/network/api_client.dart';
import '../../../core/storage/auth_storage.dart';
import '../../../core/config/api_config.dart';
import '../../../core/config/social_login_config.dart';
import '../../../core/services/fcm_service.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    apiClient: ref.read(apiClientProvider),
    authStorage: ref.read(authStorageProvider),
    fcmService: ref.read(fcmServiceProvider),
  );
});

/// 登入例外
class AuthException implements Exception {
  final String message;
  final String? code;

  AuthException(this.message, {this.code});

  @override
  String toString() => message;
}

class AuthRepository {
  final ApiClient apiClient;
  final AuthStorage authStorage;
  final FcmService fcmService;

  // Google Sign-In 實例
  // Android: 自動使用 Google Cloud Console 中註冊的 Android Client ID（透過 package name + SHA-1 驗證）
  // iOS: 需要在 Info.plist 設定 GIDClientID
  final GoogleSignIn _googleSignIn = GoogleSignIn(
    scopes: ['email', 'profile'],
  );

  AuthRepository({
    required this.apiClient,
    required this.authStorage,
    required this.fcmService,
  });

  /// LINE 登入
  Future<bool> loginWithLine() async {
    if (!SocialLoginConfig.isLineConfigured) {
      throw AuthException('LINE 登入尚未設定');
    }

    try {
      // 調用 LINE SDK 進行登入
      final result = await LineSDK.instance.login(
        scopes: ['profile', 'openid'],
      );

      final userProfile = result.userProfile;
      if (userProfile == null) {
        throw AuthException('無法取得 LINE 用戶資料');
      }

      final lineId = userProfile.userId;
      final name = userProfile.displayName;
      final avatarUrl = userProfile.pictureUrl ?? '';

      if (kDebugMode) {
        debugPrint('LINE 登入成功: $name');
      }

      // 發送到後端 API
      final response = await apiClient.post(
        '${ApiConfig.auth}/line',
        data: {
          'lineId': lineId,
          'name': name,
          'avatarUrl': avatarUrl,
        },
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        await _saveAuthData(response.data);
        return true;
      }
      return false;
    } on PlatformException catch (e) {
      debugPrint('LINE SDK 錯誤: ${e.message}');
      throw AuthException('LINE 登入失敗: ${e.message}', code: e.code);
    } catch (e) {
      debugPrint('LINE 登入錯誤: $e');
      rethrow;
    }
  }

  /// Google 登入
  Future<bool> loginWithGoogle() async {
    try {
      // 先登出以確保可以重新選擇帳號
      await _googleSignIn.signOut();

      // 調用 Google Sign-In
      final googleUser = await _googleSignIn.signIn();

      if (googleUser == null) {
        // 用戶取消登入
        throw AuthException('Google 登入已取消');
      }

      final googleId = googleUser.id;
      final email = googleUser.email;
      final name = googleUser.displayName ?? email.split('@').first;
      final avatarUrl = googleUser.photoUrl ?? '';

      if (kDebugMode) {
        debugPrint('Google 登入成功: $name');
      }

      // 發送到後端 API
      final response = await apiClient.post(
        '${ApiConfig.auth}/google',
        data: {
          'googleId': googleId,
          'email': email,
          'name': name,
          'avatarUrl': avatarUrl,
        },
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        await _saveAuthData(response.data);
        return true;
      }
      return false;
    } on Exception catch (e) {
      debugPrint('Google 登入錯誤: $e');
      if (e.toString().contains('canceled') || e.toString().contains('cancelled')) {
        throw AuthException('Google 登入已取消');
      }
      rethrow;
    }
  }

  /// Apple 登入
  Future<bool> loginWithApple() async {
    try {
      // 檢查 Apple Sign In 是否可用
      final isAvailable = await SignInWithApple.isAvailable();
      if (!isAvailable) {
        throw AuthException('此裝置不支援 Apple 登入');
      }

      // 調用 Apple Sign In
      final credential = await SignInWithApple.getAppleIDCredential(
        scopes: [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
      );

      // 取得 userIdentifier（永久唯一識別碼）
      final appleId = credential.userIdentifier;
      if (appleId == null) {
        throw AuthException('無法取得 Apple 用戶識別碼');
      }

      // 取得 identityToken 用於後端驗證
      final identityToken = credential.identityToken;
      if (identityToken == null) {
        throw AuthException('無法取得 Apple 驗證 Token');
      }

      // 組合名稱（Apple 只在用戶首次授權時提供）
      String? name;
      if (credential.givenName != null || credential.familyName != null) {
        name =
            '${credential.familyName ?? ''}${credential.givenName ?? ''}'.trim();
        // 如果是空字串，設為 null
        if (name.isEmpty) {
          name = null;
        }
      }

      if (kDebugMode) {
        debugPrint('Apple 登入成功: ${name ?? "Apple User"}');
      }

      // 發送到後端 API
      final response = await apiClient.post(
        '${ApiConfig.auth}/apple',
        data: {
          'appleId': appleId,
          'identityToken': identityToken,
          'email': credential.email,
          'name': name ?? 'Apple User',
        },
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        await _saveAuthData(response.data);
        return true;
      }
      return false;
    } on SignInWithAppleAuthorizationException catch (e) {
      if (e.code == AuthorizationErrorCode.canceled) {
        throw AuthException('Apple 登入已取消');
      }
      throw AuthException('Apple 登入失敗: ${e.message}');
    } catch (e) {
      debugPrint('Apple 登入錯誤: $e');
      if (e is AuthException) rethrow;
      throw AuthException('Apple 登入失敗');
    }
  }

  /// Demo 登入 (供 Apple 審核使用)
  /// 需要提供帳號密碼進行驗證
  Future<bool> loginWithDemo(String username, String password) async {
    try {
      if (kDebugMode) {
        debugPrint('Demo 登入開始');
      }

      // 發送到後端 API（包含帳號密碼）
      final response = await apiClient.post(
        '${ApiConfig.auth}/demo',
        data: {
          'username': username,
          'password': password,
        },
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        await _saveAuthData(response.data);
        if (kDebugMode) {
          debugPrint('Demo 登入成功');
        }
        return true;
      }
      return false;
    } catch (e) {
      if (kDebugMode) {
        debugPrint('Demo 登入錯誤: $e');
      }
      // 使用類型檢查取代字串解析
      if (e is DioException && e.response?.statusCode == 401) {
        throw AuthException('帳號或密碼錯誤');
      }
      throw AuthException('Demo 登入失敗');
    }
  }

  /// 儲存認證資料
  Future<void> _saveAuthData(Map<String, dynamic> data) async {
    await authStorage.saveTokens(
      accessToken: data['accessToken'],
      refreshToken: data['refreshToken'],
    );
    await authStorage.saveUserInfo(
      userId: data['user']['id'],
      userName: data['user']['name'],
    );

    // 登入成功後註冊 FCM Token
    await _registerFcmToken();
  }

  /// 註冊 FCM Token 到後端
  Future<void> _registerFcmToken() async {
    try {
      final token = await fcmService.getToken();
      if (token == null) {
        debugPrint('無法取得 FCM Token');
        return;
      }

      final platform = Platform.isAndroid ? 'android' : 'ios';

      await apiClient.post(
        '${ApiConfig.auth}/fcm-token',
        data: {
          'token': token,
          'platform': platform,
        },
      );
      debugPrint('FCM Token 註冊成功');
    } catch (e) {
      debugPrint('FCM Token 註冊失敗: $e');
    }
  }

  /// 登出
  Future<void> logout() async {
    try {
      // 移除 FCM Token
      await _removeFcmToken();

      // 撤銷後端 Refresh Token
      await _revokeRefreshToken();

      // 登出 LINE（僅在已配置時）
      if (SocialLoginConfig.isLineConfigured) {
        try {
          await LineSDK.instance.logout();
        } catch (e) {
          debugPrint('LINE 登出錯誤（可忽略）: $e');
        }
      }

      // 登出 Google
      try {
        await _googleSignIn.signOut();
      } catch (e) {
        debugPrint('Google 登出錯誤（可忽略）: $e');
      }
    } finally {
      // 清除本地 Token
      await authStorage.clearTokens();
    }
  }

  /// 刪除帳號
  /// 此操作不可逆，會永久刪除用戶帳號和相關資料
  Future<bool> deleteAccount() async {
    try {
      final response = await apiClient.delete('${ApiConfig.users}/me');

      if (response.statusCode == 200) {
        // 清除本地儲存
        await authStorage.clearTokens();

        // 嘗試登出社交帳號
        try {
          if (SocialLoginConfig.isLineConfigured) {
            await LineSDK.instance.logout();
          }
        } catch (_) {}

        try {
          await _googleSignIn.signOut();
        } catch (_) {}

        if (kDebugMode) {
          debugPrint('帳號已成功刪除');
        }
        return true;
      }
      return false;
    } on DioException catch (e) {
      debugPrint('刪除帳號錯誤: $e');
      final message = e.response?.data?['message'] ?? '刪除帳號失敗';
      throw AuthException(message);
    } catch (e) {
      debugPrint('刪除帳號錯誤: $e');
      if (e is AuthException) rethrow;
      throw AuthException('刪除帳號失敗');
    }
  }

  /// 撤銷後端 Refresh Token
  Future<void> _revokeRefreshToken() async {
    try {
      final refreshToken = await authStorage.getRefreshToken();
      if (refreshToken != null) {
        await apiClient.post(
          '${ApiConfig.auth}/logout',
          data: {'refreshToken': refreshToken},
        );
        if (kDebugMode) {
          debugPrint('Refresh Token 已撤銷');
        }
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('Refresh Token 撤銷失敗（可忽略）: $e');
      }
    }
  }

  /// 從後端移除 FCM Token 並清理訂閱
  Future<void> _removeFcmToken() async {
    try {
      final token = await fcmService.getToken();
      if (token != null) {
        await apiClient.delete(
          '${ApiConfig.auth}/fcm-token',
          data: {'token': token},
        );
      }

      // 刪除本地 FCM Token
      await fcmService.deleteToken();

      // 釋放 FCM 訂閱資源
      await fcmService.dispose();

      if (kDebugMode) {
        debugPrint('FCM 清理完成');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('FCM 清理失敗: $e');
      }
    }
  }

  /// 檢查登入狀態
  Future<bool> isLoggedIn() async {
    return authStorage.isLoggedIn();
  }

  /// 取得當前 LINE 用戶資料（如已登入）
  Future<UserProfile?> getLineProfile() async {
    if (!SocialLoginConfig.isLineConfigured) {
      return null;
    }

    try {
      final result = await LineSDK.instance.getProfile();
      return result;
    } catch (e) {
      return null;
    }
  }

  /// 取得當前 Google 用戶資料（如已登入）
  Future<GoogleSignInAccount?> getGoogleProfile() async {
    try {
      return _googleSignIn.currentUser ?? await _googleSignIn.signInSilently();
    } catch (e) {
      return null;
    }
  }
}
