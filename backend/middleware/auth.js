/**
 * Authentication & Authorization Middleware
 * Verifies JWT tokens, 2FA status, device validation
 */

const admin = require('firebase-admin');
const UserModel = require('../models/User');

/**
 * Verify JWT token and attach user to request
 */
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = { uid: decodedToken.uid, ...decodedToken };

    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Verify transaction PIN requirement
 * Some transactions may require PIN before proceeding
 */
const requireTransactionPin = async (req, res, next) => {
  try {
    const user = await UserModel.getUserById(req.user.uid);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.transactionPin) {
      return res.status(403).json({
        error: 'Transaction PIN not set',
        requiresPin: true,
      });
    }

    // PIN will be verified in the transaction route handler
    next();
  } catch (error) {
    console.error('Error checking transaction PIN:', error);
    return res.status(500).json({ error: 'PIN verification failed' });
  }
};

/**
 * Verify 2FA if enabled for user
 */
const verify2FA = async (req, res, next) => {
  try {
    const user = await UserModel.getUserById(req.user.uid);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.twoFactorEnabled) {
      const twoFAToken = req.headers['x-2fa-token'];

      if (!twoFAToken) {
        return res.status(403).json({
          error: '2FA verification required',
          requires2FA: true,
        });
      }

      // In production, verify the 2FA token using TOTP
      // For now, just check if token is provided
      // TODO: Implement TOTP verification with speakeasy or similar library
    }

    next();
  } catch (error) {
    console.error('Error checking 2FA:', error);
    return res.status(500).json({ error: '2FA verification failed' });
  }
};

/**
 * Validate device and update last active
 */
const validateDevice = async (req, res, next) => {
  try {
    const deviceId = req.headers['x-device-id'];
    const deviceName = req.headers['x-device-name'];

    if (!deviceId) {
      // Generate a temporary device ID if not provided
      req.deviceId = `device_${Date.now()}`;
      return next();
    }

    const user = await UserModel.getUserById(req.user.uid);
    const userDevices = await UserModel.getUserDevices(req.user.uid);

    const isKnownDevice = userDevices.some((d) => d.deviceId === deviceId);

    if (!isKnownDevice && user.twoFactorEnabled) {
      // New device detected and 2FA is enabled
      return res.status(403).json({
        error: 'New device detected',
        requiresDeviceVerification: true,
        message: 'Please verify this device to proceed',
      });
    }

    // Record device activity
    await UserModel.recordDevice(req.user.uid, {
      deviceId,
      deviceName: deviceName || 'Unknown Device',
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });

    req.deviceId = deviceId;
    next();
  } catch (error) {
    console.error('Error validating device:', error);
    // Don't block on device validation errors
    next();
  }
};

/**
 * Rate limiting middleware for sensitive operations
 */
const rateLimitSensitiveOps = (maxRequests = 5, windowMs = 60000) => {
  const requests = new Map();

  return (req, res, next) => {
    const key = `${req.user.uid}_${req.path}`;
    const now = Date.now();

    if (!requests.has(key)) {
      requests.set(key, []);
    }

    const timestamps = requests.get(key).filter((ts) => now - ts < windowMs);

    if (timestamps.length >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
      });
    }

    timestamps.push(now);
    requests.set(key, timestamps);

    next();
  };
};

/**
 * Error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('API Error:', err);

  if (err.code === 'PERMISSION_DENIED') {
    return res.status(403).json({ error: 'Permission denied' });
  }

  if (err.message.includes('Insufficient balance')) {
    return res.status(400).json({ error: err.message });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
};

module.exports = {
  verifyToken,
  requireTransactionPin,
  verify2FA,
  validateDevice,
  rateLimitSensitiveOps,
  errorHandler,
};
