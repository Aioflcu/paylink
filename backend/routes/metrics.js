const express = require('express');
const router = express.Router();
let client;
try {
  client = require('prom-client');
} catch (e) {
  client = null;
}

if (client) {
  const collectDefaultMetrics = client.collectDefaultMetrics;
  collectDefaultMetrics({ timeout: 5000 });

  router.get('/', async (req, res) => {
    try {
      res.set('Content-Type', client.register.contentType);
      res.end(await client.register.metrics());
    } catch (err) {
      res.status(500).end(err.message);
    }
  });
} else {
  router.get('/', (req, res) => res.status(501).json({ error: 'Metrics not available' }));
}

module.exports = router;
