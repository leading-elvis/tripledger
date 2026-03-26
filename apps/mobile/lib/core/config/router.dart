import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/presentation/login_page.dart';
import '../../features/trips/presentation/trip_detail_page.dart';
import '../../features/trips/presentation/trip_stats_page.dart';
import '../../features/trips/presentation/member_management_page.dart';
import '../../features/trips/presentation/edit_trip_page.dart';
import '../../features/bills/presentation/add_bill_page.dart';
import '../../features/bills/presentation/bill_detail_page.dart';
import '../../features/bills/presentation/edit_bill_page.dart';
import '../../features/settlement/presentation/settlement_page.dart';
import '../../features/trips/presentation/qr_scanner_page.dart';
import '../../features/ocr/presentation/scan_receipt_page.dart';
import '../../shared/widgets/main_shell.dart';
import '../storage/auth_storage.dart';

/// 全域導航 Key，供 FCM 等服務使用
final GlobalKey<NavigatorState> rootNavigatorKey = GlobalKey<NavigatorState>();

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: '/login',
    redirect: (context, state) async {
      final authStorage = ref.read(authStorageProvider);
      final isLoggedIn = await authStorage.isLoggedIn();

      final isLoginRoute = state.matchedLocation == '/login';

      if (!isLoggedIn && !isLoginRoute) {
        return '/login';
      }

      if (isLoggedIn && isLoginRoute) {
        return '/trips';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        name: 'login',
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: '/scan',
        name: 'qr-scanner',
        builder: (context, state) => const QrScannerPage(),
      ),
      GoRoute(
        path: '/trips',
        name: 'trips',
        builder: (context, state) => const MainShell(),
        routes: [
          GoRoute(
            path: ':tripId',
            name: 'trip-detail',
            builder: (context, state) {
              final tripId = state.pathParameters['tripId']!;
              return TripDetailPage(tripId: tripId);
            },
            routes: [
              GoRoute(
                path: 'add-bill',
                name: 'add-bill',
                builder: (context, state) {
                  final tripId = state.pathParameters['tripId']!;
                  final extra = state.extra as Map<String, dynamic>?;
                  return AddBillPage(
                    tripId: tripId,
                    prefillData: extra,
                  );
                },
              ),
              GoRoute(
                path: 'settlement',
                name: 'settlement',
                builder: (context, state) {
                  final tripId = state.pathParameters['tripId']!;
                  return SettlementPage(tripId: tripId);
                },
              ),
              GoRoute(
                path: 'stats',
                name: 'trip-stats',
                builder: (context, state) {
                  final tripId = state.pathParameters['tripId']!;
                  return TripStatsPage(tripId: tripId);
                },
              ),
              GoRoute(
                path: 'bill/:billId',
                name: 'bill-detail',
                builder: (context, state) {
                  final tripId = state.pathParameters['tripId']!;
                  final billId = state.pathParameters['billId']!;
                  return BillDetailPage(tripId: tripId, billId: billId);
                },
                routes: [
                  GoRoute(
                    path: 'edit',
                    name: 'edit-bill',
                    builder: (context, state) {
                      final tripId = state.pathParameters['tripId']!;
                      final billId = state.pathParameters['billId']!;
                      return EditBillPage(tripId: tripId, billId: billId);
                    },
                  ),
                ],
              ),
              GoRoute(
                path: 'members',
                name: 'member-management',
                builder: (context, state) {
                  final tripId = state.pathParameters['tripId']!;
                  return MemberManagementPage(tripId: tripId);
                },
              ),
              GoRoute(
                path: 'edit',
                name: 'edit-trip',
                builder: (context, state) {
                  final tripId = state.pathParameters['tripId']!;
                  return EditTripPage(tripId: tripId);
                },
              ),
              GoRoute(
                path: 'scan-receipt',
                name: 'scan-receipt',
                builder: (context, state) {
                  final tripId = state.pathParameters['tripId']!;
                  return ScanReceiptPage(tripId: tripId);
                },
              ),
            ],
          ),
        ],
      ),
    ],
  );
});
