/**
 * Offline Cache Service
 * Caches app data for offline access and syncs when online
 * Features: Cache dashboard data, store transactions, save beneficiaries,
 * auto-sync when online
 */

class OfflineCacheService {
  constructor() {
    this.dbName = 'PaylinkOfflineDB';
    this.dbVersion = 1;
    this.stores = {
      dashboard: 'dashboard',
      transactions: 'transactions',
      beneficiaries: 'beneficiaries',
      notifications: 'notifications',
      wallet: 'wallet',
      syncQueue: 'syncQueue'
    };
    this.db = null;
    this.initDB();
    this.setupOnlineListener();
  }

  /**
   * Initialize IndexedDB
   */
  initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object stores
        Object.values(this.stores).forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
          }
        });

        // Create index for sync timestamp
        if (!db.objectStoreNames.contains(this.stores.syncQueue)) {
          const store = db.createObjectStore(this.stores.syncQueue, { keyPath: 'id', autoIncrement: true });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Setup online/offline listener
   */
  setupOnlineListener() {
    window.addEventListener('online', () => {
      console.log('Device is online - syncing cached data');
      this.syncOfflineData();
    });

    window.addEventListener('offline', () => {
      console.log('Device is offline - using cached data');
    });
  }

  /**
   * Check if device is online
   */
  isOnline() {
    return navigator.onLine;
  }

  /**
   * Cache dashboard data
   */
  async cacheDashboard(userId, dashboardData) {
    try {
      const transaction = this.db.transaction([this.stores.dashboard], 'readwrite');
      const store = transaction.objectStore(this.stores.dashboard);

      const dataToStore = {
        id: userId,
        ...dashboardData,
        cachedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      };

      await new Promise((resolve, reject) => {
        const request = store.put(dataToStore);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      return { cached: true };
    } catch (error) {
      console.error('Error caching dashboard:', error);
      return { cached: false, error };
    }
  }

  /**
   * Get cached dashboard data
   */
  async getCachedDashboard(userId) {
    try {
      const transaction = this.db.transaction([this.stores.dashboard], 'readonly');
      const store = transaction.objectStore(this.stores.dashboard);

      return new Promise((resolve, reject) => {
        const request = store.get(userId);
        request.onsuccess = () => {
          const data = request.result;
          
          if (!data) {
            resolve(null);
            return;
          }

          // Check if cache is expired
          const expiresAt = new Date(data.expiresAt);
          if (expiresAt < new Date()) {
            // Cache expired, delete it
            this.clearCache(this.stores.dashboard, userId);
            resolve(null);
          } else {
            resolve(data);
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error getting cached dashboard:', error);
      return null;
    }
  }

  /**
   * Cache transactions
   */
  async cacheTransactions(userId, transactions) {
    try {
      const transaction = this.db.transaction([this.stores.transactions], 'readwrite');
      const store = transaction.objectStore(this.stores.transactions);

      // Clear existing transactions for this user
      const allRequest = store.getAll();
      allRequest.onsuccess = () => {
        const existing = allRequest.result.filter(t => t.userId === userId);
        existing.forEach(t => store.delete(t.id));
      };

      // Add new transactions
      const cachedTransactions = transactions.map(t => ({
        ...t,
        userId: userId,
        cachedAt: new Date()
      }));

      await new Promise((resolve, reject) => {
        let completed = 0;
        cachedTransactions.forEach((transaction) => {
          const request = store.add(transaction);
          request.onsuccess = () => {
            completed++;
            if (completed === cachedTransactions.length) {
              resolve();
            }
          };
          request.onerror = () => reject(request.error);
        });
      });

      return { cached: true, count: cachedTransactions.length };
    } catch (error) {
      console.error('Error caching transactions:', error);
      return { cached: false, error };
    }
  }

  /**
   * Get cached transactions
   */
  async getCachedTransactions(userId) {
    try {
      const transaction = this.db.transaction([this.stores.transactions], 'readonly');
      const store = transaction.objectStore(this.stores.transactions);

      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
          const allTxns = request.result;
          const userTxns = allTxns.filter(t => t.userId === userId);
          resolve(userTxns);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error getting cached transactions:', error);
      return [];
    }
  }

  /**
   * Cache beneficiaries
   */
  async cacheBeneficiaries(userId, beneficiaries) {
    try {
      const transaction = this.db.transaction([this.stores.beneficiaries], 'readwrite');
      const store = transaction.objectStore(this.stores.beneficiaries);

      const cachedBeneficiaries = beneficiaries.map(b => ({
        ...b,
        userId: userId,
        cachedAt: new Date()
      }));

      await new Promise((resolve, reject) => {
        let completed = 0;
        cachedBeneficiaries.forEach((beneficiary) => {
          const request = store.add(beneficiary);
          request.onsuccess = () => {
            completed++;
            if (completed === cachedBeneficiaries.length) {
              resolve();
            }
          };
          request.onerror = () => reject(request.error);
        });
      });

      return { cached: true, count: cachedBeneficiaries.length };
    } catch (error) {
      console.error('Error caching beneficiaries:', error);
      return { cached: false, error };
    }
  }

  /**
   * Get cached beneficiaries
   */
  async getCachedBeneficiaries(userId) {
    try {
      const transaction = this.db.transaction([this.stores.beneficiaries], 'readonly');
      const store = transaction.objectStore(this.stores.beneficiaries);

      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
          const allBenefs = request.result;
          const userBenefs = allBenefs.filter(b => b.userId === userId);
          resolve(userBenefs);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error getting cached beneficiaries:', error);
      return [];
    }
  }

  /**
   * Queue transaction for sync
   */
  async queueTransactionForSync(userId, transaction) {
    try {
      const transactionTx = this.db.transaction([this.stores.syncQueue], 'readwrite');
      const store = transactionTx.objectStore(this.stores.syncQueue);

      const queuedItem = {
        userId: userId,
        type: 'transaction',
        data: transaction,
        timestamp: new Date(),
        synced: false,
        attempts: 0
      };

      return new Promise((resolve, reject) => {
        const request = store.add(queuedItem);
        request.onsuccess = () => resolve({ queued: true, id: request.result });
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error queueing transaction:', error);
      return { queued: false, error };
    }
  }

  /**
   * Get pending syncs
   */
  async getPendingSyncs(userId) {
    try {
      const transaction = this.db.transaction([this.stores.syncQueue], 'readonly');
      const store = transaction.objectStore(this.stores.syncQueue);

      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
          const allItems = request.result;
          const userItems = allItems.filter(item => !item.synced && item.userId === userId);
          resolve(userItems);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error getting pending syncs:', error);
      return [];
    }
  }

  /**
   * Mark sync as completed
   */
  async markSyncCompleted(syncId) {
    try {
      const transaction = this.db.transaction([this.stores.syncQueue], 'readwrite');
      const store = transaction.objectStore(this.stores.syncQueue);

      return new Promise((resolve, reject) => {
        const getRequest = store.get(syncId);
        getRequest.onsuccess = () => {
          const item = getRequest.result;
          if (item) {
            item.synced = true;
            item.syncedAt = new Date();
            const updateRequest = store.put(item);
            updateRequest.onsuccess = () => resolve({ marked: true });
            updateRequest.onerror = () => reject(updateRequest.error);
          } else {
            resolve({ marked: false });
          }
        };
        getRequest.onerror = () => reject(getRequest.error);
      });
    } catch (error) {
      console.error('Error marking sync completed:', error);
      return { marked: false, error };
    }
  }

  /**
   * Sync offline data when online
   */
  async syncOfflineData() {
    if (!this.isOnline()) {
      console.log('Device is offline, cannot sync');
      return;
    }

    try {
      // Get all pending syncs
      const pendingSyncs = await this.getAllPendingSyncs();

      for (const item of pendingSyncs) {
        try {
          // Attempt to sync to server
          // This would call your actual API
          await this.syncItemToServer(item);
          
          // Mark as synced
          await this.markSyncCompleted(item.id);
        } catch (error) {
          console.error('Error syncing item:', error);
          // Retry logic - increment attempts
          await this.incrementSyncAttempts(item.id);
        }
      }

      return { synced: true, count: pendingSyncs.length };
    } catch (error) {
      console.error('Error during sync:', error);
      return { synced: false, error };
    }
  }

  /**
   * Get all pending syncs across all users
   */
  async getAllPendingSyncs() {
    try {
      const transaction = this.db.transaction([this.stores.syncQueue], 'readonly');
      const store = transaction.objectStore(this.stores.syncQueue);

      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
          const allItems = request.result.filter(item => !item.synced && item.attempts < 3);
          resolve(allItems);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error getting all pending syncs:', error);
      return [];
    }
  }

  /**
   * Sync item to server
   */
  async syncItemToServer(item) {
    // This would be implemented with actual API calls
    // For now, return success
    return Promise.resolve({ success: true });
  }

  /**
   * Increment sync attempts
   */
  async incrementSyncAttempts(syncId) {
    try {
      const transaction = this.db.transaction([this.stores.syncQueue], 'readwrite');
      const store = transaction.objectStore(this.stores.syncQueue);

      return new Promise((resolve, reject) => {
        const getRequest = store.get(syncId);
        getRequest.onsuccess = () => {
          const item = getRequest.result;
          if (item) {
            item.attempts = (item.attempts || 0) + 1;
            const updateRequest = store.put(item);
            updateRequest.onsuccess = () => resolve();
            updateRequest.onerror = () => reject(updateRequest.error);
          }
        };
        getRequest.onerror = () => reject(getRequest.error);
      });
    } catch (error) {
      console.error('Error incrementing sync attempts:', error);
    }
  }

  /**
   * Clear cache for a store
   */
  async clearCache(storeName, userId = null) {
    try {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      if (userId) {
        const allRequest = store.getAll();
        allRequest.onsuccess = () => {
          const items = allRequest.result.filter(item => item.userId === userId);
          items.forEach(item => store.delete(item.id));
        };
      } else {
        store.clear();
      }

      return { cleared: true };
    } catch (error) {
      console.error('Error clearing cache:', error);
      return { cleared: false, error };
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    try {
      const stats = {};

      for (const storeName of Object.values(this.stores)) {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);

        await new Promise((resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => {
            stats[storeName] = request.result.length;
            resolve();
          };
          request.onerror = () => reject(request.error);
        });
      }

      return stats;
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {};
    }
  }
}

export default new OfflineCacheService();
