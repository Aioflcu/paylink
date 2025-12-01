const redisClient = require('../utils/redisClient');

// TTL in seconds for idempotency keys
const IDEMPOTENCY_TTL = parseInt(process.env.IDEMPOTENCY_TTL_SECONDS || '300', 10); // 5 minutes by default

module.exports = async (req, res, next) => {
  try {
    const key = req.header('Idempotency-Key') || req.body?.idempotencyKey || req.query?.idempotencyKey;
    if (!key) return next();

    const idKey = `idem:${req.method}:${req.originalUrl}:${key}`;

    // Check if response exists
    const cached = await redisClient.get(idKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return res.status(parsed.status || 200).json(parsed.body);
      } catch (e) {
        // if parsing fails, continue to processing
      }
    }

    // Try to set a processing lock using NX
    const lockKey = `${idKey}:lock`;
    const lockSet = await redisClient.set(lockKey, 'processing', { NX: true, EX: IDEMPOTENCY_TTL });
    if (!lockSet) {
      return res.status(429).json({ message: 'Request with this Idempotency-Key is already being processed' });
    }

    // Capture response
    const originalJson = res.json.bind(res);
    let responded = false;
    res.json = async (body) => {
      if (responded) return originalJson(body);
      responded = true;
      const payload = JSON.stringify({ status: res.statusCode || 200, body });
      try {
        await redisClient.set(idKey, payload, { EX: IDEMPOTENCY_TTL });
      } catch (e) {
        console.error('Failed to cache idempotent response', e);
      }
      // Remove lock
      try { await redisClient.del(lockKey); } catch (e) {}
      return originalJson(body);
    };

    // On error or timeout, ensure lock is removed later (TTL will expire)
    res.on('finish', async () => {
      try {
        await redisClient.del(lockKey);
      } catch (e) {}
    });

    next();
  } catch (err) {
    console.error('Idempotency middleware error', err);
    next();
  }
};
