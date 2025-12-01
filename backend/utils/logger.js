// Lightweight logger helpers to include ISO timestamp and optional request id
// Designed to be used in backend code without adding dependencies.
function prefix(req) {
  const ts = new Date().toISOString();
  const rid = req && req.id ? ` [req:${req.id}]` : '';
  return `[${ts}]${rid}`;
}

exports.log = function(reqOrMsg, ...args) {
  // Accept either (req, ...args) or (message, ...args)
  if (typeof reqOrMsg === 'string') {
    console.log(`${prefix()} ${reqOrMsg}`, ...args);
  } else {
    console.log(`${prefix(reqOrMsg)} `, ...args);
  }
};

exports.warn = function(reqOrMsg, ...args) {
  if (typeof reqOrMsg === 'string') {
    console.warn(`${prefix()} ${reqOrMsg}`, ...args);
  } else {
    console.warn(`${prefix(reqOrMsg)} `, ...args);
  }
};

exports.error = function(reqOrErr, ...args) {
  if (reqOrErr instanceof Error || typeof reqOrErr === 'string') {
    console.error(`${prefix()} `, reqOrErr, ...args);
  } else {
    // assume req
    console.error(`${prefix(reqOrErr)} `, ...args);
  }
};

exports.prefix = prefix;
const pino = require('pino');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
module.exports = logger;
