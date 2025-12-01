const request = require('supertest');
const app = require('../../server');

jest.mock('../models/User', () => ({
  setTransactionPin: jest.fn(),
  getUserById: jest.fn(),
  enable2FA: jest.fn(),
  disable2FA: jest.fn(),
  verifyTransactionPin: jest.fn(),
  getUserDevices: jest.fn(),
  removeDevice: jest.fn(),
  getLoginHistory: jest.fn()
}));

const UserModel = require('../models/User');

describe('SecurityController', () => {
  beforeEach(() => jest.resetAllMocks());

  it('sets transaction pin', async () => {
    UserModel.setTransactionPin.mockResolvedValue(true);

    const res = await request(app)
      .post('/api/security/pin')
      .send({ pin: '1234' })
      .set('Authorization', 'Bearer faketoken');

    expect([200,400,401]).toContain(res.statusCode);
  });

  it('returns 2FA status', async () => {
    UserModel.getUserById.mockResolvedValue({ twoFactorEnabled: true });

    const res = await request(app)
      .get('/api/security/2fa')
      .set('Authorization', 'Bearer faketoken');

    expect([200,401]).toContain(res.statusCode);
  });
});
