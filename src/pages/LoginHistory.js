/**
 * LoginHistory.js
 * User Login History & Device Management
 * Track login locations, devices, sessions
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { securityAPI } from '../services/backendAPI';
import LoadingSpinner from '../components/LoadingSpinner';
import './LoginHistory.css';

const LoginHistory = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [logins, setLogins] = useState([]);
  const [devices, setDevices] = useState([]);
  const [lastLogin, setLastLogin] = useState(null);
  const [activeSessions, setActiveSessions] = useState([]);
  const [suspiciousLogins, setSuspiciousLogins] = useState([]);
  const [activeTab, setActiveTab] = useState('history'); // history, devices, sessions
  const [logoutConf, setLogoutConf] = useState(null);

  // Fetch login data
  useEffect(() => {
    if (!currentUser?.uid) {
      navigate('/login');
      return;
    }
    loadLoginData();
  }, [currentUser?.uid, navigate]);

  const loadLoginData = async () => {
    try {
      setLoading(true);
      setError('');

      const [loginHistory, devicesList, lastLog, sessions, suspicious] = await Promise.all([
        securityAPI.getLoginHistory(currentUser.uid, 50),
        securityAPI.getDevices(currentUser.uid),
        securityAPI.getLastLogin(currentUser.uid),
        securityAPI.getActiveSessions(currentUser.uid),
        securityAPI.getSuspiciousLogins(currentUser.uid)
      ]);

      setLogins(loginHistory || []);
      setDevices(devicesList || []);
      setLastLogin(lastLog || null);
      setActiveSessions(sessions || []);
      setSuspiciousLogins(suspicious || []);
    } catch (err) {
      console.error('Error loading login data:', err);
      setError('Failed to load login history');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutSession = async (sessionId) => {
    try {
      if (!window.confirm('End this session? You will need to login again.')) return;

      setLoading(true);
      await securityAPI.terminateSession(currentUser.uid, sessionId);
      alert('Session ended successfully');
      await loadLoginData();
    } catch (err) {
      console.error('Error logging out session:', err);
      setError('Failed to end session');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutAllOthers = async () => {
    try {
      if (!window.confirm('End all other sessions? You will be logged out from all other devices.')) return;

      setLoading(true);
      await securityAPI.terminateAllOtherSessions(currentUser.uid);
      alert('All other sessions ended');
      await loadLoginData();
    } catch (err) {
      console.error('Error logging out other sessions:', err);
      setError('Failed to end other sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRecognized = async (loginId) => {
    try {
      await securityAPI.markLoginAsRecognized(currentUser.uid, loginId);
      await loadLoginData();
      alert('Login marked as recognized');
    } catch (err) {
      console.error('Error marking login:', err);
      setError('Failed to update login');
    }
  };

  const getDeviceIcon = (device) => {
    const { type } = device;
    if (type === 'mobile') return '📱';
    if (type === 'tablet') return '📱';
    if (type === 'desktop') return '💻';
    return '🖥';
  };

  const getDeviceName = (device) => {
    const { os, browser, model } = device;
    return `${browser} on ${os}${model ? ` (${model})` : ''}`;
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

  const getLocationDisplay = (location) => {
    if (!location) return 'Unknown location';
    const { city, state, country } = location;
    return `${city || 'Unknown'}, ${state || ''} ${country || ''}`.trim();
  };

  const isSuspicious = (login) => {
    return suspiciousLogins.some(s => s.id === login.id);
  };

  if (loading && logins.length === 0) {
    return (
      <div className="login-history-page">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="login-history-page">
      {/* Header */}
      <div className="history-header">
        <div className="header-content">
          <h1>📱 Login Activity</h1>
          <p className="subtitle">
            Monitor your login activity, manage devices, and review active sessions
          </p>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* Last Login Card */}
      {lastLogin && (
        <div className="last-login-card">
          <div className="last-login-content">
            <p className="last-login-label">Last Login</p>
            <p className="last-login-date">{formatDate(lastLogin.timestamp)}</p>
            <p className="last-login-device">
              {getDeviceIcon(lastLogin.device)} {getDeviceName(lastLogin.device)}
            </p>
            <p className="last-login-location">📍 {getLocationDisplay(lastLogin.location)}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="history-tabs">
        <button 
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📜 Login History ({logins.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'devices' ? 'active' : ''}`}
          onClick={() => setActiveTab('devices')}
        >
          📱 Trusted Devices ({devices.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'sessions' ? 'active' : ''}`}
          onClick={() => setActiveTab('sessions')}
        >
          🔑 Active Sessions ({activeSessions.length})
        </button>
      </div>

      {/* Login History Tab */}
      {activeTab === 'history' && (
        <div className="tab-content">
          {suspiciousLogins.length > 0 && (
            <div className="suspicious-alert">
              <p className="alert-icon">⚠</p>
              <p className="alert-text">
                {suspiciousLogins.length} suspicious login{suspiciousLogins.length !== 1 ? 's' : ''} detected. 
                Review and confirm these logins.
              </p>
            </div>
          )}

          {logins.length > 0 ? (
            <div className="logins-list">
              {logins.map((login) => (
                <div 
                  key={login.id} 
                  className={`login-item ${isSuspicious(login) ? 'suspicious' : ''}`}
                >
                  <div className="login-icon">
                    {isSuspicious(login) ? '⚠' : getDeviceIcon(login.device)}
                  </div>

                  <div className="login-details">
                    <p className="login-device">
                      {getDeviceName(login.device)}
                      {login.isCurrentDevice && (
                        <span className="current-badge">Current</span>
                      )}
                    </p>
                    <p className="login-location">📍 {getLocationDisplay(login.location)}</p>
                    <p className="login-ip">IP: {login.ipAddress}</p>
                    <p className="login-time">{formatDate(login.timestamp)}</p>
                  </div>

                  <div className="login-status">
                    {isSuspicious(login) ? (
                      <span className="status-suspicious">Suspicious</span>
                    ) : (
                      <span className="status-success">✓ Recognized</span>
                    )}
                  </div>

                  {isSuspicious(login) && (
                    <button
                      className="action-btn confirm"
                      onClick={() => handleMarkAsRecognized(login.id)}
                    >
                      ✓ Confirm
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p className="empty-icon">✓</p>
              <p className="empty-title">No Login History</p>
              <p className="empty-message">Your login activity will appear here</p>
            </div>
          )}
        </div>
      )}

      {/* Devices Tab */}
      {activeTab === 'devices' && (
        <div className="tab-content">
          {devices.length > 0 ? (
            <div className="devices-list">
              {devices.map((device) => (
                <div key={device.id} className="device-item">
                  <div className="device-icon">
                    {getDeviceIcon(device)}
                  </div>

                  <div className="device-details">
                    <p className="device-name">{getDeviceName(device)}</p>
                    <p className="device-info">
                      {device.model && `${device.model} • `}
                      {device.os}
                    </p>
                    <p className="device-registered">
                      Added {formatDate(device.registeredAt)}
                    </p>
                    {device.lastUsed && (
                      <p className="device-last-used">
                        Last used {formatDate(device.lastUsed)}
                      </p>
                    )}
                  </div>

                  <div className="device-badges">
                    {device.isCurrentDevice && (
                      <span className="badge current">Current Device</span>
                    )}
                    {device.isTrusted && (
                      <span className="badge trusted">✓ Trusted</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p className="empty-icon">📱</p>
              <p className="empty-title">No Trusted Devices</p>
              <p className="empty-message">Your trusted devices will appear here</p>
            </div>
          )}
        </div>
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <div className="tab-content">
          {activeSessions.length > 1 && (
            <div className="logout-all-section">
              <button
                className="logout-all-btn"
                onClick={handleLogoutAllOthers}
              >
                🚪 End All Other Sessions
              </button>
              <p className="logout-description">
                This will end your session on all other devices
              </p>
            </div>
          )}

          {activeSessions.length > 0 ? (
            <div className="sessions-list">
              {activeSessions.map((session) => (
                <div key={session.id} className="session-item">
                  <div className="session-icon">
                    {session.isCurrentSession ? '✓' : '📱'}
                  </div>

                  <div className="session-details">
                    <p className="session-device">
                      {getDeviceName(session.device)}
                      {session.isCurrentSession && (
                        <span className="current-badge">Current Session</span>
                      )}
                    </p>
                    <p className="session-location">
                      📍 {getLocationDisplay(session.location)}
                    </p>
                    <p className="session-ip">IP: {session.ipAddress}</p>
                    <p className="session-time">
                      Login: {formatDate(session.loginAt)}
                    </p>
                  </div>

                  {!session.isCurrentSession && (
                    <button
                      className="action-btn logout"
                      onClick={() => handleLogoutSession(session.id)}
                    >
                      🚪 End Session
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p className="empty-icon">✓</p>
              <p className="empty-title">No Other Active Sessions</p>
              <p className="empty-message">You're only logged in on this device</p>
            </div>
          )}
        </div>
      )}

      {/* Security Tips */}
      <div className="security-tips-section">
        <h3>🛡 Security Tips</h3>
        <div className="tips-list">
          <div className="tip-item">
            <p className="tip-icon">✓</p>
            <p className="tip-text">Review your login history regularly for unfamiliar devices</p>
          </div>
          <div className="tip-item">
            <p className="tip-icon">✓</p>
            <p className="tip-text">Use strong, unique passwords for your account</p>
          </div>
          <div className="tip-item">
            <p className="tip-icon">✓</p>
            <p className="tip-text">Enable two-factor authentication for extra security</p>
          </div>
          <div className="tip-item">
            <p className="tip-icon">✓</p>
            <p className="tip-text">End sessions on devices you no longer use</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginHistory;
