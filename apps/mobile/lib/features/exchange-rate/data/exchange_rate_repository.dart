import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/utils/currency_utils.dart';

final exchangeRateRepositoryProvider = Provider<ExchangeRateRepository>((ref) {
  return ExchangeRateRepository(apiClient: ref.read(apiClientProvider));
});

/// 匯率回應模型
class RateResponse {
  final Currency baseCurrency;
  final Currency targetCurrency;
  final double rate;
  final DateTime fetchedAt;

  RateResponse({
    required this.baseCurrency,
    required this.targetCurrency,
    required this.rate,
    required this.fetchedAt,
  });

  factory RateResponse.fromJson(Map<String, dynamic> json) {
    return RateResponse(
      baseCurrency: CurrencyUtils.fromString(json['baseCurrency']) ?? Currency.TWD,
      targetCurrency: CurrencyUtils.fromString(json['targetCurrency']) ?? Currency.TWD,
      rate: double.parse(json['rate'].toString()),
      fetchedAt: DateTime.parse(json['fetchedAt']),
    );
  }
}

/// 轉換結果回應模型
class ConvertResponse {
  final double originalAmount;
  final Currency originalCurrency;
  final double convertedAmount;
  final Currency targetCurrency;
  final double rate;
  final DateTime fetchedAt;

  ConvertResponse({
    required this.originalAmount,
    required this.originalCurrency,
    required this.convertedAmount,
    required this.targetCurrency,
    required this.rate,
    required this.fetchedAt,
  });

  factory ConvertResponse.fromJson(Map<String, dynamic> json) {
    return ConvertResponse(
      originalAmount: double.parse(json['originalAmount'].toString()),
      originalCurrency: CurrencyUtils.fromString(json['originalCurrency']) ?? Currency.TWD,
      convertedAmount: double.parse(json['convertedAmount'].toString()),
      targetCurrency: CurrencyUtils.fromString(json['targetCurrency']) ?? Currency.TWD,
      rate: double.parse(json['rate'].toString()),
      fetchedAt: DateTime.parse(json['fetchedAt']),
    );
  }
}

class ExchangeRateRepository {
  final ApiClient apiClient;

  ExchangeRateRepository({required this.apiClient});

  /// 取得所有支援的貨幣
  Future<List<CurrencyInfo>> getSupportedCurrencies() async {
    final response = await apiClient.get('/exchange-rates/currencies');
    final List<dynamic> data = response.data;
    return data.map((json) => CurrencyInfo.fromJson(json)).toList();
  }

  /// 取得所有匯率（以 TWD 為基準）
  Future<List<RateResponse>> getAllRates() async {
    final response = await apiClient.get('/exchange-rates');
    final List<dynamic> data = response.data;
    return data.map((json) => RateResponse.fromJson(json)).toList();
  }

  /// 取得特定匯率
  Future<RateResponse> getRate(Currency from, Currency to) async {
    final response = await apiClient.get('/exchange-rates/${from.name}/${to.name}');
    return RateResponse.fromJson(response.data);
  }

  /// 轉換金額
  Future<ConvertResponse> convert({
    required double amount,
    required Currency from,
    required Currency to,
  }) async {
    final response = await apiClient.post(
      '/exchange-rates/convert',
      data: {
        'amount': amount,
        'from': from.name,
        'to': to.name,
      },
    );
    return ConvertResponse.fromJson(response.data);
  }

  /// 取得貨幣資訊
  Future<CurrencyInfo> getCurrencyInfo(Currency code) async {
    final response = await apiClient.get('/exchange-rates/currency/${code.name}');
    return CurrencyInfo.fromJson(response.data);
  }
}

/// 貨幣資訊（從 API 回傳）
class CurrencyInfo {
  final Currency code;
  final String symbol;
  final String name;
  final int decimalPlaces;

  CurrencyInfo({
    required this.code,
    required this.symbol,
    required this.name,
    required this.decimalPlaces,
  });

  factory CurrencyInfo.fromJson(Map<String, dynamic> json) {
    return CurrencyInfo(
      code: CurrencyUtils.fromString(json['code']) ?? Currency.TWD,
      symbol: json['symbol'],
      name: json['name'],
      decimalPlaces: json['decimalPlaces'],
    );
  }
}
