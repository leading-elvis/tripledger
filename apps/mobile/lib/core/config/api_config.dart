import 'package:flutter/foundation.dart' show kIsWeb, defaultTargetPlatform, TargetPlatform;

class ApiConfig {
  // 正式環境 - Cloud Run
  static const String prodBaseUrl = 'https://tripledger-api-297896850903.asia-east1.run.app/api';

  // 切換環境開關（設為 true 強制使用正式環境）
  static const bool forceProduction = true;

  // 當前使用的 Base URL
  static String get baseUrl {
    // 強制使用正式環境
    if (forceProduction) {
      return prodBaseUrl;
    }

    const bool isProduction = bool.fromEnvironment('dart.vm.product');
    if (isProduction) {
      return prodBaseUrl;
    }
    return devBaseUrl;
  }

  // 開發環境 - 根據平台自動選擇正確的網址
  static String get devBaseUrl {
    if (kIsWeb) {
      // Web (Chrome) - 直接用 localhost
      return 'http://localhost:3000/api';
    }

    // 原生平台
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        // Android 模擬器使用 10.0.2.2 存取主機的 localhost
        return 'http://10.0.2.2:3000/api';
      case TargetPlatform.iOS:
        // iOS 模擬器可以直接用 localhost
        return 'http://localhost:3000/api';
      case TargetPlatform.windows:
      case TargetPlatform.macOS:
      case TargetPlatform.linux:
        // 桌面版直接用 localhost
        return 'http://localhost:3000/api';
      default:
        return 'http://localhost:3000/api';
    }
  }

  // API 端點
  static const String auth = '/auth';
  static const String users = '/users';
  static const String trips = '/trips';
  static const String bills = '/bills';
  static const String settlements = '/settlements';
  static const String notifications = '/notifications';

  // Timeout 設定
  static const Duration connectTimeout = Duration(seconds: 10);
  static const Duration receiveTimeout = Duration(seconds: 30);
}
