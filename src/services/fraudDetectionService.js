/**
 * Fraud Detection Service
 * Monitors suspicious activity and implements security measures
 * Features: Location detection, PIN attempt tracking, large purchase detection,
 * device change alerts, auto-lock mechanism
 */

import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, orderBy, limit } from 'firebase/firestore';

class FraudDetectionService {
  // Thresholds and limits
  MAX_PIN_ATTEMPTS = 3;
  PIN_ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes
  LARGE_PURCHASE_THRESHOLD = 50000; // ₦50,000
  LOCATION_CHANGE_THRESHOLD = 100; // km
  DEVICE_CHANGE_ALERT_ENABLED = true;
  AUTO_LOCK_ENABLED = true;

  /**
   * Check for suspicious location change
   */
  async checkLocationAnomaly(userId, currentLocation) {
    try {
      // Get last transaction location
      const transactionsRef = query(
        collection(db, 'transactions'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(1)
      );

      const transactionDocs = await getDocs(transactionsRef);
      
      if (transactionDocs.empty) {
        return { suspicious: false, reason: null };
      }

      const lastTransaction = transactionDocs.docs[0].data();
      const lastLocation = lastTransaction.location;

      if (!lastLocation || !currentLocation) {
        return { suspicious: false, reason: 'Location data unavailable' };
      }

      // Calculate distance between locations
      const distance = this.calculateDistance(
        lastLocation.lat,
        lastLocation.lng,
        currentLocation.lat,
        currentLocation.lng
      );

      // Get time difference
      const lastTime = lastTransaction.timestamp?.toDate?.() || new Date(lastTransaction.timestamp);
      const timeDiff = Date.now() - lastTime.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      // Check if movement is physically impossible
      const maxSpeed = 900; // km/h (plane speed)
      const maxDistance = maxSpeed * hoursDiff;

      if (distance > maxDistance && hoursDiff > 0) {
        return {
          suspicious: true,
          reason: 'impossible_location_change',
          distance: Math.round(distance),
          timeDiff: hoursDiff
        };
      }

      return { suspicious: false, reason: null };
    } catch (error) {
      console.error('Error checking location:', error);
      return { suspicious: false, reason: 'error' };
    }
  }

  /**
   * Track PIN attempt and check for brute force
   */
  async trackPINAttempt(userId, success) {
    try {
      // Add PIN attempt record
      await addDoc(collection(db, 'pinAttempts'), {
        userId: userId,
        success: success,
        timestamp: serverTimestamp(),
        ipAddress: await this.getUserIPAddress(),
        userAgent: navigator.userAgent
      });

      // Get recent PIN attempts
      const recentTime = Date.now() - this.PIN_ATTEMPT_WINDOW;
      const attemptsRef = query(
        collection(db, 'pinAttempts'),
        where('userId', '==', userId),
        where('success', '==', false),
        orderBy('timestamp', 'desc')
      );

      const attemptDocs = await getDocs(attemptsRef);
      const recentFailedAttempts = attemptDocs.docs.filter(doc => {
        const timestamp = doc.data().timestamp?.toDate?.() || new Date(doc.data().timestamp);
        return timestamp.getTime() > recentTime;
      }).length;

      if (recentFailedAttempts >= this.MAX_PIN_ATTEMPTS) {
        return {
          suspicious: true,
          reason: 'max_pin_attempts_exceeded',
          attemptCount: recentFailedAttempts,
          shouldLock: true
        };
      }

      return { suspicious: false, reason: null, attemptCount: recentFailedAttempts };
    } catch (error) {
      console.error('Error tracking PIN attempt:', error);
      return { suspicious: false, reason: 'error' };
    }
  }

  /**
   * Check for unusually large purchase
   */
  async checkLargePurchase(userId, amount) {
    try {
      // Get user's average transaction amount
      const transactionsRef = query(
        collection(db, 'transactions'),
        where('userId', '==', userId),
        where('type', '==', 'payment'),
        orderBy('timestamp', 'desc'),
        limit(50)
      );

      const transactionDocs = await getDocs(transactionsRef);
      
      if (transactionDocs.empty) {
        // New user, check against threshold
        if (amount > this.LARGE_PURCHASE_THRESHOLD) {
          return {
            suspicious: true,
            reason: 'large_first_purchase',
            amount: amount,
            threshold: this.LARGE_PURCHASE_THRESHOLD
          };
        }
        return { suspicious: false, reason: null };
      }

      const transactions = transactionDocs.docs.map(doc => doc.data());
      const avgAmount = transactions.reduce((sum, t) => sum + (t.amount || 0), 0) / transactions.length;
      const maxAmount = Math.max(...transactions.map(t => t.amount || 0));

      // Check if amount is significantly higher than usual
      const multiplier = amount / avgAmount;
      if (multiplier > 5 || amount > maxAmount * 3) {
        return {
          suspicious: true,
          reason: 'unusually_large_purchase',
          amount: amount,
          avgAmount: Math.round(avgAmount),
          multiplier: multiplier.toFixed(2)
        };
      }

      return { suspicious: false, reason: null };
    } catch (error) {
      console.error('Error checking purchase amount:', error);
      return { suspicious: false, reason: 'error' };
    }
  }

  /**
   * Detect new device access
   */
  async detectNewDevice(userId, deviceInfo) {
    try {
      // Get known devices
      const devicesRef = query(
        collection(db, 'devices'),
        where('userId', '==', userId),
        where('isActive', '==', true)
      );

      const deviceDocs = await getDocs(devicesRef);
      const knownDevices = deviceDocs.docs.map(doc => doc.data());

      // Check if current device matches any known device
      const matchingDevice = knownDevices.find(d =>
        d.deviceFingerprint === deviceInfo.fingerprint ||
        d.userAgent === deviceInfo.userAgent
      );

      if (!matchingDevice) {
        // Record new device
        await addDoc(collection(db, 'devices'), {
          userId: userId,
          ...deviceInfo,
          firstSeen: serverTimestamp(),
          isActive: true
        });

        if (this.DEVICE_CHANGE_ALERT_ENABLED) {
          // Create alert notification
          await addDoc(collection(db, 'notifications'), {
            userId: userId,
            type: 'security',
            title: 'New Device Detected',
            message: `A new device (${deviceInfo.deviceName}) accessed your account`,
            data: { deviceInfo },
            read: false,
            timestamp: serverTimestamp()
          });
        }

        return { newDevice: true, device: deviceInfo };
      }

      return { newDevice: false };
    } catch (error) {
      console.error('Error detecting device:', error);
      return { newDevice: false, error };
    }
  }

  /**
   * Lock account temporarily after suspicious activity
   */
  async lockAccountTemporarily(userId, reason, durationMinutes = 30) {
    try {
      if (!this.AUTO_LOCK_ENABLED) {
        return { locked: false, reason: 'auto_lock_disabled' };
      }

      const lockUntil = new Date(Date.now() + durationMinutes * 60 * 1000);

      const userQuery = query(collection(db, 'users'), where('uid', '==', userId));
      const userDocs = await getDocs(userQuery);

      if (!userDocs.empty) {
        const userRef = doc(db, 'users', userDocs.docs[0].id);
        await updateDoc(userRef, {
          accountLocked: true,
          lockReason: reason,
          lockUntil: lockUntil,
          updatedAt: serverTimestamp()
        });

        // Send notification
        await addDoc(collection(db, 'notifications'), {
          userId: userId,
          type: 'security',
          title: 'Account Temporarily Locked',
          message: `Your account has been locked for security reasons. It will unlock in ${durationMinutes} minutes.`,
          data: { reason, lockUntil },
          read: false,
          timestamp: serverTimestamp()
        });

        // Log security event
        await addDoc(collection(db, 'securityEvents'), {
          userId: userId,
          eventType: 'account_locked',
          reason: reason,
          timestamp: serverTimestamp(),
          duration: durationMinutes
        });

        return { locked: true, reason, lockUntil };
      }

      return { locked: false, reason: 'user_not_found' };
    } catch (error) {
      console.error('Error locking account:', error);
      return { locked: false, error };
    }
  }

  /**
   * Check if account is locked
   */
  async isAccountLocked(userId) {
    try {
      const userQuery = query(collection(db, 'users'), where('uid', '==', userId));
      const userDocs = await getDocs(userQuery);

      if (userDocs.empty) {
        return { locked: false };
      }

      const userData = userDocs.docs[0].data();

      if (!userData.accountLocked) {
        return { locked: false };
      }

      // Check if lock has expired
      const lockUntil = userData.lockUntil?.toDate?.() || new Date(userData.lockUntil);
      if (lockUntil < new Date()) {
        // Lock has expired, unlock the account
        const userRef = doc(db, 'users', userDocs.docs[0].id);
        await updateDoc(userRef, {
          accountLocked: false,
          lockUntil: null
        });
        return { locked: false };
      }

      return {
        locked: true,
        reason: userData.lockReason,
        lockUntil: lockUntil,
        remainingMinutes: Math.ceil((lockUntil - new Date()) / (1000 * 60))
      };
    } catch (error) {
      console.error('Error checking account lock:', error);
      return { locked: false, error };
    }
  }

  /**
   * Verify transaction with fraud check
   */
  async verifyTransaction(userId, transactionData) {
    const fraudChecks = [];
    let riskScore = 0;

    try {
      // Check 1: Location anomaly
      if (transactionData.location) {
        const locationCheck = await this.checkLocationAnomaly(userId, transactionData.location);
        if (locationCheck.suspicious) {
          fraudChecks.push(locationCheck);
          riskScore += 30;
        }
      }

      // Check 2: Large purchase
      const purchaseCheck = await this.checkLargePurchase(userId, transactionData.amount);
      if (purchaseCheck.suspicious) {
        fraudChecks.push(purchaseCheck);
        riskScore += 25;
      }

      // Check 3: Account lock status
      const lockCheck = await this.isAccountLocked(userId);
      if (lockCheck.locked) {
        fraudChecks.push(lockCheck);
        riskScore += 100; // Prevent transaction
      }

      // Determine action based on risk score
      let action = 'allow';
      if (riskScore >= 100) {
        action = 'block';
      } else if (riskScore >= 60) {
        action = 'require_2fa';
      } else if (riskScore >= 30) {
        action = 'review';
      }

      // Log fraud check
      await addDoc(collection(db, 'fraudChecks'), {
        userId: userId,
        transactionId: transactionData.id,
        riskScore: riskScore,
        checks: fraudChecks,
        action: action,
        timestamp: serverTimestamp()
      });

      return {
        approved: action === 'allow',
        action: action,
        riskScore: riskScore,
        checks: fraudChecks
      };
    } catch (error) {
      console.error('Error verifying transaction:', error);
      return {
        approved: true,
        action: 'allow',
        riskScore: 0,
        error: true
      };
    }
  }

  /**
   * Helper: Calculate distance between two coordinates
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = this.degreesToRadians(lat2 - lat1);
    const dLon = this.degreesToRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.degreesToRadians(lat1)) * Math.cos(this.degreesToRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get user's IP address
   */
  async getUserIPAddress() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error('Error getting IP:', error);
      return 'unknown';
    }
  }

  /**
   * Report suspicious activity
   */
  async reportSuspiciousActivity(userId, type, details) {
    try {
      await addDoc(collection(db, 'fraudReports'), {
        userId: userId,
        type: type,
        details: details,
        userAgent: navigator.userAgent,
        timestamp: serverTimestamp(),
        status: 'reported'
      });

      return { reported: true };
    } catch (error) {
      console.error('Error reporting suspicious activity:', error);
      return { reported: false, error };
    }
  }

  /**
   * Get fraud statistics for user
   */
  async getUserFraudStats(userId) {
    try {
      const checksRef = query(
        collection(db, 'fraudChecks'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(100)
      );

      const checkDocs = await getDocs(checksRef);
      const checks = checkDocs.docs.map(doc => doc.data());

      const blockedCount = checks.filter(c => c.action === 'block').length;
      const reviewedCount = checks.filter(c => c.action === 'review').length;
      const avgRiskScore = checks.reduce((sum, c) => sum + (c.riskScore || 0), 0) / (checks.length || 1);

      return {
        totalChecks: checks.length,
        blockedTransactions: blockedCount,
        reviewedTransactions: reviewedCount,
        averageRiskScore: Math.round(avgRiskScore),
        lastCheck: checks[0]?.timestamp?.toDate?.() || null
      };
    } catch (error) {
      console.error('Error getting fraud stats:', error);
      return {
        totalChecks: 0,
        blockedTransactions: 0,
        reviewedTransactions: 0,
        averageRiskScore: 0
      };
    }
  }
}

export default new FraudDetectionService();
