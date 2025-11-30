import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import PINInput from '../components/PINInput';
import LoadingSpinner from '../components/LoadingSpinner';
import TransactionProcessor from '../services/transactionProcessor';
import './TransactionPIN.css';

const TransactionPIN = () => {
  const [mode, setMode] = useState('verify'); // 'verify', 'set', or 'change'
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasPIN, setHasPIN] = useState(false);
  const [showPINInput, setShowPINInput] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  // Determine if we're verifying for a transaction or setting/changing PIN
  const transactionData = location.state?.transactionData || null;
  const isSettingPIN = location.state?.isSettingPIN || false;
  const isChangingPIN = location.state?.isChangingPIN || false;

  useEffect(() => {
    const checkPINStatus = async () => {
      if (!currentUser) {
        navigate('/login');
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const hasStoredPIN = userData.transactionPIN && userData.transactionPIN.trim() !== '';
          setHasPIN(hasStoredPIN);

          if (isSettingPIN || isChangingPIN) {
            setMode(isChangingPIN ? 'change' : 'set');
          } else if (!hasStoredPIN) {
            // If no PIN exists and not explicitly setting it, redirect to set PIN first
            setMode('set');
          } else {
            setMode('verify');
          }
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
      const userRef = doc(db, 'users', currentUser.uid);
      // In production, encrypt the PIN before storing
      await updateDoc(userRef, {
        transactionPIN: pin,
        pinCreatedAt: new Date(),
        pinAttempts: 0
      });

      setHasPIN(true);
      setMode('verify');
      setPin('');
      setConfirmPin('');
      
      // If this was for completing a transaction, proceed
      if (transactionData) {
        navigate('/success', { state: { transactionData } });
      } else {
        setError('');
      }
    } catch (err) {
      console.error('Error setting PIN:', err);
      setError(err.message || 'Failed to set PIN');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPIN = async () => {
    if (pin.length !== 4) {
      setError('PIN must be exactly 4 digits');
      return;
    }

    setLoading(true);

    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (!userDoc.exists()) {
        setError('User data not found');
        setLoading(false);
        return;
      }

      const userData = userDoc.data();
      const storedPIN = userData.transactionPIN;

      if (storedPIN === pin) {
        // PIN is correct
        // Reset failed attempts
        await updateDoc(doc(db, 'users', currentUser.uid), {
          pinAttempts: 0,
          lastPINVerificationAt: new Date()
        });

        // Process transaction if available
        if (transactionData) {
          try {
            let result;
            
            switch (transactionData.type) {
              case 'airtime':
                result = await TransactionProcessor.processAirtimePurchase(
                  currentUser.uid,
                  {
                    provider: transactionData.provider,
                    phoneNumber: transactionData.phoneNumber,
                    amount: transactionData.amount
                  }
                );
                break;

              case 'data':
                result = await TransactionProcessor.processDataPurchase(
                  currentUser.uid,
                  {
                    provider: transactionData.provider,
                    phoneNumber: transactionData.phoneNumber,
                    planId: transactionData.planId,
                    amount: transactionData.amount
                  }
                );
                break;

              case 'electricity':
                result = await TransactionProcessor.processElectricityPayment(
                  currentUser.uid,
                  {
                    provider: transactionData.provider,
                    meterNumber: transactionData.meterNumber,
                    meterType: transactionData.meterType,
                    amount: transactionData.amount
                  }
                );
                break;

              case 'cable_tv':
                result = await TransactionProcessor.processCableSubscription(
                  currentUser.uid,
                  {
                    provider: transactionData.provider,
                    smartCard: transactionData.smartCard,
                    planId: transactionData.planId,
                    amount: transactionData.amount
                  }
                );
                break;

              default:
                // Unknown transaction type
                navigate('/success', { 
                  state: { 
                    transactionData,
                    pinVerified: true 
                  } 
                });
                return;
            }

            // Transaction processed successfully
            setPin('');
            navigate('/success', { 
              state: { 
                transactionData: result,
                pinVerified: true 
              } 
            });
          } catch (txError) {
            console.error('Transaction processing error:', txError);
            setError(txError.message || 'Transaction failed. Please try again.');
            setPin('');
          }
        } else {
          // No transaction, just PIN verification
          navigate('/dashboard');
        }
      } else {
        // PIN is incorrect
        const attempts = (userData.pinAttempts || 0) + 1;

        if (attempts >= 3) {
          setError('Too many incorrect attempts. Account temporarily locked.');
          await updateDoc(doc(db, 'users', currentUser.uid), {
            pinAttempts: attempts,
            isLocked: true,
            lockedUntil: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
          });
        } else {
          setError(`Incorrect PIN. ${3 - attempts} attempt${3 - attempts !== 1 ? 's' : ''} remaining`);
          await updateDoc(doc(db, 'users', currentUser.uid), {
            pinAttempts: attempts
          });
        }
        setPin('');
      }
    } catch (err) {
      console.error('Error verifying PIN:', err);
      setError(err.message || 'Failed to verify PIN');
    } finally {
      setLoading(false);
    }
  };

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
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        transactionPIN: pin,
        pinChangedAt: new Date(),
        pinAttempts: 0
      });

      setPin('');
      setConfirmPin('');
      setError('');
      navigate('/profile', { state: { message: 'PIN changed successfully' } });
    } catch (err) {
      console.error('Error changing PIN:', err);
      setError(err.message || 'Failed to change PIN');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
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
    </div>
  );
};

export default TransactionPIN;
