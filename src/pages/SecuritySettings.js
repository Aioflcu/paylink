import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { securityAPI } from '../services/backendAPI';
import LoadingSpinner from '../components/LoadingSpinner';
import './SecuritySettings.css';

const SecuritySettings = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) {
      navigate('/login');
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        const status = await securityAPI.get2FAStatus(currentUser.uid);
        setTwoFAEnabled(!!status.enabled);
      } catch (err) {
        console.error('Failed to load security settings', err);
        setError('Unable to load security settings');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [currentUser, navigate]);

  const toggle2FA = async () => {
    try {
      setLoading(true);
      if (twoFAEnabled) {
        await securityAPI.disable2FA(currentUser.uid);
        setTwoFAEnabled(false);
      } else {
        await securityAPI.enable2FA(currentUser.uid);
        setTwoFAEnabled(true);
      }
    } catch (err) {
      console.error('2FA toggle error', err);
      setError(err?.data?.error || err.message || 'Failed to update 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('Please fill all password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    try {
      setPwLoading(true);
      await securityAPI.changePassword(currentUser.uid, oldPassword, newPassword);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      alert('Password changed successfully');
    } catch (err) {
      console.error('Change password error', err);
      setError(err?.data?.error || err.message || 'Failed to change password');
    } finally {
      setPwLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="security-settings-page">
      <h1>Security Settings</h1>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      <section className="twofa-section">
        <h2>Two-Factor Authentication (2FA)</h2>
        <p>{twoFAEnabled ? '2FA is currently enabled on your account.' : '2FA is not enabled.'}</p>
        <button onClick={toggle2FA} className="twofa-btn" disabled={loading}>
          {loading ? 'Updating...' : twoFAEnabled ? 'Disable 2FA' : 'Enable 2FA'}
        </button>
      </section>

      <section className="password-section">
        <h2>Change Password</h2>
        <div className="pw-form">
          <label>Current Password</label>
          <input
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            disabled={pwLoading}
          />

          <label>New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={pwLoading}
          />

          <label>Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={pwLoading}
          />

          <button onClick={handleChangePassword} disabled={pwLoading} className="pw-btn">
            {pwLoading ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </section>

      <section className="pin-section">
        <h2>Transaction PIN</h2>
        <p>Manage your transaction PIN. You can set, change or reset your PIN.</p>
        <button onClick={() => navigate('/transaction-pin', { state: { isSettingPIN: true } })} className="pin-btn">
          Set / Change PIN
        </button>
      </section>
    </div>
  );
};

export default SecuritySettings;
