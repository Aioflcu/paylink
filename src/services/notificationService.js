// Frontend Notification Service
// This handles local notifications and frontend notification state
// Backend push notifications are handled by backend/functions

class NotificationService {
  static async initialize() {
    // Frontend initialization
    console.log('NotificationService initialized');
  }

  static async sendNotification(userId, notification) {
    // Frontend local notification storage
    try {
      const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
      const newNotification = {
        id: Date.now(),
        userId,
        ...notification,
        createdAt: new Date().toISOString(),
        read: false
      };
      notifications.push(newNotification);
      localStorage.setItem('notifications', JSON.stringify(notifications));
      return newNotification;
    } catch (error) {
      console.error('Error storing notification:', error);
      return null;
    }
  }

  static async getUserNotifications(userId, limit = 50) {
    try {
      const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
      return notifications
        .filter(n => n.userId === userId)
        .slice(0, limit)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
      console.error('Error getting notifications:', error);
      return [];
    }
  }

  static async markAsRead(notificationId, userId) {
    try {
      const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
      const notification = notifications.find(n => n.id === notificationId);
      if (notification) {
        notification.read = true;
        localStorage.setItem('notifications', JSON.stringify(notifications));
      }
      return notification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return null;
    }
  }

  static async markAllAsRead(userId) {
    try {
      const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
      notifications.forEach(n => {
        if (n.userId === userId) {
          n.read = true;
        }
      });
      localStorage.setItem('notifications', JSON.stringify(notifications));
      return true;
    } catch (error) {
      console.error('Error marking all as read:', error);
      return false;
    }
  }

  static async deleteNotification(notificationId, userId) {
    try {
      const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
      const filtered = notifications.filter(n => n.id !== notificationId);
      localStorage.setItem('notifications', JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  }

  static async getUnreadCount(userId) {
    try {
      const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
      return notifications.filter(n => n.userId === userId && !n.read).length;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Specific notification types
  static async notifyDeposit(userId, amount, reference) {
    const notification = {
      type: 'deposit',
      title: 'Deposit Successful',
      message: `₦${amount.toLocaleString()} has been added to your wallet`,
      data: { amount, reference, action: 'view_wallet' }
    };

    return await this.sendNotification(userId, notification);
  }

  static async notifyWithdrawal(userId, amount, status) {
    const notification = {
      type: 'withdrawal',
      title: status === 'success' ? 'Withdrawal Successful' : 'Withdrawal Failed',
      message: status === 'success'
        ? `₦${amount.toLocaleString()} has been withdrawn from your wallet`
        : `Your withdrawal of ₦${amount.toLocaleString()} failed`,
      data: { amount, status, action: 'view_wallet' }
    };

    return await this.sendNotification(userId, notification);
  }

  static async notifyPurchase(userId, service, amount, status) {
    const notification = {
      type: status === 'success' ? 'purchase' : 'failed_purchase',
      title: status === 'success' ? 'Purchase Successful' : 'Purchase Failed',
      message: status === 'success'
        ? `Your ${service} purchase of ₦${amount.toLocaleString()} was successful`
        : `Your ${service} purchase of ₦${amount.toLocaleString()} failed`,
      data: { service, amount, status, action: 'view_history' }
    };

    return await this.sendNotification(userId, notification);
  }

  static async notifySecurityAlert(userId, alerts) {
    const notification = {
      type: 'alert',
      title: 'Security Alert',
      message: 'Suspicious activity detected on your account',
      data: { alerts, action: 'view_security' }
    };

    return await this.sendNotification(userId, notification);
  }

  static async notifyReward(userId, rewardType, amount) {
    const notification = {
      type: 'reward',
      title: 'Reward Earned!',
      message: `You've earned ${rewardType}: ₦${amount.toLocaleString()}`,
      data: { rewardType, amount, action: 'view_rewards' }
    };

    return await this.sendNotification(userId, notification);
  }

  static async notifySavingsInterest(userId, amount, planName) {
    const notification = {
      type: 'savings',
      title: 'Interest Earned',
      message: `₦${amount.toLocaleString()} interest added to ${planName}`,
      data: { amount, planName, action: 'view_savings' }
    };

    return await this.sendNotification(userId, notification);
  }

  static async notifyBillReminder(userId, service, dueDate) {
    const notification = {
      type: 'reminder',
      title: 'Bill Reminder',
      message: `Your ${service} bill is due on ${dueDate}`,
      data: { service, dueDate, action: 'pay_bill' }
    };

    return await this.sendNotification(userId, notification);
  }

  static async notifyReferralBonus(userId, bonusAmount, refereeName) {
    const notification = {
      type: 'referral',
      title: 'Referral Bonus!',
      message: `You earned ₦${bonusAmount.toLocaleString()} for referring ${refereeName}`,
      data: { bonusAmount, refereeName, action: 'view_referrals' }
    };

    return await this.sendNotification(userId, notification);
  }

  static async notifyPromotion(userId, promotion) {
    const notification = {
      type: 'promo',
      title: promotion.title,
      message: promotion.message,
      data: { promotionId: promotion.id, action: 'view_promo' }
    };

    return await this.sendNotification(userId, notification);
  }

  static async notifyNewFeature(userId, feature) {
    const notification = {
      type: 'feature',
      title: 'New Feature Available!',
      message: feature.description,
      data: { featureId: feature.id, action: 'view_feature' }
    };

    return await this.sendNotification(userId, notification);
  }

  // Bulk notifications
  static async sendBulkNotification(userIds, notification) {
    const results = [];
    for (const userId of userIds) {
      try {
        const result = await this.sendNotification(userId, notification);
        results.push({ userId, success: true, result });
      } catch (error) {
        results.push({ userId, success: false, error: error.message });
      }
    }
    return results;
  }

  // Notification preferences
  static async updateNotificationPreferences(userId, preferences) {
    try {
      localStorage.setItem(`notif_prefs_${userId}`, JSON.stringify(preferences));
      return true;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return false;
    }
  }

  static async getNotificationPreferences(userId) {
    try {
      const prefs = localStorage.getItem(`notif_prefs_${userId}`);
      return prefs ? JSON.parse(prefs) : {
        deposits: true,
        withdrawals: true,
        purchases: true,
        security: true,
        promotions: true,
        reminders: true
      };
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      return {};
    }
  }

  // Clean up old notifications
  static async cleanupOldNotifications(daysOld = 30) {
    try {
      const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
      const filtered = notifications.filter(n => 
        new Date(n.createdAt) >= cutoffDate || !n.read
      );
      localStorage.setItem('notifications', JSON.stringify(filtered));
      return notifications.length - filtered.length;
    } catch (error) {
      console.error('Error cleaning up notifications:', error);
      return 0;
    }
  }
}

export default NotificationService;
