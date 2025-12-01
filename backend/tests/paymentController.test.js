const request = require('supertest');
const app = require('../../server');

// Mock the user and transaction models and payFlexService
jest.mock('../models/User', () => ({
  getUserById: jest.fn(),
  updateWalletBalance: jest.fn(),
  addRewardPoints: jest.fn(),
  verifyTransactionPin: jest.fn()
}));

jest.mock('../models/Transaction', () => ({
  createTransaction: jest.fn(),
  updateTransactionStatus: jest.fn()
}));

jest.mock('../utils/payflexService', () => ({
  buyAirtime: jest.fn()
}));

const UserModel = require('../models/User');
const TransactionModel = require('../models/Transaction');
const payFlexService = require('../utils/payflexService');

describe('PaymentController - buyAirtime', () => {
  beforeEach(() => jest.resetAllMocks());

  it('returns 400 when missing fields', async () => {
    const res = await request(app)
      .post('/api/payments/airtime')
      .send({});

    expect(res.statusCode).toBe(400);
  });

  it('returns 404 when user not found', async () => {
    UserModel.getUserById.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/payments/airtime')
      .send({ phone: '08012345678', amount: 100, provider: 'mtn' });

    expect(res.statusCode).toBe(404);
  });

  it('processes successful airtime purchase', async () => {
    UserModel.getUserById.mockResolvedValue({ uid: 'user1', walletBalance: 1000 });
    TransactionModel.createTransaction.mockResolvedValue({ transactionId: 'tx1' });
    payFlexService.buyAirtime.mockResolvedValue({ success: true, transactionId: 'external-tx' });

    const res = await request(app)
      .post('/api/payments/airtime')
      .send({ phone: '08012345678', amount: 100, provider: 'mtn' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(TransactionModel.updateTransactionStatus).toHaveBeenCalledWith('tx1', 'completed', expect.any(Object));
  });
});
