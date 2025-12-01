/**
 * Payment Routes
 * /api/payments/* endpoints for airtime, data, electricity, cable, internet, education
 */

const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/paymentController');
const { verifyToken, requireTransactionPin, validateDevice } = require('../middleware/auth');
const idempotency = require('../middleware/idempotency');
const { validate } = require('../middleware/validation');
const schemas = require('../validation/schemas');

// Protect all payment routes
router.use(verifyToken);
router.use(validateDevice);

/**
 * POST /api/payments/airtime
 * Buy airtime
 */
router.post('/airtime', idempotency, validate(schemas.airtimeSchema), PaymentController.buyAirtime);

/**
 * POST /api/payments/data
 * Buy data
 */
router.post('/data', idempotency, validate(schemas.dataSchema), PaymentController.buyData);

/**
 * POST /api/payments/electricity
 * Pay electricity bill
 */
router.post('/electricity', idempotency, validate(schemas.electricitySchema), PaymentController.payElectricity);

/**
 * POST /api/payments/cable
 * Pay cable TV subscription
 */
router.post('/cable', idempotency, validate(schemas.cableSchema), PaymentController.payCableTV);

/**
 * POST /api/payments/internet
 * Buy internet
 */
router.post('/internet', idempotency, validate(schemas.internetSchema), PaymentController.buyInternet);

/**
 * POST /api/payments/education
 * Pay education fees
 */
router.post('/education', idempotency, PaymentController.payEducation);

/**
 * POST /api/payments/insurance
 * Pay insurance premium
 */
router.post('/insurance', idempotency, PaymentController.payInsurance);

/**
 * POST /api/payments/giftcard
 * Buy gift card
 */
router.post('/giftcard', idempotency, PaymentController.buyGiftCard);

/**
 * POST /api/payments/tax
 * Pay tax
 */
router.post('/tax', idempotency, PaymentController.payTax);

/**
 * GET /api/payments/history
 * Get transaction history
 */
router.get('/history', PaymentController.getTransactionHistory);

/**
 * GET /api/payments/stats
 * Get transaction stats
 */
router.get('/stats', PaymentController.getTransactionStats);

module.exports = router;
