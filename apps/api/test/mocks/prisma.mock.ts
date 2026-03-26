/**
 * PrismaService Mock 工廠
 * 用於單元測試中模擬資料庫操作
 */

export type MockPrismaModel = {
  findUnique: jest.Mock;
  findMany: jest.Mock;
  findFirst: jest.Mock;
  create: jest.Mock;
  createMany: jest.Mock;
  update: jest.Mock;
  updateMany: jest.Mock;
  delete: jest.Mock;
  deleteMany: jest.Mock;
  count: jest.Mock;
  groupBy: jest.Mock;
};

export type PrismaMock = {
  user: MockPrismaModel;
  trip: MockPrismaModel;
  tripMember: MockPrismaModel;
  bill: MockPrismaModel;
  billShare: MockPrismaModel;
  billItem: MockPrismaModel;
  billItemShare: MockPrismaModel;
  settlement: MockPrismaModel;
  notification: MockPrismaModel;
  virtualMember: MockPrismaModel;
  refreshToken: MockPrismaModel;
  deviceToken: MockPrismaModel;
  $transaction: jest.Mock;
};

/**
 * 建立單一模型的 Mock
 */
const createModelMock = (): MockPrismaModel => ({
  findUnique: jest.fn(),
  findMany: jest.fn(),
  findFirst: jest.fn(),
  create: jest.fn(),
  createMany: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
  delete: jest.fn(),
  deleteMany: jest.fn(),
  count: jest.fn(),
  groupBy: jest.fn(),
});

/**
 * 建立完整的 PrismaService Mock
 */
export const createPrismaMock = (): PrismaMock => {
  const mock: PrismaMock = {
    user: createModelMock(),
    trip: createModelMock(),
    tripMember: createModelMock(),
    bill: createModelMock(),
    billShare: createModelMock(),
    billItem: createModelMock(),
    billItemShare: createModelMock(),
    settlement: createModelMock(),
    notification: createModelMock(),
    virtualMember: createModelMock(),
    refreshToken: createModelMock(),
    deviceToken: createModelMock(),
    $transaction: jest.fn(),
  };
  // $transaction passes the same mock objects to the callback
  // so that test setups like prismaMock.settlement.findUnique.mockResolvedValue(...)
  // are visible inside transactions
  mock.$transaction.mockImplementation((callback) => callback(mock));
  return mock;
};

/**
 * 重置所有 Mock
 */
export const resetPrismaMock = (mock: PrismaMock): void => {
  const models = [
    'user',
    'trip',
    'tripMember',
    'bill',
    'billShare',
    'billItem',
    'billItemShare',
    'settlement',
    'notification',
    'virtualMember',
    'refreshToken',
    'deviceToken',
  ] as const;

  for (const model of models) {
    Object.values(mock[model]).forEach((fn) => {
      if (typeof fn === 'function' && 'mockReset' in fn) {
        (fn as jest.Mock).mockReset();
      }
    });
  }
  mock.$transaction.mockReset();
};
