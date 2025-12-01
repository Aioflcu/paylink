/**
 * Payment Controller
 * Handles airtime, data, electricity, cable, internet, education, insurance, giftcard, and tax payments
 */

const UserModel = require('../models/User');
const TransactionModel = require('../models/Transaction');
const payFlexService = require('../utils/payflexService');

class PaymentController {
  /**
   * Process Airtime purchase
   */
  static async buyAirtime(req, res, next) {
    try {
      const { phone, amount, provider, pinHash } = req.body;
      const userId = req.user.uid;

      // Validate input
      if (!phone || !amount || !provider) {
        return res.status(400).json({
          error: 'Missing required fields: phone, amount, provider',
        });
      }

      // Get user and verify balance
      const user = await UserModel.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const totalAmount = amount + 50; // Add fee
      if (user.walletBalance < totalAmount) {
        return res.status(400).json({
          error: 'Insufficient balance',
          required: totalAmount,
          available: user.walletBalance,
        });
      }

      // Verify transaction PIN if user has one
      if (user.transactionPin && pinHash) {
        const pinValid = await UserModel.verifyTransactionPin(userId, pinHash);
        if (!pinValid) {
          return res.status(403).json({ error: 'Invalid transaction PIN' });
        }
      }

      // Create transaction record
      const transaction = await TransactionModel.createTransaction(userId, {
        type: 'airtime',
        amount,
        fee: 50,
        provider,
        recipient: phone,
        description: `Airtime purchase for ${phone}`,
        paymentMethod: 'wallet',
        status: 'pending',
        metadata: { phone, provider },
      });

      // Call PayFlex API
      try {
        const payFlexResult = await payFlexService.buyAirtime(phone, amount, provider);

        if (payFlexResult.success) {
          // Deduct from wallet
          await UserModel.updateWalletBalance(userId, -totalAmount);

          // Award reward points
          const rewardPoints = Math.floor(amount / 100);
          await UserModel.addRewardPoints(userId, rewardPoints);

          // Update transaction
          await TransactionModel.updateTransactionStatus(transaction.transactionId, 'completed', {
            externalTransactionId: payFlexResult.transactionId,
          });

          return res.status(200).json({
            success: true,
            message: 'Airtime purchased successfully',
            transaction: {
              id: transaction.transactionId,
              amount,
              fee: 50,
              totalAmount,
              rewardPoints,
              status: 'completed',
            },
          });
        } else {
          throw new Error(payFlexResult.message || 'PayFlex transaction failed');
        }
      } catch (payFlexError) {
        // Mark transaction as failed
        await TransactionModel.updateTransactionStatus(transaction.transactionId, 'failed', {
          failureReason: payFlexError.message,
        });

        return res.status(400).json({
          error: 'Payment processing failed',
          message: payFlexError.message,
          transactionId: transaction.transactionId,
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Process Data purchase
   */
  static async buyData(req, res, next) {
    try {
      const { phone, planId, provider, amount, pinHash } = req.body;
      const userId = req.user.uid;

      if (!phone || !planId || !provider || !amount) {
        return res.status(400).json({
          error: 'Missing required fields: phone, planId, provider, amount',
        });
      }

      const user = await UserModel.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const totalAmount = amount + 50;
      if (user.walletBalance < totalAmount) {
        return res.status(400).json({ error: 'Insufficient balance' });
      }

      if (user.transactionPin && pinHash) {
        const pinValid = await UserModel.verifyTransactionPin(userId, pinHash);
        if (!pinValid) {
          return res.status(403).json({ error: 'Invalid transaction PIN' });
        }
      }

      const transaction = await TransactionModel.createTransaction(userId, {
        type: 'data',
        amount,
        fee: 50,
        provider,
        recipient: phone,
        description: `Data purchase - Plan ${planId}`,
        paymentMethod: 'wallet',
        metadata: { phone, planId, provider },
      });

      try {
        const payFlexResult = await payFlexService.buyData(phone, planId, provider);

        if (payFlexResult.success) {
          await UserModel.updateWalletBalance(userId, -totalAmount);
          const rewardPoints = Math.floor(amount / 100);
          await UserModel.addRewardPoints(userId, rewardPoints);

          await TransactionModel.updateTransactionStatus(transaction.transactionId, 'completed', {
            externalTransactionId: payFlexResult.transactionId,
          });

          return res.status(200).json({
            success: true,
            message: 'Data purchased successfully',
            transaction: {
              id: transaction.transactionId,
              amount,
              fee: 50,
              totalAmount,
              rewardPoints,
              status: 'completed',
            },
          });
        }
      } catch (payFlexError) {
        await TransactionModel.updateTransactionStatus(transaction.transactionId, 'failed', {
          failureReason: payFlexError.message,
        });

        return res.status(400).json({
          error: 'Payment processing failed',
          message: payFlexError.message,
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Pay Electricity bill
   */
  static async payElectricity(req, res, next) {
    try {
      const { meterNumber, amount, disco, meterType, pinHash } = req.body;
      const userId = req.user.uid;

      if (!meterNumber || !amount || !disco || !meterType) {
        return res.status(400).json({
          error: 'Missing required fields: meterNumber, amount, disco, meterType',
        });
      }

      const user = await UserModel.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const totalAmount = amount + 100;
      if (user.walletBalance < totalAmount) {
        return res.status(400).json({ error: 'Insufficient balance' });
      }

      if (user.transactionPin && pinHash) {
        const pinValid = await UserModel.verifyTransactionPin(userId, pinHash);
        if (!pinValid) {
          return res.status(403).json({ error: 'Invalid transaction PIN' });
        }
      }

      const transaction = await TransactionModel.createTransaction(userId, {
        type: 'electricity',
        amount,
        fee: 100,
        provider: disco,
        recipient: meterNumber,
        description: `Electricity bill - Meter ${meterNumber}`,
        paymentMethod: 'wallet',
        metadata: { meterNumber, disco, meterType },
      });

      try {
        const payFlexResult = await payFlexService.payElectricity(
          meterNumber,
          amount,
          disco,
          meterType
        );

        if (payFlexResult.success) {
          await UserModel.updateWalletBalance(userId, -totalAmount);
          const rewardPoints = Math.floor(amount / 200);
          await UserModel.addRewardPoints(userId, rewardPoints);

          await TransactionModel.updateTransactionStatus(transaction.transactionId, 'completed', {
            externalTransactionId: payFlexResult.transactionId,
          });

          return res.status(200).json({
            success: true,
            message: 'Electricity bill paid successfully',
            transaction: {
              id: transaction.transactionId,
              amount,
              fee: 100,
              totalAmount,
              rewardPoints,
              status: 'completed',
            },
          });
        }
      } catch (payFlexError) {
        await TransactionModel.updateTransactionStatus(transaction.transactionId, 'failed', {
          failureReason: payFlexError.message,
        });

        return res.status(400).json({
          error: 'Payment processing failed',
          message: payFlexError.message,
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Pay Cable TV subscription
   */
  static async payCableTV(req, res, next) {
    try {
      const { smartcardNumber, amount, provider, planId, pinHash } = req.body;
      const userId = req.user.uid;

      if (!smartcardNumber || !amount || !provider || !planId) {
        return res.status(400).json({
          error: 'Missing required fields',
        });
      }

      const user = await UserModel.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const totalAmount = amount + 50;
      if (user.walletBalance < totalAmount) {
        return res.status(400).json({ error: 'Insufficient balance' });
      }

      if (user.transactionPin && pinHash) {
        const pinValid = await UserModel.verifyTransactionPin(userId, pinHash);
        if (!pinValid) {
          return res.status(403).json({ error: 'Invalid transaction PIN' });
        }
      }

      const transaction = await TransactionModel.createTransaction(userId, {
        type: 'cable',
        amount,
        fee: 50,
        provider,
        recipient: smartcardNumber,
        description: `Cable TV subscription - ${provider}`,
        paymentMethod: 'wallet',
        metadata: { smartcardNumber, provider, planId },
      });

      try {
        const payFlexResult = await payFlexService.payCableTV(
          smartcardNumber,
          amount,
          provider,
          planId
        );

        if (payFlexResult.success) {
          await UserModel.updateWalletBalance(userId, -totalAmount);
          const rewardPoints = Math.floor(amount / 100);
          await UserModel.addRewardPoints(userId, rewardPoints);

          await TransactionModel.updateTransactionStatus(transaction.transactionId, 'completed', {
            externalTransactionId: payFlexResult.transactionId,
          });

          return res.status(200).json({
            success: true,
            message: 'Cable TV subscription paid successfully',
            transaction: {
              id: transaction.transactionId,
              amount,
              fee: 50,
              totalAmount,
              rewardPoints,
              status: 'completed',
            },
          });
        }
      } catch (payFlexError) {
        await TransactionModel.updateTransactionStatus(transaction.transactionId, 'failed', {
          failureReason: payFlexError.message,
        });

        return res.status(400).json({
          error: 'Payment processing failed',
          message: payFlexError.message,
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Buy Internet
   */
  static async buyInternet(req, res, next) {
    try {
      const { customerId, amount, provider, planId, pinHash } = req.body;
      const userId = req.user.uid;

      if (!customerId || !amount || !provider || !planId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const user = await UserModel.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const totalAmount = amount + 50;
      if (user.walletBalance < totalAmount) {
        return res.status(400).json({ error: 'Insufficient balance' });
      }

      if (user.transactionPin && pinHash) {
        const pinValid = await UserModel.verifyTransactionPin(userId, pinHash);
        if (!pinValid) {
          return res.status(403).json({ error: 'Invalid transaction PIN' });
        }
      }

      const transaction = await TransactionModel.createTransaction(userId, {
        type: 'internet',
        amount,
        fee: 50,
        provider,
        recipient: customerId,
        description: `Internet purchase - ${provider}`,
        paymentMethod: 'wallet',
        metadata: { customerId, provider, planId },
      });

      try {
        const payFlexResult = await payFlexService.buyInternet(customerId, amount, provider, planId);

        if (payFlexResult.success) {
          await UserModel.updateWalletBalance(userId, -totalAmount);
          const rewardPoints = Math.floor(amount / 100);
          await UserModel.addRewardPoints(userId, rewardPoints);

          await TransactionModel.updateTransactionStatus(transaction.transactionId, 'completed', {
            externalTransactionId: payFlexResult.transactionId,
          });

          return res.status(200).json({
            success: true,
            message: 'Internet purchased successfully',
            transaction: {
              id: transaction.transactionId,
              amount,
              fee: 50,
              totalAmount,
              rewardPoints,
              status: 'completed',
            },
          });
        }
      } catch (payFlexError) {
        await TransactionModel.updateTransactionStatus(transaction.transactionId, 'failed', {
          failureReason: payFlexError.message,
        });

        return res.status(400).json({
          error: 'Payment processing failed',
          message: payFlexError.message,
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Pay Education fees
   */
  static async payEducation(req, res, next) {
    try {
      const { studentId, amount, institution, pinHash } = req.body;
      const userId = req.user.uid;

      if (!studentId || !amount || !institution) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const user = await UserModel.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const totalAmount = amount + 100;
      if (user.walletBalance < totalAmount) {
        return res.status(400).json({ error: 'Insufficient balance' });
      }

      if (user.transactionPin && pinHash) {
        const pinValid = await UserModel.verifyTransactionPin(userId, pinHash);
        if (!pinValid) {
          return res.status(403).json({ error: 'Invalid transaction PIN' });
        }
      }

      const transaction = await TransactionModel.createTransaction(userId, {
        type: 'education',
        amount,
        fee: 100,
        provider: institution,
        recipient: studentId,
        description: `Education fee payment - ${institution}`,
        paymentMethod: 'wallet',
        metadata: { studentId, institution },
      });

      try {
        const payFlexResult = await payFlexService.payEducation(
          studentId,
          amount,
          institution,
          `edu_${transaction.transactionId}`
        );

        if (payFlexResult.success) {
          await UserModel.updateWalletBalance(userId, -totalAmount);
          const rewardPoints = Math.floor(amount / 200);
          await UserModel.addRewardPoints(userId, rewardPoints);

          await TransactionModel.updateTransactionStatus(transaction.transactionId, 'completed', {
            externalTransactionId: payFlexResult.transactionId,
          });

          return res.status(200).json({
            success: true,
            message: 'Education fee paid successfully',
            transaction: {
              id: transaction.transactionId,
              amount,
              fee: 100,
              totalAmount,
              rewardPoints,
              status: 'completed',
            },
          });
        }
      } catch (payFlexError) {
        await TransactionModel.updateTransactionStatus(transaction.transactionId, 'failed', {
          failureReason: payFlexError.message,
        });

        return res.status(400).json({
          error: 'Payment processing failed',
          message: payFlexError.message,
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Pay insurance premium
   */
  static async payInsurance(req, res, next) {
    try {
      const { policyNumber, amount, provider, pinHash } = req.body;
      const userId = req.user.uid;

      if (!policyNumber || !amount || !provider) {
        return res.status(400).json({
          error: 'Policy number, amount, and provider required',
        });
      }

      if (amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      const user = await UserModel.getUserById(userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const totalAmount = amount + 100; // 100 naira fee

      if (user.walletBalance < totalAmount) {
        return res.status(400).json({
          error: 'Insufficient wallet balance',
          required: totalAmount,
          available: user.walletBalance,
        });
      }

      if (user.transactionPin && pinHash) {
        const pinValid = await UserModel.verifyTransactionPin(userId, pinHash);
        if (!pinValid) {
          return res.status(403).json({ error: 'Invalid transaction PIN' });
        }
      }

      const transaction = await TransactionModel.createTransaction(userId, {
        type: 'insurance',
        amount,
        fee: 100,
        provider,
        recipient: policyNumber,
        description: `Insurance premium - ${provider}`,
        paymentMethod: 'wallet',
        metadata: { policyNumber, provider },
      });

      try {
        const payFlexResult = await payFlexService.payInsurance(
          policyNumber,
          amount,
          provider
        );

        if (payFlexResult.success) {
          await UserModel.updateWalletBalance(userId, -totalAmount);
          const rewardPoints = Math.floor(amount / 200);
          await UserModel.addRewardPoints(userId, rewardPoints);

          await TransactionModel.updateTransactionStatus(transaction.transactionId, 'completed', {
            externalTransactionId: payFlexResult.transactionId,
          });

          return res.status(200).json({
            success: true,
            message: 'Insurance premium paid successfully',
            transaction: {
              id: transaction.transactionId,
              amount,
              fee: 100,
              totalAmount,
              rewardPoints,
              status: 'completed',
            },
          });
        }
      } catch (payFlexError) {
        await TransactionModel.updateTransactionStatus(transaction.transactionId, 'failed', {
          failureReason: payFlexError.message,
        });

        return res.status(400).json({
          error: 'Payment processing failed',
          message: payFlexError.message,
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Buy gift card
   */
  static async buyGiftCard(req, res, next) {
    try {
      const { giftCardCode, amount, provider, pinHash } = req.body;
      const userId = req.user.uid;

      if (!giftCardCode || !amount || !provider) {
        return res.status(400).json({
          error: 'Gift card code, amount, and provider required',
        });
      }

      if (amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      const user = await UserModel.getUserById(userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const totalAmount = amount + 50; // 50 naira fee

      if (user.walletBalance < totalAmount) {
        return res.status(400).json({
          error: 'Insufficient wallet balance',
          required: totalAmount,
          available: user.walletBalance,
        });
      }

      if (user.transactionPin && pinHash) {
        const pinValid = await UserModel.verifyTransactionPin(userId, pinHash);
        if (!pinValid) {
          return res.status(403).json({ error: 'Invalid transaction PIN' });
        }
      }

      const transaction = await TransactionModel.createTransaction(userId, {
        type: 'giftcard',
        amount,
        fee: 50,
        provider,
        recipient: giftCardCode,
        description: `Gift card purchase - ${provider}`,
        paymentMethod: 'wallet',
        metadata: { giftCardCode, provider },
      });

      try {
        const payFlexResult = await payFlexService.buyGiftCard(
          giftCardCode,
          amount,
          provider
        );

        if (payFlexResult.success) {
          await UserModel.updateWalletBalance(userId, -totalAmount);
          const rewardPoints = Math.floor(amount / 100);
          await UserModel.addRewardPoints(userId, rewardPoints);

          await TransactionModel.updateTransactionStatus(transaction.transactionId, 'completed', {
            externalTransactionId: payFlexResult.transactionId,
          });

          return res.status(200).json({
            success: true,
            message: 'Gift card purchased successfully',
            transaction: {
              id: transaction.transactionId,
              amount,
              fee: 50,
              totalAmount,
              rewardPoints,
              status: 'completed',
            },
          });
        }
      } catch (payFlexError) {
        await TransactionModel.updateTransactionStatus(transaction.transactionId, 'failed', {
          failureReason: payFlexError.message,
        });

        return res.status(400).json({
          error: 'Payment processing failed',
          message: payFlexError.message,
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Pay tax
   */
  static async payTax(req, res, next) {
    try {
      const { taxType, taxId, amount, authority, pinHash } = req.body;
      const userId = req.user.uid;

      if (!taxType || !taxId || !amount || !authority) {
        return res.status(400).json({
          error: 'Tax type, tax ID, amount, and authority required',
        });
      }

      if (amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      const user = await UserModel.getUserById(userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const totalAmount = amount + 100; // 100 naira fee

      if (user.walletBalance < totalAmount) {
        return res.status(400).json({
          error: 'Insufficient wallet balance',
          required: totalAmount,
          available: user.walletBalance,
        });
      }

      if (user.transactionPin && pinHash) {
        const pinValid = await UserModel.verifyTransactionPin(userId, pinHash);
        if (!pinValid) {
          return res.status(403).json({ error: 'Invalid transaction PIN' });
        }
      }

      const transaction = await TransactionModel.createTransaction(userId, {
        type: 'tax',
        amount,
        fee: 100,
        provider: authority,
        recipient: taxId,
        description: `Tax payment - ${taxType}`,
        paymentMethod: 'wallet',
        metadata: { taxType, taxId, authority },
      });

      try {
        const payFlexResult = await payFlexService.payTax(taxType, taxId, amount, authority);

        if (payFlexResult.success) {
          await UserModel.updateWalletBalance(userId, -totalAmount);
          const rewardPoints = Math.floor(amount / 200);
          await UserModel.addRewardPoints(userId, rewardPoints);

          await TransactionModel.updateTransactionStatus(transaction.transactionId, 'completed', {
            externalTransactionId: payFlexResult.transactionId,
          });

          return res.status(200).json({
            success: true,
            message: 'Tax paid successfully',
            transaction: {
              id: transaction.transactionId,
              amount,
              fee: 100,
              totalAmount,
              rewardPoints,
              status: 'completed',
            },
          });
        }
      } catch (payFlexError) {
        await TransactionModel.updateTransactionStatus(transaction.transactionId, 'failed', {
          failureReason: payFlexError.message,
        });

        return res.status(400).json({
          error: 'Payment processing failed',
          message: payFlexError.message,
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user transaction history
   */
  static async getTransactionHistory(req, res, next) {
    try {
      const userId = req.user.uid;
      const { limit = 50, type } = req.query;

      let transactions;
      if (type) {
        transactions = await TransactionModel.getTransactionsByType(userId, type, parseInt(limit));
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
   * Get transaction stats
   */
  static async getTransactionStats(req, res, next) {
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
}

module.exports = PaymentController;
