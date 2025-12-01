const rateLimit = require('express-rate-limit');

// Generic rate limiter factory: use per-route for sensitive endpoints
exports.globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_GLOBAL || '200', 10),
  standardHeaders: true,
  legacyHeaders: false,
});

exports.authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_AUTH || '10', 10),
  message: { error: 'Too many auth attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

exports.paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_PAYMENT || '20', 10),
  message: { error: 'Too many payment attempts, slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});
