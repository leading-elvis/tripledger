import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:flutter_line_sdk/flutter_line_sdk.dart';
import 'core/config/router.dart';
import 'core/config/theme.dart';
import 'core/config/theme_provider.dart';
import 'core/config/social_login_config.dart';
import 'core/services/fcm_service.dart';
import 'core/services/ad_service.dart';
import 'features/purchase/providers/purchase_providers.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 初始化 Firebase
  try {
    await Firebase.initializeApp();
    if (kDebugMode) debugPrint('Firebase 初始化成功');
  } catch (e) {
    if (kDebugMode) debugPrint('Firebase 初始化失敗: $e');
  }

  // 初始化 LINE SDK
  if (SocialLoginConfig.isLineConfigured) {
    await LineSDK.instance.setup(SocialLoginConfig.lineChannelId);
    if (kDebugMode) debugPrint('LINE SDK 初始化成功');
  } else {
    if (kDebugMode) debugPrint('LINE SDK 尚未設定 Channel ID，請在 SocialLoginConfig 中設定');
  }

  runApp(
    const ProviderScope(
      child: TripLedgerApp(),
    ),
  );
}

class TripLedgerApp extends ConsumerStatefulWidget {
  const TripLedgerApp({super.key});

  @override
  ConsumerState<TripLedgerApp> createState() => _TripLedgerAppState();
}

class _TripLedgerAppState extends ConsumerState<TripLedgerApp> {
  @override
  void initState() {
    super.initState();
    _initializeServices();
  }

  Future<void> _initializeServices() async {
    // 初始化 FCM
    try {
      final fcmService = ref.read(fcmServiceProvider);
      await fcmService.initialize();
      if (kDebugMode) debugPrint('FCM 初始化成功');
    } catch (e) {
      if (kDebugMode) debugPrint('FCM 初始化失敗: $e');
    }

    // 初始化 AdMob
    try {
      final adService = ref.read(adServiceProvider);
      await adService.initialize();
      ref.read(adInitializedProvider.notifier).state = true;
    } catch (e) {
      if (kDebugMode) debugPrint('AdMob 初始化失敗: $e');
    }

    // 初始化內購服務
    try {
      final purchaseService = ref.read(purchaseServiceProvider);
      await purchaseService.initialize();
      if (kDebugMode) debugPrint('內購服務初始化成功，載入 ${purchaseService.products.length} 個產品');
    } catch (e) {
      if (kDebugMode) debugPrint('內購服務初始化失敗: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(routerProvider);
    final themeMode = ref.watch(themeModeProvider);

    return ScreenUtilInit(
      designSize: const Size(375, 812),
      minTextAdapt: true,
      splitScreenMode: true,
      builder: (context, child) {
        return MaterialApp.router(
          title: 'TripLedger',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.light,
          darkTheme: AppTheme.dark,
          themeMode: themeMode,
          routerConfig: router,
        );
      },
    );
  }
}
