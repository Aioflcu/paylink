/**
 * Rewards.js
 * Reward Points System UI
 * Display points balance, earn/redeem rewards, history
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import rewardPointsService from '../services/rewardPointsService';
import LoadingSpinner from '../components/LoadingSpinner';
import './Rewards.css';

const Rewards = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('balance'); // balance, redeem, history
  const [pointsData, setPointsData] = useState(null);
  const [redemptionOptions, setRedemptionOptions] = useState([]);
  const [redemptionHistory, setRedemptionHistory] = useState([]);
  const [pointsHistory, setPointsHistory] = useState([]);
  const [pointsSummary, setPointsSummary] = useState({});
  const [selectedReward, setSelectedReward] = useState(null);
  const [redeeming, setRedeeming] = useState(false);

  // Fetch points data
  useEffect(() => {
    if (!user?.uid) {
      navigate('/login');
      return;
    }
    loadPointsData();
  }, [user?.uid, navigate]);

  const loadPointsData = async () => {
    try {
      setLoading(true);
      setError('');

      const [points, redemptions, history, summary] = await Promise.all([
        rewardPointsService.getUserPoints(user.uid),
        rewardPointsService.getRedemptionHistory(user.uid),
        rewardPointsService.getPointsHistory(user.uid),
        rewardPointsService.getPointsSummary(user.uid)
      ]);

      setPointsData(points);
      setRedemptionOptions(rewardPointsService.getRedemptionOptions());
      setRedemptionHistory(redemptions);
      setPointsHistory(history);
      setPointsSummary(summary);
    } catch (err) {
      console.error('Error loading points data:', err);
      setError('Failed to load rewards data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemPoints = async (rewardId, rewardPoints, rewardValue) => {
    try {
      setRedeeming(true);
      setError('');

      const result = await rewardPointsService.redeemPoints(user.uid, rewardId, rewardPoints, rewardValue);
      
      // Show success message
      setError('');
      alert(result.message);

      // Reload points data
      await loadPointsData();
      setSelectedReward(null);
    } catch (err) {
      console.error('Error redeeming points:', err);
      setError(err.message || 'Failed to redeem points');
    } finally {
      setRedeeming(false);
    }
  };

  const getTierInfo = () => {
    if (!pointsData) return null;
    return rewardPointsService.getTierBenefits(pointsData.tier);
  };

  const canRedeem = (rewardPoints) => {
    return pointsData && pointsData.availablePoints >= rewardPoints;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp?.toDate?.() || new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="rewards-page">
        <LoadingSpinner />
      </div>
    );
  }

  const tierInfo = getTierInfo();

  return (
    <div className="rewards-page">
      {/* Header */}
      <div className="rewards-header">
        <h1>🎁 Reward Points</h1>
        <p className="subtitle">Earn points on every purchase and redeem amazing rewards</p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* Points Overview Card */}
      {pointsData && (
        <div className="points-overview">
          <div className="overview-card main">
            <p className="overview-label">Available Points</p>
            <p className="overview-value">{pointsData.availablePoints}</p>
            <p className="overview-secondary">Total Earned: {pointsData.totalPoints}</p>
          </div>

          <div className="overview-card">
            <p className="overview-label">Tier Status</p>
            <div className="tier-badge">
              {pointsData.tier === 'bronze' && '🥉'}
              {pointsData.tier === 'silver' && '🥈'}
              {pointsData.tier === 'gold' && '🥇'}
              {pointsData.tier === 'platinum' && '👑'}
              {' '}{tierInfo?.name}
            </div>
            {tierInfo?.pointsUntilNext && (
              <p className="tier-progress">{tierInfo.pointsUntilNext} points to {tierInfo.nextTier}</p>
            )}
          </div>

          <div className="overview-card">
            <p className="overview-label">Redemptions</p>
            <p className="overview-value">{pointsData.totalRedemptions}</p>
            <p className="overview-secondary">Points used: {pointsData.redeemedPoints}</p>
          </div>
        </div>
      )}

      {/* Tier Benefits */}
      {tierInfo && (
        <div className="tier-benefits">
          <h3>✨ Your {tierInfo.name} Benefits</h3>
          <ul className="benefits-list">
            {tierInfo.benefits.map((benefit, index) => (
              <li key={index}>{benefit}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'balance' ? 'active' : ''}`}
          onClick={() => setActiveTab('balance')}
        >
          💰 Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'redeem' ? 'active' : ''}`}
          onClick={() => setActiveTab('redeem')}
        >
          🎉 Redeem Rewards
        </button>
        <button 
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📜 History
        </button>
      </div>

      {/* Tab Content - Overview */}
      {activeTab === 'balance' && pointsData && (
        <div className="tab-content">
          <div className="overview-grid">
            {/* Points by Category */}
            <div className="category-section">
              <h3>📊 Points by Category</h3>
              {Object.keys(pointsSummary).length > 0 ? (
                <div className="category-list">
                  {Object.entries(pointsSummary).map(([category, data]) => (
                    <div key={category} className="category-item">
                      <div className="category-info">
                        <p className="category-name">{category.charAt(0).toUpperCase() + category.slice(1)}</p>
                        <p className="category-transactions">{data.transactions} transactions</p>
                      </div>
                      <p className="category-points">{data.points} pts</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-data">No purchases yet. Start earning points!</p>
              )}
            </div>

            {/* How to Earn */}
            <div className="how-to-earn">
              <h3>🎯 How to Earn Points</h3>
              <div className="earning-rates">
                <div className="earning-item">
                  <span className="category">Airtime</span>
                  <span className="rate">1 pt per ₦100</span>
                </div>
                <div className="earning-item">
                  <span className="category">Data</span>
                  <span className="rate">1 pt per ₦200</span>
                </div>
                <div className="earning-item">
                  <span className="category">Electricity</span>
                  <span className="rate">2 pts per ₦500</span>
                </div>
                <div className="earning-item">
                  <span className="category">Cable TV</span>
                  <span className="rate">1 pt per ₦200</span>
                </div>
                <div className="earning-item">
                  <span className="category">Internet</span>
                  <span className="rate">1 pt per ₦200</span>
                </div>
                <div className="earning-item">
                  <span className="category">Education</span>
                  <span className="rate">2 pts per ₦500</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content - Redeem Rewards */}
      {activeTab === 'redeem' && (
        <div className="tab-content">
          <div className="redemption-grid">
            {redemptionOptions.map((reward) => (
              <div 
                key={reward.id} 
                className={`reward-card ${canRedeem(reward.points) ? 'available' : 'unavailable'}`}
              >
                <div className="reward-header">
                  {reward.type === 'discount' && '🏷️'}
                  {reward.type === 'airtime' && '📱'}
                  {reward.type === 'data' && '📡'}
                  {reward.type === 'cashback' && '💵'}
                  <span className="reward-title">{reward.label}</span>
                </div>

                <p className="reward-description">{reward.description}</p>

                <div className="reward-details">
                  <div className="detail-item">
                    <span className="label">Points Needed</span>
                    <span className="value">{reward.points}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Value</span>
                    <span className="value">₦{reward.value}</span>
                  </div>
                </div>

                {canRedeem(reward.points) ? (
                  <button
                    className="redeem-btn"
                    onClick={() => handleRedeemPoints(reward.id, reward.points, reward.value)}
                    disabled={redeeming}
                  >
                    {redeeming ? 'Processing...' : 'Redeem Now'}
                  </button>
                ) : (
                  <button className="redeem-btn unavailable">
                    Need {reward.points - (pointsData?.availablePoints || 0)} more points
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content - History */}
      {activeTab === 'history' && (
        <div className="tab-content">
          <div className="history-container">
            {/* Redemption History */}
            <div className="history-section">
              <h3>🎁 Redemption History</h3>
              {redemptionHistory.length > 0 ? (
                <div className="history-list">
                  {redemptionHistory.map((item) => (
                    <div key={item.id} className="history-item redemption">
                      <div className="history-icon">🎉</div>
                      <div className="history-content">
                        <p className="history-title">Points Redeemed</p>
                        <p className="history-date">{formatDate(item.redemptionDate)}</p>
                      </div>
                      <div className="history-value">
                        <p className="points-used">-{item.pointsUsed} pts</p>
                        <p className="status">{item.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-data">No redemptions yet</p>
              )}
            </div>

            {/* Earning History */}
            <div className="history-section">
              <h3>💰 Points Earned</h3>
              {pointsHistory.filter(h => h.type === 'earn').length > 0 ? (
                <div className="history-list">
                  {pointsHistory.filter(h => h.type === 'earn').map((item) => (
                    <div key={item.id} className="history-item earning">
                      <div className="history-icon">⭐</div>
                      <div className="history-content">
                        <p className="history-title">{item.source?.charAt(0).toUpperCase() + item.source?.slice(1)} Purchase</p>
                        <p className="history-date">{formatDate(item.timestamp)}</p>
                      </div>
                      <div className="history-value">
                        <p className="points-earned">+{item.points} pts</p>
                        <p className="amount">₦{item.transactionAmount?.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-data">No earning history yet</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rewards;
