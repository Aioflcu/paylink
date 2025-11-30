/**
 * rewardPointsService.js
 * Reward Points System
 * Manages points earning, redemption, and tracking
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Points earning rates per transaction
 * Category: points per ₦amount
 */
const POINTS_RATES = {
  airtime: 1,        // 1 point per ₦100
  data: 1,           // 1 point per ₦200
  electricity: 2,    // 2 points per ₦500
  cable: 1,          // 1 point per ₦200
  internet: 1,       // 1 point per ₦200
  education: 2,      // 2 points per ₦500
  tax: 1             // 1 point per ₦200
};

/**
 * Points redemption rewards
 * Points required vs reward value
 */
const REDEMPTION_OPTIONS = [
  {
    id: 'discount_5',
    type: 'discount',
    points: 100,
    value: 500,
    label: '₦500 Discount',
    description: 'Get ₦500 off your next purchase',
    redemptionCount: 0
  },
  {
    id: 'airtime_1k',
    type: 'airtime',
    points: 150,
    value: 1000,
    label: 'Free ₦1,000 Airtime',
    description: 'Redeem 150 points for free airtime',
    redemptionCount: 0
  },
  {
    id: 'discount_10',
    type: 'discount',
    points: 200,
    value: 1000,
    label: '₦1,000 Discount',
    description: 'Get ₦1,000 off your next purchase',
    redemptionCount: 0
  },
  {
    id: 'data_5gb',
    type: 'data',
    points: 200,
    value: 2500,
    label: 'Free 5GB Data Bundle',
    description: 'Redeem 200 points for 5GB data',
    redemptionCount: 0
  },
  {
    id: 'cashback_2',
    type: 'cashback',
    points: 250,
    value: 2000,
    label: '₦2,000 Cashback',
    description: 'Get ₦2,000 cash back to your wallet',
    redemptionCount: 0
  },
  {
    id: 'discount_20',
    type: 'discount',
    points: 300,
    value: 2000,
    label: '₦2,000 Discount',
    description: 'Get ₦2,000 off your next purchase',
    redemptionCount: 0
  },
  {
    id: 'airtime_5k',
    type: 'airtime',
    points: 400,
    value: 5000,
    label: 'Free ₦5,000 Airtime',
    description: 'Redeem 400 points for free airtime',
    redemptionCount: 0
  },
  {
    id: 'cashback_5',
    type: 'cashback',
    points: 500,
    value: 5000,
    label: '₦5,000 Cashback',
    description: 'Get ₦5,000 cash back to your wallet',
    redemptionCount: 0
  }
];

/**
 * Calculate points earned from transaction
 */
const calculatePointsEarned = (transactionType, amount) => {
  const rate = POINTS_RATES[transactionType?.toLowerCase()] || 0;
  
  // Different earning rates per category
  const divisor = {
    airtime: 100,
    data: 200,
    electricity: 500,
    cable: 200,
    internet: 200,
    education: 500,
    tax: 200
  }[transactionType?.toLowerCase()] || 100;

  return Math.floor((amount / divisor) * rate);
};

/**
 * Get or create user points account
 */
export const initializeUserPoints = async (userId) => {
  try {
    const pointsRef = doc(db, 'users', userId, 'loyalty', 'points');
    const pointsSnap = await getDoc(pointsRef);

    if (!pointsSnap.exists()) {
      await setDoc(pointsRef, {
        totalPoints: 0,
        availablePoints: 0,
        redeemedPoints: 0,
        tier: 'bronze', // bronze, silver, gold, platinum
        totalEarnings: 0,
        totalRedemptions: 0,
        createdAt: Timestamp.now(),
        lastUpdated: Timestamp.now(),
        joinDate: Timestamp.now()
      });
    }

    return pointsSnap.data();
  } catch (error) {
    console.error('Error initializing user points:', error);
    throw error;
  }
};

/**
 * Add points after successful transaction
 */
export const addTransactionPoints = async (userId, transaction) => {
  try {
    if (!transaction || !transaction.status || transaction.status !== 'success') {
      return;
    }

    const pointsEarned = calculatePointsEarned(transaction.type, transaction.amount);

    if (pointsEarned === 0) {
      return;
    }

    const pointsRef = doc(db, 'users', userId, 'loyalty', 'points');
    const pointsSnap = await getDoc(pointsRef);

    if (!pointsSnap.exists()) {
      await initializeUserPoints(userId);
    }

    // Add to points history
    const historyRef = collection(db, 'users', userId, 'loyalty', 'points', 'history');
    await updateDoc(pointsRef, {
      totalPoints: (pointsSnap.data()?.totalPoints || 0) + pointsEarned,
      availablePoints: (pointsSnap.data()?.availablePoints || 0) + pointsEarned,
      totalEarnings: (pointsSnap.data()?.totalEarnings || 0) + pointsEarned,
      lastUpdated: Timestamp.now()
    });

    // Create history entry
    await setDoc(doc(historyRef), {
      type: 'earn',
      points: pointsEarned,
      source: transaction.type,
      transactionAmount: transaction.amount,
      transactionId: transaction.id,
      timestamp: Timestamp.now(),
      balanceBefore: pointsSnap.data()?.availablePoints || 0,
      balanceAfter: (pointsSnap.data()?.availablePoints || 0) + pointsEarned
    });

    // Update tier based on total points
    await updateUserTier(userId, pointsSnap.data()?.totalPoints || 0 + pointsEarned);

    return pointsEarned;
  } catch (error) {
    console.error('Error adding transaction points:', error);
    throw error;
  }
};

/**
 * Update user tier based on total points
 */
const updateUserTier = async (userId, totalPoints) => {
  try {
    let tier = 'bronze';
    
    if (totalPoints >= 5000) tier = 'platinum';
    else if (totalPoints >= 2000) tier = 'gold';
    else if (totalPoints >= 500) tier = 'silver';

    const pointsRef = doc(db, 'users', userId, 'loyalty', 'points');
    await updateDoc(pointsRef, { tier });
  } catch (error) {
    console.error('Error updating user tier:', error);
  }
};

/**
 * Get user's points balance
 */
export const getUserPoints = async (userId) => {
  try {
    const pointsRef = doc(db, 'users', userId, 'loyalty', 'points');
    const pointsSnap = await getDoc(pointsRef);

    if (!pointsSnap.exists()) {
      return await initializeUserPoints(userId);
    }

    return pointsSnap.data();
  } catch (error) {
    console.error('Error getting user points:', error);
    throw error;
  }
};

/**
 * Redeem points for reward
 */
export const redeemPoints = async (userId, rewardId, rewardPoints, rewardValue) => {
  try {
    const pointsRef = doc(db, 'users', userId, 'loyalty', 'points');
    const pointsSnap = await getDoc(pointsRef);

    if (!pointsSnap.exists()) {
      throw new Error('User points account not found');
    }

    const currentPoints = pointsSnap.data()?.availablePoints || 0;

    if (currentPoints < rewardPoints) {
      throw new Error(`Insufficient points. You have ${currentPoints} points but need ${rewardPoints}`);
    }

    // Create redemption entry
    const redemptionRef = collection(db, 'users', userId, 'loyalty', 'points', 'redemptions');
    const redemptionId = doc(redemptionRef).id;

    // Add redemption record
    await setDoc(doc(redemptionRef, redemptionId), {
      id: redemptionId,
      rewardId,
      pointsUsed: rewardPoints,
      rewardValue,
      status: 'completed',
      redemptionDate: Timestamp.now(),
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days expiry
      claimedAt: null
    });

    // Update points balance
    await updateDoc(pointsRef, {
      availablePoints: currentPoints - rewardPoints,
      redeemedPoints: (pointsSnap.data()?.redeemedPoints || 0) + rewardPoints,
      totalRedemptions: (pointsSnap.data()?.totalRedemptions || 0) + 1,
      lastUpdated: Timestamp.now()
    });

    // Add to history
    const historyRef = collection(db, 'users', userId, 'loyalty', 'points', 'history');
    await setDoc(doc(historyRef), {
      type: 'redeem',
      points: rewardPoints,
      reward: rewardId,
      rewardValue,
      timestamp: Timestamp.now(),
      balanceBefore: currentPoints,
      balanceAfter: currentPoints - rewardPoints,
      redemptionId
    });

    return {
      success: true,
      redemptionId,
      message: `Successfully redeemed ${rewardPoints} points!`,
      remainingPoints: currentPoints - rewardPoints
    };
  } catch (error) {
    console.error('Error redeeming points:', error);
    throw error;
  }
};

/**
 * Get redemption history
 */
export const getRedemptionHistory = async (userId, limit = 50) => {
  try {
    const redemptionRef = collection(db, 'users', userId, 'loyalty', 'points', 'redemptions');
    const q = query(redemptionRef, orderBy('redemptionDate', 'desc'));

    const snapshot = await getDocs(q);
    const redemptions = [];

    snapshot.forEach((doc) => {
      redemptions.push({
        id: doc.id,
        ...doc.data(),
        redemptionDate: doc.data().redemptionDate?.toDate?.() || new Date(doc.data().redemptionDate)
      });
    });

    return redemptions.slice(0, limit);
  } catch (error) {
    console.error('Error getting redemption history:', error);
    return [];
  }
};

/**
 * Get points earning history
 */
export const getPointsHistory = async (userId, limit = 100) => {
  try {
    const historyRef = collection(db, 'users', userId, 'loyalty', 'points', 'history');
    const q = query(historyRef, orderBy('timestamp', 'desc'));

    const snapshot = await getDocs(q);
    const history = [];

    snapshot.forEach((doc) => {
      history.push({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.() || new Date(doc.data().timestamp)
      });
    });

    return history.slice(0, limit);
  } catch (error) {
    console.error('Error getting points history:', error);
    return [];
  }
};

/**
 * Get available redemption options
 */
export const getRedemptionOptions = () => {
  return REDEMPTION_OPTIONS;
};

/**
 * Get tier benefits
 */
export const getTierBenefits = (tier) => {
  const benefits = {
    bronze: {
      name: 'Bronze',
      pointsRequired: 0,
      benefits: ['Earn 1x points on all purchases', 'Basic support'],
      nextTier: 'Silver',
      pointsUntilNext: 500
    },
    silver: {
      name: 'Silver',
      pointsRequired: 500,
      benefits: ['Earn 1.25x points on all purchases', 'Priority support', '2% bonus on redemptions'],
      nextTier: 'Gold',
      pointsUntilNext: 1500
    },
    gold: {
      name: 'Gold',
      pointsRequired: 2000,
      benefits: ['Earn 1.5x points on all purchases', 'VIP support', '5% bonus on redemptions', 'Exclusive offers'],
      nextTier: 'Platinum',
      pointsUntilNext: 3000
    },
    platinum: {
      name: 'Platinum',
      pointsRequired: 5000,
      benefits: ['Earn 2x points on all purchases', 'Dedicated support', '10% bonus on redemptions', 'Exclusive rewards', 'Birthday bonus'],
      nextTier: null,
      pointsUntilNext: null
    }
  };

  return benefits[tier] || benefits.bronze;
};

/**
 * Claim pending reward (convert to wallet credit or airtime)
 */
export const claimReward = async (userId, redemptionId) => {
  try {
    const redemptionRef = doc(db, 'users', userId, 'loyalty', 'points', 'redemptions', redemptionId);
    const redemptionSnap = await getDoc(redemptionRef);

    if (!redemptionSnap.exists()) {
      throw new Error('Redemption not found');
    }

    const redemptionData = redemptionSnap.data();

    if (redemptionData.status !== 'completed') {
      throw new Error('This reward has already been claimed or is invalid');
    }

    // Update redemption status
    await updateDoc(redemptionRef, {
      status: 'claimed',
      claimedAt: Timestamp.now()
    });

    // If cashback or discount, add to wallet
    if (redemptionData.rewardId.includes('cashback') || redemptionData.rewardId.includes('discount')) {
      // TODO: Add to wallet balance
    }

    return {
      success: true,
      message: 'Reward claimed successfully!',
      rewardValue: redemptionData.rewardValue
    };
  } catch (error) {
    console.error('Error claiming reward:', error);
    throw error;
  }
};

/**
 * Get points summary by category
 */
export const getPointsSummary = async (userId) => {
  try {
    const historyRef = collection(db, 'users', userId, 'loyalty', 'points', 'history');
    const q = query(historyRef, where('type', '==', 'earn'));

    const snapshot = await getDocs(q);
    const summary = {};

    snapshot.forEach((doc) => {
      const data = doc.data();
      const source = data.source || 'unknown';
      
      if (!summary[source]) {
        summary[source] = { points: 0, transactions: 0 };
      }
      
      summary[source].points += data.points || 0;
      summary[source].transactions++;
    });

    return summary;
  } catch (error) {
    console.error('Error getting points summary:', error);
    return {};
  }
};

/**
 * Get leaderboard (top users by points)
 */
export const getLeaderboard = async (limit = 10) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('loyaltyPoints', 'desc'));

    const snapshot = await getDocs(q);
    const leaderboard = [];

    let rank = 1;
    snapshot.forEach((doc) => {
      if (leaderboard.length < limit) {
        leaderboard.push({
          rank: rank++,
          userId: doc.id,
          userName: doc.data().displayName || 'Anonymous',
          points: doc.data().loyaltyPoints || 0
        });
      }
    });

    return leaderboard;
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    return [];
  }
};

export default {
  initializeUserPoints,
  addTransactionPoints,
  getUserPoints,
  redeemPoints,
  getRedemptionHistory,
  getPointsHistory,
  getRedemptionOptions,
  getTierBenefits,
  claimReward,
  getPointsSummary,
  getLeaderboard,
  calculatePointsEarned,
  POINTS_RATES,
  REDEMPTION_OPTIONS
};
