const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const nodemailer = require('nodemailer');
const axios = require('axios');

jest.mock('nodemailer');
jest.mock('axios');

let app;
let mongoServer;

beforeAll(async () => {
  // Start in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  process.env.JWT_SECRET = 'testsecret';
  process.env.FRONTEND_ORIGIN = 'http://localhost:3000';

  // Mock nodemailer transporter to avoid real emails
  nodemailer.createTransport.mockReturnValue({ sendMail: jest.fn().mockResolvedValue(true) });

  // Mock redis client used by idempotency middleware to a simple in-memory stub
  jest.doMock('../utils/redisClient', () => {
    const store = new Map();
    return {
      get: async (k) => store.get(k) || null,
      set: async (k, v) => { store.set(k, v); return 'OK'; },
      del: async (k) => { store.delete(k); return 1; }
    };
  });

  // Require app after setting envs and mocks
  app = require('../../server');
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('Integration - auth and wallet flows', () => {
  test('Register -> verify OTP -> login -> get wallet balance', async () => {
    // register
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Test User',
        username: 'testuser',
        email: 'test@example.com',
        phone: '08000000000',
        country: 'NG',
        password: 'password123'
      })
      .expect(201);

    expect(registerRes.body.message).toMatch(/registered/i);

    // fetch user to get OTP (OTP saved in DB) - use User model directly
    const User = require('../../models/User');
    const user = await User.findOne({ email: 'test@example.com' });
    expect(user).toBeTruthy();
    const otp = user.otp;

    // verify otp
    const verifyRes = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: 'test@example.com', otp })
      .expect(200);

    expect(verifyRes.body.token).toBeTruthy();
    const token = verifyRes.body.token;

    // login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'test@example.com', password: 'password123' })
      .expect(200);
    expect(loginRes.body.token).toBeTruthy();

    // wallet balance
    const balRes = await request(app)
      .get('/api/wallet/balance')
      .set('Authorization', `Bearer ${loginRes.body.token}`)
      .expect(200);
    expect(balRes.body.balance).toBeDefined();
  }, 20000);

  test('Deposit initializes Monnify payment and returns checkout url', async () => {
    // Create a user and token via register->verify flow quickly
    await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Pay User',
        username: 'payuser',
        email: 'pay@example.com',
        phone: '08011111111',
        country: 'NG',
        password: 'password123'
      })
      .expect(201);

    const User = require('../../models/User');
    const user = await User.findOne({ email: 'pay@example.com' });
    // verify OTP
    await request(app).post('/api/auth/verify-otp').send({ email: 'pay@example.com', otp: user.otp }).expect(200);
    const loginRes = await request(app).post('/api/auth/login').send({ identifier: 'pay@example.com', password: 'password123' }).expect(200);
    const token = loginRes.body.token;

    // Mock Monnify init response
    axios.post.mockResolvedValueOnce({ data: { responseBody: { checkoutUrl: 'https://pay.monnify/checkout', transactionReference: 'TX-123' } } });

    const depositRes = await request(app)
      .post('/api/wallet/deposit')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 5000 })
      .expect(200);

    expect(depositRes.body.checkoutUrl).toBe('https://pay.monnify/checkout');
    expect(depositRes.body.transactionReference).toBe('TX-123');
  }, 20000);
});
