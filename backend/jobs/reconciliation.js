// backend/jobs/reconciliation.js
// Reconciliation job to recover missed/failed webhooks and reconcile pending transactions.
// Behavior:
//  - Finds transactions with status 'pending' or 'unknown' and attempts provider lookups
//  - Updates transaction.status when provider reports a definitive state
//  - Credits wallets for successful deposits that were previously missed
//  - Records reconcile attempts and timestamps

const mongoose = require('mongoose');
const axios = require('axios');
let promClient = null;
try {
  promClient = require('prom-client');
} catch (e) {
  promClient = null;
}
const Transaction = require('../../models/Transaction');
const User = require('../../models/User');
const Wallet = require('../../models/Wallet');

// TTL/limits
const MAX_BATCH = parseInt(process.env.RECONCILE_BATCH_LIMIT || '200', 10);

async function ensureConnected() {
  if (mongoose.connection.readyState === 0) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI is not set');
    await mongoose.connect(uri);
  }
}

async function reconcileOne(tx) {
  try {
    // Try Monnify-style lookup for deposit category
    if (tx.category === 'deposit' && tx.reference && process.env.MONNIFY_BASE_URL) {
      try {
        const resp = await axios.get(`${process.env.MONNIFY_BASE_URL}/api/v1/transactions/${tx.reference}`, {
          auth: {
            username: process.env.MONNIFY_API_KEY,
            password: process.env.MONNIFY_SECRET_KEY
          }
        });
        const providerStatus = resp.data?.responseBody?.status || resp.data?.status;
        if (providerStatus) {
          tx.status = providerStatus.toLowerCase();
          tx.reconcileAttempts = (tx.reconcileAttempts || 0) + 1;
          tx.lastReconciledAt = new Date();
          await tx.save();

          if (tx.type === 'credit' && tx.status === 'success') {
            // ensure wallet is credited (idempotent)
            const wallet = await Wallet.findOne({ userId: tx.userId });
            if (wallet && (!tx._walletCreditedAt || !tx._walletCredited)) {
              wallet.balance += tx.amount || 0;
              await wallet.save();
              tx._walletCredited = true;
              tx._walletCreditedAt = new Date();
              await tx.save();
              console.log(`[reconcile] Credited wallet for tx ${tx._id} amount=${tx.amount}`);
            }
          }
          return;
        }
      } catch (err) {
        console.warn(`[reconcile] Monnify lookup failed for ${tx.reference}:`, err.message || err);
      }
    }

    // Try Peyflex-style lookup
    if (tx.reference && process.env.PEYFLEX_BASE_URL && process.env.PEYFLEX_API_KEY) {
      try {
        const resp = await axios.get(`${process.env.PEYFLEX_BASE_URL}/transactions/${tx.reference}`, {
          headers: { 'Authorization': `Bearer ${process.env.PEYFLEX_API_KEY}` }
        });
        const providerStatus = resp.data?.status || resp.data?.responseBody?.status;
        if (providerStatus) {
          tx.status = providerStatus.toLowerCase();
          tx.reconcileAttempts = (tx.reconcileAttempts || 0) + 1;
          tx.lastReconciledAt = new Date();
          await tx.save();
          return;
        }
      } catch (err) {
        console.warn(`[reconcile] Peyflex lookup failed for ${tx.reference}:`, err.message || err);
      }
    }

    // Generic fallback: mark attempt and leave for later
    tx.reconcileAttempts = (tx.reconcileAttempts || 0) + 1;
    tx.lastReconciledAt = new Date();
    await tx.save();
    console.log(`[reconcile] No definitive provider info for tx ${tx._id}, attempts=${tx.reconcileAttempts}`);

    // Emit Prometheus metric if available
    try {
      if (promClient) {
        if (!promClient.register.getSingleMetric('paylink_reconcile_attempts_total')) {
          const counter = new promClient.Counter({
            name: 'paylink_reconcile_attempts_total',
            help: 'Total reconciliation attempts'
          });
          // register happens automatically
        }
        const metric = promClient.register.getSingleMetric('paylink_reconcile_attempts_total');
        if (metric && typeof metric.inc === 'function') metric.inc();
      }
    } catch (mErr) {
      // non-fatal
      console.warn('[reconcile] failed to emit metric', mErr.message || mErr);
    }
  } catch (err) {
    console.error('[reconcile] error reconciling tx', tx._id, err.message || err);
  }
}

async function runOnce({ limit = MAX_BATCH } = {}) {
  await ensureConnected();

  console.log('[reconcile] Finding pending/unknown transactions to reconcile');
  const query = { status: { $in: ['pending', 'unknown', null] } };
  const txs = await Transaction.find(query).limit(limit);
  console.log(`[reconcile] Found ${txs.length} candidates`);

  for (const tx of txs) {
    await reconcileOne(tx);
  }

  console.log('[reconcile] runOnce complete');
  return txs.length;
}

if (require.main === module) {
  // Allow running as a CLI: `node backend/jobs/reconciliation.js`
  runOnce().then(() => {
    mongoose.disconnect();
  }).catch(err => {
    console.error('[reconcile] Fatal error', err);
    mongoose.disconnect();
    process.exit(1);
  });
}

module.exports = { runOnce, reconcileOne };
