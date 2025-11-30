/**
 * SecurityAlerts.js
 * AI Fraud Detection & Security Alerts Dashboard
 * View suspicious activity, manage blocked devices, verify logins
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import fraudDetection from '../services/fraudDetection';
import LoadingSpinner from '../components/LoadingSpinner';
import './SecurityAlerts.css';

const SecurityAlerts = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [blockedDevices, setBlockedDevices] = useState([]);
  const [suspiciousActivities, setSuspiciousActivities] = useState([]);
  const [riskScore, setRiskScore] = useState(0);
  const [activeTab, setActiveTab] = useState('alerts'); // alerts, devices, activities
  const [verifyingAlert, setVerifyingAlert] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Fetch security data
  useEffect(() => {
    if (!user?.uid) {
      navigate('/login');
      return;
    }
    loadSecurityData();
  }, [user?.uid, navigate]);

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      setError('');

      const [recentAlerts, blockedDev, activities, score] = await Promise.all([
        fraudDetection.getRecentAlerts(user.uid),
        fraudDetection.getBlockedDevices(user.uid),
        fraudDetection.getSuspiciousActivities(user.uid),
        fraudDetection.calculateRiskScore(user.uid)
      ]);

      setAlerts(recentAlerts || []);
      setBlockedDevices(blockedDev || []);
      setSuspiciousActivities(activities || []);
      setRiskScore(score || 0);
    } catch (err) {
      console.error('Error loading security data:', err);
      setError('Failed to load security alerts');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAlert = async (alertId, alertType) => {
    try {
      setVerifying(true);
      setError('');

      // Verify with OTP
      const result = await fraudDetection.verifyLoginWithOTP(user.uid, alertId, otpCode);

      if (result.verified) {
        alert('Login verified successfully');
        setVerifyingAlert(null);
        setOtpCode('');
        await loadSecurityData();
      } else {
        setError('Invalid OTP. Please try again.');
      }
    } catch (err) {
      console.error('Error verifying alert:', err);
      setError(err.message || 'Failed to verify login');
    } finally {
      setVerifying(false);
    }
  };

  const handleUnblockDevice = async (deviceId) => {
    try {
      if (!window.confirm('Are you sure you want to unblock this device?')) return;

      setLoading(true);
      await fraudDetection.unblockDevice(user.uid, deviceId);
      alert('Device unblocked');
      await loadSecurityData();
    } catch (err) {
      console.error('Error unblocking device:', err);
      setError('Failed to unblock device');
    } finally {
      setLoading(false);
    }
  };

  const handleDismissAlert = async (alertId) => {
    try {
      await fraudDetection.dismissAlert(user.uid, alertId);
      setAlerts(alerts.filter(a => a.id !== alertId));
    } catch (err) {
      console.error('Error dismissing alert:', err);
      setError('Failed to dismiss alert');
    }
  };

  const getRiskLevel = () => {
    if (riskScore < 30) return { level: 'Low', color: '#10b981', icon: '✓' };
    if (riskScore < 60) return { level: 'Medium', color: '#f59e0b', icon: '⚠' };
    if (riskScore < 85) return { level: 'High', color: '#ef4444', icon: '⛔' };
    return { level: 'Critical', color: '#991b1b', icon: '🔒' };
  };

  const getSeverity = (alertType) => {
    const severityMap = {
      'unusual_location': 'High',
      'multiple_failed_attempts': 'Critical',
      'large_purchase': 'Medium',
      'device_change': 'High',
      'withdrawal_attempt': 'Critical',
      'suspicious_pattern': 'Medium'
    };
    return severityMap[alertType] || 'Medium';
  };

  const getAlertIcon = (alertType) => {
    const iconMap = {
      'unusual_location': '🌍',
      'multiple_failed_attempts': '🔐',
      'large_purchase': '💰',
      'device_change': '📱',
      'withdrawal_attempt': '💸',
      'suspicious_pattern': '🚨'
    };
    return iconMap[alertType] || '⚠';
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp?.toDate?.() || new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && alerts.length === 0) {
    return (
      <div className="security-alerts-page">
        <LoadingSpinner />
      </div>
    );
  }

  const riskInfo = getRiskLevel();

  return (
    <div className="security-alerts-page">
      {/* Header */}
      <div className="security-header">
        <div className="header-content">
          <h1>🔐 Security Alerts</h1>
          <p className="subtitle">Monitor suspicious activity and manage your account security</p>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* Risk Score Card */}
      <div className="risk-card" style={{ borderLeftColor: riskInfo.color }}>
        <div className="risk-header">
          <div className="risk-score" style={{ color: riskInfo.color }}>
            {riskInfo.icon}
          </div>
          <div className="risk-content">
            <p className="risk-label">Account Risk Level</p>
            <p className="risk-level" style={{ color: riskInfo.color }}>
              {riskInfo.level} ({riskScore}%)
            </p>
          </div>
        </div>
        <div className="risk-bar">
          <div 
            className="risk-progress"
            style={{ width: `${riskScore}%`, backgroundColor: riskInfo.color }}
          />
        </div>
        <p className="risk-recommendation">
          {riskScore < 30 && '✓ Your account is secure. Keep up good security practices.'}
          {riskScore >= 30 && riskScore < 60 && '⚠ Review recent login activity and verify suspicious logins.'}
          {riskScore >= 60 && riskScore < 85 && '⛔ Unusual activity detected. Change your password and review security settings.'}
          {riskScore >= 85 && '🔒 Critical threat detected. Contact support and enable all security features.'}
        </p>
      </div>

      {/* Tabs */}
      <div className="security-tabs">
        <button 
          className={`tab-btn ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          🚨 Recent Alerts ({alerts.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'devices' ? 'active' : ''}`}
          onClick={() => setActiveTab('devices')}
        >
          📱 Blocked Devices ({blockedDevices.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'activities' ? 'active' : ''}`}
          onClick={() => setActiveTab('activities')}
        >
          📊 Suspicious Activities ({suspiciousActivities.length})
        </button>
      </div>

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="alerts-content">
          {alerts.length > 0 ? (
            <div className="alerts-list">
              {alerts.map((alert) => (
                <div 
                  key={alert.id} 
                  className={`alert-card severity-${getSeverity(alert.type).toLowerCase()}`}
                >
                  <div className="alert-icon">{getAlertIcon(alert.type)}</div>
                  
                  <div className="alert-details">
                    <div className="alert-header">
                      <p className="alert-title">{alert.title}</p>
                      <span className={`severity-badge ${getSeverity(alert.type).toLowerCase()}`}>
                        {getSeverity(alert.type)}
                      </span>
                    </div>
                    <p className="alert-description">{alert.description}</p>
                    
                    <div className="alert-meta">
                      <span className="meta-item">
                        📍 {alert.location || 'Unknown location'}
                      </span>
                      <span className="meta-item">
                        📱 {alert.device || 'Unknown device'}
                      </span>
                      <span className="meta-item">
                        🕐 {formatDate(alert.timestamp)}
                      </span>
                    </div>

                    {alert.requiresVerification && (
                      <div className="verification-section">
                        <p className="verify-prompt">Verify this login attempt with OTP</p>
                        {verifyingAlert === alert.id ? (
                          <div className="otp-input-group">
                            <input
                              type="text"
                              placeholder="Enter 6-digit OTP"
                              maxLength="6"
                              value={otpCode}
                              onChange={(e) => setOtpCode(e.target.value)}
                              className="otp-input"
                            />
                            <button
                              className="verify-btn"
                              onClick={() => handleVerifyAlert(alert.id, alert.type)}
                              disabled={verifying || otpCode.length !== 6}
                            >
                              {verifying ? 'Verifying...' : 'Verify'}
                            </button>
                            <button
                              className="cancel-btn"
                              onClick={() => setVerifyingAlert(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            className="action-btn verify"
                            onClick={() => setVerifyingAlert(alert.id)}
                          >
                            ✓ Verify Login
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    className="dismiss-btn"
                    onClick={() => handleDismissAlert(alert.id)}
                    title="Dismiss alert"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p className="empty-icon">✓</p>
              <p className="empty-title">No Security Alerts</p>
              <p className="empty-message">Your account is secure with no recent suspicious activities</p>
            </div>
          )}
        </div>
      )}

      {/* Blocked Devices Tab */}
      {activeTab === 'devices' && (
        <div className="devices-content">
          {blockedDevices.length > 0 ? (
            <div className="devices-list">
              {blockedDevices.map((device) => (
                <div key={device.id} className="device-card">
                  <div className="device-icon">📱</div>
                  <div className="device-details">
                    <p className="device-name">{device.name}</p>
                    <p className="device-info">
                      {device.os} • {device.browser}
                    </p>
                    <p className="device-ip">IP: {device.ipAddress}</p>
                    <p className="device-blocked">
                      🚫 Blocked on {formatDate(device.blockedAt)}
                    </p>
                    <p className="device-reason">
                      Reason: {device.reason}
                    </p>
                  </div>
                  <button
                    className="action-btn unblock"
                    onClick={() => handleUnblockDevice(device.id)}
                  >
                    Unblock Device
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p className="empty-icon">✓</p>
              <p className="empty-title">No Blocked Devices</p>
              <p className="empty-message">All your devices are allowed to access your account</p>
            </div>
          )}
        </div>
      )}

      {/* Suspicious Activities Tab */}
      {activeTab === 'activities' && (
        <div className="activities-content">
          {suspiciousActivities.length > 0 ? (
            <div className="activities-list">
              {suspiciousActivities.map((activity) => (
                <div key={activity.id} className="activity-card">
                  <div className="activity-icon">{getAlertIcon(activity.type)}</div>
                  <div className="activity-details">
                    <p className="activity-title">{activity.title}</p>
                    <p className="activity-description">{activity.description}</p>
                    <div className="activity-meta">
                      <span className="meta-item">
                        💰 {activity.amount ? `₦${activity.amount.toLocaleString()}` : 'N/A'}
                      </span>
                      <span className="meta-item">
                        📍 {activity.location || 'Unknown'}
                      </span>
                      <span className="meta-item">
                        🕐 {formatDate(activity.timestamp)}
                      </span>
                    </div>
                  </div>
                  <span className={`severity-badge ${getSeverity(activity.type).toLowerCase()}`}>
                    {getSeverity(activity.type)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p className="empty-icon">✓</p>
              <p className="empty-title">No Suspicious Activities</p>
              <p className="empty-message">No unusual activities detected on your account</p>
            </div>
          )}
        </div>
      )}

      {/* Security Tips */}
      <div className="security-tips">
        <h3>🛡 Security Tips</h3>
        <div className="tips-grid">
          <div className="tip-card">
            <p className="tip-icon">🔑</p>
            <p className="tip-title">Strong Password</p>
            <p className="tip-text">Use a unique password with 12+ characters, uppercase, numbers, and symbols</p>
          </div>
          <div className="tip-card">
            <p className="tip-icon">📱</p>
            <p className="tip-title">2FA Protection</p>
            <p className="tip-text">Enable two-factor authentication to add an extra layer of security</p>
          </div>
          <div className="tip-card">
            <p className="tip-icon">🔒</p>
            <p className="tip-title">Verify Logins</p>
            <p className="tip-text">Always verify suspicious login attempts from new devices or locations</p>
          </div>
          <div className="tip-card">
            <p className="tip-icon">⏰</p>
            <p className="tip-title">Regular Checkups</p>
            <p className="tip-text">Review your security settings and login history regularly</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityAlerts;
