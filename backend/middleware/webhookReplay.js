// Webhook replay protection middleware using Redis
const redis = require('../utils/redisClient');

const DEFAULT_TTL = parseInt(process.env.WEBHOOK_REPLAY_TTL_SECONDS || '300', 10); // 5 minutes

module.exports = async (req, res, next) => {
  try {
    // Expect providers to include X-Timestamp and X-Nonce headers
    const ts = req.header('X-Timestamp') || req.header('x-timestamp');
    const nonce = req.header('X-Nonce') || req.header('x-nonce');

    if (!ts || !nonce) {
      // If headers not present, allow but log
      return next();
    }

    const now = Math.floor(Date.now() / 1000);
    const tsNum = parseInt(ts, 10);
    if (Number.isNaN(tsNum)) return res.status(400).json({ message: 'Invalid timestamp' });

    // Reject old timestamps (replay window)
    const skew = Math.abs(now - tsNum);
    const window = parseInt(process.env.WEBHOOK_REPLAY_WINDOW_SECONDS || '300', 10);
    if (skew > window) return res.status(400).json({ message: 'Stale webhook timestamp' });

    const key = `webhook:nonce:${nonce}`;
    const exists = await redis.get(key);
    if (exists) {
      return res.status(409).json({ message: 'Duplicate webhook (replay detected)' });
    }

    // Store nonce with TTL
    await redis.set(key, '1', { EX: DEFAULT_TTL });
    return next();
  } catch (err) {
    console.error('Webhook replay middleware error', err);
    return next();
  }
};
