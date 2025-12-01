const logger = require('../utils/logger');

// Centralized error handler. Captures exception to Sentry when configured and
// returns a small JSON payload including the request id for easier support.
module.exports = function errorHandler(err, req, res, next) {
  try {
    const status = err && err.status ? err.status : 500;

    // Ensure we log stack and message with request id and timestamp
    if (req) {
      logger.error(req, err.stack || err.message || err);
    } else {
      logger.error(err.stack || err.message || err);
    }

    // Capture in Sentry if available
    try {
      if (global.Sentry && typeof global.Sentry.captureException === 'function') {
        global.Sentry.captureException(err);
      }
    } catch (sentryErr) {
      logger.warn(req, 'Sentry capture failed', sentryErr.message || sentryErr);
    }

    // Respond with minimal info and request id for tracing
    res.status(status).json({
      success: false,
      error: err && err.message ? err.message : 'Internal server error',
      requestId: req && req.id ? req.id : undefined
    });
  } catch (fatal) {
    // If error handler itself fails, fallback to simple response
    console.error('Fatal error in errorHandler', fatal);
    try { res.status(500).json({ success: false, error: 'Internal server error' }); } catch (e) { /* ignore */ }
  }
};
