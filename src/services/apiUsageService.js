import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, orderBy, serverTimestamp } from 'firebase/firestore';

class APIUsageService {
  /**
   * Track an API request
   * @param {Object} usageData - API usage data
   * @param {string} usageData.userId - User ID making the request
   * @param {string} usageData.apiKey - API key used (optional)
   * @param {string} usageData.endpoint - API endpoint called
   * @param {string} usageData.method - HTTP method (GET, POST, etc.)
   * @param {number} usageData.responseTime - Response time in milliseconds
   * @param {boolean} usageData.success - Whether the request was successful
   * @param {number} usageData.statusCode - HTTP status code
   */
  static async trackRequest(usageData) {
    try {
      const usageRef = collection(db, 'apiUsage');

      await addDoc(usageRef, {
        userId: usageData.userId,
        apiKey: usageData.apiKey || null,
        endpoint: usageData.endpoint,
        method: usageData.method,
        responseTime: usageData.responseTime,
        success: usageData.success,
        statusCode: usageData.statusCode,
        timestamp: serverTimestamp(),
        requestCount: 1 // For batch operations
      });
    } catch (error) {
      console.error('Error tracking API usage:', error);
      // Don't throw error to avoid breaking the API call
    }
  }

  /**
   * Get usage statistics for a user
   * @param {string} userId - User ID
   * @param {string} period - Time period ('day', 'week', 'month', 'year')
   * @returns {Promise<Object>} Usage statistics
   */
  static async getUsageStats(userId, period = 'month') {
    try {
      const usageRef = collection(db, 'apiUsage');
      const now = new Date();
      const periodStart = this.getPeriodStart(period);

      const usageQuery = query(
        usageRef,
        where('userId', '==', userId),
        where('timestamp', '>=', periodStart),
        orderBy('timestamp', 'desc')
      );

      const usageDocs = await getDocs(usageQuery);

      let totalRequests = 0;
      let totalResponseTime = 0;
      let successfulRequests = 0;
      let failedRequests = 0;
      const endpointStats = {};
      const methodStats = {};

      usageDocs.forEach(doc => {
        const data = doc.data();
        const count = data.requestCount || 1;

        totalRequests += count;
        totalResponseTime += (data.responseTime || 0) * count;

        if (data.success !== false) {
          successfulRequests += count;
        } else {
          failedRequests += count;
        }

        // Track endpoint usage
        if (data.endpoint) {
          endpointStats[data.endpoint] = (endpointStats[data.endpoint] || 0) + count;
        }

        // Track method usage
        if (data.method) {
          methodStats[data.method] = (methodStats[data.method] || 0) + count;
        }
      });

      return {
        totalRequests,
        successfulRequests,
        failedRequests,
        averageResponseTime: totalRequests > 0 ? Math.round(totalResponseTime / totalRequests) : 0,
        successRate: totalRequests > 0 ? ((successfulRequests / totalRequests) * 100).toFixed(1) : '0.0',
        endpointStats,
        methodStats,
        period
      };
    } catch (error) {
      console.error('Error getting usage stats:', error);
      return {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        successRate: '0.0',
        endpointStats: {},
        methodStats: {},
        period
      };
    }
  }

  /**
   * Get period start date
   * @param {string} period - Time period
   * @returns {Date} Start date for the period
   */
  static getPeriodStart(period) {
    const now = new Date();
    switch (period) {
      case 'day':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case 'week':
        const dayOfWeek = now.getDay();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - dayOfWeek);
        startOfWeek.setHours(0, 0, 0, 0);
        return startOfWeek;
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'year':
        return new Date(now.getFullYear(), 0, 1);
      default:
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }
  }

  /**
   * Clean up old usage data (optional maintenance function)
   * @param {number} daysOld - Remove data older than this many days
   */
  static async cleanupOldData(daysOld = 90) {
    try {
      // This would be implemented if we need to clean up old data
      // For now, we'll keep all data for analytics
      console.log(`Cleanup not implemented. Keeping data for ${daysOld} days.`);
    } catch (error) {
      console.error('Error cleaning up old data:', error);
    }
  }
}

// Export the trackAPIUsage function for use in interceptors
export const trackAPIUsage = APIUsageService.trackRequest;

export default APIUsageService;
