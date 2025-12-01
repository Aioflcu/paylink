import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { securityAPI } from '../services/backendAPI';
import PINInput from '../components/PINInput';
import LoadingSpinner from '../components/LoadingSpinner';
import './SetPIN.css';

const SetPIN = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState('create'); // create, confirm, success, error
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!currentUser) {
    navigate('/login');
    return null;
  }

  const handlePINChange = (e) => {
    setPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6));
    setError('');
  };

  const handleConfirmPINChange = (e) => {
    setConfirmPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6));
    setError('');
  };

  const handleCreatePIN = async (e) => {
    e.preventDefault();

    if (!pin || pin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }

    setStep('confirm');
    setPin('');
  };

  const handleConfirmPIN = async (e) => {
    e.preventDefault();

    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    try {
      setLoading(true);
      setError('');

      await securityAPI.setPin(pin);

      setStep('success');
      setTimeout(() => {
        navigate('/security-settings');
      }, 2000);
    } catch (err) {
      console.error('Failed to set PIN:', err);
      setError(err?.data?.error || err.message || 'Failed to set PIN');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner message="Setting PIN..." />;

  return (
    <div className="set-pin-page">
      <div className="set-pin-container">
        <div className="set-pin-header">
          <h1>🔐 Set Transaction PIN</h1>
          <p>Create a 4-6 digit PIN to secure your transactions</p>
        </div>

        {error && (
          <div className="error-alert">
            <span>❌ {error}</span>
          </div>
        )}

        {step === 'create' && (
          <form onSubmit={handleCreatePIN} className="pin-form">
            <div className="form-group">
              <label>Enter PIN</label>
              <PINInput
                value={pin}
                onChange={handlePINChange}
                placeholder="Enter 4-6 digits"
                autoFocus
              />
              <small>Must be 4-6 digits</small>
            </div>
            <button type="submit" className="btn btn-primary" disabled={pin.length < 4}>
              Continue →
            </button>
          </form>
        )}

        {step === 'confirm' && (
          <form onSubmit={handleConfirmPIN} className="pin-form">
            <div className="form-group">
              <label>Confirm PIN</label>
              <PINInput
                value={confirmPin}
                onChange={handleConfirmPINChange}
                placeholder="Re-enter your PIN"
                autoFocus
              />
              <small>Re-enter the same PIN</small>
            </div>
            <button type="submit" className="btn btn-primary" disabled={confirmPin.length < 4}>
              Confirm PIN ✓
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setStep('create');
                setPin('');
                setConfirmPin('');
              }}
            >
              ← Back
            </button>
          </form>
        )}

        {step === 'success' && (
          <div className="success-message">
            <div className="success-icon">✓</div>
            <h2>PIN Set Successfully!</h2>
            <p>Your transaction PIN has been created.</p>
            <p>Redirecting...</p>
          </div>
        )}

        {step === 'error' && (
          <div className="error-message">
            <div className="error-icon">✕</div>
            <h2>Failed to Set PIN</h2>
            <p>{error}</p>
            <button
              className="btn btn-primary"
              onClick={() => {
                setStep('create');
                setPin('');
                setConfirmPin('');
                setError('');
              }}
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SetPIN;
