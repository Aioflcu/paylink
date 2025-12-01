module.exports = function initSentry() {
  try {
    const Sentry = require('@sentry/node');
    const dsn = process.env.SENTRY_DSN;
    if (!dsn) {
      console.warn('SENTRY_DSN not provided; skipping Sentry initialization');
      return null;
    }

    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.05')
    });

    return Sentry;
  } catch (err) {
    console.warn('Failed to initialize Sentry:', err.message);
    return null;
  }
};
