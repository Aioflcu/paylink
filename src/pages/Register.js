import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { validateEmail, validatePassword, validatePhone, validateUsername } from '../utils/validation';
import LoadingSpinner from '../components/LoadingSpinner';
import './Register.css';

const Register = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    country: 'Nigeria',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // Step 1: form, Step 2: OTP
  const { register, loginWithGoogle, sendOTP } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    // Clear error for this field
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!validateUsername(formData.username)) {
      newErrors.username = 'Username must be 3-20 characters (letters, numbers, underscore only)';
    }

    if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number (e.g., +234XXXXXXXXXX or 0XXXXXXXXXX)';
    }

    if (!formData.country) {
      newErrors.country = 'Please select a country';
    }

    if (!validatePassword(formData.password)) {
      newErrors.password = 'Password must be at least 6 characters with 1 uppercase letter and 1 number';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const userCredential = await register(formData.email, formData.password, {
        fullName: formData.fullName,
        username: formData.username,
        phone: formData.phone,
        country: formData.country,
        createdAt: new Date(),
        walletBalance: 0,
        transactionPIN: null,
        points: 0,
        referralCode: `REF-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
      });

      // Send OTP verification email
      await sendOTP();

      // Navigate to OTP verification
      navigate('/otp-verification', {
        state: { email: formData.email, mode: 'verify', isNewUser: true }
      });
    } catch (error) {
      console.error('Registration error:', error);
      if (error.code === 'auth/email-already-in-use') {
        setErrors({ email: 'This email is already registered' });
      } else if (error.code === 'auth/weak-password') {
        setErrors({ password: 'Password is too weak' });
      } else {
        setErrors({ form: error.message || 'Failed to create account. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setErrors({});
    setLoading(true);

    try {
      const userCredential = await loginWithGoogle();
      
      // For Google users, email is automatically verified
      navigate('/dashboard');
    } catch (error) {
      console.error('Google registration error:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        setErrors({ form: 'Registration cancelled' });
      } else {
        setErrors({ form: 'Failed to register with Google. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Creating your account..." />;
  }

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <h2>Join PAYLINK</h2>
          <p>Create your account to start paying utilities</p>
        </div>

        {errors.form && (
          <div className="error-message" role="alert">
            <span className="error-icon">⚠️</span>
            {errors.form}
          </div>
        )}

        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="fullName">Full Name *</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="John Doe"
                className={`form-input ${errors.fullName ? 'error' : ''}`}
                required
                disabled={loading}
              />
              {errors.fullName && (
                <span className="field-error">{errors.fullName}</span>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="username">Username *</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="john_doe"
                className={`form-input ${errors.username ? 'error' : ''}`}
                required
                disabled={loading}
              />
              {errors.username && (
                <span className="field-error">{errors.username}</span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="john@example.com"
              className={`form-input ${errors.email ? 'error' : ''}`}
              required
              disabled={loading}
            />
            {errors.email && (
              <span className="field-error">{errors.email}</span>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="phone">Phone Number *</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+234 or 0"
                className={`form-input ${errors.phone ? 'error' : ''}`}
                required
                disabled={loading}
              />
              {errors.phone && (
                <span className="field-error">{errors.phone}</span>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="country">Country *</label>
              <select
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                className={`form-input ${errors.country ? 'error' : ''}`}
                required
                disabled={loading}
              >
                <option value="Nigeria">Nigeria</option>
                <option value="Ghana">Ghana</option>
                <option value="Kenya">Kenya</option>
                <option value="South Africa">South Africa</option>
                <option value="Uganda">Uganda</option>
              </select>
              {errors.country && (
                <span className="field-error">{errors.country}</span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="At least 6 characters"
              className={`form-input ${errors.password ? 'error' : ''}`}
              required
              disabled={loading}
            />
            {errors.password && (
              <span className="field-error">{errors.password}</span>
            )}
            <p className="password-hint">
              Must contain at least 1 uppercase letter and 1 number
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password *</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter your password"
              className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
              required
              disabled={loading}
            />
            {errors.confirmPassword && (
              <span className="field-error">{errors.confirmPassword}</span>
            )}
          </div>

          <button
            type="submit"
            className="register-btn"
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="divider">
          <span>or continue with</span>
        </div>

        <button
          onClick={handleGoogleRegister}
          className="google-btn"
          disabled={loading}
          type="button"
        >
          <span className="google-icon">🔒</span>
          Google
        </button>

        <div className="register-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="login-link">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
