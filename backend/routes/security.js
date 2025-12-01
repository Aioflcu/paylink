/**
 * Security Routes
 * Handles 2FA, PIN, password, device management, and login history
 */

const express = require('express');
const SecurityController = require('../controllers/securityController');
const { verifyToken, rateLimitSensitiveOps } = require('../middleware/auth');

const router = express.Router();

// All security routes require authentication
router.use(verifyToken);

// PIN management (rate limited)
router.post('/set-pin', rateLimitSensitiveOps(5, 60000), SecurityController.setTransactionPin);
router.get('/pin-status', SecurityController.checkPinStatus);

// Password management (rate limited)
router.post('/change-password', rateLimitSensitiveOps(5, 60000), SecurityController.changePassword);

// 2FA management (rate limited)
router.post('/enable-2fa', rateLimitSensitiveOps(3, 60000), SecurityController.enable2FA);
router.post('/disable-2fa', rateLimitSensitiveOps(5, 60000), SecurityController.disable2FA);
router.get('/2fa-status', SecurityController.get2FAStatus);

// Login history
router.get('/login-history', SecurityController.getLoginHistory);

// Device management
router.get('/devices', SecurityController.getUserDevices);
router.delete('/devices/:deviceId', SecurityController.removeDevice);

module.exports = router;
