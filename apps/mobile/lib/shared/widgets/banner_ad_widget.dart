import 'package:flutter/material.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import '../../core/config/ad_config.dart';

/// 橫幅廣告元件
///
/// 使用方式：
/// ```dart
/// // 在頁面底部顯示
/// Scaffold(
///   body: YourContent(),
///   bottomNavigationBar: Column(
///     mainAxisSize: MainAxisSize.min,
///     children: [
///       const BannerAdWidget(),
///       BottomNavigationBar(...),
///     ],
///   ),
/// )
///
/// // 或在列表底部
/// ListView(
///   children: [
///     ...yourItems,
///     const BannerAdWidget(),
///   ],
/// )
/// ```
class BannerAdWidget extends StatefulWidget {
  /// 廣告尺寸，預設為自適應橫幅
  final AdSize? adSize;

  const BannerAdWidget({
    super.key,
    this.adSize,
  });

  @override
  State<BannerAdWidget> createState() => _BannerAdWidgetState();
}

class _BannerAdWidgetState extends State<BannerAdWidget> {
  BannerAd? _bannerAd;
  bool _isLoaded = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _loadAd();
  }

  Future<void> _loadAd() async {
    // 取得螢幕寬度以計算自適應廣告尺寸
    final size = widget.adSize ?? await _getAdaptiveAdSize();

    _bannerAd = BannerAd(
      adUnitId: AdConfig.bannerAdUnitId,
      size: size,
      request: const AdRequest(),
      listener: BannerAdListener(
        onAdLoaded: (ad) {
          debugPrint('Banner 廣告載入成功');
          if (mounted) {
            setState(() => _isLoaded = true);
          }
        },
        onAdFailedToLoad: (ad, error) {
          debugPrint('Banner 廣告載入失敗: ${error.message}');
          ad.dispose();
          _bannerAd = null;
        },
        onAdOpened: (ad) => debugPrint('Banner 廣告已開啟'),
        onAdClosed: (ad) => debugPrint('Banner 廣告已關閉'),
        onAdImpression: (ad) => debugPrint('Banner 廣告曝光'),
        onAdClicked: (ad) => debugPrint('Banner 廣告被點擊'),
      ),
    );

    await _bannerAd?.load();
  }

  Future<AdSize> _getAdaptiveAdSize() async {
    // 使用 MediaQuery 取得螢幕寬度
    final width = MediaQuery.of(context).size.width.truncate();
    final adaptiveSize =
        await AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize(width);
    return adaptiveSize ?? AdSize.banner;
  }

  @override
  void dispose() {
    _bannerAd?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!_isLoaded || _bannerAd == null) {
      // 廣告未載入時不佔用空間
      return const SizedBox.shrink();
    }

    return Container(
      width: _bannerAd!.size.width.toDouble(),
      height: _bannerAd!.size.height.toDouble(),
      alignment: Alignment.center,
      child: AdWidget(ad: _bannerAd!),
    );
  }
}

/// 固定在底部的橫幅廣告（帶安全區域）
class BottomBannerAd extends StatelessWidget {
  const BottomBannerAd({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Theme.of(context).scaffoldBackgroundColor,
      child: SafeArea(
        top: false,
        child: const BannerAdWidget(),
      ),
    );
  }
}

/// 內嵌式橫幅廣告（用於列表或內容中間）
class InlineBannerAd extends StatelessWidget {
  final EdgeInsets? margin;

  const InlineBannerAd({
    super.key,
    this.margin,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: margin ?? const EdgeInsets.symmetric(vertical: 16),
      child: const BannerAdWidget(),
    );
  }
}
