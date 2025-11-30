class RewardSystem {
  static POINTS_RATES = {
    airtime: { rate: 1, perAmount: 100 }, // 1 point per ₦100
    data: { rate: 1, perAmount: 200 },    // 1 point per ₦200
    electricity: { rate: 2, perAmount: 500 }, // 2 points per ₦500
    cabletv: { rate: 1.5, perAmount: 1000 }, // 1.5 points per ₦1000
    internet: { rate: 1, perAmount: 500 },   // 1 point per ₦500
    education: { rate: 2, perAmount: 1000 }, // 2 points per ₦1000
    insurance: { rate: 3, perAmount: 2000 }, // 3 points per ₦2000
    giftcard: { rate: 2, perAmount: 1000 },  // 2 points per ₦1000
    tax: { rate: 1, perAmount: 500 }         // 1 point per ₦500
  };

  static REDEMPTION_RATES = {
    discount_50: { points: 100, value: 50, type: 'discount' },
    discount_100: { points: 180, value: 100, type: 'discount' },
    discount_200: { points: 320, value: 200, type: 'discount' },
    airtime_100: { points: 150, value: 100, type: 'airtime' },
    airtime_200: { points: 280, value: 200, type: 'airtime' },
    data_200mb: { points: 150, value: 200, type: 'data', plan: '200MB' },
    data_500mb: { points: 300, value: 500, type: 'data', plan: '500MB' },
    cashback_50: { points: 120, value: 50, type: 'cashback' },
    cashback_100: { points: 220, value: 100, type: 'cashback' }
  };

  static async calculatePoints(category, amount) {
    const rate = this.POINTS_RATES[category];
    if (!rate) return 0;

    const points = Math.floor((amount / rate.perAmount) * rate.rate);
    return Math.max(points, 0);
  }

  static async awardPoints(userId, category, amount, transactionId) {
    try {
      const { db } = require('../firebase');
      const { doc, getDoc, updateDoc, increment, collection, addDoc, Timestamp } = require('firebase/firestore');

      const points = await this.calculatePoints(category, amount);

      if (points === 0) return 0;

      // Update user reward balance
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const currentPoints = userSnap.data().rewardPoints || 0;
        await updateDoc(userRef, {
          rewardPoints: currentPoints + points
        });
      }

      // Record reward transaction
      const rewardTxRef = collection(db, 'users', userId, 'rewardTransactions');
      await addDoc(rewardTxRef, {
        type: 'earned',
        points,
        reason: `${category} purchase`,
        transactionId,
        amount,
        createdAt: Timestamp.now()
      });

      return points;
    } catch (error) {
      console.error('Error awarding points:', error);
      return 0;
    }
  }

  static async redeemPoints(userId, redemptionId) {
    try {
      const { db } = require('../firebase');
      const { doc, getDoc, updateDoc, collection, addDoc, Timestamp } = require('firebase/firestore');

      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      const redemption = this.REDEMPTION_RATES[redemptionId];

      if (!redemption) {
        throw new Error('Invalid redemption option');
      }

      const currentPoints = userSnap.data()?.rewardPoints || 0;
      if (currentPoints < redemption.points) {
        throw new Error('Insufficient points');
      }

      // Deduct points
      await updateDoc(userRef, {
        rewardPoints: currentPoints - redemption.points
      });

      // Record redemption transaction
      const rewardTxRef = collection(db, 'users', userId, 'rewardTransactions');
      await addDoc(rewardTxRef, {
        type: 'redeemed',
        points: -redemption.points,
        reason: `Redeemed for ${redemptionId}`,
        redemption,
        createdAt: Timestamp.now()
      });

      // Process the reward
      await this.processReward(userId, redemption);

      return { success: true, redemption };

      return redemption;
    } catch (error) {
      console.error('Error redeeming points:', error);
      throw error;
    }
  }

  static async processReward(userId, redemption) {
    try {
      switch (redemption.type) {
        case 'discount':
          await this.applyDiscount(userId, redemption.value);
          break;

        case 'airtime':
          await this.autoPurchaseAirtime(userId, redemption.value);
          break;

        case 'data':
          await this.autoPurchaseData(userId, redemption);
          break;

        case 'cashback':
          await this.addCashback(userId, redemption.value);
          break;

        default:
          console.error('Unknown reward type:', redemption.type);
      }
    } catch (error) {
      console.error('Error processing reward:', error);
    }
  }

  static async applyDiscount(userId, discountAmount) {
    try {
      const { db } = require('../firebase');
      const { doc, updateDoc } = require('firebase/firestore');

      const userRef = doc(db, 'users', userId);
      const discountExpires = new Date();
      discountExpires.setDate(discountExpires.getDate() + 30);

      await updateDoc(userRef, {
        discountAmount,
        discountExpires
      });
    } catch (error) {
      console.error('Error applying discount:', error);
    }
  }

  static async autoPurchaseAirtime(userId, amount) {
    console.log(`Auto-purchasing ₦${amount} airtime for user ${userId}`);
    // Would integrate with airtime purchase service
  }

  static async autoPurchaseData(userId, redemption) {
    console.log(`Auto-purchasing ${redemption.plan} data for user ${userId}`);
    // Would integrate with data purchase service
  }

  static async addCashback(userId, amount) {
    try {
      const { db } = require('../firebase');
      const { doc, getDoc, updateDoc, collection, addDoc, Timestamp, increment } = require('firebase/firestore');

      // Add to wallet balance
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const currentBalance = userSnap.data().walletBalance || 0;
        await updateDoc(userRef, {
          walletBalance: currentBalance + amount
        });
      }

      // Create transaction record
      const txRef = collection(db, 'users', userId, 'transactions');
      await addDoc(txRef, {
        type: 'credit',
        category: 'reward',
        amount,
        reference: `REWARD_${Date.now()}`,
        status: 'success',
        description: 'Reward cashback',
        createdAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error adding cashback:', error);
    }
  }

  static async getUserPoints(userId) {
    try {
      const { db } = require('../firebase');
      const { doc, getDoc } = require('firebase/firestore');

      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      return userSnap.data()?.rewardPoints || 0;
    } catch (error) {
      console.error('Error getting user points:', error);
      return 0;
    }
  }

  static async getRewardHistory(userId, limit = 50) {
    try {
      const { db } = require('../firebase');
      const { collection, query, orderBy, limit: limitFn, getDocs } = require('firebase/firestore');

      const txRef = collection(db, 'users', userId, 'rewardTransactions');
      const q = query(txRef, orderBy('createdAt', 'desc'), limitFn(limit));
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting reward history:', error);
      return [];
    }
  }

  static getAvailableRedemptions() {
    return Object.keys(this.REDEMPTION_RATES).map(key => ({
      id: key,
      ...this.REDEMPTION_RATES[key]
    }));
  }

  static async getPointsSummary(userId) {
    try {
      const { db } = require('../firebase');
      const { collection, query, where, getDocs } = require('firebase/firestore');

      const txRef = collection(db, 'users', userId, 'rewardTransactions');

      // Get earned points
      const earnedQ = query(txRef, where('type', '==', 'earned'));
      const earnedSnap = await getDocs(earnedQ);
      const totalEarned = earnedSnap.docs.reduce((sum, doc) => sum + doc.data().points, 0);

      // Get redeemed points
      const redeemedQ = query(txRef, where('type', '==', 'redeemed'));
      const redeemedSnap = await getDocs(redeemedQ);
      const totalRedeemed = redeemedSnap.docs.reduce((sum, doc) => sum + Math.abs(doc.data().points), 0);

      const currentPoints = await this.getUserPoints(userId);

      return {
        totalEarned,
        totalRedeemed,
        currentPoints,
        availablePoints: currentPoints
      };
    } catch (error) {
      console.error('Error getting points summary:', error);
      return {
        totalEarned: 0,
        totalRedeemed: 0,
        currentPoints: 0,
        availablePoints: 0
      };
    }
  }

  static async checkDiscountEligibility(userId) {
    try {
      const user = await User.findById(userId).select('discountAmount discountExpires');

      if (!user.discountAmount || user.discountAmount <= 0) {
        return { eligible: false };
      }

      if (user.discountExpires && user.discountExpires < new Date()) {
        // Expired discount, clear it
        await User.findByIdAndUpdate(userId, {
          discountAmount: 0,
          discountExpires: null
        });
        return { eligible: false };
      }

      return {
        eligible: true,
        amount: user.discountAmount,
        expires: user.discountExpires
      };
    } catch (error) {
      console.error('Error checking discount eligibility:', error);
      return { eligible: false };
    }
  }

  static async applyDiscountToPurchase(userId, purchaseAmount) {
    const discountInfo = await this.checkDiscountEligibility(userId);

    if (!discountInfo.eligible) {
      return { discountedAmount: purchaseAmount, discountApplied: 0 };
    }

    const discountApplied = Math.min(discountInfo.amount, purchaseAmount);
    const discountedAmount = purchaseAmount - discountApplied;

    // Update remaining discount
    const remainingDiscount = discountInfo.amount - discountApplied;
    if (remainingDiscount <= 0) {
      await User.findByIdAndUpdate(userId, {
        discountAmount: 0,
        discountExpires: null
      });
    } else {
      await User.findByIdAndUpdate(userId, {
        discountAmount: remainingDiscount
      });
    }

    return { discountedAmount, discountApplied };
  }

  // Admin functions for managing rewards
  static async adjustUserPoints(userId, points, reason, adminId) {
    try {

      await User.findByIdAndUpdate(userId, { $inc: { points: points } });

      const rewardTransaction = new RewardTransaction({
        userId,
        type: points > 0 ? 'earned' : 'redeemed',
        points: Math.abs(points),
        reason: `Admin adjustment: ${reason}`,
        adminId
      });

      if (points < 0) {
        rewardTransaction.points = -rewardTransaction.points;
      }

      await rewardTransaction.save();

      return true;
    } catch (error) {
      console.error('Error adjusting user points:', error);
      throw error;
    }
  }

  static async getSystemStats() {
    try {

      const [totalUsers, totalPoints, totalRedemptions] = await Promise.all([
        User.countDocuments({ points: { $gt: 0 } }),
        User.aggregate([{ $group: { _id: null, total: { $sum: '$points' } } }]),
        RewardTransaction.countDocuments({ type: 'redeemed' })
      ]);

      return {
        totalUsersWithPoints: totalUsers,
        totalPointsInSystem: totalPoints[0]?.total || 0,
        totalRedemptions
      };
    } catch (error) {
      console.error('Error getting system stats:', error);
      return {
        totalUsersWithPoints: 0,
        totalPointsInSystem: 0,
        totalRedemptions: 0
      };
    }
  }
}

export default RewardSystem;
