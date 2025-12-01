/**
 * Wallet Routes
 * Handles wallet operations: balance, deposits, withdrawals, transactions
 */

const express = require('express');
const WalletController = require('../controllers/walletController');
const { verifyToken, validateDevice, rateLimitSensitiveOps } = require('../middleware/auth');
const idempotency = require('../middleware/idempotency');
const { validate } = require('../middleware/validation');
const schemas = require('../validation/schemas');

const router = express.Router();

// All wallet routes require authentication
router.use(verifyToken);
router.use(validateDevice);

// Wallet balance and stats
router.get('/balance', WalletController.getBalance);
router.get('/stats', WalletController.getStats);

// Transactions
router.get('/transactions', WalletController.getTransactions);

// Deposits (rate limited)
router.post('/deposit', rateLimitSensitiveOps(10, 60000), idempotency, validate(schemas.depositSchema), WalletController.deposit);

// Withdrawals (rate limited)
router.post('/withdraw', rateLimitSensitiveOps(5, 60000), idempotency, validate(schemas.withdrawSchema), WalletController.withdraw);

// Verify withdrawal status
router.get('/withdraw/:transactionId', WalletController.verifyWithdrawal);

module.exports = router;
