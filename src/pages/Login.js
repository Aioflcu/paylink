import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../firebase';
import { validateEmail } from '../utils/validation';
import LoadingSpinner from '../components/LoadingSpinner';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginMode, setLoginMode] = useState('email'); // 'email' or 'username'
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Check if already logged in
  useEffect(() => {
    if (auth.currentUser) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email || !password) {
        setError('Please fill in all fields');
        setLoading(false);
        return;
      }

      // Email validation
      if (loginMode === 'email' && !validateEmail(email)) {
        setError('Please enter a valid email address');
        setLoading(false);
        return;
      }

      // Attempt login
      const userCredential = await login(email, password);

      // Check if email is verified
      await userCredential.user.reload();
      if (!userCredential.user.emailVerified) {
        // Send OTP and navigate to verification
        navigate('/otp-verification', { 
          state: { email: userCredential.user.email, mode: 'verify' } 
        });
      } else {
        // Email already verified, go to dashboard
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // More specific error messages
      if (error.code === 'auth/user-not-found') {
        setError('No account found with this email/username');
      } else if (error.code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many login attempts. Please try again later');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email format');
      } else {
        setError(error.message || 'Failed to log in. Please check your credentials.');
      }
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const userCredential = await loginWithGoogle();

      // Google login automatically verifies email
      await userCredential.user.reload();
      navigate('/dashboard');
    } catch (error) {
      console.error('Google login error:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        setError('Login cancelled');
      } else {
        setError('Failed to log in with Google. Please try again.');
      }
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Logging in..." />;
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2>Welcome to PAYLINK</h2>
          <p>Your all-in-one utility payment solution</p>
        </div>

        {error && (
          <div className="error-message" role="alert">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">
              {loginMode === 'email' ? 'Email Address' : 'Username'}
            </label>
            <input
              type={loginMode === 'email' ? 'email' : 'text'}
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={
                loginMode === 'email'
                  ? 'Enter your email'
                  : 'Enter your username'
              }
              required
              disabled={loading}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={loading}
              className="form-input"
            />
          </div>

          <div className="login-mode-toggle">
            <label>
              <input
                type="radio"
                name="loginMode"
                value="email"
                checked={loginMode === 'email'}
                onChange={(e) => {
                  setLoginMode(e.target.value);
                  setEmail('');
                  setError('');
                }}
              />
              Login with Email
            </label>
            <label>
              <input
                type="radio"
                name="loginMode"
                value="username"
                checked={loginMode === 'username'}
                onChange={(e) => {
                  setLoginMode(e.target.value);
                  setEmail('');
                  setError('');
                }}
              />
              Login with Username
            </label>
          </div>

          <button
            type="submit"
            className="login-btn"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="divider">
          <span>or continue with</span>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="google-btn"
          disabled={loading}
          type="button"
        >
          <span className="google-icon">🔒</span>
          Google
        </button>

        <div className="login-footer">
          <p>
            Don't have an account?{' '}
            <Link to="/register" className="register-link">
              Register here
            </Link>
          </p>
        </div>
      </div>

      <div className="login-info">
        <h3>Why PAYLINK?</h3>
        <ul>
          <li>✓ Secure & Fast Payments</li>
          <li>✓ Multiple Utilities in One App</li>
          <li>✓ Real-time Transaction Tracking</li>
          <li>✓ Cashback & Rewards</li>
          <li>✓ 24/7 Customer Support</li>
        </ul>
      </div>
    </div>
  );
};

export default Login;
