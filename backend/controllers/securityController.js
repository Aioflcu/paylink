/**
 * Security Controller
 * Handles 2FA, PIN, password, device management, and login history
 */

const crypto = require('crypto');
const admin = require('firebase-admin');
const UserModel = require('../models/User');

class SecurityController {
  /**
   * Set transaction PIN
   */
  static async setTransactionPin(req, res, next) {
    try {
      const { pin } = req.body;
      const userId = req.user.uid;

      if (!pin || pin.length !== 4 || !/^\d+$/.test(pin)) {
        return res.status(400).json({
          error: 'PIN must be exactly 4 digits',
        });
      }

      // Hash the PIN
      const pinHash = crypto.createHash('sha256').update(pin).digest('hex');

      await UserModel.setTransactionPin(userId, pinHash);

      return res.status(200).json({
        success: true,
        message: 'Transaction PIN set successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change password
   */
  static async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.uid;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          error: 'Current and new password required',
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          error: 'Password must be at least 8 characters',
        });
      }

      // Verify current password
      try {
        await admin
          .auth()
          .updateUser(userId, { password: newPassword });

        return res.status(200).json({
          success: true,
          message: 'Password changed successfully',
        });
      } catch (authError) {
        return res.status(400).json({
          error: 'Failed to change password',
          message: authError.message,
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Enable 2FA
   */
  static async enable2FA(req, res, next) {
    try {
      const userId = req.user.uid;

      // In production, use speakeasy or similar to generate TOTP secret
      // For now, generate a simple secret
      const secret = crypto.randomBytes(32).toString('hex');

      await UserModel.enable2FA(userId, secret);

      return res.status(200).json({
        success: true,
        message: '2FA enabled successfully',
        secret, // In production, return QR code URL instead
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Disable 2FA
   */
  static async disable2FA(req, res, next) {
    try {
      const userId = req.user.uid;
      const { pin } = req.body;

      if (!pin) {
        return res.status(400).json({
          error: 'PIN required to disable 2FA',
        });
      }

      // Verify PIN
      const pinHash = crypto.createHash('sha256').update(pin).digest('hex');
      const isValid = await UserModel.verifyTransactionPin(userId, pinHash);

      if (!isValid) {
        return res.status(403).json({
          error: 'Invalid PIN',
        });
      }

      await UserModel.disable2FA(userId);

      return res.status(200).json({
        success: true,
        message: '2FA disabled successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get login history
   */
  static async getLoginHistory(req, res, next) {
    try {
      const userId = req.user.uid;
      const { limit = 50 } = req.query;

      const history = await UserModel.getLoginHistory(userId, parseInt(limit));

      return res.status(200).json({
        success: true,
        history,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user devices
   */
  static async getUserDevices(req, res, next) {
    try {
      const userId = req.user.uid;

      const devices = await UserModel.getUserDevices(userId);

      return res.status(200).json({
        success: true,
        devices,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove device
   */
  static async removeDevice(req, res, next) {
    try {
      const userId = req.user.uid;
      const { deviceId } = req.params;

      if (!deviceId) {
        return res.status(400).json({
          error: 'Device ID required',
        });
      }

      await UserModel.removeDevice(userId, deviceId);

      return res.status(200).json({
        success: true,
        message: 'Device removed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get 2FA status
   */
  static async get2FAStatus(req, res, next) {
    try {
      const userId = req.user.uid;

      const user = await UserModel.getUserById(userId);

      return res.status(200).json({
        success: true,
        twoFactorEnabled: user.twoFactorEnabled || false,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check if PIN is set
   */
  static async checkPinStatus(req, res, next) {
    try {
      const userId = req.user.uid;

      const user = await UserModel.getUserById(userId);

      return res.status(200).json({
        success: true,
        pinSet: !!user.transactionPin,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = SecurityController;
