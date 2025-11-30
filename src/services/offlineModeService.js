class OfflineModeService {
  static CACHE_KEYS = {
    DASHBOARD_BALANCE: 'dashboard_balance',
    RECENT_TRANSACTIONS: 'recent_transactions',
    USER_PROFILE: 'user_profile',
    BENEFICIARIES: 'beneficiaries',
    SAVINGS_PLANS: 'savings_plans',
    NOTIFICATIONS: 'notifications'
  };

  static CACHE_DURATION = {
    DASHBOARD_BALANCE: 24 * 60 * 60 * 1000, // 24 hours
    RECENT_TRANSACTIONS: 6 * 60 * 60 * 1000, // 6 hours
    USER_PROFILE: 7 * 24 * 60 * 60 * 1000, // 7 days
    BENEFICIARIES: 24 * 60 * 60 * 1000, // 24 hours
    SAVINGS_PLANS: 12 * 60 * 60 * 1000, // 12 hours
    NOTIFICATIONS: 2 * 60 * 60 * 1000 // 2 hours
  };

  static async cacheDashboardData(userId) {
    try {
      const WalletService = require('./walletService');

      // Cache wallet balance
      const wallet = await WalletService.getWallet(userId);
      this.setCache(this.CACHE_KEYS.DASHBOARD_BALANCE, {
        mainBalance: wallet.mainBalance,
        savingsBalance: wallet.savingsBalance,
        totalBalance: wallet.mainBalance + wallet.savingsBalance,
        lastUpdated: new Date()
      }, userId);

      // Cache recent transactions
      const recentTransactions = await Transaction.find({ userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('type category amount description createdAt status');

      this.setCache(this.CACHE_KEYS.RECENT_TRANSACTIONS, {
        transactions: recentTransactions,
        lastUpdated: new Date()
      }, userId);

      console.log('Dashboard data cached for offline mode');
    } catch (error) {
      console.error('Error caching dashboard data:', error);
    }
  }

  static async cacheUserProfile(userId) {
    try {

      const user = await User.findById(userId).select(
        'fullName username email phone country profilePicture lastLogin'
      );

      this.setCache(this.CACHE_KEYS.USER_PROFILE, {
        profile: user,
        lastUpdated: new Date()
      }, userId);

      console.log('User profile cached for offline mode');
    } catch (error) {
      console.error('Error caching user profile:', error);
    }
  }

  static async cacheBeneficiaries(userId) {
    try {
      const BeneficiaryManager = require('./beneficiaryManager');

      const beneficiaries = await BeneficiaryManager.getBeneficiaries(userId);

      this.setCache(this.CACHE_KEYS.BENEFICIARIES, {
        beneficiaries: beneficiaries.map(b => ({
          id: b._id,
          nickname: b.nickname,
          type: b.type,
          provider: b.provider,
          lastUsed: b.lastUsed
        })),
        lastUpdated: new Date()
      }, userId);

      console.log('Beneficiaries cached for offline mode');
    } catch (error) {
      console.error('Error caching beneficiaries:', error);
    }
  }

  static async cacheSavingsPlans(userId) {
    try {

      const savingsPlans = await Savings.find({ userId, status: 'active' })
        .select('name targetAmount currentAmount interestRate maturityDate');

      this.setCache(this.CACHE_KEYS.SAVINGS_PLANS, {
        plans: savingsPlans,
        lastUpdated: new Date()
      }, userId);

      console.log('Savings plans cached for offline mode');
    } catch (error) {
      console.error('Error caching savings plans:', error);
    }
  }

  static async cacheNotifications(userId) {
    try {
      const NotificationService = require('./notificationService');

      const notifications = await NotificationService.getUserNotifications(userId, 20);

      this.setCache(this.CACHE_KEYS.NOTIFICATIONS, {
        notifications: notifications.map(n => ({
          id: n._id,
          type: n.type,
          title: n.title,
          message: n.message,
          read: n.read,
          createdAt: n.createdAt
        })),
        lastUpdated: new Date()
      }, userId);

      console.log('Notifications cached for offline mode');
    } catch (error) {
      console.error('Error caching notifications:', error);
    }
  }

  static async cacheAllUserData(userId) {
    try {
      await Promise.all([
        this.cacheDashboardData(userId),
        this.cacheUserProfile(userId),
        this.cacheBeneficiaries(userId),
        this.cacheSavingsPlans(userId),
        this.cacheNotifications(userId)
      ]);

      console.log('All user data cached for offline mode');
    } catch (error) {
      console.error('Error caching all user data:', error);
    }
  }

  static getCachedDashboardData(userId) {
    return this.getCache(this.CACHE_KEYS.DASHBOARD_BALANCE, userId);
  }

  static getCachedTransactions(userId) {
    return this.getCache(this.CACHE_KEYS.RECENT_TRANSACTIONS, userId);
  }

  static getCachedProfile(userId) {
    return this.getCache(this.CACHE_KEYS.USER_PROFILE, userId);
  }

  static getCachedBeneficiaries(userId) {
    return this.getCache(this.CACHE_KEYS.BENEFICIARIES, userId);
  }

  static getCachedSavingsPlans(userId) {
    return this.getCache(this.CACHE_KEYS.SAVINGS_PLANS, userId);
  }

  static getCachedNotifications(userId) {
    return this.getCache(this.CACHE_KEYS.NOTIFICATIONS, userId);
  }

  static setCache(key, data, userId) {
    try {
      const cacheKey = `paylink_offline_${userId}_${key}`;
      const cacheData = {
        data,
        timestamp: Date.now(),
        userId
      };

      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error setting cache:', error);
    }
  }

  static getCache(key, userId) {
    try {
      const cacheKey = `paylink_offline_${userId}_${key}`;
      const cached = localStorage.getItem(cacheKey);

      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      const maxAge = this.CACHE_DURATION[key.toUpperCase().replace(/_/g, '_')];

      if (Date.now() - timestamp > maxAge) {
        this.clearCache(key, userId);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting cache:', error);
      return null;
    }
  }

  static clearCache(key, userId) {
    try {
      const cacheKey = `paylink_offline_${userId}_${key}`;
      localStorage.removeItem(cacheKey);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  static clearAllUserCache(userId) {
    try {
      Object.values(this.CACHE_KEYS).forEach(key => {
        this.clearCache(key, userId);
      });
      console.log('All user cache cleared');
    } catch (error) {
      console.error('Error clearing all user cache:', error);
    }
  }

  static isOnline() {
    return navigator.onLine;
  }

  static async syncPendingActions(userId) {
    try {
      // Get pending actions from cache
      const pendingActions = this.getPendingActions(userId);

      if (pendingActions.length === 0) return;

      console.log(`Syncing ${pendingActions.length} pending actions`);

      for (const action of pendingActions) {
        try {
          await this.executePendingAction(action, userId);
          this.removePendingAction(action.id, userId);
        } catch (error) {
          console.error('Error executing pending action:', error);
          // Keep failed actions for retry
        }
      }
    } catch (error) {
      console.error('Error syncing pending actions:', error);
    }
  }

  static addPendingAction(action, userId) {
    try {
      const pendingActions = this.getPendingActions(userId);
      pendingActions.push({
        id: Date.now().toString(),
        action,
        timestamp: Date.now()
      });

      const cacheKey = `paylink_pending_${userId}`;
      localStorage.setItem(cacheKey, JSON.stringify(pendingActions));
    } catch (error) {
      console.error('Error adding pending action:', error);
    }
  }

  static getPendingActions(userId) {
    try {
      const cacheKey = `paylink_pending_${userId}`;
      const actions = localStorage.getItem(cacheKey);
      return actions ? JSON.parse(actions) : [];
    } catch (error) {
      console.error('Error getting pending actions:', error);
      return [];
    }
  }

  static removePendingAction(actionId, userId) {
    try {
      const pendingActions = this.getPendingActions(userId);
      const filtered = pendingActions.filter(action => action.id !== actionId);

      const cacheKey = `paylink_pending_${userId}`;
      localStorage.setItem(cacheKey, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error removing pending action:', error);
    }
  }

  static async executePendingAction(pendingAction, userId) {
    const { action } = pendingAction;

    switch (action.type) {
      case 'purchase':
        // Execute cached purchase
        const ApiService = require('./api');
        await ApiService.makePurchase(action.data);
        break;

      case 'transfer':
        // Execute cached transfer
        const WalletService = require('./walletService');
        await WalletService.transferBetweenWallets(
          userId,
          action.data.fromWallet,
          action.data.toWallet,
          action.data.amount
        );
        break;

      case 'notification_read':
        // Mark notification as read
        const NotificationService = require('./notificationService');
        await NotificationService.markAsRead(action.data.notificationId, userId);
        break;

      default:
        console.log('Unknown pending action type:', action.type);
    }
  }

  static getOfflineCapabilities() {
    return {
      viewBalance: true,
      viewTransactions: true,
      viewProfile: true,
      viewBeneficiaries: true,
      viewSavings: true,
      viewNotifications: true,
      makePurchases: false, // Requires online connection
      makeTransfers: false, // Requires online connection
      updateProfile: false, // Requires online connection
      sendSupport: false // Requires online connection
    };
  }

  static async initializeOfflineMode(userId) {
    try {
      // Cache all user data
      await this.cacheAllUserData(userId);

      // Set up online/offline event listeners
      window.addEventListener('online', () => this.handleOnline(userId));
      window.addEventListener('offline', () => this.handleOffline());

      console.log('Offline mode initialized');
    } catch (error) {
      console.error('Error initializing offline mode:', error);
    }
  }

  static async handleOnline(userId) {
    console.log('Connection restored, syncing data');

    try {
      // Sync pending actions
      await this.syncPendingActions(userId);

      // Refresh cache with latest data
      await this.cacheAllUserData(userId);

      // Notify user
      if ('serviceWorker' in navigator && 'Notification' in window) {
        new Notification('PAYLINK', {
          body: 'You are back online. Data has been synced.',
          icon: '/logo192.png'
        });
      }
    } catch (error) {
      console.error('Error handling online event:', error);
    }
  }

  static handleOffline() {
    console.log('Connection lost, switching to offline mode');

    // Notify user
    if ('serviceWorker' in navigator && 'Notification' in window) {
      new Notification('PAYLINK', {
        body: 'You are offline. Some features may be limited.',
        icon: '/logo192.png'
      });
    }
  }

  static getCacheStats(userId) {
    const stats = {};
    let totalSize = 0;

    try {
      Object.values(this.CACHE_KEYS).forEach(key => {
        const cacheKey = `paylink_offline_${userId}_${key}`;
        const data = localStorage.getItem(cacheKey);

        if (data) {
          const size = new Blob([data]).size;
          stats[key] = {
            size: size,
            lastUpdated: JSON.parse(data).timestamp
          };
          totalSize += size;
        }
      });

      stats.totalSize = totalSize;
      stats.totalItems = Object.keys(stats).length - 1; // Exclude totalSize
    } catch (error) {
      console.error('Error getting cache stats:', error);
    }

    return stats;
  }

  static async clearExpiredCache(userId) {
    try {
      Object.entries(this.CACHE_DURATION).forEach(([key, maxAge]) => {
        const cacheKeyName = key.toLowerCase().replace(/_/g, '_');
        const data = this.getCache(cacheKeyName, userId);

        if (!data) {
          // Cache is already cleared or expired
          return;
        }

        // Check if expired
        const cacheTime = data.lastUpdated ? new Date(data.lastUpdated).getTime() : 0;
        if (Date.now() - cacheTime > maxAge) {
          this.clearCache(cacheKeyName, userId);
        }
      });

      console.log('Expired cache cleared');
    } catch (error) {
      console.error('Error clearing expired cache:', error);
    }
  }

  static async exportCacheData(userId) {
    try {
      const allData = {};

      Object.values(this.CACHE_KEYS).forEach(key => {
        const data = this.getCache(key, userId);
        if (data) {
          allData[key] = data;
        }
      });

      return {
        userId,
        exportedAt: new Date(),
        data: allData
      };
    } catch (error) {
      console.error('Error exporting cache data:', error);
      return null;
    }
  }

  static async importCacheData(cacheData) {
    try {
      const { userId, data } = cacheData;

      Object.entries(data).forEach(([key, value]) => {
        this.setCache(key, value, userId);
      });

      console.log('Cache data imported successfully');
      return true;
    } catch (error) {
      console.error('Error importing cache data:', error);
      return false;
    }
  }
}

export default OfflineModeService;
