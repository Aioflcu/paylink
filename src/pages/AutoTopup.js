/**
 * AutoTopup.js
 * Auto Top-Up Service - Automation Rules
 * Create and manage automatic top-up rules for balance, data, electricity
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import autoTopupService from '../services/autoTopupService';
import walletService from '../services/walletService';
import LoadingSpinner from '../components/LoadingSpinner';
import './AutoTopup.css';

const AutoTopup = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rules, setRules] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);

  // Form state
  const [ruleType, setRuleType] = useState('balance'); // balance, data, electricity
  const [threshold, setThreshold] = useState('');
  const [topupAmount, setTopupAmount] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [provider, setProvider] = useState('');
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [creating, setCreating] = useState(false);

  // Fetch rules
  useEffect(() => {
    if (!currentUser?.uid) {
      navigate('/login');
      return;
    }
    loadRules();
  }, [currentUser?.uid, navigate]);

  const loadRules = async () => {
    try {
      setLoading(true);
      setError('');

      const [userRules, balance] = await Promise.all([
        autoTopupService.getUserRules(currentUser.uid),
        walletService.getWalletBalance(currentUser.uid)
      ]);

      setRules(userRules || []);
      setWalletBalance(balance || 0);
    } catch (err) {
      console.error('Error loading rules:', err);
      setError('Failed to load auto-topup rules');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = async (e) => {
    e.preventDefault();
    try {
      setCreating(true);
      setError('');

      // Validate form
      if (!threshold || !topupAmount) {
        setError('Please fill in all required fields');
        return;
      }

      const ruleData = {
        ruleType,
        threshold: parseInt(threshold),
        action: {
          type: 'topup',
          amount: parseInt(topupAmount),
          accountNumber: accountNumber || user.phoneNumber,
          provider: provider || 'system'
        },
        notificationEnabled
      };

      let result;
      if (editingRule) {
        result = await autoTopupService.updateRule(currentUser.uid, editingRule.id, ruleData);
      } else {
        result = await autoTopupService.createAutoTopupRule(currentUser.uid, ruleData);
      }

      alert(editingRule ? 'Rule updated successfully' : 'Auto-topup rule created successfully');
      
      // Reset form
      resetForm();
      await loadRules();
    } catch (err) {
      console.error('Error creating rule:', err);
      setError(err.message || 'Failed to create rule');
    } finally {
      setCreating(false);
    }
  };

  const handleEditRule = (rule) => {
    setEditingRule(rule);
    setRuleType(rule.ruleType);
    setThreshold(rule.threshold.toString());
    setTopupAmount(rule.action.amount.toString());
    setAccountNumber(rule.action.accountNumber);
    setProvider(rule.action.provider);
    setNotificationEnabled(rule.notificationEnabled);
    setShowForm(true);
  };

  const handleDeleteRule = async (ruleId) => {
    try {
      if (!window.confirm('Delete this auto-topup rule?')) return;

      setLoading(true);
      await autoTopupService.deleteRule(currentUser.uid, ruleId);
      alert('Rule deleted successfully');
      await loadRules();
    } catch (err) {
      console.error('Error deleting rule:', err);
      setError('Failed to delete rule');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRule = async (ruleId, currentStatus) => {
    try {
      await autoTopupService.toggleRuleStatus(currentUser.uid, ruleId, !currentStatus);
      await loadRules();
    } catch (err) {
      console.error('Error toggling rule:', err);
      setError('Failed to update rule');
    }
  };

  const resetForm = () => {
    setRuleType('balance');
    setThreshold('');
    setTopupAmount('');
    setAccountNumber('');
    setProvider('');
    setNotificationEnabled(true);
    setEditingRule(null);
    setShowForm(false);
  };

  const getRuleTypeIcon = (type) => {
    const iconMap = {
      'balance': '💰',
      'data': '📱',
      'electricity': '⚡'
    };
    return iconMap[type] || '🔄';
  };

  const getRuleTypeLabel = (type) => {
    const labelMap = {
      'balance': 'Low Balance Alert',
      'data': 'Data Renewal',
      'electricity': 'Electricity Reminder'
    };
    return labelMap[type] || type;
  };

  const getThresholdLabel = (type) => {
    const labelMap = {
      'balance': '₦',
      'data': 'MB',
      'electricity': 'days'
    };
    return labelMap[type] || '';
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp?.toDate?.() || new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading && rules.length === 0) {
    return (
      <div className="auto-topup-page">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="auto-topup-page">
      {/* Header */}
      <div className="topup-header">
        <div className="header-content">
          <h1>🤖 Auto Top-Up</h1>
          <p className="subtitle">
            Create automation rules for automatic top-ups and reminders
          </p>
        </div>
        {!showForm && (
          <button
            className="create-btn"
            onClick={() => setShowForm(true)}
          >
            + Create Rule
          </button>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* Wallet Balance */}
      <div className="balance-card">
        <div className="balance-icon">💰</div>
        <div className="balance-content">
          <p className="balance-label">Current Wallet Balance</p>
          <p className="balance-value">₦{walletBalance.toLocaleString()}</p>
        </div>
      </div>

      {/* Create Rule Form */}
      {showForm && (
        <div className="rule-form-container">
          <div className="form-header">
            <h3>{editingRule ? 'Edit Auto-Topup Rule' : 'Create New Auto-Topup Rule'}</h3>
            <button
              className="close-form-btn"
              onClick={resetForm}
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleCreateRule} className="rule-form">
            {/* Rule Type */}
            <div className="form-group">
              <label>Rule Type</label>
              <div className="rule-type-options">
                <button
                  type="button"
                  className={`type-option ${ruleType === 'balance' ? 'active' : ''}`}
                  onClick={() => setRuleType('balance')}
                >
                  💰 Low Balance Alert
                </button>
                <button
                  type="button"
                  className={`type-option ${ruleType === 'data' ? 'active' : ''}`}
                  onClick={() => setRuleType('data')}
                >
                  📱 Data Renewal
                </button>
                <button
                  type="button"
                  className={`type-option ${ruleType === 'electricity' ? 'active' : ''}`}
                  onClick={() => setRuleType('electricity')}
                >
                  ⚡ Electricity Reminder
                </button>
              </div>
            </div>

            {/* Threshold */}
            <div className="form-group">
              <label>
                Trigger When {ruleType === 'balance' ? 'Balance' : ruleType === 'data' ? 'Data' : 'Next Payment'} Falls Below
              </label>
              <div className="input-with-unit">
                <input
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  placeholder="Enter threshold"
                  min="0"
                  required
                />
                <span className="unit">{getThresholdLabel(ruleType)}</span>
              </div>
              <p className="help-text">
                {ruleType === 'balance' && 'Example: 500 - Auto top-up when balance drops below ₦500'}
                {ruleType === 'data' && 'Example: 100 - Auto renew when data falls below 100MB'}
                {ruleType === 'electricity' && 'Example: 7 - Remind in 7 days before next payment'}
              </p>
            </div>

            {/* Top-up Amount */}
            {ruleType !== 'electricity' && (
              <div className="form-group">
                <label>Top-Up Amount</label>
                <div className="input-with-icon">
                  <span className="input-icon">₦</span>
                  <input
                    type="number"
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    placeholder="Enter amount"
                    min="0"
                    required
                  />
                </div>
                <p className="help-text">Amount to automatically purchase</p>
              </div>
            )}

            {/* Account Number */}
            {ruleType !== 'electricity' && (
              <div className="form-group">
                <label>Account/Phone Number (Optional)</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Leave blank to use your number"
                />
              </div>
            )}

            {/* Notification */}
            <div className="form-group checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={notificationEnabled}
                  onChange={(e) => setNotificationEnabled(e.target.checked)}
                />
                <span>Send me notifications when rule is triggered</span>
              </label>
            </div>

            {/* Actions */}
            <div className="form-actions">
              <button
                type="submit"
                className="submit-btn"
                disabled={creating}
              >
                {creating ? '⏳ Creating...' : editingRule ? '✓ Update Rule' : '✓ Create Rule'}
              </button>
              <button
                type="button"
                className="cancel-btn"
                onClick={resetForm}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Rules List */}
      <div className="rules-container">
        <h3>Your Auto-Topup Rules ({rules.length})</h3>

        {rules.length > 0 ? (
          <div className="rules-grid">
            {rules.map((rule) => (
              <div 
                key={rule.id}
                className={`rule-card ${rule.active ? 'active' : 'inactive'}`}
              >
                <div className="rule-icon">{getRuleTypeIcon(rule.ruleType)}</div>

                <div className="rule-content">
                  <div className="rule-header">
                    <p className="rule-title">{getRuleTypeLabel(rule.ruleType)}</p>
                    <button
                      className={`toggle-btn ${rule.active ? 'on' : 'off'}`}
                      onClick={() => handleToggleRule(rule.id, rule.active)}
                      title={rule.active ? 'Disable' : 'Enable'}
                    >
                      {rule.active ? '✓' : '✕'}
                    </button>
                  </div>

                  <div className="rule-details">
                    <p className="detail-item">
                      <span className="detail-label">Trigger:</span>
                      <span className="detail-value">
                        {rule.threshold}{getThresholdLabel(rule.ruleType)}
                      </span>
                    </p>
                    
                    {rule.ruleType !== 'electricity' && (
                      <p className="detail-item">
                        <span className="detail-label">Top-Up:</span>
                        <span className="detail-value">₦{rule.action.amount?.toLocaleString()}</span>
                      </p>
                    )}

                    <p className="detail-item">
                      <span className="detail-label">Created:</span>
                      <span className="detail-value">{formatDate(rule.createdAt)}</span>
                    </p>

                    {rule.lastTriggered && (
                      <p className="detail-item">
                        <span className="detail-label">Last Triggered:</span>
                        <span className="detail-value">{formatDate(rule.lastTriggered)}</span>
                      </p>
                    )}
                  </div>

                  {rule.notificationEnabled && (
                    <p className="notification-badge">🔔 Notifications enabled</p>
                  )}
                </div>

                <div className="rule-actions">
                  <button
                    className="action-btn edit"
                    onClick={() => handleEditRule(rule)}
                  >
                    ✎ Edit
                  </button>
                  <button
                    className="action-btn delete"
                    onClick={() => handleDeleteRule(rule.id)}
                  >
                    🗑 Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p className="empty-icon">🤖</p>
            <p className="empty-title">No Auto-Topup Rules</p>
            <p className="empty-message">
              Create your first rule to automate top-ups and payments
            </p>
            <button
              className="create-rule-btn"
              onClick={() => setShowForm(true)}
            >
              Create Your First Rule
            </button>
          </div>
        )}
      </div>

      {/* How It Works */}
      <div className="how-it-works">
        <h3>📖 How Auto-Topup Works</h3>
        <div className="steps-container">
          <div className="step-card">
            <div className="step-number">1</div>
            <p className="step-title">Create a Rule</p>
            <p className="step-text">Set your trigger threshold and action amount</p>
          </div>
          <div className="step-card">
            <div className="step-number">2</div>
            <p className="step-title">System Monitors</p>
            <p className="step-text">We continuously monitor your balance 24/7</p>
          </div>
          <div className="step-card">
            <div className="step-number">3</div>
            <p className="step-title">Auto Triggers</p>
            <p className="step-text">When threshold is reached, action executes</p>
          </div>
          <div className="step-card">
            <div className="step-number">4</div>
            <p className="step-title">Get Notified</p>
            <p className="step-text">You receive instant notification of the action</p>
          </div>
        </div>

        <div className="safety-info">
          <p className="safety-icon">🔒</p>
          <p className="safety-text">
            <strong>Secure & Safe:</strong> Auto-topup uses your saved payment method and respects your spending limits. 
            You can enable/disable rules anytime.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AutoTopup;
