import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

class AnalyticsService {
  static async getSpendAnalytics(userId, period = 'monthly') {
    try {
      const periodStart = this.getPeriodStart(period);
      const transactionsRef = collection(db, 'transactions');
      const q = query(
        transactionsRef,
        where('userId', '==', userId),
        where('type', '==', 'debit'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const transactions = [];
      querySnapshot.forEach(doc => {
        const data = doc.data();
        if (data.createdAt && new Date(data.createdAt.toDate?.() || data.createdAt) >= periodStart) {
          transactions.push({ id: doc.id, ...data });
        }
      });

      const analytics = {
        totalSpent: transactions.reduce((sum, t) => sum + (t.amount || 0), 0),
        categoryBreakdown: this.groupByCategory(transactions),
        weeklyTrend: [],
        topCategories: this.getTopCategories(transactions),
        averageTransaction: this.calculateAverage(transactions),
        transactionCount: transactions.length,
        period
      };

      return analytics;
    } catch (error) {
      console.error('Error getting spend analytics:', error);
      return this.getEmptyAnalytics();
    }
  }

  static getPeriodStart(period) {
    const now = new Date();
    switch (period) {
      case 'weekly':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'yearly':
        return new Date(now.getFullYear(), 0, 1);
      default:
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }
  }

  static groupByCategory(transactions) {
    const categories = {};

    transactions.forEach(transaction => {
      const category = transaction.category || 'other';
      categories[category] = (categories[category] || 0) + transaction.amount;
    });

    // Convert to array and sort by amount
    return Object.entries(categories)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }

  static async calculateWeeklyTrend(userId, period) {
    try {
      const periodStart = this.getPeriodStart(period);
      const now = new Date();

      const weeks = [];
      let currentWeek = new Date(periodStart);

      while (currentWeek <= now) {
        const weekEnd = new Date(currentWeek.getTime() + 6 * 24 * 60 * 60 * 1000);

        // Query transactions for this week
        const transactionsRef = query(
          collection(db, 'transactions'),
          where('userId', '==', userId),
          where('type', '==', 'debit'),
          where('timestamp', '>=', currentWeek),
          where('timestamp', '<=', weekEnd),
          orderBy('timestamp', 'asc')
        );

        const querySnapshot = await getDocs(transactionsRef);
        const weekTransactions = querySnapshot.docs.map(doc => doc.data());

        const weekTotal = weekTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

        weeks.push({
          week: currentWeek.toISOString().split('T')[0],
          amount: weekTotal / 100, // Convert to Naira
          transactions: weekTransactions.length
        });

        currentWeek = new Date(weekEnd.getTime() + 24 * 60 * 60 * 1000);
      }

      return weeks;
    } catch (error) {
      console.error('Error calculating weekly trend:', error);
      return [];
    }
  }

  static getTopCategories(transactions, limit = 3) {
    const categoryBreakdown = this.groupByCategory(transactions);
    return categoryBreakdown.slice(0, limit);
  }

  static calculateAverage(transactions) {
    if (transactions.length === 0) return 0;

    const total = transactions.reduce((sum, t) => sum + t.amount, 0);
    return total / transactions.length;
  }

  static getEmptyAnalytics() {
    return {
      totalSpent: 0,
      categoryBreakdown: [],
      weeklyTrend: [],
      topCategories: [],
      averageTransaction: 0,
      transactionCount: 0,
      period: 'monthly'
    };
  }

  static async getCategoryAnalytics(userId, category, period = 'monthly') {
    try {
      const periodStart = this.getPeriodStart(period);

      const transactions = await Transaction.find({
        userId,
        category,
        createdAt: { $gte: periodStart },
        type: 'debit'
      }).sort({ createdAt: -1 });

      const analytics = {
        category,
        totalSpent: transactions.reduce((sum, t) => sum + t.amount, 0),
        transactionCount: transactions.length,
        averageAmount: this.calculateAverage(transactions),
        largestTransaction: transactions.length > 0 ? Math.max(...transactions.map(t => t.amount)) : 0,
        recentTransactions: transactions.slice(0, 5),
        monthlyTrend: await this.calculateMonthlyTrend(userId, category, period)
      };

      return analytics;
    } catch (error) {
      console.error('Error getting category analytics:', error);
      return {
        category,
        totalSpent: 0,
        transactionCount: 0,
        averageAmount: 0,
        largestTransaction: 0,
        recentTransactions: [],
        monthlyTrend: []
      };
    }
  }

  static async calculateMonthlyTrend(userId, category, period) {
    try {
      const periodStart = this.getPeriodStart(period);
      const now = new Date();

      const months = [];
      let currentMonth = new Date(periodStart.getFullYear(), periodStart.getMonth(), 1);

      while (currentMonth <= now) {
        const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

        const transactionsRef = query(
          collection(db, 'transactions'),
          where('userId', '==', userId),
          where('category', '==', category),
          where('timestamp', '>=', currentMonth),
          where('timestamp', '<=', monthEnd),
          where('type', '==', 'debit')
        );

        const querySnapshot = await getDocs(transactionsRef);
        const monthTransactions = querySnapshot.docs.map(doc => doc.data());

        const monthTotal = monthTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

        months.push({
          month: currentMonth.toLocaleString('default', { month: 'short', year: 'numeric' }),
          amount: monthTotal / 100, // Convert to Naira
          transactions: monthTransactions.length
        });

        currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
      }

      return months;
    } catch (error) {
      console.error('Error calculating monthly trend:', error);
      return [];
    }
  }

  static async getComparisonAnalytics(userId, currentPeriod = 'monthly', previousPeriod = 'monthly') {
    try {
      const currentAnalytics = await this.getSpendAnalytics(userId, currentPeriod);
      const previousStart = this.getPreviousPeriodStart(currentPeriod);
      const previousAnalytics = await this.getSpendAnalyticsForPeriod(userId, previousStart, currentPeriod);

      const comparison = {
        current: currentAnalytics,
        previous: previousAnalytics,
        change: {
          totalSpent: this.calculateChange(currentAnalytics.totalSpent, previousAnalytics.totalSpent),
          transactionCount: this.calculateChange(currentAnalytics.transactionCount, previousAnalytics.transactionCount),
          averageTransaction: this.calculateChange(currentAnalytics.averageTransaction, previousAnalytics.averageTransaction)
        }
      };

      return comparison;
    } catch (error) {
      console.error('Error getting comparison analytics:', error);
      return {
        current: this.getEmptyAnalytics(),
        previous: this.getEmptyAnalytics(),
        change: { totalSpent: 0, transactionCount: 0, averageTransaction: 0 }
      };
    }
  }

  static getPreviousPeriodStart(period) {
    const now = new Date();
    switch (period) {
      case 'weekly':
        return new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth() - 1, 1);
      case 'yearly':
        return new Date(now.getFullYear() - 1, 0, 1);
      default:
        return new Date(now.getFullYear(), now.getMonth() - 1, 1);
    }
  }

  static async getSpendAnalyticsForPeriod(userId, startDate, period) {
    try {
      const endDate = new Date(startDate);

      switch (period) {
        case 'weekly':
          endDate.setDate(endDate.getDate() + 7);
          break;
        case 'monthly':
          endDate.setMonth(endDate.getMonth() + 1);
          break;
        case 'yearly':
          endDate.setFullYear(endDate.getFullYear() + 1);
          break;
      }

      const transactions = await Transaction.find({
        userId,
        createdAt: { $gte: startDate, $lt: endDate },
        type: 'debit'
      });

      return {
        totalSpent: transactions.reduce((sum, t) => sum + t.amount, 0),
        transactionCount: transactions.length,
        averageTransaction: transactions.length > 0 ? transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length : 0
      };
    } catch (error) {
      console.error('Error getting spend analytics for period:', error);
      return { totalSpent: 0, transactionCount: 0, averageTransaction: 0 };
    }
  }

  static calculateChange(current, previous) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  static async getBudgetAnalytics(userId, budget = null) {
    try {
      const currentAnalytics = await this.getSpendAnalytics(userId, 'monthly');

      if (!budget) {
        // Suggest budget based on spending patterns
        const averageMonthly = currentAnalytics.totalSpent;
        budget = Math.ceil(averageMonthly * 1.1); // 10% buffer
      }

      const remaining = budget - currentAnalytics.totalSpent;
      const percentageUsed = (currentAnalytics.totalSpent / budget) * 100;

      return {
        budget,
        spent: currentAnalytics.totalSpent,
        remaining,
        percentageUsed,
        status: percentageUsed > 90 ? 'danger' : percentageUsed > 75 ? 'warning' : 'good',
        suggestions: this.getBudgetSuggestions(currentAnalytics, budget)
      };
    } catch (error) {
      console.error('Error getting budget analytics:', error);
      return {
        budget: 0,
        spent: 0,
        remaining: 0,
        percentageUsed: 0,
        status: 'unknown',
        suggestions: []
      };
    }
  }

  static getBudgetSuggestions(analytics, budget) {
    const suggestions = [];
    const dailyBudget = budget / 30;
    const currentDaily = analytics.totalSpent / new Date().getDate();

    if (currentDaily > dailyBudget) {
      suggestions.push(`You're spending ₦${(currentDaily - dailyBudget).toFixed(2)} more per day than budgeted`);
    }

    // Category suggestions
    analytics.categoryBreakdown.forEach(cat => {
      const percentage = (cat.amount / analytics.totalSpent) * 100;
      if (percentage > 50) {
        suggestions.push(`${cat.category} accounts for ${percentage.toFixed(1)}% of your spending`);
      }
    });

    return suggestions;
  }

  static async exportAnalytics(userId, period = 'monthly', format = 'json') {
    try {
      const analytics = await this.getSpendAnalytics(userId, period);
      const comparison = await this.getComparisonAnalytics(userId, period);

      const exportData = {
        period,
        generatedAt: new Date().toISOString(),
        analytics,
        comparison,
        insights: this.generateInsights(analytics, comparison)
      };

      if (format === 'csv') {
        return this.convertToCSV(exportData);
      }

      return exportData;
    } catch (error) {
      console.error('Error exporting analytics:', error);
      throw error;
    }
  }

  static generateInsights(analytics, comparison) {
    const insights = [];

    if (comparison.change.totalSpent > 20) {
      insights.push(`Your spending increased by ${comparison.change.totalSpent.toFixed(1)}% compared to last ${analytics.period}`);
    } else if (comparison.change.totalSpent < -20) {
      insights.push(`Great job! Your spending decreased by ${Math.abs(comparison.change.totalSpent).toFixed(1)}% compared to last ${analytics.period}`);
    }

    const topCategory = analytics.topCategories[0];
    if (topCategory) {
      insights.push(`${topCategory.category} is your biggest expense category this ${analytics.period}`);
    }

    if (analytics.averageTransaction > 10000) {
      insights.push('You tend to make larger transactions. Consider breaking them into smaller purchases for better cash flow.');
    }

    return insights;
  }

  static convertToCSV(data) {
    // Convert analytics data to CSV format
    const csvRows = [];

    // Header
    csvRows.push('Category,Metric,Value');

    // Analytics data
    csvRows.push(`Analytics,Total Spent,${data.analytics.totalSpent}`);
    csvRows.push(`Analytics,Transaction Count,${data.analytics.transactionCount}`);
    csvRows.push(`Analytics,Average Transaction,${data.analytics.averageTransaction}`);

    // Category breakdown
    data.analytics.categoryBreakdown.forEach(cat => {
      csvRows.push(`Category,${cat.category},${cat.amount}`);
    });

    return csvRows.join('\n');
  }

  static async getSystemAnalytics() {
    try {
      // Simplified system analytics without model access
      return {
        totalUsers: 0,
        activeUsers: 0,
        totalTransactions: 0,
        totalVolume: 0,
        categoryStats: [],
        error: 'System analytics requires backend access'
      };
    } catch (error) {
      console.error('Error getting system analytics:', error);
      return {};
    }
  }
}

export default AnalyticsService;
