class AutoTopupService {
  static async createAutoTopupRule(userId, ruleData) {
    try {

      // Validate rule data
      const validation = this.validateRuleData(ruleData);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Check if similar rule already exists
      const existingRule = await AutoTopup.findOne({
        userId,
        ruleType: ruleData.ruleType,
        'action.accountNumber': ruleData.action.accountNumber,
        active: true
      });

      if (existingRule) {
        throw new Error('Similar auto-topup rule already exists');
      }

      const autoTopup = new AutoTopup({
        userId,
        ruleType: ruleData.ruleType,
        threshold: ruleData.threshold,
        action: ruleData.action,
        active: ruleData.active !== false,
        notificationEnabled: ruleData.notificationEnabled !== false
      });

      await autoTopup.save();

      // Send confirmation notification
      if (autoTopup.notificationEnabled) {
        await this.sendRuleCreatedNotification(userId, autoTopup);
      }

      return autoTopup;
    } catch (error) {
      console.error('Error creating auto-topup rule:', error);
      throw error;
    }
  }

  static validateRuleData(ruleData) {
    const { ruleType, threshold, action } = ruleData;

    // Validate rule type
    if (!['balance', 'data', 'electricity'].includes(ruleType)) {
      return { valid: false, error: 'Invalid rule type' };
    }

    // Validate threshold based on rule type
    switch (ruleType) {
      case 'balance':
        if (threshold < 100 || threshold > 10000) {
          return { valid: false, error: 'Balance threshold must be between ₦100 and ₦10,000' };
        }
        break;
      case 'data':
        if (threshold < 50 || threshold > 5000) {
          return { valid: false, error: 'Data threshold must be between 50MB and 5000MB' };
        }
        break;
      case 'electricity':
        // No specific validation for electricity threshold
        break;
    }

    // Validate action
    if (!action || !action.type || !action.amount) {
      return { valid: false, error: 'Action details are required' };
    }

    if (!['airtime', 'data', 'electricity'].includes(action.type)) {
      return { valid: false, error: 'Invalid action type' };
    }

    if (action.amount < 50 || action.amount > 50000) {
      return { valid: false, error: 'Action amount must be between ₦50 and ₦50,000' };
    }

    // Validate account numbers based on action type
    if (action.type === 'airtime' || action.type === 'data') {
      if (!action.phoneNumber || !this.isValidPhoneNumber(action.phoneNumber)) {
        return { valid: false, error: 'Valid phone number is required' };
      }
      if (action.type === 'data' && !action.network) {
        return { valid: false, error: 'Network provider is required for data top-up' };
      }
    } else if (action.type === 'electricity') {
      if (!action.meterNumber || !/^\d{10,13}$/.test(action.meterNumber)) {
        return { valid: false, error: 'Valid meter number is required' };
      }
      if (!action.disco) {
        return { valid: false, error: 'Electricity provider is required' };
      }
    }

    return { valid: true };
  }

  static isValidPhoneNumber(phone) {
    return /^(\+234|0)[789]\d{9}$/.test(phone.replace(/\D/g, ''));
  }

  static async getUserAutoTopupRules(userId) {
    try {

      const rules = await AutoTopup.find({ userId }).sort({ createdAt: -1 });

      return rules.map(rule => ({
        id: rule._id,
        ruleType: rule.ruleType,
        threshold: rule.threshold,
        action: rule.action,
        active: rule.active,
        notificationEnabled: rule.notificationEnabled,
        lastTriggered: rule.lastTriggered,
        triggerCount: rule.triggerCount,
        createdAt: rule.createdAt
      }));
    } catch (error) {
      console.error('Error getting auto-topup rules:', error);
      return [];
    }
  }

  static async updateAutoTopupRule(ruleId, userId, updateData) {
    try {

      const rule = await AutoTopup.findOne({ _id: ruleId, userId });
      if (!rule) {
        throw new Error('Auto-topup rule not found');
      }

      // Validate update data if it includes rule changes
      if (updateData.ruleType || updateData.threshold || updateData.action) {
        const validation = this.validateRuleData({
          ruleType: updateData.ruleType || rule.ruleType,
          threshold: updateData.threshold || rule.threshold,
          action: updateData.action || rule.action
        });

        if (!validation.valid) {
          throw new Error(validation.error);
        }
      }

      Object.assign(rule, updateData);
      await rule.save();

      return rule;
    } catch (error) {
      console.error('Error updating auto-topup rule:', error);
      throw error;
    }
  }

  static async deleteAutoTopupRule(ruleId, userId) {
    try {

      const result = await AutoTopup.findOneAndDelete({ _id: ruleId, userId });

      if (!result) {
        throw new Error('Auto-topup rule not found');
      }

      return true;
    } catch (error) {
      console.error('Error deleting auto-topup rule:', error);
      throw error;
    }
  }

  static async checkAndTriggerRules(userId) {
    try {

      const activeRules = await AutoTopup.find({ userId, active: true });

      const triggeredRules = [];

      for (const rule of activeRules) {
        try {
          const shouldTrigger = await this.evaluateRule(userId, rule);

          if (shouldTrigger && this.canTriggerRule(rule)) {
            const result = await this.executeAutoTopup(userId, rule);
            triggeredRules.push({
              ruleId: rule._id,
              ruleType: rule.ruleType,
              success: result.success,
              message: result.message
            });

            // Update rule stats
            rule.lastTriggered = new Date();
            rule.triggerCount += 1;
            await rule.save();
          }
        } catch (error) {
          console.error(`Error processing rule ${rule._id}:`, error);
          triggeredRules.push({
            ruleId: rule._id,
            ruleType: rule.ruleType,
            success: false,
            message: error.message
          });
        }
      }

      return triggeredRules;
    } catch (error) {
      console.error('Error checking and triggering rules:', error);
      throw error;
    }
  }

  static async evaluateRule(userId, rule) {
    try {
      switch (rule.ruleType) {
        case 'balance':
          return await this.checkBalanceThreshold(userId, rule.threshold);

        case 'data':
          return await this.checkDataThreshold(userId, rule.threshold);

        case 'electricity':
          return await this.checkElectricityReminder(userId, rule);

        default:
          return false;
      }
    } catch (error) {
      console.error('Error evaluating rule:', error);
      return false;
    }
  }

  static async checkBalanceThreshold(userId, threshold) {
    const WalletService = require('./walletService');
    const wallet = await WalletService.getWallet(userId);
    return wallet.mainBalance < threshold;
  }

  static async checkDataThreshold(userId, threshold) {
    // This would integrate with a data usage tracking service
    // For now, return false (not implemented)
    console.log(`Data threshold check not implemented for user ${userId}`);
    return false;
  }

  static async checkElectricityReminder(userId, rule) {
    // Check if it's time for electricity bill payment
    // This could be based on calendar reminders or bill due dates
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentDate = now.getDate();

    // Example: Remind on the 25th of each month
    return currentDate >= 25;
  }

  static canTriggerRule(rule) {
    // Check cooldown period (minimum 24 hours between triggers)
    if (!rule.lastTriggered) return true;

    const timeSinceLastTrigger = Date.now() - rule.lastTriggered.getTime();
    const cooldownPeriod = 24 * 60 * 60 * 1000; // 24 hours

    return timeSinceLastTrigger >= cooldownPeriod;
  }

  static async executeAutoTopup(userId, rule) {
    try {
      const WalletService = require('./walletService');
      const ApiService = require('./api');

      // Check wallet balance
      const hasBalance = await WalletService.checkBalance(userId, rule.action.amount);
      if (!hasBalance) {
        return {
          success: false,
          message: 'Insufficient wallet balance for auto-topup'
        };
      }

      let result;

      // Execute the top-up action
      switch (rule.action.type) {
        case 'airtime':
          result = await ApiService.purchaseAirtime({
            phoneNumber: rule.action.phoneNumber,
            amount: rule.action.amount,
            network: rule.action.network
          });
          break;

        case 'data':
          result = await ApiService.purchaseData({
            phoneNumber: rule.action.phoneNumber,
            plan: rule.action.plan,
            amount: rule.action.amount,
            network: rule.action.network
          });
          break;

        case 'electricity':
          result = await ApiService.purchaseElectricity({
            meterNumber: rule.action.meterNumber,
            amount: rule.action.amount,
            disco: rule.action.disco,
            meterType: rule.action.meterType
          });
          break;

        default:
          throw new Error('Unsupported auto-topup action type');
      }

      // Deduct from wallet
      await WalletService.deductFromWallet(userId, rule.action.amount, `Auto-topup: ${rule.action.type}`);

      // Create transaction record
      const transaction = new Transaction({
        userId,
        type: 'debit',
        category: rule.action.type,
        amount: rule.action.amount,
        reference: result.reference,
        status: 'success',
        description: `Auto-topup: ${rule.action.type} - Triggered by ${rule.ruleType} threshold`,
        metadata: {
          autoTopup: true,
          ruleId: rule._id,
          ruleType: rule.ruleType,
          threshold: rule.threshold
        }
      });

      await transaction.save();

      // Send notification
      if (rule.notificationEnabled) {
        await this.sendAutoTopupNotification(userId, rule, transaction);
      }

      return {
        success: true,
        message: `Auto-topup executed successfully`,
        transactionId: transaction._id,
        reference: result.reference
      };
    } catch (error) {
      console.error('Error executing auto-topup:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  static async sendRuleCreatedNotification(userId, rule) {
    const NotificationService = require('./notificationService');

    await NotificationService.sendNotification(userId, {
      type: 'auto_topup',
      title: 'Auto-Topup Rule Created',
      message: `Auto-topup rule created for ${rule.ruleType} threshold`,
      data: { ruleId: rule._id, action: 'view_rules' }
    });
  }

  static async sendAutoTopupNotification(userId, rule, transaction) {
    const NotificationService = require('./notificationService');

    await NotificationService.sendNotification(userId, {
      type: 'auto_topup',
      title: 'Auto-Topup Executed',
      message: `₦${rule.action.amount.toLocaleString()} auto-topup completed for ${rule.action.type}`,
      data: {
        ruleId: rule._id,
        transactionId: transaction._id,
        amount: rule.action.amount,
        action: 'view_transaction'
      }
    });
  }

  static async getAutoTopupStats(userId) {
    try {

      const stats = await AutoTopup.aggregate([
        { $match: { userId: require('mongoose').Types.ObjectId(userId) } },
        {
          $group: {
            _id: null,
            totalRules: { $sum: 1 },
            activeRules: { $sum: { $cond: ['$active', 1, 0] } },
            totalTriggers: { $sum: '$triggerCount' },
            totalAmount: {
              $sum: { $multiply: ['$triggerCount', '$action.amount'] }
            }
          }
        }
      ]);

      const result = stats[0] || {
        totalRules: 0,
        activeRules: 0,
        totalTriggers: 0,
        totalAmount: 0
      };

      // Get rules by type
      const rulesByType = await AutoTopup.aggregate([
        { $match: { userId: require('mongoose').Types.ObjectId(userId) } },
        {
          $group: {
            _id: '$ruleType',
            count: { $sum: 1 },
            active: { $sum: { $cond: ['$active', 1, 0] } }
          }
        }
      ]);

      result.rulesByType = rulesByType.reduce((acc, type) => {
        acc[type._id] = { total: type.count, active: type.active };
        return acc;
      }, {});

      return result;
    } catch (error) {
      console.error('Error getting auto-topup stats:', error);
      return {
        totalRules: 0,
        activeRules: 0,
        totalTriggers: 0,
        totalAmount: 0,
        rulesByType: {}
      };
    }
  }

  static async pauseRule(ruleId, userId) {
    return await this.updateAutoTopupRule(ruleId, userId, { active: false });
  }

  static async resumeRule(ruleId, userId) {
    return await this.updateAutoTopupRule(ruleId, userId, { active: true });
  }

  static async testRule(ruleId, userId) {
    try {

      const rule = await AutoTopup.findOne({ _id: ruleId, userId });
      if (!rule) {
        throw new Error('Auto-topup rule not found');
      }

      // Temporarily set lastTriggered to allow testing
      const originalLastTriggered = rule.lastTriggered;
      rule.lastTriggered = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      await rule.save();

      const result = await this.checkAndTriggerRules(userId);

      // Restore original lastTriggered
      rule.lastTriggered = originalLastTriggered;
      await rule.save();

      return {
        testResult: result.find(r => r.ruleId.toString() === ruleId.toString()),
        message: 'Rule test completed'
      };
    } catch (error) {
      console.error('Error testing rule:', error);
      throw error;
    }
  }

  static async setupScheduler() {
    // Set up periodic checking of auto-topup rules
    setInterval(async () => {
      try {
        // Get all users with active auto-topup rules
        const usersWithRules = await AutoTopup.distinct('userId', { active: true });

        for (const userId of usersWithRules) {
          try {
            await this.checkAndTriggerRules(userId);
          } catch (error) {
            console.error(`Error checking rules for user ${userId}:`, error);
          }
        }
      } catch (error) {
        console.error('Error in auto-topup scheduler:', error);
      }
    }, 15 * 60 * 1000); // Check every 15 minutes

    console.log('Auto-topup scheduler started');
  }

  static getRuleTemplates() {
    return {
      low_balance: {
        ruleType: 'balance',
        threshold: 500,
        action: {
          type: 'airtime',
          amount: 1000
        },
        notificationEnabled: true
      },
      data_reminder: {
        ruleType: 'data',
        threshold: 200, // MB
        action: {
          type: 'data',
          amount: 1000
        },
        notificationEnabled: true
      },
      electricity_reminder: {
        ruleType: 'electricity',
        threshold: 25, // Day of month
        action: {
          type: 'electricity',
          amount: 5000
        },
        notificationEnabled: true
      }
    };
  }
}

export default AutoTopupService;
