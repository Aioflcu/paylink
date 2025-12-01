/**
 * User Model
 * Tracks user accounts with security features, 2FA, device management, login history
 */

const admin = require('firebase-admin');

class UserModel {
  constructor() {
    this.db = admin.firestore();
    this.usersCollection = 'users';
    this.devicesCollection = 'devices';
    this.loginHistoryCollection = 'loginHistory';
  }

  /**
   * Create or update user profile
   */
  async upsertUser(userId, userData) {
    try {
      const userRef = this.db.collection(this.usersCollection).doc(userId);
      const timestamp = admin.firestore.FieldValue.serverTimestamp();

      const existingUser = await userRef.get();
      const payload = {
        ...userData,
        updatedAt: timestamp,
      };

      if (!existingUser.exists) {
        payload.createdAt = timestamp;
        payload.walletBalance = userData.walletBalance || 0;
        payload.transactionPin = userData.transactionPin || null;
        payload.twoFactorEnabled = userData.twoFactorEnabled || false;
        payload.twoFactorSecret = userData.twoFactorSecret || null;
        payload.rewardPoints = userData.rewardPoints || 0;
      }

      await userRef.set(payload, { merge: true });
      return { success: true, userId, data: payload };
    } catch (error) {
      console.error('Error upserting user:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    try {
      const doc = await this.db.collection(this.usersCollection).doc(userId).get();
      if (!doc.exists) {
        return null;
      }
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  }

  /**
   * Update wallet balance
   */
  async updateWalletBalance(userId, amount) {
    try {
      const userRef = this.db.collection(this.usersCollection).doc(userId);
      const user = await userRef.get();

      if (!user.exists) {
        throw new Error('User not found');
      }

      const currentBalance = user.data().walletBalance || 0;
      const newBalance = currentBalance + amount;

      await userRef.update({
        walletBalance: newBalance,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true, newBalance };
    } catch (error) {
      console.error('Error updating wallet balance:', error);
      throw error;
    }
  }

  /**
   * Set transaction PIN
   */
  async setTransactionPin(userId, pinHash) {
    try {
      await this.db.collection(this.usersCollection).doc(userId).update({
        transactionPin: pinHash,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      console.error('Error setting transaction PIN:', error);
      throw error;
    }
  }

  /**
   * Verify transaction PIN
   */
  async verifyTransactionPin(userId, pinHash) {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      return user.transactionPin === pinHash;
    } catch (error) {
      console.error('Error verifying PIN:', error);
      throw error;
    }
  }

  /**
   * Enable 2FA - store secret
   */
  async enable2FA(userId, secret) {
    try {
      await this.db.collection(this.usersCollection).doc(userId).update({
        twoFactorEnabled: true,
        twoFactorSecret: secret,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      throw error;
    }
  }

  /**
   * Disable 2FA
   */
  async disable2FA(userId) {
    try {
      await this.db.collection(this.usersCollection).doc(userId).update({
        twoFactorEnabled: false,
        twoFactorSecret: null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      throw error;
    }
  }

  /**
   * Record device login
   */
  async recordDevice(userId, deviceInfo) {
    try {
      const deviceId = deviceInfo.deviceId || `device_${Date.now()}`;
      const deviceRef = this.db
        .collection(this.usersCollection)
        .doc(userId)
        .collection(this.devicesCollection)
        .doc(deviceId);

      const timestamp = admin.firestore.FieldValue.serverTimestamp();

      await deviceRef.set({
        deviceId,
        deviceName: deviceInfo.deviceName,
        userAgent: deviceInfo.userAgent,
        ipAddress: deviceInfo.ipAddress,
        lastActive: timestamp,
        createdAt: (await deviceRef.get()).exists
          ? (await deviceRef.get()).data().createdAt
          : timestamp,
      });

      return { success: true, deviceId };
    } catch (error) {
      console.error('Error recording device:', error);
      throw error;
    }
  }

  /**
   * Get user devices
   */
  async getUserDevices(userId) {
    try {
      const snapshot = await this.db
        .collection(this.usersCollection)
        .doc(userId)
        .collection(this.devicesCollection)
        .get();

      const devices = [];
      snapshot.forEach((doc) => {
        devices.push({ id: doc.id, ...doc.data() });
      });

      return devices;
    } catch (error) {
      console.error('Error getting user devices:', error);
      throw error;
    }
  }

  /**
   * Remove device
   */
  async removeDevice(userId, deviceId) {
    try {
      await this.db
        .collection(this.usersCollection)
        .doc(userId)
        .collection(this.devicesCollection)
        .doc(deviceId)
        .delete();

      return { success: true };
    } catch (error) {
      console.error('Error removing device:', error);
      throw error;
    }
  }

  /**
   * Record login in history
   */
  async recordLoginHistory(userId, loginInfo) {
    try {
      const historyRef = this.db
        .collection(this.usersCollection)
        .doc(userId)
        .collection(this.loginHistoryCollection)
        .doc();

      await historyRef.set({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        ipAddress: loginInfo.ipAddress,
        deviceName: loginInfo.deviceName,
        userAgent: loginInfo.userAgent,
        status: loginInfo.status || 'success',
      });

      return { success: true };
    } catch (error) {
      console.error('Error recording login history:', error);
      throw error;
    }
  }

  /**
   * Get login history
   */
  async getLoginHistory(userId, limit = 50) {
    try {
      const snapshot = await this.db
        .collection(this.usersCollection)
        .doc(userId)
        .collection(this.loginHistoryCollection)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      const history = [];
      snapshot.forEach((doc) => {
        history.push({ id: doc.id, ...doc.data() });
      });

      return history;
    } catch (error) {
      console.error('Error getting login history:', error);
      throw error;
    }
  }

  /**
   * Update reward points
   */
  async addRewardPoints(userId, points) {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const currentPoints = user.rewardPoints || 0;
      const newPoints = currentPoints + points;

      await this.db.collection(this.usersCollection).doc(userId).update({
        rewardPoints: newPoints,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true, newPoints };
    } catch (error) {
      console.error('Error adding reward points:', error);
      throw error;
    }
  }
}

module.exports = new UserModel();
