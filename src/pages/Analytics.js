/**
 * Analytics.js
 * Spending Analytics Dashboard
 * Displays spending visualizations, trends, and insights
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuth } from '../context/AuthContext';
import analyticsService from '../services/analyticsService';
import LoadingSpinner from '../components/LoadingSpinner';
import './Analytics.css';

const Analytics = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categoryData, setCategoryData] = useState([]);
  const [weeklyTrend, setWeeklyTrend] = useState([]);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [stats, setStats] = useState({
    totalSpent: 0,
    averageTransaction: 0,
    minTransaction: 0,
    maxTransaction: 0,
    totalTransactions: 0,
    dailyAverage: 0
  });
  const [topCategories, setTopCategories] = useState([]);
  const [dateRange, setDateRange] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [merchantData, setMerchantData] = useState([]);

  // Color palette for categories
  const COLORS = {
    airtime: '#3b82f6',
    data: '#8b5cf6',
    electricity: '#f59e0b',
    cable: '#ef4444',
    internet: '#10b981',
    education: '#f97316',
    tax: '#6366f1'
  };

  // Fetch analytics data
  useEffect(() => {
    if (!user?.uid) {
      navigate('/login');
      return;
    }
    loadAnalytics();
  }, [user?.uid, navigate]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError('');

      const [categoryRes, weeklyRes, monthlyRes, statsRes, topRes, merchantRes] = await Promise.all([
        analyticsService.getSpendingByCategory(user.uid),
        analyticsService.getWeeklyTrend(user.uid, 4),
        analyticsService.getMonthlyBreakdown(user.uid, 6),
        analyticsService.getSpendingStats(user.uid),
        analyticsService.getTopCategories(user.uid, 3),
        analyticsService.getMerchantSpending(user.uid)
      ]);

      // Format category data for pie chart
      const pieData = Object.entries(categoryRes.byCategory).map(([category, amount]) => ({
        name: category.charAt(0).toUpperCase() + category.slice(1),
        value: amount,
        category
      })).filter(item => item.value > 0);

      setCategoryData(pieData);
      setWeeklyTrend(weeklyRes || []);
      setMonthlyTrend(monthlyRes || []);
      setStats(statsRes);
      setTopCategories(topRes || []);
      setMerchantData(merchantRes || []);
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Failed to load analytics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (range) => {
    setDateRange(range);
    if (range !== 'custom') {
      setCustomStartDate('');
      setCustomEndDate('');
    }
  };

  const handleExportCSV = async () => {
    try {
      setLoading(true);
      const csv = await analyticsService.exportToCSV(user.uid);
      
      const element = document.createElement('a');
      const file = new Blob([csv], { type: 'text/csv' });
      element.href = URL.createObjectURL(file);
      element.download = `spending-analytics-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (err) {
      console.error('Error exporting CSV:', err);
      setError('Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="analytics-tooltip">
          <p className="tooltip-label">{payload[0].name}</p>
          <p className="tooltip-value">₦{payload[0].value?.toLocaleString() || 0}</p>
        </div>
      );
    }
    return null;
  };

  if (loading && categoryData.length === 0) {
    return (
      <div className="analytics-page">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="analytics-page">
      {/* Header */}
      <div className="analytics-header">
        <div className="header-content">
          <h1>💹 Spending Analytics</h1>
          <p className="subtitle">Track your spending patterns and insights</p>
        </div>
        <button className="export-btn" onClick={handleExportCSV}>
          📥 Export to CSV
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* Date Range Selector */}
      <div className="date-range-selector">
        <button 
          className={`range-btn ${dateRange === 'all' ? 'active' : ''}`}
          onClick={() => handleDateRangeChange('all')}
        >
          All Time
        </button>
        <button 
          className={`range-btn ${dateRange === '30' ? 'active' : ''}`}
          onClick={() => handleDateRangeChange('30')}
        >
          Last 30 Days
        </button>
        <button 
          className={`range-btn ${dateRange === '90' ? 'active' : ''}`}
          onClick={() => handleDateRangeChange('90')}
        >
          Last 90 Days
        </button>
        <button 
          className={`range-btn ${dateRange === 'custom' ? 'active' : ''}`}
          onClick={() => handleDateRangeChange('custom')}
        >
          Custom
        </button>
      </div>

      {/* Custom Date Range */}
      {dateRange === 'custom' && (
        <div className="custom-date-range">
          <input 
            type="date" 
            value={customStartDate}
            onChange={(e) => setCustomStartDate(e.target.value)}
            placeholder="Start Date"
          />
          <span>to</span>
          <input 
            type="date" 
            value={customEndDate}
            onChange={(e) => setCustomEndDate(e.target.value)}
            placeholder="End Date"
          />
        </div>
      )}

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <p className="stat-label">Total Spent</p>
            <p className="stat-value">₦{stats.totalSpent?.toLocaleString()}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <p className="stat-label">Average Transaction</p>
            <p className="stat-value">₦{stats.averageTransaction?.toLocaleString()}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔢</div>
          <div className="stat-content">
            <p className="stat-label">Total Transactions</p>
            <p className="stat-value">{stats.totalTransactions}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <p className="stat-label">Daily Average</p>
            <p className="stat-value">₦{stats.dailyAverage?.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-container">
        {/* Pie Chart - Category Breakdown */}
        <div className="chart-card">
          <h3>📊 Spending by Category</h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.category]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `₦${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data">No spending data available</div>
          )}
        </div>

        {/* Weekly Trend Chart */}
        <div className="chart-card">
          <h3>📈 Weekly Spending Trend</h3>
          {weeklyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip formatter={(value) => `₦${value.toLocaleString()}`} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#8b5cf6" 
                  dot={{ fill: '#8b5cf6', r: 5 }}
                  activeDot={{ r: 8 }}
                  name="Weekly Spend"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data">No data available</div>
          )}
        </div>

        {/* Monthly Breakdown Chart */}
        <div className="chart-card full-width">
          <h3>📅 Monthly Spending Breakdown</h3>
          {monthlyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `₦${value.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="amount" fill="#3b82f6" name="Monthly Spend" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data">No data available</div>
          )}
        </div>
      </div>

      {/* Top Categories & Merchants */}
      <div className="insights-grid">
        {/* Top Categories */}
        <div className="insight-card">
          <h3>🏆 Top Categories</h3>
          {topCategories.length > 0 ? (
            <div className="insights-list">
              {topCategories.map((category, index) => (
                <div key={index} className="insight-item">
                  <div className="insight-rank">
                    {index === 0 && '🥇'}
                    {index === 1 && '🥈'}
                    {index === 2 && '🥉'}
                  </div>
                  <div className="insight-content">
                    <p className="insight-label">{category.category}</p>
                    <p className="insight-value">₦{category.amount?.toLocaleString()}</p>
                  </div>
                  <p className="insight-percentage">{category.percentage}%</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data">No category data</div>
          )}
        </div>

        {/* Top Merchants */}
        <div className="insight-card">
          <h3>🏪 Top Merchants</h3>
          {merchantData.length > 0 ? (
            <div className="insights-list">
              {merchantData.slice(0, 5).map((merchant, index) => (
                <div key={index} className="insight-item">
                  <div className="insight-rank">#{index + 1}</div>
                  <div className="insight-content">
                    <p className="insight-label">{merchant.provider}</p>
                    <p className="insight-value">₦{merchant.totalSpent?.toLocaleString()}</p>
                  </div>
                  <p className="insight-percentage">{merchant.transactionCount} txs</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data">No merchant data</div>
          )}
        </div>
      </div>

      {/* Min/Max Transactions */}
      <div className="minmax-section">
        <div className="minmax-card">
          <p className="minmax-label">Smallest Transaction</p>
          <p className="minmax-value">₦{stats.minTransaction?.toLocaleString()}</p>
        </div>
        <div className="minmax-card">
          <p className="minmax-label">Largest Transaction</p>
          <p className="minmax-value">₦{stats.maxTransaction?.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
