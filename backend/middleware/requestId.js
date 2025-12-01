const crypto = require('crypto');

// Attach a request id to each request (X-Request-Id header) and expose it
// on req.id so downstream logs and error handlers can include it.
module.exports = function requestIdMiddleware(req, res, next) {
  try {
    const headerId = req.header('X-Request-Id');
    const id = headerId || (crypto.randomUUID ? crypto.randomUUID() : `req-${Date.now()}-${Math.random().toString(36).slice(2,8)}`);
    req.id = id;
    // expose to clients for troubleshooting
    res.setHeader('X-Request-Id', id);
  } catch (e) {
    // non-fatal: if randomUUID not present or something else fails, continue
    req.id = req.id || `req-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    try { res.setHeader('X-Request-Id', req.id); } catch (err) {}
  }
  next();
};
