class FraudDetectionService {
  static async detectSuspiciousActivity(userId, activity) {
    const alerts = [];

    // Check for unusual location login
    const isUnusualLocation = await this.isUnusualLocation(userId, activity.location);
    if (isUnusualLocation) {
      alerts.push('Unusual login location detected');
    }

    // Check for multiple failed PIN attempts
    if (activity.failedPinAttempts > 3) {
      alerts.push('Multiple failed PIN attempts');
    }

    // Check for large sudden purchases
    const isLargePurchase = await this.isLargePurchase(userId, activity.amount);
    if (isLargePurchase) {
      alerts.push('Large sudden purchase detected');
    }

    // Check for device change
    const isNewDevice = await this.isNewDevice(userId, activity.device);
    if (isNewDevice) {
      alerts.push('New device login detected');
    }

    // Check for suspicious withdrawal attempts
    if (activity.type === 'withdrawal' && activity.amount > 50000) {
      alerts.push('Suspicious large withdrawal attempt');
    }

    return alerts;
  }

  static async isUnusualLocation(userId, location) {
    try {
      // Get user's recent login locations
      const recentLogins = await this.getRecentLoginLocations(userId);

      if (recentLogins.length === 0) return false;

      // Simple distance check (in a real app, use proper geolocation)
      const userLocations = recentLogins.map(login => login.location);
      const currentLocation = location;

      // Check if current location is far from usual locations
      for (const loc of userLocations) {
        const distance = this.calculateDistance(loc, currentLocation);
        if (distance < 100) { // Within 100km
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Error checking unusual location:', error);
      return false;
    }
  }

  static async isLargePurchase(userId, amount) {
    try {
      // Get user's average transaction amount
      const averageAmount = await this.getUserAverageTransaction(userId);

      // Flag if amount is 5x the average or over 100,000 NGN
      return amount > Math.max(averageAmount * 5, 100000);
    } catch (error) {
      console.error('Error checking large purchase:', error);
      return false;
    }
  }

  static async isNewDevice(userId, device) {
    try {
      // Get user's registered devices
      const userDevices = await this.getUserDevices(userId);

      // Check if device fingerprint matches
      return !userDevices.some(d => d.fingerprint === device.fingerprint);
    } catch (error) {
      console.error('Error checking new device:', error);
      return false;
    }
  }

  static async getRecentLoginLocations(userId) {
    try {
      const { db } = await import('../firebase');
      const { collection, query, where, orderBy, limit, getDocs } = await import('firebase/firestore');

      // Query login history collection for recent logins
      const loginHistoryRef = collection(db, 'loginHistory');
      const q = query(
        loginHistoryRef,
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(10) // Get last 10 login locations
      );

      const querySnapshot = await getDocs(q);
      const loginLocations = [];

      querySnapshot.forEach(doc => {
        const data = doc.data();
        if (data.location && data.location.lat && data.location.lng) {
          loginLocations.push({
            location: {
              lat: data.location.lat,
              lng: data.location.lng
            },
            timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp),
            ipAddress: data.ipAddress,
            deviceInfo: data.deviceInfo
          });
        }
      });

      // If no login history exists, return empty array
      return loginLocations;
    } catch (error) {
      console.error('Error getting recent login locations:', error);
      return [];
    }
  }

  static async getUserAverageTransaction(userId) {
    try {
      const aggregation = await this.getTransactionAggregation(userId, 30);
      return aggregation.averageAmount;
    } catch (error) {
      console.error('Error calculating user average transaction:', error);
      return 0;
    }
  }

  // Comprehensive transaction history aggregation for fraud detection
  static async getTransactionAggregation(userId, days = 30) {
    try {
      const { db } = await import('../firebase');
      const { collection, query, where, getDocs, orderBy } = await import('firebase/firestore');

      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const transactionsRef = collection(db, 'transactions');
      const q = query(
        transactionsRef,
        where('userId', '==', userId),
        where('type', '==', 'debit'),
        where('status', '==', 'success'),
        where('timestamp', '>=', startDate),
        orderBy('timestamp', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const transactions = [];

      querySnapshot.forEach(doc => {
        const data = doc.data();
        if (data.amount && data.amount > 0) {
          transactions.push({
            id: doc.id,
            amount: data.amount,
            timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp),
            category: data.category || 'other',
            description: data.description || '',
            provider: data.provider || ''
          });
        }
      });

      if (transactions.length === 0) {
        return {
          totalTransactions: 0,
          totalAmount: 0,
          averageAmount: 0,
          minAmount: 0,
          maxAmount: 0,
          medianAmount: 0,
          mostCommonCategory: null,
          mostCommonProvider: null,
          transactionFrequency: 0,
          velocityScore: 0,
          unusualPatterns: []
        };
      }

      // Calculate comprehensive metrics
      const amounts = transactions.map(t => t.amount);
      const totalAmount = amounts.reduce((sum, amount) => sum + amount, 0);
      const averageAmount = Math.round(totalAmount / transactions.length);

      // Sort amounts for median calculation
      const sortedAmounts = [...amounts].sort((a, b) => a - b);
      const medianAmount = sortedAmounts.length % 2 === 0
        ? (sortedAmounts[sortedAmounts.length / 2 - 1] + sortedAmounts[sortedAmounts.length / 2]) / 2
        : sortedAmounts[Math.floor(sortedAmounts.length / 2)];

      // Category analysis
      const categoryCount = {};
      transactions.forEach(t => {
        categoryCount[t.category] = (categoryCount[t.category] || 0) + 1;
      });
      const mostCommonCategory = Object.entries(categoryCount)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || null;

      // Provider analysis
      const providerCount = {};
      transactions.forEach(t => {
        if (t.provider) {
          providerCount[t.provider] = (providerCount[t.provider] || 0) + 1;
        }
      });
      const mostCommonProvider = Object.entries(providerCount)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || null;

      // Transaction frequency (transactions per day)
      const transactionFrequency = transactions.length / days;

      // Velocity score (recent activity vs historical)
      const recentTransactions = transactions.filter(t =>
        t.timestamp > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      );
      const velocityScore = recentTransactions.length > 0
        ? (recentTransactions.length / 7) / (transactions.length / days)
        : 0;

      // Detect unusual patterns
      const unusualPatterns = this.detectUnusualPatterns(transactions, averageAmount);

      return {
        totalTransactions: transactions.length,
        totalAmount,
        averageAmount,
        minAmount: Math.min(...amounts),
        maxAmount: Math.max(...amounts),
        medianAmount,
        mostCommonCategory,
        mostCommonProvider,
        transactionFrequency,
        velocityScore,
        unusualPatterns,
        transactions: transactions.slice(0, 10) // Last 10 transactions for reference
      };
    } catch (error) {
      console.error('Error aggregating transaction history:', error);
      return {
        totalTransactions: 0,
        totalAmount: 0,
        averageAmount: 0,
        minAmount: 0,
        maxAmount: 0,
        medianAmount: 0,
        mostCommonCategory: null,
        mostCommonProvider: null,
        transactionFrequency: 0,
        velocityScore: 0,
        unusualPatterns: []
      };
    }
  }

  // Detect unusual transaction patterns
  static detectUnusualPatterns(transactions, averageAmount) {
    const patterns = [];

    if (transactions.length < 3) return patterns;

    // Check for sudden large transactions
    const largeTransactions = transactions.filter(t => t.amount > averageAmount * 3);
    if (largeTransactions.length > 0) {
      patterns.push({
        type: 'large_transaction',
        severity: 'medium',
        description: `${largeTransactions.length} transaction(s) significantly above average`,
        transactions: largeTransactions.slice(0, 3)
      });
    }

    // Check for rapid succession transactions
    const rapidTransactions = [];
    for (let i = 1; i < transactions.length; i++) {
      const timeDiff = transactions[i-1].timestamp - transactions[i].timestamp;
      if (timeDiff < 5 * 60 * 1000) { // Within 5 minutes
        rapidTransactions.push(transactions[i]);
      }
    }
    if (rapidTransactions.length > 2) {
      patterns.push({
        type: 'rapid_transactions',
        severity: 'high',
        description: 'Multiple transactions in rapid succession',
        transactions: rapidTransactions
      });
    }

    // Check for unusual categories
    const unusualCategories = transactions.filter(t =>
      !['airtime', 'data', 'electricity', 'cable', 'education'].includes(t.category)
    );
    if (unusualCategories.length > transactions.length * 0.3) {
      patterns.push({
        type: 'unusual_categories',
        severity: 'low',
        description: 'High proportion of transactions in unusual categories',
        transactions: unusualCategories.slice(0, 3)
      });
    }

    return patterns;
  }

  static async getUserDevices(userId) {
    // Get user's device history
    // Mock implementation
    return [
      { fingerprint: 'device123' },
      { fingerprint: 'device456' }
    ];
  }

  static calculateDistance(loc1, loc2) {
    // Simple distance calculation (Haversine formula approximation)
    const lat1 = loc1.lat;
    const lon1 = loc1.lng;
    const lat2 = loc2.lat;
    const lon2 = loc2.lng;

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = 6371 * c; // Distance in km

    return distance;
  }

  static async triggerSecurityAction(userId, alerts) {
    // Send security alert to user
    // Lock account temporarily
    // Require OTP verification

    if (alerts.length > 0) {
      // Send notification
      await this.sendSecurityAlert(userId, alerts);

      // Temporarily lock account
      await this.lockAccount(userId);

      // Require additional verification
      return { action: 'require_otp', alerts };
    }

    return { action: 'allow', alerts: [] };
  }

  static async sendSecurityAlert(userId, alerts) {
    // Send push notification or email
    console.log(`Security alert for user ${userId}:`, alerts);
    // Implementation would send actual notification
  }

  static async lockAccount(userId) {
    // Temporarily lock account
    console.log(`Temporarily locking account for user ${userId}`);
    // Implementation would update user status in database
  }
}

export default FraudDetectionService;
