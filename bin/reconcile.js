#!/usr/bin/env node

// Simple CLI wrapper to run the reconciliation job on demand or via cron
const { runOnce } = require('../backend/jobs/reconciliation');

(async function() {
  try {
    const limitArg = process.argv[2];
    const limit = limitArg ? parseInt(limitArg, 10) : undefined;
    await runOnce({ limit });
    process.exit(0);
  } catch (err) {
    console.error('Reconcile CLI failed', err);
    process.exit(1);
  }
})();
