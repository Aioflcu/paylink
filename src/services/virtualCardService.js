class VirtualCardService {
  static async createVirtualCard(userId, cardData = {}) {
    try {
      const { db } = require('../firebase');
      const { collection, addDoc, query, where, getDocs, Timestamp } = require('firebase/firestore');

      // Check if user already has an active virtual card
      const cardsRef = collection(db, 'users', userId, 'cards');
      const q = query(cardsRef, where('status', '==', 'active'));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        throw new Error('User already has an active virtual card');
      }

      // Generate card details
      const cardDetails = this.generateCardDetails();

      const newCard = {
        cardNumber: cardDetails.cardNumber,
        expiryMonth: cardDetails.expiryMonth,
        expiryYear: cardDetails.expiryYear,
        cvv: cardDetails.cvv,
        cardholderName: cardData.cardholderName || 'PAYLINK USER',
        balance: cardData.initialBalance || 0,
        currency: cardData.currency || 'NGN',
        status: 'active',
        limits: {
          daily: cardData.dailyLimit || 50000,
          monthly: cardData.monthlyLimit || 200000,
          perTransaction: cardData.perTransactionLimit || 10000
        },
        settings: {
          onlinePurchases: true,
          atmWithdrawals: cardData.allowATM || false,
          contactless: true,
          international: cardData.international || false
        },
        createdAt: Timestamp.now(),
        lastUsed: null
      };

      const cardDoc = await addDoc(cardsRef, newCard);

      // Create transaction record if funding from wallet
      if (cardData.initialBalance > 0) {
        await this.createTransaction(userId, {
          type: 'credit',
          category: 'virtual_card',
          amount: cardData.initialBalance,
          reference: `VC_FUND_${Date.now()}`,
          status: 'success',
          description: `Virtual card funding - ${cardDetails.cardNumber.slice(-4)}`
        });
      }

      return { id: cardDoc.id, ...newCard };
    } catch (error) {
      console.error('Error creating virtual card:', error);
      throw error;
    }
  }

  static async getUserCards(userId) {
    try {
      const { db } = require('../firebase');
      const { collection, query, where, getDocs, orderBy } = require('firebase/firestore');

      const cardsRef = collection(db, 'users', userId, 'cards');
      const q = query(cardsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting user cards:', error);
      return [];
    }
  }

  static async fundCard(userId, cardId, amount) {
    try {
      const { db } = require('../firebase');
      const { doc, updateDoc, increment } = require('firebase/firestore');

      const cardRef = doc(db, 'users', userId, 'cards', cardId);
      await updateDoc(cardRef, {
        balance: increment(amount),
        lastUsed: new Date()
      });

      // Create transaction record
      await this.createTransaction(userId, {
        type: 'credit',
        category: 'virtual_card',
        amount,
        reference: `VC_FUND_${Date.now()}`,
        status: 'success',
        description: `Virtual card funding`
      });

      return { success: true, amount };
    } catch (error) {
      console.error('Error funding virtual card:', error);
      throw error;
    }
  }

  static async makePurchase(userId, cardId, amount, merchant, category = 'online') {
    try {
      const { db } = require('../firebase');
      const { doc, getDoc, updateDoc, increment } = require('firebase/firestore');

      const cardRef = doc(db, 'users', userId, 'cards', cardId);
      const cardSnap = await getDoc(cardRef);

      if (!cardSnap.exists()) {
        throw new Error('Virtual card not found');
      }

      const card = cardSnap.data();

      if (card.status !== 'active') {
        throw new Error('Card is not active');
      }

      if (card.balance < amount) {
        throw new Error('Insufficient card balance');
      }

      // Check transaction limits
      await this.checkTransactionLimits(userId, cardId, amount);

      // Deduct from card balance
      await updateDoc(cardRef, {
        balance: increment(-amount),
        lastUsed: new Date()
      });

      // Create transaction record
      await this.createTransaction(userId, {
        type: 'debit',
        category: 'virtual_card',
        amount,
        reference: `VC_PURCHASE_${Date.now()}`,
        status: 'success',
        description: `Virtual card purchase at ${merchant}`,
        metadata: { merchant, cardLastFour: card.cardNumber.slice(-4) }
      });

      return { success: true, amount, merchant };
    } catch (error) {
      console.error('Error making virtual card purchase:', error);
      throw error;
    }
  }

  static async freezeCard(userId, cardId) {
    try {
      const { db } = require('../firebase');
      const { doc, getDoc, updateDoc } = require('firebase/firestore');

      const cardRef = doc(db, 'users', userId, 'cards', cardId);
      const cardSnap = await getDoc(cardRef);

      if (!cardSnap.exists()) {
        throw new Error('Virtual card not found');
      }

      const currentStatus = cardSnap.data().status;
      const newStatus = currentStatus === 'frozen' ? 'active' : 'frozen';

      await updateDoc(cardRef, { status: newStatus });

      return { success: true, status: newStatus };
    } catch (error) {
      console.error('Error freezing/unfreezing card:', error);
      throw error;
    }
  }

  static async updateCardLimits(userId, cardId, limits) {
    try {
      const { db } = require('../firebase');
      const { doc, getDoc, updateDoc } = require('firebase/firestore');

      const cardRef = doc(db, 'users', userId, 'cards', cardId);
      const cardSnap = await getDoc(cardRef);

      if (!cardSnap.exists()) {
        throw new Error('Virtual card not found');
      }

      const currentLimits = cardSnap.data().limits;
      await updateDoc(cardRef, {
        limits: { ...currentLimits, ...limits }
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating card limits:', error);
      throw error;
    }
  }

  static async updateCardSettings(userId, cardId, settings) {
    try {
      const { db } = require('../firebase');
      const { doc, getDoc, updateDoc } = require('firebase/firestore');

      const cardRef = doc(db, 'users', userId, 'cards', cardId);
      const cardSnap = await getDoc(cardRef);

      if (!cardSnap.exists()) {
        throw new Error('Virtual card not found');
      }

      const currentSettings = cardSnap.data().settings;
      await updateDoc(cardRef, {
        settings: { ...currentSettings, ...settings }
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating card settings:', error);
      throw error;
    }
  }

  static async getCardTransactions(userId, cardId, limit = 20) {
    try {
      const { db } = require('../firebase');
      const { collection, query, where, getDocs, orderBy, limit: limitFn } = require('firebase/firestore');

      const txRef = collection(db, 'users', userId, 'transactions');
      const q = query(
        txRef,
        where('category', '==', 'virtual_card'),
        orderBy('createdAt', 'desc'),
        limitFn(limit)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting card transactions:', error);
      return [];
    }
  }

  static async deleteCard(userId, cardId) {
    try {
      const { db } = require('../firebase');
      const { doc, getDoc, updateDoc } = require('firebase/firestore');

      const cardRef = doc(db, 'users', userId, 'cards', cardId);
      const cardSnap = await getDoc(cardRef);

      if (!cardSnap.exists()) {
        throw new Error('Virtual card not found');
      }

      const card = cardSnap.data();
      if (card.balance > 0) {
        throw new Error('Cannot delete card with remaining balance. Please withdraw funds first.');
      }

      await updateDoc(cardRef, { status: 'deleted' });
      return { success: true };
    } catch (error) {
      console.error('Error deleting card:', error);
      throw error;
    }
  }

  static async checkTransactionLimits(userId, cardId, amount) {
    try {
      const { db } = require('../firebase');
      const { doc, getDoc, collection, query, where, getDocs } = require('firebase/firestore');

      // Get card limits
      const cardRef = doc(db, 'users', userId, 'cards', cardId);
      const cardSnap = await getDoc(cardRef);
      const card = cardSnap.data();

      // Check per transaction limit
      if (amount > card.limits.perTransaction) {
        throw new Error(`Transaction amount exceeds per-transaction limit of ₦${card.limits.perTransaction.toLocaleString()}`);
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Get today's transactions
      const txRef = collection(db, 'users', userId, 'transactions');
      const todayQ = query(
        txRef,
        where('category', '==', 'virtual_card'),
        where('type', '==', 'debit'),
        where('createdAt', '>=', today)
      );

      const todaySnap = await getDocs(todayQ);
      const todayTotal = todaySnap.docs.reduce((sum, doc) => sum + doc.data().amount, 0);

      if (todayTotal + amount > card.limits.daily) {
        throw new Error(`Transaction would exceed daily limit of ₦${card.limits.daily.toLocaleString()}`);
      }

      return true;
    } catch (error) {
      if (error.message.includes('Transaction')) {
        throw error;
      }
      console.error('Error checking limits:', error);
      return true;
    }
  }

  static generateCardDetails() {
    const cardNumber = this.generateCardNumber();
    const expiryMonth = Math.floor(Math.random() * 12) + 1;
    const expiryYear = new Date().getFullYear() + 3;
    const cvv = Math.floor(Math.random() * 900) + 100;

    return {
      cardNumber,
      expiryMonth: expiryMonth.toString().padStart(2, '0'),
      expiryYear: expiryYear.toString().slice(-2),
      cvv: cvv.toString()
    };
  }

  static generateCardNumber() {
    const prefix = '4'; // Visa-like
    let number = prefix;

    for (let i = 0; i < 15; i++) {
      number += Math.floor(Math.random() * 10);
    }

    return number;
  }

  static async getCardStats(userId) {
    try {
      const { db } = require('../firebase');
      const { collection, query, where, getDocs, orderBy, limit: limitFn } = require('firebase/firestore');

      const cardsRef = collection(db, 'users', userId, 'cards');
      const activeQ = query(cardsRef, where('status', '==', 'active'));
      const cardsSnap = await getDocs(activeQ);

      const txRef = collection(db, 'users', userId, 'transactions');
      const txQ = query(
        txRef,
        where('category', '==', 'virtual_card'),
        orderBy('createdAt', 'desc'),
        limitFn(10)
      );
      const txSnap = await getDocs(txQ);

      const transactions = txSnap.docs.map(doc => doc.data());
      const totalSpent = transactions
        .filter(t => t.type === 'debit')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalFunded = transactions
        .filter(t => t.type === 'credit')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalBalance = cardsSnap.docs.reduce((sum, doc) => sum + doc.data().balance, 0);

      return {
        activeCards: cardsSnap.size,
        totalBalance,
        totalSpent,
        totalFunded,
        recentTransactions: transactions
      };
    } catch (error) {
      console.error('Error getting card stats:', error);
      return {
        activeCards: 0,
        totalBalance: 0,
        totalSpent: 0,
        totalFunded: 0,
        recentTransactions: []
      };
    }
  }

  static async withdrawFromCard(userId, cardId, amount) {
    try {
      const { db } = require('../firebase');
      const { doc, getDoc, updateDoc, increment } = require('firebase/firestore');

      const cardRef = doc(db, 'users', userId, 'cards', cardId);
      const cardSnap = await getDoc(cardRef);

      if (!cardSnap.exists()) {
        throw new Error('Virtual card not found');
      }

      const card = cardSnap.data();
      if (card.balance < amount) {
        throw new Error('Insufficient card balance');
      }

      // Deduct from card
      await updateDoc(cardRef, {
        balance: increment(-amount)
      });

      // Create withdrawal transaction
      await this.createTransaction(userId, {
        type: 'transfer',
        category: 'virtual_card',
        amount,
        reference: `VC_WITHDRAW_${Date.now()}`,
        status: 'success',
        description: 'Funds withdrawn from virtual card'
      });

      return { success: true, amount };
    } catch (error) {
      console.error('Error withdrawing from card:', error);
      throw error;
    }
  }

  static async createTransaction(userId, txData) {
    try {
      const { db } = require('../firebase');
      const { collection, addDoc, Timestamp } = require('firebase/firestore');

      const txRef = collection(db, 'users', userId, 'transactions');
      await addDoc(txRef, {
        ...txData,
        createdAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error creating transaction:', error);
    }
  }
}

export default VirtualCardService;
