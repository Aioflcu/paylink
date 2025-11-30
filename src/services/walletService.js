import { db } from '../firebase';
import { doc, getDoc, updateDoc, collection, addDoc, Timestamp } from 'firebase/firestore';

const walletService = {
  /**
   * Get current wallet balance for a user
   * @param {string} userId - User ID from Firebase Auth
   * @returns {Promise<number>} Current wallet balance
   */
  async getBalance(userId) {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        return userDoc.data().walletBalance || 0;
      }
      return 0;
    } catch (error) {
      console.error('Error getting balance:', error);
      throw error;
    }
  },

  /**
   * Update wallet balance with transaction record
   * @param {string} userId - User ID
   * @param {number} amount - Amount to add/subtract
   * @param {string} type - 'credit' or 'debit'
   * @param {string} category - Transaction category
   * @param {string} description - Transaction description
   * @returns {Promise<number>} New balance
   */
  async updateBalance(userId, amount, type, category = 'Wallet', description = '') {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const currentBalance = userDoc.data().walletBalance || 0;
      const newBalance = type === 'credit' ? currentBalance + amount : currentBalance - amount;

      // Prevent negative balance
      if (newBalance < 0) {
        throw new Error('Insufficient balance');
      }

      // Update user wallet balance
      await updateDoc(userRef, { walletBalance: newBalance });

      // Record transaction
      await addDoc(collection(db, 'transactions'), {
        userId,
        type,
        amount,
        category,
        description,
        status: 'success',
        timestamp: Timestamp.now(),
      });

      return newBalance;
    } catch (error) {
      console.error('Error updating balance:', error);
      throw error;
    }
  },

  /**
   * Process wallet deposit via Paystack
   * @param {string} userId - User ID
   * @param {number} amount - Deposit amount in NGN
   * @param {string} reference - Paystack transaction reference
   * @returns {Promise<object>} Success status and new balance
   */
  async deposit(userId, amount, reference) {
    try {
      const newBalance = await this.updateBalance(
        userId,
        amount,
        'credit',
        'Wallet Deposit',
        `Paystack deposit - Reference: ${reference}`
      );
      return { success: true, newBalance, reference };
    } catch (error) {
      console.error('Deposit error:', error);
      throw error;
    }
  },

  /**
   * Process wallet withdrawal to bank account
   * @param {string} userId - User ID
   * @param {number} amount - Withdrawal amount in NGN
   * @param {object} bankDetails - Bank account details
   * @returns {Promise<object>} Success status and new balance
   */
  async withdraw(userId, amount, bankDetails) {
    try {
      const currentBalance = await this.getBalance(userId);
      
      if (currentBalance < amount) {
        throw new Error('Insufficient balance');
      }

      const userRef = doc(db, 'users', userId);
      const newBalance = currentBalance - amount;

      // Update user wallet balance
      await updateDoc(userRef, { walletBalance: newBalance });

      // Record withdrawal transaction
      await addDoc(collection(db, 'transactions'), {
        userId,
        type: 'debit',
        amount,
        category: 'Bank Withdrawal',
        bankName: bankDetails.bankName,
        accountNumber: bankDetails.accountNumber,
        accountName: bankDetails.accountName,
        status: 'pending', // Withdrawal needs manual processing
        timestamp: Timestamp.now(),
        description: `Withdrawal to ${bankDetails.bankName} - ${bankDetails.accountNumber}`
      });

      return { success: true, newBalance, message: 'Withdrawal initiated. Processing within 24 hours.' };
    } catch (error) {
      console.error('Withdrawal error:', error);
      throw error;
    }
  },

  /**
   * Get transaction history for a user
   * @param {string} userId - User ID
   * @param {number} limit - Number of recent transactions to fetch
   * @returns {Promise<array>} Array of transaction objects
   */
  async getTransactionHistory(userId, limit = 10) {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      return userDoc.data().transactions || [];
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      throw error;
    }
  }
};

export default walletService;
