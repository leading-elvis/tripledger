import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';

final cacheServiceProvider = Provider<CacheService>((ref) {
  return CacheService();
});

/// 快取大小資訊
class CacheInfo {
  final int sizeInBytes;
  final int fileCount;

  const CacheInfo({
    required this.sizeInBytes,
    required this.fileCount,
  });

  /// 格式化顯示大小
  String get formattedSize {
    if (sizeInBytes < 1024) {
      return '$sizeInBytes B';
    } else if (sizeInBytes < 1024 * 1024) {
      return '${(sizeInBytes / 1024).toStringAsFixed(1)} KB';
    } else if (sizeInBytes < 1024 * 1024 * 1024) {
      return '${(sizeInBytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    } else {
      return '${(sizeInBytes / (1024 * 1024 * 1024)).toStringAsFixed(2)} GB';
    }
  }
}

/// 快取管理服務
class CacheService {
  /// 取得快取大小資訊
  Future<CacheInfo> getCacheInfo() async {
    if (kIsWeb) {
      // Web 平台無法存取檔案系統
      return const CacheInfo(sizeInBytes: 0, fileCount: 0);
    }

    try {
      final cacheDir = await getTemporaryDirectory();
      final appCacheDir = await getApplicationCacheDirectory();

      int totalSize = 0;
      int fileCount = 0;

      // 計算 temp 目錄
      final tempInfo = await _calculateDirectorySize(cacheDir);
      totalSize += tempInfo.$1;
      fileCount += tempInfo.$2;

      // 計算 app cache 目錄
      if (appCacheDir.path != cacheDir.path) {
        final appCacheInfo = await _calculateDirectorySize(appCacheDir);
        totalSize += appCacheInfo.$1;
        fileCount += appCacheInfo.$2;
      }

      return CacheInfo(sizeInBytes: totalSize, fileCount: fileCount);
    } catch (e) {
      debugPrint('Error getting cache info: $e');
      return const CacheInfo(sizeInBytes: 0, fileCount: 0);
    }
  }

  /// 計算目錄大小
  Future<(int, int)> _calculateDirectorySize(Directory dir) async {
    int totalSize = 0;
    int fileCount = 0;

    try {
      if (!await dir.exists()) {
        return (0, 0);
      }

      await for (final entity in dir.list(recursive: true, followLinks: false)) {
        if (entity is File) {
          try {
            final stat = await entity.stat();
            totalSize += stat.size;
            fileCount++;
          } catch (e) {
            // 忽略無法存取的檔案
          }
        }
      }
    } catch (e) {
      debugPrint('Error calculating directory size: $e');
    }

    return (totalSize, fileCount);
  }

  /// 清除所有快取
  Future<bool> clearCache() async {
    if (kIsWeb) {
      // Web 平台無法存取檔案系統
      return true;
    }

    try {
      final cacheDir = await getTemporaryDirectory();
      final appCacheDir = await getApplicationCacheDirectory();

      // 清除 temp 目錄
      await _clearDirectory(cacheDir);

      // 清除 app cache 目錄
      if (appCacheDir.path != cacheDir.path) {
        await _clearDirectory(appCacheDir);
      }

      return true;
    } catch (e) {
      debugPrint('Error clearing cache: $e');
      return false;
    }
  }

  /// 清除目錄內容
  Future<void> _clearDirectory(Directory dir) async {
    try {
      if (!await dir.exists()) {
        return;
      }

      await for (final entity in dir.list(followLinks: false)) {
        try {
          if (entity is File) {
            await entity.delete();
          } else if (entity is Directory) {
            await entity.delete(recursive: true);
          }
        } catch (e) {
          // 忽略無法刪除的檔案/目錄
          debugPrint('Error deleting ${entity.path}: $e');
        }
      }
    } catch (e) {
      debugPrint('Error clearing directory: $e');
    }
  }

  /// 清除圖片快取（如果使用 cached_network_image）
  Future<void> clearImageCache() async {
    // 這裡可以整合 cached_network_image 的快取清除
    // CachedImageProvider.clearAllCachedImages();
    // 目前使用預設的快取清除邏輯
  }
}
