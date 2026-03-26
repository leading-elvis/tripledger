import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

final authStorageProvider = Provider<AuthStorage>((ref) {
  return AuthStorage();
});

class AuthStorage {
  static const String _accessTokenKey = 'access_token';
  static const String _refreshTokenKey = 'refresh_token';
  static const String _userIdKey = 'user_id';
  static const String _userNameKey = 'user_name';

  final FlutterSecureStorage _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );

  // 儲存 Tokens
  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await _storage.write(key: _accessTokenKey, value: accessToken);
    await _storage.write(key: _refreshTokenKey, value: refreshToken);
  }

  // 取得 Access Token
  Future<String?> getAccessToken() async {
    return _storage.read(key: _accessTokenKey);
  }

  // 取得 Refresh Token
  Future<String?> getRefreshToken() async {
    return _storage.read(key: _refreshTokenKey);
  }

  // 儲存用戶資訊
  Future<void> saveUserInfo({
    required String userId,
    required String userName,
  }) async {
    await _storage.write(key: _userIdKey, value: userId);
    await _storage.write(key: _userNameKey, value: userName);
  }

  // 取得用戶 ID
  Future<String?> getUserId() async {
    return _storage.read(key: _userIdKey);
  }

  // 取得用戶名稱
  Future<String?> getUserName() async {
    return _storage.read(key: _userNameKey);
  }

  // 清除所有 Tokens
  Future<void> clearTokens() async {
    await _storage.deleteAll();
  }

  // 檢查是否已登入
  Future<bool> isLoggedIn() async {
    final token = await getAccessToken();
    return token != null;
  }
}
