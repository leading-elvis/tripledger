import 'package:intl/intl.dart';

/// 支援的貨幣列表
enum Currency {
  TWD, // 新台幣
  USD, // 美元
  JPY, // 日圓
  EUR, // 歐元
  KRW, // 韓元
  CNY, // 人民幣
  HKD, // 港幣
  GBP, // 英鎊
  THB, // 泰銖
  VND, // 越南盾
  SGD, // 新加坡幣
  MYR, // 馬來西亞令吉
  PHP, // 菲律賓披索
  IDR, // 印尼盾
  AUD, // 澳幣
}

/// 貨幣資訊
class CurrencyInfo {
  final Currency code;
  final String symbol;
  final String name;
  final int decimalPlaces;
  final String flag;

  const CurrencyInfo({
    required this.code,
    required this.symbol,
    required this.name,
    required this.decimalPlaces,
    required this.flag,
  });
}

/// 貨幣工具類
class CurrencyUtils {
  static const Map<Currency, CurrencyInfo> _currencyInfo = {
    Currency.TWD: CurrencyInfo(
      code: Currency.TWD,
      symbol: 'NT\$',
      name: '新台幣',
      decimalPlaces: 0,
      flag: '🇹🇼',
    ),
    Currency.USD: CurrencyInfo(
      code: Currency.USD,
      symbol: '\$',
      name: '美元',
      decimalPlaces: 2,
      flag: '🇺🇸',
    ),
    Currency.JPY: CurrencyInfo(
      code: Currency.JPY,
      symbol: '¥',
      name: '日圓',
      decimalPlaces: 0,
      flag: '🇯🇵',
    ),
    Currency.EUR: CurrencyInfo(
      code: Currency.EUR,
      symbol: '€',
      name: '歐元',
      decimalPlaces: 2,
      flag: '🇪🇺',
    ),
    Currency.KRW: CurrencyInfo(
      code: Currency.KRW,
      symbol: '₩',
      name: '韓元',
      decimalPlaces: 0,
      flag: '🇰🇷',
    ),
    Currency.CNY: CurrencyInfo(
      code: Currency.CNY,
      symbol: '¥',
      name: '人民幣',
      decimalPlaces: 2,
      flag: '🇨🇳',
    ),
    Currency.HKD: CurrencyInfo(
      code: Currency.HKD,
      symbol: 'HK\$',
      name: '港幣',
      decimalPlaces: 2,
      flag: '🇭🇰',
    ),
    Currency.GBP: CurrencyInfo(
      code: Currency.GBP,
      symbol: '£',
      name: '英鎊',
      decimalPlaces: 2,
      flag: '🇬🇧',
    ),
    Currency.THB: CurrencyInfo(
      code: Currency.THB,
      symbol: '฿',
      name: '泰銖',
      decimalPlaces: 2,
      flag: '🇹🇭',
    ),
    Currency.VND: CurrencyInfo(
      code: Currency.VND,
      symbol: '₫',
      name: '越南盾',
      decimalPlaces: 0,
      flag: '🇻🇳',
    ),
    Currency.SGD: CurrencyInfo(
      code: Currency.SGD,
      symbol: 'S\$',
      name: '新加坡幣',
      decimalPlaces: 2,
      flag: '🇸🇬',
    ),
    Currency.MYR: CurrencyInfo(
      code: Currency.MYR,
      symbol: 'RM',
      name: '馬來西亞令吉',
      decimalPlaces: 2,
      flag: '🇲🇾',
    ),
    Currency.PHP: CurrencyInfo(
      code: Currency.PHP,
      symbol: '₱',
      name: '菲律賓披索',
      decimalPlaces: 2,
      flag: '🇵🇭',
    ),
    Currency.IDR: CurrencyInfo(
      code: Currency.IDR,
      symbol: 'Rp',
      name: '印尼盾',
      decimalPlaces: 0,
      flag: '🇮🇩',
    ),
    Currency.AUD: CurrencyInfo(
      code: Currency.AUD,
      symbol: 'A\$',
      name: '澳幣',
      decimalPlaces: 2,
      flag: '🇦🇺',
    ),
  };

  /// 取得貨幣資訊
  static CurrencyInfo getInfo(Currency currency) {
    return _currencyInfo[currency]!;
  }

  /// 取得所有貨幣資訊
  static List<CurrencyInfo> getAllCurrencies() {
    return _currencyInfo.values.toList();
  }

  /// 格式化金額
  static String formatAmount(num amount, Currency currency) {
    final info = getInfo(currency);
    final formatter = NumberFormat.currency(
      symbol: info.symbol,
      decimalDigits: info.decimalPlaces,
    );
    return formatter.format(amount);
  }

  /// 格式化金額（僅數字）
  static String formatAmountNumber(num amount, Currency currency) {
    final info = getInfo(currency);
    final formatter = NumberFormat.decimalPattern()
      ..minimumFractionDigits = info.decimalPlaces
      ..maximumFractionDigits = info.decimalPlaces;
    return formatter.format(amount);
  }

  /// 從字串解析貨幣
  static Currency? fromString(String? code) {
    if (code == null) return null;
    try {
      return Currency.values.firstWhere(
        (c) => c.name == code.toUpperCase(),
      );
    } catch (_) {
      return null;
    }
  }

  /// 取得貨幣符號
  static String getSymbol(Currency currency) {
    return getInfo(currency).symbol;
  }

  /// 取得貨幣旗幟
  static String getFlag(Currency currency) {
    return getInfo(currency).flag;
  }

  /// 取得貨幣名稱
  static String getName(Currency currency) {
    return getInfo(currency).name;
  }

  /// 取得顯示文字（旗幟 + 代碼 + 名稱）
  static String getDisplayText(Currency currency) {
    final info = getInfo(currency);
    return '${info.flag} ${currency.name} - ${info.name}';
  }

  /// 取得簡短顯示文字（旗幟 + 代碼）
  static String getShortDisplayText(Currency currency) {
    final info = getInfo(currency);
    return '${info.flag} ${currency.name}';
  }
}
