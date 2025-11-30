class ReferralService {
  static async generateReferralCode(userId) {
    try {

      // Generate unique referral code
      let referralCode;
      let isUnique = false;
      let attempts = 0;

      while (!isUnique && attempts < 10) {
        referralCode = this.generateCode();
        const existing = await User.findOne({ referralCode });
        isUnique = !existing;
        attempts++;
      }

      if (!isUnique) {
        throw new Error('Could not generate unique referral code');
      }

      // Update user with referral code
      await User.findByIdAndUpdate(userId, { referralCode });

      return referralCode;
    } catch (error) {
      console.error('Error generating referral code:', error);
      throw error;
    }
  }

  static generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'PAY';

    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return code;
  }

  static async processReferral(referralCode, newUserId) {
    try {

      // Find referrer
      const referrer = await User.findOne({ referralCode });
      if (!referrer) {
        throw new Error('Invalid referral code');
      }

      // Check if new user was already referred
      const existingReferral = await Referral.findOne({ refereeId: newUserId });
      if (existingReferral) {
        throw new Error('User has already been referred');
      }

      // Create referral record
      const referral = new Referral({
        referrerId: referrer._id,
        refereeId: newUserId,
        referralCode,
        status: 'pending',
        rewards: {
          referrer: 500, // ₦500 bonus for referrer
          referee: 200   // ₦200 bonus for referee
        }
      });

      await referral.save();

      // Award immediate bonus to referrer
      await this.awardReferralBonus(referrer._id, 500, 'referrer');

      // Award bonus to referee after first transaction
      await this.awardReferralBonus(newUserId, 200, 'referee');

      // Update referral status
      referral.status = 'completed';
      await referral.save();

      // Send notifications
      const NotificationService = require('./notificationService');
      await NotificationService.notifyReferralBonus(referrer._id, 500, 'New User');
      await NotificationService.notifyReferralBonus(newUserId, 200, 'Welcome Bonus');

      return referral;
    } catch (error) {
      console.error('Error processing referral:', error);
      throw error;
    }
  }

  static async awardReferralBonus(userId, amount, type) {
    try {
      const WalletService = require('./walletService');

      // Add bonus to wallet
      await WalletService.deductFromWallet(userId, -amount, `Referral bonus (${type})`);

      // Award points
      const RewardSystem = require('./rewardSystem');
      await RewardSystem.awardPoints(userId, 'referral', amount, `REF_${Date.now()}`);

      console.log(`Referral bonus of ₦${amount} awarded to user ${userId}`);
    } catch (error) {
      console.error('Error awarding referral bonus:', error);
    }
  }

  static async getReferralStats(userId) {
    try {

      const referrals = await Referral.find({ referrerId: userId })
        .populate('refereeId', 'fullName username createdAt')
        .sort({ createdAt: -1 });

      const totalReferrals = referrals.length;
      const successfulReferrals = referrals.filter(r => r.status === 'completed').length;
      const totalEarnings = referrals.reduce((sum, r) => sum + (r.rewards?.referrer || 0), 0);

      return {
        totalReferrals,
        successfulReferrals,
        totalEarnings,
        referrals: referrals.map(r => ({
          refereeName: r.refereeId?.fullName || 'Unknown',
          refereeUsername: r.refereeId?.username || 'Unknown',
          joinedAt: r.refereeId?.createdAt,
          status: r.status,
          earnings: r.rewards?.referrer || 0
        }))
      };
    } catch (error) {
      console.error('Error getting referral stats:', error);
      return {
        totalReferrals: 0,
        successfulReferrals: 0,
        totalEarnings: 0,
        referrals: []
      };
    }
  }

  static async getReferralLink(userId) {
    try {
      const user = await User.findById(userId);

      if (!user.referralCode) {
        const code = await this.generateReferralCode(userId);
        user.referralCode = code;
        await user.save();
      }

      const baseUrl = process.env.FRONTEND_URL || 'https://paylink.com';
      return `${baseUrl}/register?ref=${user.referralCode}`;
    } catch (error) {
      console.error('Error getting referral link:', error);
      throw error;
    }
  }

  static async shareReferralLink(userId, method = 'copy') {
    try {
      const link = await this.getReferralLink(userId);
      const shareText = `Join PAYLINK with my referral link and get ₦200 bonus! ${link}`;

      switch (method) {
        case 'whatsapp':
          window.open(`whatsapp://send?text=${encodeURIComponent(shareText)}`);
          break;

        case 'telegram':
          window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Join PAYLINK and get bonus!')}`);
          break;

        case 'twitter':
          window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent('Join PAYLINK and get ₦200 bonus!')}&url=${encodeURIComponent(link)}`);
          break;

        case 'copy':
        default:
          await navigator.clipboard.writeText(link);
          break;
      }

      return link;
    } catch (error) {
      console.error('Error sharing referral link:', error);
      throw error;
    }
  }

  static async getReferralLeaderboard(limit = 10) {
    try {

      const leaderboard = await Referral.aggregate([
        {
          $group: {
            _id: '$referrerId',
            totalReferrals: { $sum: 1 },
            successfulReferrals: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            totalEarnings: { $sum: '$rewards.referrer' }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: '$user'
        },
        {
          $project: {
            _id: 0,
            userId: '$_id',
            fullName: '$user.fullName',
            username: '$user.username',
            totalReferrals: 1,
            successfulReferrals: 1,
            totalEarnings: 1
          }
        },
        {
          $sort: { totalEarnings: -1, successfulReferrals: -1 }
        },
        {
          $limit: limit
        }
      ]);

      return leaderboard;
    } catch (error) {
      console.error('Error getting referral leaderboard:', error);
      return [];
    }
  }

  static async getReferralProgramInfo() {
    return {
      referrerBonus: 500, // ₦500 for each successful referral
      refereeBonus: 200,  // ₦200 welcome bonus
      requirements: [
        'Referee must complete registration',
        'Referee must make at least one transaction',
        'Referral code must be valid and unused'
      ],
      terms: [
        'Bonuses are credited immediately',
        'Referrals are tracked for 12 months',
        'Multiple referrals from same IP may be flagged',
        'PAYLINK reserves right to modify program terms'
      ]
    };
  }

  static async validateReferralCode(code) {
    try {
      const user = await User.findOne({ referralCode: code });

      if (!user) {
        return { valid: false, error: 'Invalid referral code' };
      }

      return {
        valid: true,
        referrerId: user._id,
        referrerName: user.fullName
      };
    } catch (error) {
      console.error('Error validating referral code:', error);
      return { valid: false, error: 'Error validating code' };
    }
  }

  static async getReferralHistory(userId, limit = 50) {
    try {

      // Get referrals made by user
      const madeReferrals = await Referral.find({ referrerId: userId })
        .populate('refereeId', 'fullName username createdAt')
        .sort({ createdAt: -1 })
        .limit(limit);

      // Get referral used by user (if any)
      const usedReferral = await Referral.findOne({ refereeId: userId })
        .populate('referrerId', 'fullName username');

      return {
        made: madeReferrals.map(r => ({
          id: r._id,
          refereeName: r.refereeId?.fullName || 'Unknown',
          refereeUsername: r.refereeId?.username || 'Unknown',
          joinedAt: r.refereeId?.createdAt,
          status: r.status,
          earnings: r.rewards?.referrer || 0,
          createdAt: r.createdAt
        })),
        used: usedReferral ? {
          referrerName: usedReferral.referrerId?.fullName || 'Unknown',
          referrerUsername: usedReferral.referrerId?.username || 'Unknown',
          bonus: usedReferral.rewards?.referee || 0,
          usedAt: usedReferral.createdAt
        } : null
      };
    } catch (error) {
      console.error('Error getting referral history:', error);
      return { made: [], used: null };
    }
  }

  static async sendReferralReminder(userId) {
    try {
      const user = await User.findById(userId);

      if (!user.referralCode) {
        await this.generateReferralCode(userId);
      }

      const link = await this.getReferralLink(userId);

      const NotificationService = require('./notificationService');
      await NotificationService.sendNotification(userId, {
        type: 'referral_reminder',
        title: 'Share PAYLINK & Earn!',
        message: `Earn ₦500 for each friend who joins using your referral link: ${link}`,
        data: { referralLink: link, action: 'share_referral' }
      });

      return true;
    } catch (error) {
      console.error('Error sending referral reminder:', error);
      return false;
    }
  }

  static async getReferralAnalytics(userId) {
    try {

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const [total, last30Days, last7Days, pending, completed] = await Promise.all([
        Referral.countDocuments({ referrerId: userId }),
        Referral.countDocuments({ referrerId: userId, createdAt: { $gte: thirtyDaysAgo } }),
        Referral.countDocuments({ referrerId: userId, createdAt: { $gte: sevenDaysAgo } }),
        Referral.countDocuments({ referrerId: userId, status: 'pending' }),
        Referral.countDocuments({ referrerId: userId, status: 'completed' })
      ]);

      const totalEarnings = await Referral.aggregate([
        { $match: { referrerId: require('mongoose').Types.ObjectId(userId), status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$rewards.referrer' } } }
      ]);

      return {
        totalReferrals: total,
        last30Days: last30Days,
        last7Days: last7Days,
        pendingReferrals: pending,
        completedReferrals: completed,
        totalEarnings: totalEarnings[0]?.total || 0,
        conversionRate: total > 0 ? (completed / total) * 100 : 0
      };
    } catch (error) {
      console.error('Error getting referral analytics:', error);
      return {
        totalReferrals: 0,
        last30Days: 0,
        last7Days: 0,
        pendingReferrals: 0,
        completedReferrals: 0,
        totalEarnings: 0,
        conversionRate: 0
      };
    }
  }

  static async cleanupOldReferrals(daysOld = 365) {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

      const result = await Referral.deleteMany({
        createdAt: { $lt: cutoffDate },
        status: 'pending'
      });

      console.log(`Cleaned up ${result.deletedCount} old pending referrals`);
      return result.deletedCount;
    } catch (error) {
      console.error('Error cleaning up old referrals:', error);
      return 0;
    }
  }

  static async exportReferralData(userId) {
    try {
      const stats = await this.getReferralStats(userId);
      const history = await this.getReferralHistory(userId);

      return {
        userId,
        exportedAt: new Date(),
        stats,
        history
      };
    } catch (error) {
      console.error('Error exporting referral data:', error);
      return null;
    }
  }
}

export default ReferralService;
