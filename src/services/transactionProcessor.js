/**
 * Transaction Processor Service
 * Handles real payment processing via PayFlex & Monnify APIs
 */

import { db } from '../firebase';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  Timestamp, 
  increment, 
  query, 
  where, 
  orderBy, 
  limit as limitFn,
  getDocs
} from 'firebase/firestore';

class TransactionProcessor {
  static PAYFLEX_API = process.env.REACT_APP_PAYFLEX_API_URL || 'https://api.payflex.co';
  static PAYFLEX_KEY = process.env.REACT_APP_PAYFLEX_API_KEY;
  
  static MONNIFY_API = process.env.REACT_APP_MONNIFY_API_URL || 'https://api.monnify.com';
  static MONNIFY_KEY = process.env.REACT_APP_MONNIFY_API_KEY;
  static MONNIFY_SECRET = process.env.REACT_APP_MONNIFY_SECRET_KEY;

  /**
   * Process Airtime Purchase
   * Calls actual PayFlex API to purchase airtime
   */
  static async processAirtimePurchase(userId, purchaseData) {
    try {
      const { provider, phoneNumber, amount } = purchaseData;

      // Step 1: Validate user wallet balance
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      const walletBalance = userSnap.data()?.walletBalance || 0;

      if (walletBalance < amount) {
        throw new Error(`Insufficient wallet balance. Available: ₦${walletBalance}, Required: ₦${amount}`);
      }

      // Step 2: Call PayFlex API to buy airtime
      const payFlexResponse = await fetch(`${this.PAYFLEX_API}/topup/airtime`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.PAYFLEX_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: phoneNumber,
          provider: provider,
          amount: amount
        })
      });

      if (!payFlexResponse.ok) {
        const errorData = await payFlexResponse.json();
        throw new Error(errorData.message || 'PayFlex API failed');
      }

      const payFlexData = await payFlexResponse.json();

      // Step 3: Deduct from wallet
      await updateDoc(userRef, {
        walletBalance: increment(-amount)
      });

      // Step 4: Save transaction to Firestore
      const txRef = collection(db, 'users', userId, 'transactions');
      const transaction = await addDoc(txRef, {
        type: 'airtime',
        provider,
        phoneNumber,
        amount,
        status: 'success',
        payFlexRef: payFlexData.data?.reference || 'N/A',
        description: `Airtime purchase - ${provider.toUpperCase()} - ₦${amount}`,
        walletBefore: walletBalance,
        walletAfter: walletBalance - amount,
        createdAt: Timestamp.now()
      });

      // Step 5: Award reward points
      const pointsEarned = Math.floor(amount / 100); // 1 point per ₦100
      await updateDoc(userRef, {
        rewardPoints: increment(pointsEarned)
      });

      // Step 6: Log reward transaction
      const rewardRef = collection(db, 'users', userId, 'rewardTransactions');
      await addDoc(rewardRef, {
        type: 'earned',
        points: pointsEarned,
        reason: 'airtime purchase',
        transactionId: transaction.id,
        amount,
        createdAt: Timestamp.now()
      });

      return {
        success: true,
        transactionId: transaction.id,
        reference: payFlexData.data?.reference,
        amount,
        pointsEarned,
        message: `Airtime purchase successful. ₦${amount} sent to ${phoneNumber}`
      };
    } catch (error) {
      console.error('Error processing airtime purchase:', error);
      throw error;
    }
  }

  /**
   * Process Data Purchase
   * Calls actual PayFlex API to purchase data bundle
   */
  static async processDataPurchase(userId, purchaseData) {
    try {
      const { provider, phoneNumber, planId, amount } = purchaseData;

      // Step 1: Validate wallet balance
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      const walletBalance = userSnap.data()?.walletBalance || 0;

      if (walletBalance < amount) {
        throw new Error(`Insufficient balance. Available: ₦${walletBalance}, Required: ₦${amount}`);
      }

      // Step 2: Call PayFlex API
      const payFlexResponse = await fetch(`${this.PAYFLEX_API}/data/buy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.PAYFLEX_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: phoneNumber,
          provider: provider,
          plan_id: planId,
          amount: amount
        })
      });

      if (!payFlexResponse.ok) {
        const errorData = await payFlexResponse.json();
        throw new Error(errorData.message || 'Data purchase failed');
      }

      const payFlexData = await payFlexResponse.json();

      // Step 3: Deduct from wallet
      await updateDoc(userRef, {
        walletBalance: increment(-amount)
      });

      // Step 4: Save transaction
      const txRef = collection(db, 'users', userId, 'transactions');
      const transaction = await addDoc(txRef, {
        type: 'data',
        provider,
        phoneNumber,
        planId,
        amount,
        status: 'success',
        payFlexRef: payFlexData.data?.reference || 'N/A',
        description: `Data purchase - ${provider.toUpperCase()} - ₦${amount}`,
        walletBefore: walletBalance,
        walletAfter: walletBalance - amount,
        createdAt: Timestamp.now()
      });

      // Step 5: Award points (1 point per ₦200 for data)
      const pointsEarned = Math.floor(amount / 200);
      await updateDoc(userRef, {
        rewardPoints: increment(pointsEarned)
      });

      return {
        success: true,
        transactionId: transaction.id,
        reference: payFlexData.data?.reference,
        amount,
        pointsEarned,
        message: `Data purchase successful. Bundle sent to ${phoneNumber}`
      };
    } catch (error) {
      console.error('Error processing data purchase:', error);
      throw error;
    }
  }

  /**
   * Process Electricity Bill Payment
   */
  static async processElectricityPayment(userId, purchaseData) {
    try {
      const { provider, meterNumber, meterType, amount } = purchaseData;

      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      const walletBalance = userSnap.data()?.walletBalance || 0;

      if (walletBalance < amount) {
        throw new Error(`Insufficient balance`);
      }

      // Call PayFlex API
      const payFlexResponse = await fetch(`${this.PAYFLEX_API}/bill/electricity`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.PAYFLEX_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          disco: provider,
          meter_number: meterNumber,
          meter_type: meterType,
          amount: amount
        })
      });

      if (!payFlexResponse.ok) {
        throw new Error('Electricity payment failed');
      }

      const payFlexData = await payFlexResponse.json();

      // Deduct from wallet
      await updateDoc(userRef, {
        walletBalance: increment(-amount)
      });

      // Save transaction
      const txRef = collection(db, 'users', userId, 'transactions');
      const transaction = await addDoc(txRef, {
        type: 'electricity',
        provider,
        meterNumber,
        amount,
        status: 'success',
        payFlexRef: payFlexData.data?.reference || 'N/A',
        description: `Electricity bill - ${provider} - ₦${amount}`,
        walletBefore: walletBalance,
        walletAfter: walletBalance - amount,
        createdAt: Timestamp.now()
      });

      // Award points (2 points per ₦500)
      const pointsEarned = Math.floor(amount / 500) * 2;
      await updateDoc(userRef, {
        rewardPoints: increment(pointsEarned)
      });

      return {
        success: true,
        transactionId: transaction.id,
        reference: payFlexData.data?.reference,
        amount,
        pointsEarned,
        message: `Electricity payment successful`
      };
    } catch (error) {
      console.error('Error processing electricity payment:', error);
      throw error;
    }
  }

  /**
   * Process Cable TV Subscription
   */
  static async processCableSubscription(userId, purchaseData) {
    try {
      const { provider, smartCard, planId, amount } = purchaseData;

      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      const walletBalance = userSnap.data()?.walletBalance || 0;

      if (walletBalance < amount) {
        throw new Error(`Insufficient balance`);
      }

      // Call PayFlex API
      const payFlexResponse = await fetch(`${this.PAYFLEX_API}/bill/cable`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.PAYFLEX_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider: provider,
          smartcard_number: smartCard,
          plan_id: planId,
          amount: amount
        })
      });

      if (!payFlexResponse.ok) {
        throw new Error('Cable subscription failed');
      }

      const payFlexData = await payFlexResponse.json();

      // Deduct from wallet
      await updateDoc(userRef, {
        walletBalance: increment(-amount)
      });

      // Save transaction
      const txRef = collection(db, 'users', userId, 'transactions');
      const transaction = await addDoc(txRef, {
        type: 'cable_tv',
        provider,
        smartCard,
        planId,
        amount,
        status: 'success',
        payFlexRef: payFlexData.data?.reference || 'N/A',
        description: `Cable subscription - ${provider} - ₦${amount}`,
        walletBefore: walletBalance,
        walletAfter: walletBalance - amount,
        createdAt: Timestamp.now()
      });

      // Award points (1.5 points per ₦1000)
      const pointsEarned = Math.floor(amount / 1000) * 1.5;
      await updateDoc(userRef, {
        rewardPoints: increment(pointsEarned)
      });

      return {
        success: true,
        transactionId: transaction.id,
        reference: payFlexData.data?.reference,
        amount,
        pointsEarned: Math.floor(pointsEarned),
        message: `Cable subscription successful`
      };
    } catch (error) {
      console.error('Error processing cable subscription:', error);
      throw error;
    }
  }

  /**
   * Fund Wallet via Monnify
   * User transfers money into wallet from their bank account
   */
  static async fundWallet(userId, amount) {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();

      // Generate unique reference
      const reference = `WALLET_FUND_${userId}_${Date.now()}`;

      // Call Monnify API to create payment request
      const monnifyResponse = await fetch(`${this.MONNIFY_API}/api/v1/transactions/init`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.MONNIFY_KEY}:${this.MONNIFY_SECRET}`).toString('base64')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: amount,
          customerName: userData.displayName || 'User',
          customerEmail: userData.email,
          paymentReference: reference,
          paymentDescription: 'Wallet Funding',
          currencyCode: 'NGN',
          redirectUrl: `${window.location.origin}/wallet/success`,
          incomeSplitConfig: null
        })
      });

      if (!monnifyResponse.ok) {
        throw new Error('Monnify payment initialization failed');
      }

      const monnifyData = await monnifyResponse.json();

      // Save wallet funding transaction
      const txRef = collection(db, 'users', userId, 'transactions');
      await addDoc(txRef, {
        type: 'wallet_funding',
        amount,
        status: 'pending',
        monnifyRef: reference,
        description: `Wallet funding - ₦${amount}`,
        createdAt: Timestamp.now()
      });

      return {
        success: true,
        paymentLink: monnifyData.data.redirectUrl,
        reference: reference,
        message: 'Redirecting to payment gateway'
      };
    } catch (error) {
      console.error('Error funding wallet:', error);
      throw error;
    }
  }

  /**
   * Confirm Monnify Payment Webhook
   * Called when Monnify sends payment confirmation
   */
  static async confirmMonnifyPayment(reference, amount, userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      const currentBalance = userSnap.data()?.walletBalance || 0;

      // Update wallet balance
      await updateDoc(userRef, {
        walletBalance: currentBalance + amount
      });

      // Update transaction status
      const txRef = collection(db, 'users', userId, 'transactions');
      const snapshot = await getDocs(
        query(txRef, where('monnifyRef', '==', reference))
      );

      if (!snapshot.empty) {
        await updateDoc(snapshot.docs[0].ref, {
          status: 'success',
          confirmedAt: Timestamp.now()
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error confirming payment:', error);
      throw error;
    }
  }

  /**
   * Get transaction history
   */
  static async getTransactionHistory(userId, limit = 20) {
    try {
      const txRef = collection(db, 'users', userId, 'transactions');
      const q = query(txRef, orderBy('createdAt', 'desc'), limitFn(limit));
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting transaction history:', error);
      return [];
    }
  }
}

export default TransactionProcessor;
