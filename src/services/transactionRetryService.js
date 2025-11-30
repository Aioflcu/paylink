class TransactionRetryService {
  static RETRY_CONFIG = {
    maxRetries: 3,
    baseDelay: 5000, // 5 seconds
    maxDelay: 300000, // 5 minutes
    backoffMultiplier: 2
  };

  static RETRYABLE_ERRORS = [
    'NETWORK_ERROR',
    'TIMEOUT',
    'SERVER_ERROR',
    'TEMPORARY_FAILURE',
    'RATE_LIMITED'
  ];

  static async retryTransaction(transactionId, customConfig = {}) {
    try {
      const config = { ...this.RETRY_CONFIG, ...customConfig };

      const transaction = await Transaction.findById(transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.status === 'success') {
        return { success: true, message: 'Transaction already successful' };
      }

      if (transaction.retryCount >= config.maxRetries) {
        await this.handleMaxRetriesExceeded(transaction);
        return { success: false, message: 'Max retries exceeded' };
      }

      // Increment retry count
      transaction.retryCount += 1;
      transaction.lastRetryAt = new Date();
      await transaction.save();

      // Calculate delay with exponential backoff
      const delay = this.calculateDelay(transaction.retryCount, config);

      // Schedule retry
      setTimeout(async () => {
        try {
          await this.executeRetry(transaction, config);
        } catch (error) {
          console.error(`Retry execution failed for transaction ${transactionId}:`, error);
        }
      }, delay);

      return {
        success: true,
        message: `Retry scheduled in ${delay / 1000} seconds`,
        nextRetryIn: delay
      };
    } catch (error) {
      console.error('Error initiating transaction retry:', error);
      throw error;
    }
  }

  static calculateDelay(retryCount, config) {
    const delay = config.baseDelay * Math.pow(config.backoffMultiplier, retryCount - 1);
    return Math.min(delay, config.maxDelay);
  }

  static async executeRetry(transaction, config) {
    try {
      console.log(`Executing retry ${transaction.retryCount} for transaction ${transaction._id}`);

      // Determine which service to call based on transaction category
      const result = await this.callAppropriateService(transaction);

      if (result.success) {
        // Update transaction as successful
        transaction.status = 'success';
        transaction.reference = result.reference;
        transaction.completedAt = new Date();
        transaction.errorMessage = null;
        await transaction.save();

        // Send success notification
        await this.sendRetrySuccessNotification(transaction);

        console.log(`Transaction ${transaction._id} completed successfully on retry ${transaction.retryCount}`);
      } else {
        // Check if error is retryable
        if (this.isRetryableError(result.error) && transaction.retryCount < config.maxRetries) {
          // Schedule another retry
          await this.retryTransaction(transaction._id, config);
        } else {
          // Mark as failed and initiate refund
          await this.handlePermanentFailure(transaction, result.error);
        }
      }
    } catch (error) {
      console.error(`Error executing retry for transaction ${transaction._id}:`, error);

      if (transaction.retryCount < config.maxRetries) {
        await this.retryTransaction(transaction._id, config);
      } else {
        await this.handlePermanentFailure(transaction, error.message);
      }
    }
  }

  static async callAppropriateService(transaction) {
    const ApiService = require('./api');

    try {
      switch (transaction.category) {
        case 'airtime':
          return await ApiService.purchaseAirtime({
            phoneNumber: transaction.metadata?.phoneNumber,
            amount: transaction.amount,
            network: transaction.metadata?.network
          });

        case 'data':
          return await ApiService.purchaseData({
            phoneNumber: transaction.metadata?.phoneNumber,
            plan: transaction.metadata?.plan,
            amount: transaction.amount,
            network: transaction.metadata?.network
          });

        case 'electricity':
          return await ApiService.purchaseElectricity({
            meterNumber: transaction.metadata?.meterNumber,
            amount: transaction.amount,
            disco: transaction.metadata?.disco,
            meterType: transaction.metadata?.meterType
          });

        case 'cabletv':
          return await ApiService.purchaseCableTV({
            smartcardNumber: transaction.metadata?.smartcardNumber,
            amount: transaction.amount,
            provider: transaction.metadata?.provider
          });

        case 'internet':
          return await ApiService.purchaseInternet({
            accountNumber: transaction.metadata?.accountNumber,
            amount: transaction.amount,
            provider: transaction.metadata?.provider
          });

        default:
          throw new Error(`Unsupported transaction category: ${transaction.category}`);
      }
    } catch (error) {
      return {
        success: false,
        error: this.categorizeError(error)
      };
    }
  }

  static categorizeError(error) {
    const errorMessage = error.message?.toLowerCase() || '';

    if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      return 'NETWORK_ERROR';
    }

    if (errorMessage.includes('timeout')) {
      return 'TIMEOUT';
    }

    if (errorMessage.includes('server') || errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503')) {
      return 'SERVER_ERROR';
    }

    if (errorMessage.includes('rate') || errorMessage.includes('limit')) {
      return 'RATE_LIMITED';
    }

    if (errorMessage.includes('insufficient') || errorMessage.includes('balance')) {
      return 'INSUFFICIENT_FUNDS';
    }

    if (errorMessage.includes('invalid') || errorMessage.includes('not found')) {
      return 'INVALID_REQUEST';
    }

    return 'UNKNOWN_ERROR';
  }

  static isRetryableError(errorType) {
    return this.RETRYABLE_ERRORS.includes(errorType);
  }

  static async handleMaxRetriesExceeded(transaction) {
    transaction.status = 'failed';
    transaction.errorMessage = 'Max retries exceeded';
    await transaction.save();

    await this.handlePermanentFailure(transaction, 'Max retries exceeded');
  }

  static async handlePermanentFailure(transaction, errorMessage) {
    try {
      transaction.status = 'failed';
      transaction.errorMessage = errorMessage;
      transaction.completedAt = new Date();
      await transaction.save();

      // Initiate refund if transaction was debited
      if (transaction.type === 'debit') {
        await this.initiateRefund(transaction);
      }

      // Send failure notification
      await this.sendRetryFailureNotification(transaction, errorMessage);

      console.log(`Transaction ${transaction._id} marked as permanently failed`);
    } catch (error) {
      console.error('Error handling permanent failure:', error);
    }
  }

  static async initiateRefund(transaction) {
    try {
      const WalletService = require('./walletService');

      // Refund to wallet
      await WalletService.deductFromWallet(transaction.userId, -transaction.amount, `Refund for failed transaction ${transaction._id}`);

      // Create refund transaction record
      const refundTransaction = new Transaction({
        userId: transaction.userId,
        type: 'credit',
        category: 'refund',
        amount: transaction.amount,
        reference: `REFUND_${transaction._id}`,
        status: 'success',
        description: `Refund for failed transaction ${transaction.reference}`,
        metadata: {
          originalTransactionId: transaction._id,
          reason: 'transaction_failure'
        }
      });

      await refundTransaction.save();

      console.log(`Refund processed for transaction ${transaction._id}`);
    } catch (error) {
      console.error('Error initiating refund:', error);
    }
  }

  static async sendRetrySuccessNotification(transaction) {
    const NotificationService = require('./notificationService');

    await NotificationService.sendNotification(transaction.userId, {
      type: 'transaction_retry',
      title: 'Transaction Completed',
      message: `Your ${transaction.category} transaction of ₦${transaction.amount.toLocaleString()} has been completed successfully after retry.`,
      data: {
        transactionId: transaction._id,
        amount: transaction.amount,
        category: transaction.category,
        action: 'view_transaction'
      }
    });
  }

  static async sendRetryFailureNotification(transaction, errorMessage) {
    const NotificationService = require('./notificationService');

    await NotificationService.sendNotification(transaction.userId, {
      type: 'transaction_retry',
      title: 'Transaction Failed',
      message: `Your ${transaction.category} transaction could not be completed. Funds have been refunded to your wallet.`,
      data: {
        transactionId: transaction._id,
        amount: transaction.amount,
        category: transaction.category,
        error: errorMessage,
        action: 'view_transaction'
      }
    });
  }

  static async getRetryStats(userId, days = 30) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const stats = await Transaction.aggregate([
        {
          $match: {
            userId: require('mongoose').Types.ObjectId(userId),
            createdAt: { $gte: startDate },
            retryCount: { $gt: 0 }
          }
        },
        {
          $group: {
            _id: null,
            totalRetries: { $sum: '$retryCount' },
            successfulRetries: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'success'] },
                  1,
                  0
                ]
              }
            },
            failedRetries: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'failed'] },
                  1,
                  0
                ]
              }
            },
            totalRetryTransactions: { $sum: 1 }
          }
        }
      ]);

      const result = stats[0] || {
        totalRetries: 0,
        successfulRetries: 0,
        failedRetries: 0,
        totalRetryTransactions: 0
      };

      result.successRate = result.totalRetryTransactions > 0
        ? (result.successfulRetries / result.totalRetryTransactions) * 100
        : 0;

      return result;
    } catch (error) {
      console.error('Error getting retry stats:', error);
      return {
        totalRetries: 0,
        successfulRetries: 0,
        failedRetries: 0,
        totalRetryTransactions: 0,
        successRate: 0
      };
    }
  }

  static async getRetryHistory(userId, limit = 20) {
    try {

      const transactions = await Transaction.find({
        userId,
        retryCount: { $gt: 0 }
      })
      .select('category amount status retryCount lastRetryAt createdAt errorMessage')
      .sort({ createdAt: -1 })
      .limit(limit);

      return transactions;
    } catch (error) {
      console.error('Error getting retry history:', error);
      return [];
    }
  }

  static async forceRetry(transactionId, userId) {
    try {

      const transaction = await Transaction.findOne({ _id: transactionId, userId });
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.status === 'success') {
        throw new Error('Transaction is already successful');
      }

      // Reset retry count for manual retry
      transaction.retryCount = 0;
      transaction.errorMessage = null;
      await transaction.save();

      return await this.retryTransaction(transactionId);
    } catch (error) {
      console.error('Error forcing retry:', error);
      throw error;
    }
  }

  static async cancelRetries(transactionId, userId) {
    try {

      const transaction = await Transaction.findOne({ _id: transactionId, userId });
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Mark as cancelled
      transaction.status = 'cancelled';
      transaction.errorMessage = 'Retries cancelled by user';
      await transaction.save();

      // Initiate refund if transaction was debited
      if (transaction.type === 'debit') {
        await this.initiateRefund(transaction);
      }

      return true;
    } catch (error) {
      console.error('Error cancelling retries:', error);
      throw error;
    }
  }

  static async getSystemRetryStats() {
    try {

      const stats = await Transaction.aggregate([
        {
          $match: {
            retryCount: { $gt: 0 }
          }
        },
        {
          $group: {
            _id: null,
            totalRetries: { $sum: '$retryCount' },
            successfulRetries: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'success'] },
                  1,
                  0
                ]
              }
            },
            failedRetries: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'failed'] },
                  1,
                  0
                ]
              }
            },
            totalRetryTransactions: { $sum: 1 }
          }
        }
      ]);

      const result = stats[0] || {
        totalRetries: 0,
        successfulRetries: 0,
        failedRetries: 0,
        totalRetryTransactions: 0
      };

      result.successRate = result.totalRetryTransactions > 0
        ? (result.successfulRetries / result.totalRetryTransactions) * 100
        : 0;

      // Get retry distribution by category
      const categoryStats = await Transaction.aggregate([
        {
          $match: {
            retryCount: { $gt: 0 }
          }
        },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            successful: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'success'] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);

      result.byCategory = categoryStats.reduce((acc, cat) => {
        acc[cat._id] = {
          total: cat.count,
          successful: cat.successful,
          failed: cat.count - cat.successful
        };
        return acc;
      }, {});

      return result;
    } catch (error) {
      console.error('Error getting system retry stats:', error);
      return {
        totalRetries: 0,
        successfulRetries: 0,
        failedRetries: 0,
        totalRetryTransactions: 0,
        successRate: 0,
        byCategory: {}
      };
    }
  }

  static async cleanupOldRetryData(daysOld = 90) {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

      // Only clean up completed/failed transactions older than cutoff
      const result = await Transaction.updateMany(
        {
          retryCount: { $gt: 0 },
          status: { $in: ['success', 'failed', 'cancelled'] },
          completedAt: { $lt: cutoffDate }
        },
        {
          $unset: {
            retryCount: 1,
            lastRetryAt: 1,
            errorMessage: 1
          }
        }
      );

      console.log(`Cleaned up retry data for ${result.modifiedCount} transactions`);
      return result.modifiedCount;
    } catch (error) {
      console.error('Error cleaning up retry data:', error);
      return 0;
    }
  }
}

export default TransactionRetryService;
