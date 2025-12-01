/**
 * PayFlex Proxy Routes
 * Expose live provider and plan data from PayFlex API
 * No authentication required for public provider/plan listings
 */

const express = require('express');
const PayFlexProxyController = require('../controllers/payflexProxyController');

const router = express.Router();

// Public endpoints - no auth required (but can be rate limited)
// Get all providers for a service type
router.get('/providers/:serviceType', PayFlexProxyController.getProviders);

// Get plans for a specific provider
router.get('/plans', PayFlexProxyController.getPlans);

// Search providers
router.get('/search', PayFlexProxyController.searchProviders);

module.exports = router;
