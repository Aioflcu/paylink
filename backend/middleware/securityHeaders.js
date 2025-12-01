const helmet = require('helmet');

module.exports = (app, options = {}) => {
  // Default helmet configuration - tweak as necessary
  const cfg = {
    contentSecurityPolicy: false, // frontend serves CSP via meta tags or reverse proxy
    crossOriginEmbedderPolicy: false,
    ...options
  };

  return helmet(cfg);
};
