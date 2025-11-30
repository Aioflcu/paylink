/**
 * Referrals.js
 * Referral Program UI
 * Share referral link, track earnings, view referrals
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import referralService from '../services/referralService';
import LoadingSpinner from '../components/LoadingSpinner';
import './Referrals.css';

const Referrals = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // overview, referrals, earnings, tiers
  const [referralStats, setReferralStats] = useState(null);
  const [referralHistory, setReferralHistory] = useState([]);
  const [earningsHistory, setEarningsHistory] = useState([]);
  const [copied, setCopied] = useState(false);

  // Fetch referral data
  useEffect(() => {
    if (!user?.uid) {
      navigate('/login');
      return;
    }
    loadReferralData();
  }, [user?.uid, navigate]);

  const loadReferralData = async () => {
    try {
      setLoading(true);
      setError('');

      const [stats, referrals, earnings] = await Promise.all([
        referralService.getReferralStats(user.uid),
        referralService.getReferralHistory(user.uid),
        referralService.getReferralEarnings(user.uid)
      ]);

      setReferralStats(stats);
      setReferralHistory(referrals);
      setEarningsHistory(earnings);
    } catch (err) {
      console.error('Error loading referral data:', err);
      setError('Failed to load referral data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareViaWhatsApp = () => {
    if (!referralStats) return;
    const shareText = referralService.getShareableReferralText(
      referralStats.referralCode,
      user?.displayName || 'Friend'
    );
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareViaEmail = () => {
    if (!referralStats) return;
    const shareText = referralService.getShareableReferralText(
      referralStats.referralCode,
      user?.displayName || 'Friend'
    );
    const emailUrl = `mailto:?subject=Join Paylink!&body=${encodeURIComponent(shareText)}`;
    window.open(emailUrl);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp?.toDate?.() || new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="referrals-page">
        <LoadingSpinner />
      </div>
    );
  }

  const allTiers = referralService.getAllBonusTiers();

  return (
    <div className="referrals-page">
      {/* Header */}
      <div className="referrals-header">
        <h1>🎯 Referral Program</h1>
        <p className="subtitle">Earn money by referring friends</p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* Referral Overview Card */}
      {referralStats && (
        <div className="referral-overview">
          <div className="overview-section">
            <h3>Your Referral Code</h3>
            <div className="code-display">
              <span className="code">{referralStats.referralCode}</span>
              <button 
                className="copy-btn"
                onClick={() => copyToClipboard(referralStats.referralCode)}
              >
                {copied ? '✓ Copied!' : '📋 Copy'}
              </button>
            </div>
          </div>

          <div className="overview-stats">
            <div className="stat-card">
              <p className="stat-label">Total Referrals</p>
              <p className="stat-value">{referralStats.totalReferrals}</p>
              <p className="stat-active">{referralStats.activeReferrals} active</p>
            </div>

            <div className="stat-card">
              <p className="stat-label">Total Earnings</p>
              <p className="stat-value">₦{referralStats.totalEarnings?.toLocaleString()}</p>
              <p className="stat-points">{referralStats.totalBonusPoints} bonus points</p>
            </div>

            <div className="stat-card tier-card">
              <p className="stat-label">Current Tier</p>
              <div className="tier-display">
                <span className="tier-icon">{referralStats.tierInfo?.icon}</span>
                <span className="tier-name">{referralStats.tierInfo?.name}</span>
              </div>
              {referralStats.nextTierName && (
                <p className="tier-progress">
                  {referralStats.progressToNextTier}% to {referralStats.nextTierName}
                </p>
              )}
            </div>
          </div>

          <div className="share-buttons">
            <button className="share-btn whatsapp" onClick={shareViaWhatsApp}>
              💬 Share on WhatsApp
            </button>
            <button className="share-btn email" onClick={shareViaEmail}>
              📧 Share via Email
            </button>
            <button 
              className="share-btn link"
              onClick={() => copyToClipboard(referralStats.referralLink)}
            >
              🔗 Copy Link
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'referrals' ? 'active' : ''}`}
          onClick={() => setActiveTab('referrals')}
        >
          👥 My Referrals
        </button>
        <button 
          className={`tab-btn ${activeTab === 'earnings' ? 'active' : ''}`}
          onClick={() => setActiveTab('earnings')}
        >
          💰 Earnings
        </button>
        <button 
          className={`tab-btn ${activeTab === 'tiers' ? 'active' : ''}`}
          onClick={() => setActiveTab('tiers')}
        >
          🏆 Bonus Tiers
        </button>
      </div>

      {/* Tab Content - Overview */}
      {activeTab === 'overview' && (
        <div className="tab-content">
          <div className="how-it-works">
            <h3>💡 How It Works</h3>
            <div className="steps-container">
              <div className="step">
                <div className="step-number">1</div>
                <h4>Share Your Code</h4>
                <p>Share your unique referral code with friends</p>
              </div>
              <div className="step">
                <div className="step-number">2</div>
                <h4>Friends Register</h4>
                <p>Friends use your code when registering</p>
              </div>
              <div className="step">
                <div className="step-number">3</div>
                <h4>Earn Bonus</h4>
                <p>Earn 5% of their first transaction</p>
              </div>
              <div className="step">
                <div className="step-number">4</div>
                <h4>Unlock Tiers</h4>
                <p>Reach milestones to unlock bonus rewards</p>
              </div>
            </div>
          </div>

          <div className="benefits-section">
            <h3>🎁 Benefits</h3>
            <ul className="benefits-list">
              <li>Earn ₦500-₦5,000 per referral</li>
              <li>Unlock tier bonuses up to ₦50,000</li>
              <li>Get bonus points for redemptions</li>
              <li>Lifetime earnings from referrals</li>
              <li>No referral cap - unlimited earnings!</li>
            </ul>
          </div>
        </div>
      )}

      {/* Tab Content - My Referrals */}
      {activeTab === 'referrals' && (
        <div className="tab-content">
          {referralHistory.length > 0 ? (
            <div className="referrals-list">
              <h3>Referral List ({referralHistory.length})</h3>
              {referralHistory.map((referral, index) => (
                <div key={referral.id} className="referral-item">
                  <div className="referral-number">#{index + 1}</div>
                  <div className="referral-info">
                    <p className="referral-id">Referral ID: {referral.referredUserId.substring(0, 8)}</p>
                    <p className="referral-date">{formatDate(referral.referredAt)}</p>
                  </div>
                  <div className="referral-status">
                    <span className="status-badge active">{referral.status}</span>
                    <p className="earnings">₦{referral.totalEarningsFromReferral?.toLocaleString() || 0}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No referrals yet. Start sharing your code!</p>
            </div>
          )}
        </div>
      )}

      {/* Tab Content - Earnings */}
      {activeTab === 'earnings' && (
        <div className="tab-content">
          {earningsHistory.length > 0 ? (
            <div className="earnings-list">
              <h3>Earnings History</h3>
              {earningsHistory.map((earning) => (
                <div key={earning.id} className="earnings-item">
                  <div className="earning-icon">💰</div>
                  <div className="earning-info">
                    <p className="earning-type">Referral Bonus</p>
                    <p className="earning-date">{formatDate(earning.earnedAt)}</p>
                  </div>
                  <div className="earning-value">
                    <p className="amount">+₦{earning.bonusValue?.toLocaleString()}</p>
                    <p className="points">+{earning.bonusPoints} pts</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No earnings yet. Refer friends to start earning!</p>
            </div>
          )}
        </div>
      )}

      {/* Tab Content - Bonus Tiers */}
      {activeTab === 'tiers' && (
        <div className="tab-content">
          <div className="tiers-container">
            <h3>🏆 Bonus Tier System</h3>
            <p className="tier-description">
              Reach referral milestones to unlock bonus tier rewards
            </p>

            <div className="tiers-grid">
              {Object.entries(allTiers).map(([tierKey, tierData]) => {
                const isCurrentTier = referralStats?.currentTier === tierKey;
                const isReachedTier = referralStats && 
                  referralService.getReferralTier(referralStats.totalReferrals) === tierKey ||
                  Object.keys(allTiers).indexOf(tierKey) <= Object.keys(allTiers).indexOf(referralStats?.currentTier);

                return (
                  <div 
                    key={tierKey} 
                    className={`tier-card ${isCurrentTier ? 'current' : ''} ${isReachedTier ? 'reached' : ''}`}
                  >
                    <div className="tier-header">
                      <span className="tier-icon">{tierData.icon}</span>
                      <h4>{tierData.description.split('=')[0]}</h4>
                    </div>

                    <div className="tier-rewards">
                      <p className="reward-value">₦{tierData.bonusValue?.toLocaleString()}</p>
                      <p className="reward-points">{tierData.bonusPoints} points</p>
                    </div>

                    {isCurrentTier && (
                      <div className="tier-badge">Current Tier</div>
                    )}

                    {isReachedTier && !isCurrentTier && (
                      <div className="tier-badge completed">Unlocked</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Referrals;
