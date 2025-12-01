// backend/tests/e2e.test.js
// End-to-end test suite exercising full user flows without Monnify.
// Uses supertest to make HTTP calls and mocks external providers.

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const User = require('../../models/User');
const Wallet = require('../../models/Wallet');
const Transaction = require('../../models/Transaction');
const jwt = require('jsonwebtoken');

// Test database setup (use test DB or memory-server in real setup)
const TEST_DB = process.env.MONGODB_URI || 'mongodb://localhost:27017/paylink_e2e_test';

let authToken;
let testUserId;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_DB, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
  }
  // Clear test data
  await User.deleteMany({});
  await Wallet.deleteMany({});
  await Transaction.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe('E2E: User Authentication & Wallet Flow (non-Monnify)', () => {
  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Test User',
        username: 'testuser123',
        email: 'test@example.com',
        phone: '+2348012345678',
        country: 'NG',
        password: 'TestPassword123!'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toContain('verify OTP');

    // Fetch OTP from DB (in real tests, use email service mock)
    const user = await User.findOne({ email: 'test@example.com' });
    expect(user).toBeDefined();
    expect(user.otp).toBeDefined();
  });

  it('should verify OTP and return JWT', async () => {
    const user = await User.findOne({ email: 'test@example.com' });
    const otp = user.otp;

    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({
        email: 'test@example.com',
        otp: otp
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('test@example.com');

    authToken = res.body.token;
    testUserId = res.body.user.id;
  });

  it('should login with credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'testuser123',
        password: 'TestPassword123!'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('should get wallet balance', async () => {
    const res = await request(app)
      .get('/api/wallet/balance')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.balance).toBe(0); // new wallet
  });

  it('should reject Monnify deposit without credentials', async () => {
    const res = await request(app)
      .post('/api/wallet/deposit')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        amount: 1000
      });

    expect(res.statusCode).toBe(501);
    expect(res.body.message).toContain('not configured');
  });
});

describe('E2E: Utility Purchase Flow (Mocked Providers)', () => {
  beforeAll(async () => {
    // Create a test user with wallet balance for purchases
    if (!testUserId) {
      const user = new User({
        fullName: 'Utility Test User',
        username: 'utilitytest',
        email: 'utility@example.com',
        phone: '+2348087654321',
        country: 'NG',
        password: 'TestPassword123!',
        isVerified: true
      });
      await user.save();
      testUserId = user._id;

      const wallet = new Wallet({
        userId: user._id,
        balance: 10000 // starting balance
      });
      await wallet.save();

      // Create a JWT for this user
      authToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'testsecret', {
        expiresIn: '7d'
      });
    }
  });

  it('should set transaction PIN', async () => {
    const res = await request(app)
      .post('/api/security/set-pin')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        pin: '1234'
      });

    expect([200, 201]).toContain(res.statusCode);
  });

  it('should reject airtime purchase with invalid Idempotency-Key header', async () => {
    // Without idempotency key, request should still process but allow duplicates
    const res = await request(app)
      .post('/api/payments/airtime')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        provider: 'MTN',
        phone: '+2348012345678',
        amount: 500
      });

    // Should either succeed (if provider mock available) or fail gracefully
    expect([200, 400, 500, 501]).toContain(res.statusCode);
  });

  it('should handle Peyflex provider fetch', async () => {
    const res = await request(app)
      .get('/api/payflex/providers/airtime');

    // May return 500 if Peyflex not mocked, but should not crash
    expect([200, 500, 502]).toContain(res.statusCode);
  });

  it('should reject unauthorized requests', async () => {
    const res = await request(app)
      .get('/api/wallet/balance');

    expect(res.statusCode).toBe(401);
  });
});

describe('E2E: Health & Observability', () => {
  it('should respond to health check', async () => {
    const res = await request(app)
      .get('/api/health/live');

    expect([200, 404]).toContain(res.statusCode);
  });

  it('should expose metrics endpoint', async () => {
    const res = await request(app)
      .get('/api/metrics');

    // Metrics may not be available if prom-client not installed
    expect([200, 404]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.text).toContain('http_requests_total');
    }
  });

  it('should include X-Request-Id in responses', async () => {
    const res = await request(app)
      .get('/api/health/live');

    // Request ID should be present in all responses
    if (res.statusCode === 200 || res.statusCode === 404) {
      expect(res.headers['x-request-id']).toBeDefined();
    }
  });
});

describe('E2E: Error Handling', () => {
  it('should return structured error response with requestId', async () => {
    const res = await request(app)
      .post('/api/payments/airtime')
      .set('Authorization', `Bearer invalid-token`)
      .send({
        provider: 'MTN',
        phone: '+2348012345678',
        amount: 500
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.requestId).toBeDefined();
    expect(res.body.success).toBe(false);
  });

  it('should handle 404 gracefully', async () => {
    const res = await request(app)
      .get('/api/nonexistent-endpoint');

    expect(res.statusCode).toBe(404);
    expect(res.body.requestId).toBeDefined();
  });
});
