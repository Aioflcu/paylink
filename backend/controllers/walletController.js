/**
 * Wallet Controller
 * Handles wallet balance, deposits, withdrawals, and transaction queries
 */

const admin = require('firebase-admin');
const UserModel = require('../models/User');
const TransactionModel = require('../models/Transaction');

class WalletController {
  /**
   * Get wallet balance
   */
  static async getBalance(req, res, next) {
    try {
      const userId = req.user.uid;

      const user = await UserModel.getUserById(userId);

      return res.status(200).json({
        success: true,
        walletBalance: user.walletBalance || 0,
        rewardPoints: user.rewardPoints || 0,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deposit funds to wallet
   * In production, integrate with Monnify or payment gateway
   */
  static async deposit(req, res, next) {
    try {
      const { amount, paymentMethod, reference } = req.body;
      const userId = req.user.uid;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          error: 'Invalid amount',
        });
      }

      if (!paymentMethod) {
        return res.status(400).json({
          error: 'Payment method required',
        });
      }

      // Validate amount is within reasonable range
      if (amount > 5000000) {
        // 5 million limit
        return res.status(400).json({
          error: 'Amount exceeds maximum limit',
        });
      }

      // Get user
      const user = await UserModel.getUserById(userId);

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
        });
      }

      // Create transaction
      const transaction = await TransactionModel.createTransaction(userId, {
        type: 'deposit',
        status: 'pending',
        amount,
        fee: 0,
        provider: paymentMethod,
        description: `Wallet deposit via ${paymentMethod}`,
        paymentMethod,
        metadata: {
          reference,
        },
      });

      // In production, call Monnify API here
      // For now, mark as completed if reference provided
      if (reference) {
        // Verify with payment gateway
        await UserModel.updateWalletBalance(userId, amount);
        await TransactionModel.updateTransactionStatus(transaction.transactionId, 'completed', {
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
          externalTransactionId: reference,
        });

        return res.status(200).json({
          success: true,
          message: 'Deposit successful',
          transaction: {
            id: transaction.transactionId,
            amount,
            status: 'completed',
            walletBalance: user.walletBalance + amount,
          },
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Deposit initiated. Awaiting payment confirmation.',
        transaction: {
          id: transaction.transactionId,
          amount,
          status: 'pending',
          reference,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Withdraw funds from wallet
   */
  static async withdraw(req, res, next) {
    try {
      const { amount, bankAccount, pin } = req.body;
      const userId = req.user.uid;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          error: 'Invalid amount',
        });
      }

      if (!bankAccount) {
        return res.status(400).json({
          error: 'Bank account required',
        });
      }

      if (!pin || pin.length !== 4) {
        return res.status(400).json({
          error: 'Valid PIN required',
        });
      }

      // Get user
      const user = await UserModel.getUserById(userId);

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
        });
      }

      // Verify PIN
      const crypto = require('crypto');
      const pinHash = crypto.createHash('sha256').update(pin).digest('hex');
      const isPinValid = await UserModel.verifyTransactionPin(userId, pinHash);

      if (!isPinValid) {
        return res.status(403).json({
          error: 'Invalid PIN',
        });
      }

      // Check balance
      if (user.walletBalance < amount) {
        return res.status(400).json({
          error: 'Insufficient wallet balance',
          availableBalance: user.walletBalance,
        });
      }

      // Create withdrawal transaction
      const transaction = await TransactionModel.createTransaction(userId, {
        type: 'withdraw',
        status: 'pending',
        amount,
        fee: 0,
        provider: 'bank_transfer',
        recipient: bankAccount,
        description: `Withdrawal to ${bankAccount}`,
        paymentMethod: 'bank_account',
      });

      // Deduct from wallet immediately (can be refunded if failed)
      await UserModel.updateWalletBalance(userId, -amount);

      // In production, call bank transfer API (e.g., Monnify, Paystack)
      // For now, mark as pending for manual review
      return res.status(200).json({
        success: true,
        message: 'Withdrawal request submitted. Processing in progress.',
        transaction: {
          id: transaction.transactionId,
          amount,
          status: 'pending',
          bankAccount,
          walletBalance: user.walletBalance - amount,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get wallet transactions
   */
  static async getTransactions(req, res, next) {
    try {
      const userId = req.user.uid;
      const { limit = 50, type } = req.query;

      let transactions;

      if (type) {
        transactions = await TransactionModel.getTransactionsByType(
          userId,
          type,
          parseInt(limit)
        );
      } else {
        transactions = await TransactionModel.getUserTransactions(userId, parseInt(limit));
      }

      return res.status(200).json({
        success: true,
        transactions,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get wallet stats
   */
  static async getStats(req, res, next) {
    try {
      const userId = req.user.uid;

      const stats = await TransactionModel.getUserTransactionStats(userId);

      return res.status(200).json({
        success: true,
        stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify withdrawal status (for checking after bank processing)
   */
  static async verifyWithdrawal(req, res, next) {
    try {
      const { transactionId } = req.params;

      const transaction = await TransactionModel.getTransactionById(transactionId);

      if (!transaction) {
        return res.status(404).json({
          error: 'Transaction not found',
        });
      }

      return res.status(200).json({
        success: true,
        transaction: {
          id: transaction.transactionId,
          status: transaction.status,
          amount: transaction.amount,
          recipient: transaction.recipient,
          createdAt: transaction.createdAt,
          completedAt: transaction.completedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = WalletController;
