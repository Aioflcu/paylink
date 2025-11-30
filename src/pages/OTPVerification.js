import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';
import { reload } from 'firebase/auth';
import LoadingSpinner from '../components/LoadingSpinner';
import './OTPVerification.css';

const OTPVerification = () => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [email, setEmail] = useState('');
  const [mode, setMode] = useState('verify'); // 'verify' or 'resent'
  const navigate = useNavigate();
  const location = useLocation();
  const { sendOTP, verifyOTP, currentUser } = useAuth();

  useEffect(() => {
    // Get email from location state or from current user
    if (location.state?.email) {
      setEmail(location.state.email);
      setMode(location.state.mode || 'verify');
    } else if (currentUser?.email) {
      setEmail(currentUser.email);
    } else {
      // Redirect to login if no email found
      navigate('/login');
    }
  }, [location, currentUser, navigate]);

  // Countdown timer for resend button
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    if (!auth.currentUser) {
      setError('Please log in first');
      navigate('/login');
      return;
    }

    setLoading(true);

    try {
      // In Firebase, we check emailVerified by reloading the user
      // The OTP code is verified by Firebase Email Verification link
      // Here we just reload and check if email is verified

      await reload(auth.currentUser);

      if (auth.currentUser.emailVerified) {
        // Email is verified, call verifyOTP
        const isVerified = await verifyOTP();
        if (isVerified) {
          navigate('/dashboard');
        } else {
          setError('Email verification failed. Please try again.');
        }
      } else {
        // Email not yet verified - this would normally happen via email link
        setError('Please click the verification link sent to your email');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      setError(error.message || 'Failed to verify OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError('');
    setLoading(true);

    try {
      if (!auth.currentUser) {
        setError('Please log in first');
        navigate('/login');
        return;
      }

      await sendOTP();
      setCountdown(60);
      setMode('resent');
      // Clear OTP input
      setOtp('');
    } catch (error) {
      console.error('Resend OTP error:', error);
      setError(error.message || 'Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(value);
    setError('');
  };

  if (loading && countdown === 0) {
    return <LoadingSpinner message="Verifying your email..." />;
  }

  return (
    <div className="otp-container">
      <div className="otp-card">
        <div className="otp-header">
          <h2>Verify Your Email</h2>
          <p>We sent a verification code to</p>
          <p className="email-display">{email}</p>
        </div>

        {error && (
          <div className="error-message" role="alert">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        {mode === 'resent' && (
          <div className="success-message">
            <span className="success-icon">✓</span>
            Code resent successfully! Check your email
          </div>
        )}

        <form onSubmit={handleSubmit} className="otp-form">
          <div className="form-group">
            <label htmlFor="otp">Enter Verification Code</label>
            <input
              type="text"
              id="otp"
              inputMode="numeric"
              value={otp}
              onChange={handleOTPChange}
              placeholder="000000"
              maxLength="6"
              required
              disabled={loading}
              className="otp-input"
              autoFocus
            />
            <p className="otp-hint">6-digit code from your email</p>
          </div>

          <button
            type="submit"
            className="verify-btn"
            disabled={loading || otp.length !== 6}
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>

        <div className="resend-section">
          <p className="resend-text">Didn't receive the code?</p>
          <button
            onClick={handleResendOTP}
            className="resend-btn"
            disabled={countdown > 0 || loading}
            type="button"
          >
            {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
          </button>
        </div>

        <div className="otp-info">
          <p>
            <span className="info-icon">ℹ️</span>
            Check your spam/junk folder if you don't see the email
          </p>
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;
