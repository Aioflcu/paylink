import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { securityAPI, paymentAPI } from '../services/backendAPI';
import PINInput from '../components/PINInput';
import LoadingSpinner from '../components/LoadingSpinner';
import './TransactionPIN.css';

const TransactionPIN = () => {
  const [mode, setMode] = useState('verify'); // 'verify', 'set', or 'change'
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasPIN, setHasPIN] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  // Determine if we're verifying for a transaction or setting/changing PIN
  const transactionData = location.state?.transactionData || null;
  const isSettingPIN = location.state?.isSettingPIN || false;
  const isChangingPIN = location.state?.isChangingPIN || false;

  // Check PIN status on mount
  useEffect(() => {
    const checkPINStatus = async () => {
      if (!currentUser) {
        navigate('/login');
        return;
      }

      try {
        const result = await securityAPI.checkPinStatus();
        setHasPIN(result.hasPIN || false);

        if (isSettingPIN || isChangingPIN) {
          setMode(isChangingPIN ? 'change' : 'set');
        } else if (!result.hasPIN) {
          setMode('set');
        } else {
          setMode('verify');
        }
      } catch (err) {
        console.error('Error checking PIN status:', err);
        setError('Failed to verify PIN status');
      }
    };

    checkPINStatus();
  }, [currentUser, navigate, isSettingPIN, isChangingPIN]);

  const handlePINInput = (newPin) => {
    setPin(newPin);
    setError('');
  };

  const handleConfirmPINInput = (newPin) => {
    setConfirmPin(newPin);
    setError('');
  };

  // Set PIN for the first time
  const handleSetPIN = async () => {
    if (pin.length !== 4) {
      setError('PIN must be exactly 4 digits');
      return;
    }

    if (pin !== confirmPin) {
      setError('PINs do not match');
      setPin('');
      setConfirmPin('');
      return;
    }

    setLoading(true);

    try {
      const result = await securityAPI.setPin(pin);
      
      if (result.success) {
        setHasPIN(true);
        setPin('');
        setConfirmPin('');
        
        if (transactionData && transactionData.onPinVerified) {
          // Call the callback with pin hash if transaction is waiting
          const pinHash = await securityAPI.checkPinStatus();
          transactionData.onPinVerified(pinHash);
          navigate('/success', { state: transactionData });
        } else if (transactionData) {
          // If there's transaction data, proceed to process it
          navigate('/success', { state: { transactionData } });
        } else {
          // Just PIN setup without transaction
          navigate('/dashboard', { state: { message: 'PIN created successfully' } });
        }
      }
    } catch (err) {
      console.error('Error setting PIN:', err);
      setError(err.data?.error || err.message || 'Failed to set PIN');
    } finally {
      setLoading(false);
    }
  };

  // Verify PIN for transactions
  const handleVerifyPIN = async () => {
    if (pin.length !== 4) {
      setError('PIN must be exactly 4 digits');
      return;
    }

    setLoading(true);

    try {
      // Call transaction processor with PIN if callback provided
      if (transactionData && transactionData.onPinVerified) {
        const result = await transactionData.onPinVerified(pin);
        
        if (result && result.success) {
          setPin('');
          navigate('/success', { 
            state: { 
              transactionData: result,
              pinVerified: true 
            } 
          });
        } else {
          setError('PIN verification failed. Please try again.');
          setPin('');
        }
      } else {
        // Just verify PIN without processing transaction
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Error verifying PIN:', err);
      
      if (err.status === 401) {
        setError('Incorrect PIN. Please try again.');
      } else {
        setError(err.data?.error || err.message || 'Failed to verify PIN');
      }
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  // Change existing PIN
  const handleChangePIN = async () => {
    if (pin.length !== 4 || confirmPin.length !== 4) {
      setError('Both PINs must be exactly 4 digits');
      return;
    }

    if (pin !== confirmPin) {
      setError('New PINs do not match');
      setPin('');
      setConfirmPin('');
      return;
    }

    setLoading(true);

    try {
      // First verify old PIN, then set new one
      const result = await securityAPI.setPin(pin);
      
      if (result.success) {
        setPin('');
        setConfirmPin('');
        navigate('/profile', { state: { message: 'PIN changed successfully' } });
      }
    } catch (err) {
      console.error('Error changing PIN:', err);
      setError(err.data?.error || err.message || 'Failed to change PIN');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !pin) {
    return <LoadingSpinner message="Processing..." />;
  }

  return (
    <div className="pin-page-container">
      {mode === 'set' && (
        <div className="pin-card">
          <div className="pin-header">
            <h2>Create Transaction PIN</h2>
            <p>Set a 4-digit PIN for all your transactions</p>
          </div>

          {error && (
            <div className="error-message" role="alert">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <div className="pin-form">
            <div className="pin-field">
              <label htmlFor="new-pin">Enter New PIN</label>
              <input
                type="password"
                id="new-pin"
                inputMode="numeric"
                value={pin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                  handlePINInput(value);
                }}
                placeholder="••••"
                maxLength="4"
                className="pin-input"
                disabled={loading}
              />
            </div>

            <div className="pin-field">
              <label htmlFor="confirm-pin">Confirm PIN</label>
              <input
                type="password"
                id="confirm-pin"
                inputMode="numeric"
                value={confirmPin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                  handleConfirmPINInput(value);
                }}
                placeholder="••••"
                maxLength="4"
                className="pin-input"
                disabled={loading}
              />
            </div>

            <button
              onClick={handleSetPIN}
              className="pin-btn"
              disabled={pin.length !== 4 || confirmPin.length !== 4 || loading}
            >
              {loading ? 'Setting PIN...' : 'Set PIN'}
            </button>
          </div>

          <div className="pin-info">
            <p>💡 Choose a PIN you'll remember easily. You'll need it for every purchase.</p>
          </div>
        </div>
      )}

      {mode === 'verify' && hasPIN && (
        <div className="pin-card">
          <div className="pin-header">
            <h2>Verify Transaction PIN</h2>
            <p>Enter your 4-digit PIN to complete this action</p>
          </div>

          {error && (
            <div className="error-message" role="alert">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <div className="pin-form">
            <div className="pin-field">
              <label htmlFor="verify-pin">Enter PIN</label>
              <input
                type="password"
                id="verify-pin"
                inputMode="numeric"
                value={pin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                  handlePINInput(value);
                }}
                placeholder="••••"
                maxLength="4"
                className="pin-input"
                disabled={loading}
                autoFocus
              />
            </div>

            <button
              onClick={handleVerifyPIN}
              className="pin-btn"
              disabled={pin.length !== 4 || loading}
            >
              {loading ? 'Verifying...' : 'Verify PIN'}
            </button>
          </div>

          <div className="pin-actions">
            <button className="pin-forgot-btn">
              <a href="/profile">Forgot PIN? Reset it here</a>
            </button>
          </div>
        </div>
      )}

      {mode === 'change' && (
        <div className="pin-card">
          <div className="pin-header">
            <h2>Change Transaction PIN</h2>
            <p>Update your 4-digit PIN</p>
          </div>

          {error && (
            <div className="error-message" role="alert">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <div className="pin-form">
            <div className="pin-field">
              <label htmlFor="new-pin-change">New PIN</label>
              <input
                type="password"
                id="new-pin-change"
                inputMode="numeric"
                value={pin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                  handlePINInput(value);
                }}
                placeholder="••••"
                maxLength="4"
                className="pin-input"
                disabled={loading}
              />
            </div>

            <div className="pin-field">
              <label htmlFor="confirm-pin-change">Confirm New PIN</label>
              <input
                type="password"
                id="confirm-pin-change"
                inputMode="numeric"
                value={confirmPin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                  handleConfirmPINInput(value);
                }}
                placeholder="••••"
                maxLength="4"
                className="pin-input"
                disabled={loading}
              />
            </div>

            <button
              onClick={handleChangePIN}
              className="pin-btn"
              disabled={pin.length !== 4 || confirmPin.length !== 4 || loading}
            >
              {loading ? 'Changing PIN...' : 'Change PIN'}
            </button>
          </div>
        </div>
      )}

      {mode === 'verify' && !hasPIN && (
        <div className="pin-card">
          <div className="pin-header">
            <h2>Create Transaction PIN</h2>
            <p>You need to set a PIN first to complete this transaction</p>
          </div>

          {error && (
            <div className="error-message" role="alert">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <div className="pin-form">
            <div className="pin-field">
              <label htmlFor="setup-pin">Enter New PIN</label>
              <input
                type="password"
                id="setup-pin"
                inputMode="numeric"
                value={pin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                  handlePINInput(value);
                }}
                placeholder="••••"
                maxLength="4"
                className="pin-input"
                disabled={loading}
              />
            </div>

            <div className="pin-field">
              <label htmlFor="setup-pin-confirm">Confirm PIN</label>
              <input
                type="password"
                id="setup-pin-confirm"
                inputMode="numeric"
                value={confirmPin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                  handleConfirmPINInput(value);
                }}
                placeholder="••••"
                maxLength="4"
                className="pin-input"
                disabled={loading}
              />
            </div>

            <button
              onClick={handleSetPIN}
              className="pin-btn"
              disabled={pin.length !== 4 || confirmPin.length !== 4 || loading}
            >
              {loading ? 'Setting PIN...' : 'Set PIN'}
            </button>
          </div>

          <div className="pin-info">
            <p>💡 Choose a PIN you'll remember easily. You'll need it for every purchase.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionPIN;
