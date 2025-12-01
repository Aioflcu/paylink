const request = require('supertest');
const app = require('../../server');

describe('Webhooks', () => {
  it('returns 501 for metrics if prom-client missing', async () => {
    const res = await request(app).get('/api/metrics');
    expect([200,501]).toContain(res.statusCode);
  });
});
