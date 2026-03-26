/// 帳單測試資料固定值

/// 完整的帳單 JSON（用於 fromJson 測試）
final billJsonFixture = {
  'id': 'bill-1',
  'tripId': 'trip-1',
  'payerId': 'user-1',
  'payer': {
    'id': 'user-1',
    'name': '小明',
    'avatarUrl': 'https://example.com/avatar1.jpg',
  },
  'title': '晚餐',
  'amount': '1000.00',
  'category': 'FOOD',
  'splitType': 'EQUAL',
  'receiptImage': null,
  'note': '好吃的日本料理',
  'paidAt': '2024-01-15T02:30:00.000Z',
  'shares': [
    {
      'id': 'share-1',
      'billId': 'bill-1',
      'userId': 'user-1',
      'user': {
        'id': 'user-1',
        'name': '小明',
        'avatarUrl': 'https://example.com/avatar1.jpg',
      },
      'amount': '333.34',
    },
    {
      'id': 'share-2',
      'billId': 'bill-1',
      'userId': 'user-2',
      'user': {
        'id': 'user-2',
        'name': '小華',
        'avatarUrl': null,
      },
      'amount': '333.33',
    },
    {
      'id': 'share-3',
      'billId': 'bill-1',
      'userId': 'user-3',
      'user': {
        'id': 'user-3',
        'name': '小美',
        'avatarUrl': null,
      },
      'amount': '333.33',
    },
  ],
  'items': null,
};

/// ITEMIZED 類型帳單 JSON
final itemizedBillJsonFixture = {
  'id': 'bill-itemized',
  'tripId': 'trip-1',
  'payerId': 'user-1',
  'payer': {
    'id': 'user-1',
    'name': '小明',
    'avatarUrl': null,
  },
  'title': '細項帳單',
  'amount': '1000',
  'category': 'FOOD',
  'splitType': 'ITEMIZED',
  'receiptImage': null,
  'note': null,
  'paidAt': '2024-01-15T02:30:00.000Z',
  'shares': [
    {
      'id': 'share-1',
      'billId': 'bill-itemized',
      'userId': 'user-1',
      'user': {'id': 'user-1', 'name': '小明', 'avatarUrl': null},
      'amount': '300',
    },
    {
      'id': 'share-2',
      'billId': 'bill-itemized',
      'userId': 'user-2',
      'user': {'id': 'user-2', 'name': '小華', 'avatarUrl': null},
      'amount': '500',
    },
    {
      'id': 'share-3',
      'billId': 'bill-itemized',
      'userId': 'user-3',
      'user': {'id': 'user-3', 'name': '小美', 'avatarUrl': null},
      'amount': '200',
    },
  ],
  'items': [
    {
      'id': 'item-1',
      'billId': 'bill-itemized',
      'name': '牛排',
      'amount': '600',
      'shares': [
        {
          'id': 'item-share-1',
          'billItemId': 'item-1',
          'userId': 'user-1',
          'user': {'id': 'user-1', 'name': '小明', 'avatarUrl': null},
          'amount': '300',
        },
        {
          'id': 'item-share-2',
          'billItemId': 'item-1',
          'userId': 'user-2',
          'user': {'id': 'user-2', 'name': '小華', 'avatarUrl': null},
          'amount': '300',
        },
      ],
    },
    {
      'id': 'item-2',
      'billId': 'bill-itemized',
      'name': '沙拉',
      'amount': '400',
      'shares': [
        {
          'id': 'item-share-3',
          'billItemId': 'item-2',
          'userId': 'user-2',
          'user': {'id': 'user-2', 'name': '小華', 'avatarUrl': null},
          'amount': '200',
        },
        {
          'id': 'item-share-4',
          'billItemId': 'item-2',
          'userId': 'user-3',
          'user': {'id': 'user-3', 'name': '小美', 'avatarUrl': null},
          'amount': '200',
        },
      ],
    },
  ],
};

/// 最小必要欄位的帳單 JSON
final minimalBillJsonFixture = {
  'id': 'bill-minimal',
  'tripId': 'trip-1',
  'payerId': 'user-1',
  'payer': {
    'id': 'user-1',
    'name': '小明',
    'avatarUrl': null,
  },
  'title': '最小帳單',
  'amount': '100',
  'category': 'OTHER',
  'splitType': 'EQUAL',
  'receiptImage': null,
  'note': null,
  'paidAt': '2024-01-15T00:00:00.000Z',
  'shares': [],
  'items': null,
};

/// 金額為整數字串的 JSON（測試 double.parse）
final integerAmountBillJsonFixture = {
  'id': 'bill-int',
  'tripId': 'trip-1',
  'payerId': 'user-1',
  'payer': {'id': 'user-1', 'name': '小明', 'avatarUrl': null},
  'title': '整數金額',
  'amount': '500', // 整數字串
  'category': 'TRANSPORT',
  'splitType': 'EQUAL',
  'receiptImage': null,
  'note': null,
  'paidAt': '2024-01-15T00:00:00.000Z',
  'shares': [
    {
      'id': 'share-1',
      'billId': 'bill-int',
      'userId': 'user-1',
      'user': {'id': 'user-1', 'name': '小明', 'avatarUrl': null},
      'amount': '250',
    },
    {
      'id': 'share-2',
      'billId': 'bill-int',
      'userId': 'user-2',
      'user': {'id': 'user-2', 'name': '小華', 'avatarUrl': null},
      'amount': '250',
    },
  ],
  'items': null,
};
