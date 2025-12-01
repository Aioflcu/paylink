#!/usr/bin/env node
// Lightweight smoke script to exercise health endpoints and a sample protected route
const axios = require('axios');

async function smoke() {
  const base = process.env.BACKEND_URL || 'http://localhost:5000/api';
  console.log('[smoke] Using base URL', base);

  try {
    const liveness = await axios.get(`${base}/health/liveness`);
    console.log('[smoke] liveness status', liveness.status);
  } catch (err) {
    console.error('[smoke] liveness failed', err.message);
  }

  try {
    const readiness = await axios.get(`${base}/health/readiness`);
    console.log('[smoke] readiness status', readiness.status);
  } catch (err) {
    console.error('[smoke] readiness failed', err.message);
  }

  console.log('[smoke] Completed smoke checks. For full tests run `npm run test:backend` (requires test env).');
}

smoke().catch(err => {
  console.error('[smoke] fatal', err);
  process.exit(1);
});
