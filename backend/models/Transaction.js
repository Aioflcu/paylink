/**
 * Transaction Model
 * Tracks all payment transactions, deposits, withdrawals, and refunds
 */

const admin = require('firebase-admin');

class TransactionModel {
  constructor() {
    this.db = admin.firestore();
    this.transactionsCollection = 'transactions';
  }

  /**
   * Create a new transaction
   */
  async createTransaction(userId, transactionData) {
    try {
      const transactionRef = this.db.collection(this.transactionsCollection).doc();

      const payload = {
        userId,
        transactionId: transactionRef.id,
        type: transactionData.type, // 'airtime', 'data', 'electricity', 'cable', 'internet', 'education', 'deposit', 'withdraw', 'insurance', 'giftcard', 'tax'
        status: transactionData.status || 'pending', // pending, completed, failed, refunded
        amount: transactionData.amount,
        fee: transactionData.fee || 0,
        totalAmount: (transactionData.amount || 0) + (transactionData.fee || 0),
        provider: transactionData.provider || null,
        recipient: transactionData.recipient || null, // phone number, account, etc
        description: transactionData.description || '',
        paymentMethod: transactionData.paymentMethod || 'wallet', // wallet, card, bank, etc
        externalTransactionId: transactionData.externalTransactionId || null, // reference from PayFlex/Monnify
        metadata: transactionData.metadata || {}, // Extra data like plan details
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        completedAt: null,
        failureReason: null,
      };

      await transactionRef.set(payload);

      return { success: true, transactionId: transactionRef.id, data: payload };
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(transactionId, status, additionalData = {}) {
    try {
      const updateData = {
        status,
        ...additionalData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (status === 'completed') {
        updateData.completedAt = admin.firestore.FieldValue.serverTimestamp();
      }

      await this.db.collection(this.transactionsCollection).doc(transactionId).update(updateData);

      return { success: true };
    } catch (error) {
      console.error('Error updating transaction status:', error);
      throw error;
    }
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(transactionId) {
    try {
      const doc = await this.db.collection(this.transactionsCollection).doc(transactionId).get();

      if (!doc.exists) {
        return null;
      }

      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error getting transaction:', error);
      throw error;
    }
  }

  /**
   * Get all transactions for a user
   */
  async getUserTransactions(userId, limit = 100, startAfter = null) {
    try {
      let query = this.db
        .collection(this.transactionsCollection)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(limit);

      if (startAfter) {
        query = query.startAfter(startAfter);
      }

      const snapshot = await query.get();
      const transactions = [];

      snapshot.forEach((doc) => {
        transactions.push({ id: doc.id, ...doc.data() });
      });

      return transactions;
    } catch (error) {
      console.error('Error getting user transactions:', error);
      throw error;
    }
  }

  /**
   * Get transactions by type
   */
  async getTransactionsByType(userId, type, limit = 50) {
    try {
      const snapshot = await this.db
        .collection(this.transactionsCollection)
        .where('userId', '==', userId)
        .where('type', '==', type)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      const transactions = [];
      snapshot.forEach((doc) => {
        transactions.push({ id: doc.id, ...doc.data() });
      });

      return transactions;
    } catch (error) {
      console.error('Error getting transactions by type:', error);
      throw error;
    }
  }

  /**
   * Get transaction by external ID (from PayFlex/Monnify)
   */
  async getTransactionByExternalId(externalId) {
    try {
      const snapshot = await this.db
        .collection(this.transactionsCollection)
        .where('externalTransactionId', '==', externalId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error getting transaction by external ID:', error);
      throw error;
    }
  }

  /**
   * Get transaction stats for a user
   */
  async getUserTransactionStats(userId) {
    try {
      const snapshot = await this.db
        .collection(this.transactionsCollection)
        .where('userId', '==', userId)
        .where('status', '==', 'completed')
        .get();

      let totalAmount = 0;
      let totalFees = 0;
      const typeBreakdown = {};

      snapshot.forEach((doc) => {
        const data = doc.data();
        totalAmount += data.amount || 0;
        totalFees += data.fee || 0;

        const type = data.type;
        if (!typeBreakdown[type]) {
          typeBreakdown[type] = { count: 0, amount: 0 };
        }
        typeBreakdown[type].count += 1;
        typeBreakdown[type].amount += data.amount || 0;
      });

      return {
        totalTransactions: snapshot.size,
        totalAmount,
        totalFees,
        typeBreakdown,
      };
    } catch (error) {
      console.error('Error getting transaction stats:', error);
      throw error;
    }
  }
}

module.exports = new TransactionModel();
