/**
 * Biometrics.js
 * Biometric Authentication Setup & Management
 * Enable/disable fingerprint or Face ID authentication
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import biometricService from '../services/biometricService';
import LoadingSpinner from '../components/LoadingSpinner';
import './Biometrics.css';

const Biometrics = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // State management
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [biometricSupport, setBiometricSupport] = useState(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState(null);
  const [showSetup, setShowSetup] = useState(false);
  const [setupStep, setSetupStep] = useState(1); // 1: info, 2: pin setup, 3: registration, 4: test, 5: complete
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [testPin, setTestPin] = useState('');
  const [testing, setTesting] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [usageLogs, setUsageLogs] = useState([]);

  // Check biometric support
  useEffect(() => {
    if (!user?.uid) {
      navigate('/login');
      return;
    }
    checkBiometricSupport();
  }, [user?.uid, navigate]);

  const checkBiometricSupport = async () => {
    try {
      setLoading(true);
      setError('');

      // Check device support
      const support = await biometricService.checkBiometricSupport();
      setBiometricSupport(support);

      // Check if already enabled
      const enabled = biometricService.isBiometricEnabled(user.uid);
      setIsEnabled(enabled);

      if (enabled) {
        const type = biometricService.getBiometricType(user.uid);
        setBiometricType(type);

        // Load usage logs
        const logs = biometricService.getBiometricLogs(user.uid);
        setUsageLogs(logs || []);
      }
    } catch (err) {
      console.error('Error checking biometric support:', err);
      setError('Failed to check biometric support');
    } finally {
      setLoading(false);
    }
  };

  const handleStartSetup = () => {
    setError('');
    setSuccess('');
    setPin('');
    setConfirmPin('');
    setSetupStep(1);
    setShowSetup(true);
  };

  const handleNextStep = () => {
    if (setupStep === 1) {
      setSetupStep(2);
    } else if (setupStep === 2) {
      // Validate PIN
      if (pin.length < 4) {
        setError('PIN must be at least 4 digits');
        return;
      }
      if (pin !== confirmPin) {
        setError('PINs do not match');
        return;
      }
      setError('');
      setSetupStep(3);
    } else if (setupStep === 3) {
      handleRegisterBiometric();
    }
  };

  const handleRegisterBiometric = async () => {
    try {
      setLoading(true);
      setError('');

      const result = await biometricService.registerBiometric(user.uid, pin);

      setSuccess(`${result.biometricType === 'face_id' ? 'Face ID' : 'Fingerprint'} registered successfully`);
      setBiometricType(result.biometricType);
      setSetupStep(4); // Move to test step
    } catch (err) {
      console.error('Error registering biometric:', err);
      setError(err.message || 'Failed to register biometric');
    } finally {
      setLoading(false);
    }
  };

  const handleTestBiometric = async () => {
    try {
      setTesting(true);
      setError('');

      const result = await biometricService.testBiometric(user.uid);

      setSuccess('Biometric test successful!');
      setSetupStep(5); // Complete
    } catch (err) {
      console.error('Error testing biometric:', err);
      setError('Biometric test failed. Please try again.');
    } finally {
      setTesting(false);
    }
  };

  const handleCompleteSetup = () => {
    setShowSetup(false);
    setSetupStep(1);
    setPin('');
    setConfirmPin('');
    checkBiometricSupport();
  };

  const handleDisableBiometric = async () => {
    try {
      if (!window.confirm('Disable biometric authentication? You can set it up again later.')) return;

      setDisabling(true);
      setError('');

      const result = await biometricService.disableBiometric(user.uid, testPin);

      setSuccess('Biometric authentication disabled');
      setIsEnabled(false);
      setTestPin('');
      checkBiometricSupport();
    } catch (err) {
      console.error('Error disabling biometric:', err);
      setError(err.message || 'Failed to disable biometric authentication');
    } finally {
      setDisabling(false);
    }
  };

  const getBiometricIcon = () => {
    if (!biometricType) return '📱';
    return biometricType === 'face_id' ? '🔓' : '👆';
  };

  const getBiometricLabel = () => {
    if (!biometricType) return 'Biometric';
    return biometricType === 'face_id' ? 'Face ID' : 'Fingerprint';
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && biometricSupport === null) {
    return (
      <div className="biometrics-page">
        <LoadingSpinner />
      </div>
    );
  }

  const biometricNotSupported = !biometricSupport?.supported;

  return (
    <div className="biometrics-page">
      {/* Header */}
      <div className="biometrics-header">
        <div className="header-content">
          <h1>{getBiometricIcon()} Biometric Authentication</h1>
          <p className="subtitle">
            Use fingerprint or Face ID for quick and secure login
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

      {/* Success Banner */}
      {success && (
        <div className="success-banner">
          <span>✓ {success}</span>
          <button onClick={() => setSuccess('')}>✕</button>
        </div>
      )}

      {/* Device Support Status */}
      <div className={`support-card ${biometricNotSupported ? 'not-supported' : 'supported'}`}>
        <div className="support-icon">
          {biometricNotSupported ? '⚠' : '✓'}
        </div>
        <div className="support-content">
          <p className="support-title">
            {biometricNotSupported ? 'Not Supported' : 'Supported'}
          </p>
          <p className="support-message">
            {biometricNotSupported 
              ? 'Your device does not support biometric authentication. ' + biometricSupport?.reason
              : `${getBiometricLabel()} authentication available on your device`
            }
          </p>
        </div>
      </div>

      {/* Setup Wizard */}
      {showSetup && !biometricNotSupported && (
        <div className="setup-wizard">
          <div className="wizard-header">
            <h3>{setupStep === 5 ? 'Setup Complete!' : 'Set Up ' + getBiometricLabel()}</h3>
            <button
              className="close-wizard"
              onClick={() => setShowSetup(false)}
            >
              ✕
            </button>
          </div>

          <div className="wizard-progress">
            {[1, 2, 3, 4, 5].map((step) => (
              <div
                key={step}
                className={`progress-dot ${step <= setupStep ? 'active' : ''} ${step === setupStep ? 'current' : ''}`}
              >
                {step}
              </div>
            ))}
          </div>

          <div className="wizard-content">
            {/* Step 1: Info */}
            {setupStep === 1 && (
              <div className="step-content">
                <div className="step-icon">{getBiometricIcon()}</div>
                <h4>Enable {getBiometricLabel()} Authentication</h4>
                <p className="step-description">
                  Add an extra layer of security to your account by enabling {getBiometricLabel()} 
                  authentication for quick and secure login.
                </p>
                <div className="benefits-list">
                  <div className="benefit-item">
                    <span className="benefit-icon">⚡</span>
                    <p>Fast login with just a touch or glance</p>
                  </div>
                  <div className="benefit-item">
                    <span className="benefit-icon">🔒</span>
                    <p>Secure - your biometric data stays on your device</p>
                  </div>
                  <div className="benefit-item">
                    <span className="benefit-icon">💰</span>
                    <p>Quick payment confirmation</p>
                  </div>
                  <div className="benefit-item">
                    <span className="benefit-icon">🔄</span>
                    <p>Can disable anytime with your PIN</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: PIN Setup */}
            {setupStep === 2 && (
              <div className="step-content">
                <h4>Set a Backup PIN</h4>
                <p className="step-description">
                  Create a 4-digit PIN as a backup in case biometric authentication fails
                </p>
                
                <div className="form-group">
                  <label>PIN (4+ digits)</label>
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Enter 4+ digit PIN"
                    maxLength="6"
                    inputMode="numeric"
                  />
                </div>

                <div className="form-group">
                  <label>Confirm PIN</label>
                  <input
                    type="password"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    placeholder="Confirm your PIN"
                    maxLength="6"
                    inputMode="numeric"
                  />
                </div>

                <div className="pin-strength">
                  <p className="strength-label">PIN Strength:</p>
                  <div className="strength-bar">
                    <div 
                      className={`strength-fill ${pin.length >= 4 ? 'strong' : pin.length >= 2 ? 'medium' : 'weak'}`}
                      style={{ width: `${(pin.length / 6) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Registration */}
            {setupStep === 3 && (
              <div className="step-content">
                <div className="step-icon">📱</div>
                <h4>Scan Your {getBiometricLabel()}</h4>
                <p className="step-description">
                  {biometricType === 'face_id' 
                    ? 'Position your face in front of the camera'
                    : 'Place your finger on the sensor when prompted'
                  }
                </p>
                <div className="loading-indicator">
                  <div className="spinner"></div>
                  <p>Registering your {getBiometricLabel()}...</p>
                </div>
              </div>
            )}

            {/* Step 4: Test */}
            {setupStep === 4 && (
              <div className="step-content">
                <div className="step-icon">✓</div>
                <h4>Test Your {getBiometricLabel()}</h4>
                <p className="step-description">
                  Let's test your {getBiometricLabel()} authentication to make sure it works
                </p>
                <div className="test-instruction">
                  <p>Tap the button below and authenticate with your {getBiometricLabel()}</p>
                </div>
              </div>
            )}

            {/* Step 5: Complete */}
            {setupStep === 5 && (
              <div className="step-content">
                <div className="step-icon">🎉</div>
                <h4>All Set!</h4>
                <p className="step-description">
                  Your {getBiometricLabel()} authentication is now enabled
                </p>
                <div className="complete-info">
                  <p>✓ You can now use {getBiometricLabel()} to:</p>
                  <ul>
                    <li>Login to your account</li>
                    <li>Confirm payments</li>
                    <li>Access your wallet</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Wizard Actions */}
          <div className="wizard-actions">
            {setupStep === 1 && (
              <button className="btn-primary" onClick={handleNextStep}>
                Continue →
              </button>
            )}
            {setupStep === 2 && (
              <>
                <button className="btn-secondary" onClick={() => setSetupStep(1)}>
                  ← Back
                </button>
                <button 
                  className="btn-primary" 
                  onClick={handleNextStep}
                  disabled={!pin || !confirmPin || pin.length < 4}
                >
                  Continue →
                </button>
              </>
            )}
            {setupStep === 3 && (
              <div className="loading-message">
                <p>Setting up your {getBiometricLabel()}...</p>
              </div>
            )}
            {setupStep === 4 && (
              <>
                <button 
                  className="btn-primary" 
                  onClick={handleTestBiometric}
                  disabled={testing}
                >
                  {testing ? '⏳ Testing...' : '👆 Test ' + getBiometricLabel()}
                </button>
              </>
            )}
            {setupStep === 5 && (
              <button className="btn-primary" onClick={handleCompleteSetup}>
                Done ✓
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      {!showSetup && (
        <>
          {/* Current Status */}
          <div className={`status-card ${isEnabled ? 'enabled' : 'disabled'}`}>
            <div className="status-icon">{getBiometricIcon()}</div>
            <div className="status-content">
              <p className="status-title">{getBiometricLabel()} Authentication</p>
              <p className={`status-badge ${isEnabled ? 'active' : 'inactive'}`}>
                {isEnabled ? '✓ Enabled' : '○ Disabled'}
              </p>
            </div>

            {!biometricNotSupported && !isEnabled && (
              <button 
                className="btn-enable"
                onClick={handleStartSetup}
              >
                Enable
              </button>
            )}
          </div>

          {/* Biometric Info */}
          {isEnabled && (
            <div className="biometric-info-card">
              <h3>Active {getBiometricLabel()} Settings</h3>
              
              <div className="info-item">
                <span className="info-label">Type</span>
                <span className="info-value">{getBiometricLabel()}</span>
              </div>

              <div className="info-item">
                <span className="info-label">Status</span>
                <span className="info-value active">Enabled</span>
              </div>

              <div className="info-item">
                <span className="info-label">Uses</span>
                <span className="info-value">{usageLogs.length} times</span>
              </div>

              {usageLogs.length > 0 && (
                <div className="info-item">
                  <span className="info-label">Last Used</span>
                  <span className="info-value">
                    {formatDate(usageLogs[usageLogs.length - 1].timestamp)}
                  </span>
                </div>
              )}

              <div className="disable-section">
                <p className="disable-label">Want to disable {getBiometricLabel()}?</p>
                <input
                  type="password"
                  value={testPin}
                  onChange={(e) => setTestPin(e.target.value)}
                  placeholder="Enter your PIN to disable"
                  maxLength="6"
                  inputMode="numeric"
                />
                <button 
                  className="btn-disable"
                  onClick={handleDisableBiometric}
                  disabled={!testPin || disabling}
                >
                  {disabling ? '⏳ Disabling...' : 'Disable'}
                </button>
              </div>
            </div>
          )}

          {/* Security Tips */}
          <div className="security-tips">
            <h3>🛡 Security Tips</h3>
            <div className="tips-list">
              <div className="tip-item">
                <span className="tip-icon">✓</span>
                <p>Your biometric data is stored securely on your device only</p>
              </div>
              <div className="tip-item">
                <span className="tip-icon">✓</span>
                <p>Biometric data is never sent to our servers</p>
              </div>
              <div className="tip-item">
                <span className="tip-icon">✓</span>
                <p>Keep your backup PIN safe and secret</p>
              </div>
              <div className="tip-item">
                <span className="tip-icon">✓</span>
                <p>You can disable biometric authentication anytime</p>
              </div>
            </div>
          </div>

          {/* Usage Logs */}
          {isEnabled && usageLogs.length > 0 && (
            <div className="usage-logs">
              <h3>Recent Activity</h3>
              <div className="logs-list">
                {usageLogs.slice(-10).reverse().map((log, index) => (
                  <div key={index} className="log-item">
                    <div className="log-icon">
                      {log.usage === 'login' && '🔓'}
                      {log.usage === 'payment_confirmation' && '💳'}
                      {log.usage === 'wallet_access' && '💰'}
                    </div>
                    <div className="log-content">
                      <p className="log-action">
                        {log.usage === 'login' && 'Login'}
                        {log.usage === 'payment_confirmation' && 'Payment Confirmed'}
                        {log.usage === 'wallet_access' && 'Wallet Access'}
                      </p>
                      <p className="log-time">{formatDate(log.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Biometrics;
