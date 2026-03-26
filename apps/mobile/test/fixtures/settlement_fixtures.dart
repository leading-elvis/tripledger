/// 結算測試資料固定值

/// 成員餘額 JSON
final memberBalanceJsonFixture = {
  'userId': 'user-1',
  'userName': '小明',
  'userAvatar': 'https://example.com/avatar.jpg',
  'paid': '1500',
  'owed': '666.67',
  'balance': '833.33',
};

/// 餘額為負的成員 JSON
final negativeBalanceJsonFixture = {
  'userId': 'user-2',
  'userName': '小華',
  'userAvatar': null,
  'paid': '0',
  'owed': '500',
  'balance': '-500',
};

/// 建議結算 JSON
final suggestedSettlementJsonFixture = {
  'from': {
    'id': 'user-2',
    'name': '小華',
    'avatarUrl': null,
  },
  'to': {
    'id': 'user-1',
    'name': '小明',
    'avatarUrl': 'https://example.com/avatar.jpg',
  },
  'amount': '500',
};

/// 旅程總結 JSON
final tripSummaryJsonFixture = {
  'totalSpent': '5000',
  'billCount': 10,
  'memberCount': 3,
  'balances': [
    {
      'userId': 'user-1',
      'userName': '小明',
      'userAvatar': null,
      'paid': '3000',
      'owed': '1666.67',
      'balance': '1333.33',
    },
    {
      'userId': 'user-2',
      'userName': '小華',
      'userAvatar': null,
      'paid': '1500',
      'owed': '1666.67',
      'balance': '-166.67',
    },
    {
      'userId': 'user-3',
      'userName': '小美',
      'userAvatar': null,
      'paid': '500',
      'owed': '1666.66',
      'balance': '-1166.66',
    },
  ],
  'suggestedSettlements': [
    {
      'from': {'id': 'user-3', 'name': '小美', 'avatarUrl': null},
      'to': {'id': 'user-1', 'name': '小明', 'avatarUrl': null},
      'amount': '1166.66',
    },
    {
      'from': {'id': 'user-2', 'name': '小華', 'avatarUrl': null},
      'to': {'id': 'user-1', 'name': '小明', 'avatarUrl': null},
      'amount': '166.67',
    },
  ],
  'settledAmount': '500',
};

/// 結算記錄 JSON（PENDING 狀態）
final pendingSettlementJsonFixture = {
  'id': 'settlement-1',
  'tripId': 'trip-1',
  'payerId': 'user-2',
  'payer': {
    'id': 'user-2',
    'name': '小華',
    'avatarUrl': null,
  },
  'receiverId': 'user-1',
  'receiver': {
    'id': 'user-1',
    'name': '小明',
    'avatarUrl': 'https://example.com/avatar.jpg',
  },
  'amount': '500',
  'status': 'PENDING',
  'settledAt': null,
  'createdAt': '2024-01-20T02:00:00.000Z',
};

/// 結算記錄 JSON（CONFIRMED 狀態）
final confirmedSettlementJsonFixture = {
  'id': 'settlement-2',
  'tripId': 'trip-1',
  'payerId': 'user-3',
  'payer': {
    'id': 'user-3',
    'name': '小美',
    'avatarUrl': null,
  },
  'receiverId': 'user-1',
  'receiver': {
    'id': 'user-1',
    'name': '小明',
    'avatarUrl': null,
  },
  'amount': '300.50',
  'status': 'CONFIRMED',
  'settledAt': '2024-01-21T15:30:00.000Z',
  'createdAt': '2024-01-20T02:00:00.000Z',
};

/// 金額為整數的結算 JSON
final integerAmountSettlementJsonFixture = {
  'id': 'settlement-int',
  'tripId': 'trip-1',
  'payerId': 'user-2',
  'payer': {'id': 'user-2', 'name': '小華', 'avatarUrl': null},
  'receiverId': 'user-1',
  'receiver': {'id': 'user-1', 'name': '小明', 'avatarUrl': null},
  'amount': '1000', // 整數
  'status': 'PENDING',
  'settledAt': null,
  'createdAt': '2024-01-20T00:00:00.000Z',
};
