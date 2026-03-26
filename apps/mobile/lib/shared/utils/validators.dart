import '../../core/utils/currency_utils.dart';

/// 表單驗證工具類別
class Validators {
  /// 驗證必填欄位
  static String? required(String? value, {String fieldName = '此欄位'}) {
    if (value == null || value.trim().isEmpty) {
      return '請輸入$fieldName';
    }
    return null;
  }

  /// 驗證金額
  static String? amount(String? value, {
    double? min,
    double? max,
    bool allowZero = false,
  }) {
    if (value == null || value.isEmpty) {
      return '請輸入金額';
    }

    final amount = double.tryParse(value);
    if (amount == null) {
      return '請輸入有效的數字';
    }

    if (!allowZero && amount <= 0) {
      return '金額必須大於 0';
    }

    if (allowZero && amount < 0) {
      return '金額不能為負數';
    }

    if (min != null && amount < min) {
      return '金額不能小於 ${min.toStringAsFixed(0)}';
    }

    if (max != null && amount > max) {
      return '金額不能大於 ${max.toStringAsFixed(0)}';
    }

    return null;
  }

  /// 驗證百分比
  static String? percentage(String? value, {bool allowZero = false}) {
    if (value == null || value.isEmpty) {
      return '請輸入百分比';
    }

    final percentage = double.tryParse(value);
    if (percentage == null) {
      return '請輸入有效的數字';
    }

    if (!allowZero && percentage <= 0) {
      return '百分比必須大於 0';
    }

    if (percentage < 0) {
      return '百分比不能為負數';
    }

    if (percentage > 100) {
      return '百分比不能超過 100';
    }

    return null;
  }

  /// 驗證整數
  static String? integer(String? value, {
    int? min,
    int? max,
    String fieldName = '數值',
  }) {
    if (value == null || value.isEmpty) {
      return '請輸入$fieldName';
    }

    final intValue = int.tryParse(value);
    if (intValue == null) {
      return '請輸入有效的整數';
    }

    if (min != null && intValue < min) {
      return '$fieldName不能小於 $min';
    }

    if (max != null && intValue > max) {
      return '$fieldName不能大於 $max';
    }

    return null;
  }

  /// 驗證文字長度
  static String? length(String? value, {
    int? min,
    int? max,
    String fieldName = '此欄位',
  }) {
    if (value == null || value.isEmpty) {
      if (min != null && min > 0) {
        return '請輸入$fieldName';
      }
      return null;
    }

    final length = value.length;

    if (min != null && length < min) {
      return '$fieldName至少需要 $min 個字元';
    }

    if (max != null && length > max) {
      return '$fieldName不能超過 $max 個字元';
    }

    return null;
  }

  /// 驗證邀請碼格式
  static String? inviteCode(String? value) {
    if (value == null || value.trim().isEmpty) {
      return '請輸入邀請碼';
    }

    final trimmed = value.trim().toUpperCase();

    // 邀請碼應為 6-8 位英數字
    if (trimmed.length < 6 || trimmed.length > 8) {
      return '邀請碼應為 6-8 位';
    }

    if (!RegExp(r'^[A-Z0-9]+$').hasMatch(trimmed)) {
      return '邀請碼只能包含英文字母和數字';
    }

    return null;
  }

  /// 組合多個驗證器
  static String? Function(String?) combine(
    List<String? Function(String?)> validators,
  ) {
    return (String? value) {
      for (final validator in validators) {
        final error = validator(value);
        if (error != null) {
          return error;
        }
      }
      return null;
    };
  }
}

/// 帳單驗證器
class BillValidators {
  /// 驗證帳單標題
  static String? title(String? value) {
    return Validators.combine([
      (v) => Validators.required(v, fieldName: '帳單標題'),
      (v) => Validators.length(v, min: 1, max: 100, fieldName: '帳單標題'),
    ])(value);
  }

  /// 驗證帳單金額
  static String? amount(String? value) {
    return Validators.amount(value, min: 1, max: 10000000);
  }

  /// 驗證備註
  static String? note(String? value) {
    return Validators.length(value, max: 500, fieldName: '備註');
  }

  /// 驗證指定金額分攤的總和
  static String? exactAmountTotal({
    required double totalAmount,
    required Map<String, double> exactAmounts,
    required Set<String> selectedMemberIds,
    Currency currency = Currency.TWD,
  }) {
    final totalExact = selectedMemberIds.fold<double>(
      0, (sum, id) => sum + (exactAmounts[id] ?? 0),
    );

    if ((totalExact - totalAmount).abs() > 0.01) {
      return '指定金額總和 (${CurrencyUtils.formatAmount(totalExact, currency)}) 與帳單金額 (${CurrencyUtils.formatAmount(totalAmount, currency)}) 不符';
    }
    return null;
  }

  /// 驗證百分比分攤的總和
  static String? percentageTotal({
    required Map<String, double> percentages,
    required Set<String> selectedMemberIds,
  }) {
    final totalPercentage = selectedMemberIds.fold<double>(
      0, (sum, id) => sum + (percentages[id] ?? 0),
    );

    if ((totalPercentage - 100).abs() > 0.01) {
      return '百分比總和 (${totalPercentage.toStringAsFixed(1)}%) 必須等於 100%';
    }
    return null;
  }
}

/// 旅程驗證器
class TripValidators {
  /// 驗證旅程名稱
  static String? name(String? value) {
    return Validators.combine([
      (v) => Validators.required(v, fieldName: '旅程名稱'),
      (v) => Validators.length(v, min: 1, max: 50, fieldName: '旅程名稱'),
    ])(value);
  }

  /// 驗證旅程描述
  static String? description(String? value) {
    return Validators.length(value, max: 200, fieldName: '描述');
  }

  /// 驗證邀請碼
  static String? inviteCode(String? value) {
    return Validators.inviteCode(value);
  }
}
