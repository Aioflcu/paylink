import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import themeService from '../services/themeService';
import { db } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import './Profile.css';

const Profile = () => {
  const { currentUser, logout } = useAuth();
  const [profile, setProfile] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    country: '',
    pin: ''
  });
  const [loading, setLoading] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [darkMode, setDarkMode] = useState(false);
  const [themeSettings, setThemeSettings] = useState(null);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [autoLogoutMinutes, setAutoLogoutMinutes] = useState(15);
  const [showAutoLogoutSettings, setShowAutoLogoutSettings] = useState(false);
  const [deviceList, setDeviceList] = useState([]);
  const [loginHistory, setLoginHistory] = useState([]);
  const [showDeviceManagement, setShowDeviceManagement] = useState(false);

  useEffect(() => {
    if (currentUser) {
      fetchProfile();
      loadThemeSettings();
      loadSecuritySettings();
      loadDeviceList();
      loadLoginHistory();
    }
  }, [currentUser]);

  const loadThemeSettings = () => {
    const settings = themeService.getThemeSettings();
    setDarkMode(settings.isDark);
    setThemeSettings(settings);

    // Subscribe to theme changes
    const unsubscribe = themeService.subscribe((changes) => {
      const updated = themeService.getThemeSettings();
      setDarkMode(updated.isDark);
      setThemeSettings(updated);
    });

    return unsubscribe;
  };

  const loadSecuritySettings = async () => {
    try {
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', currentUser.uid)));
        if (!userDoc.empty) {
          const userData = userDoc.docs[0].data();
          setTwoFactorEnabled(userData.twoFactorEnabled || false);
          setAutoLogoutMinutes(userData.autoLogoutMinutes || 15);
        }
      }
    } catch (error) {
      console.error('Error loading security settings:', error);
    }
  };

  const loadDeviceList = async () => {
    try {
      if (currentUser) {
        const devicesRef = query(
          collection(db, 'devices'),
          where('userId', '==', currentUser.uid),
          orderBy('lastActive', 'desc'),
          limit(5)
        );
        const devicesSnap = await getDocs(devicesRef);
        const devices = devicesSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          lastActive: doc.data().lastActive?.toDate?.()
        }));
        setDeviceList(devices);
      }
    } catch (error) {
      console.error('Error loading devices:', error);
    }
  };

  const loadLoginHistory = async () => {
    try {
      if (currentUser) {
        const loginsRef = query(
          collection(db, 'loginHistory'),
          where('userId', '==', currentUser.uid),
          orderBy('timestamp', 'desc'),
          limit(10)
        );
        const loginsSnap = await getDocs(loginsRef);
        const logins = loginsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate?.()
        }));
        setLoginHistory(logins);
      }
    } catch (error) {
      console.error('Error loading login history:', error);
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await api.get('/auth/profile');
      setProfile(response.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const updateProfile = async () => {
    setLoading(true);
    try {
      await api.put('/auth/profile', profile);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      alert('New password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      alert('Password changed successfully!');
      setShowChangePassword(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error changing password:', error);
      alert('Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const setTransactionPIN = async () => {
    const newPin = prompt('Enter new 4-digit PIN:');
    if (!newPin || newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      alert('Please enter a valid 4-digit PIN');
      return;
    }

    const confirmPin = prompt('Confirm new 4-digit PIN:');
    if (newPin !== confirmPin) {
      alert('PINs do not match');
      return;
    }

    try {
      await api.put('/auth/set-pin', { pin: newPin });
      alert('Transaction PIN set successfully!');
      setProfile({...profile, pin: newPin});
    } catch (error) {
      console.error('Error setting PIN:', error);
      alert('Failed to set PIN. Please try again.');
    }
  };

  const toggleDarkMode = () => {
    themeService.toggleTheme();
  };

  const toggleTwoFactor = async () => {
    try {
      const userQuery = query(collection(db, 'users'), where('uid', '==', currentUser.uid));
      const userDocs = await getDocs(userQuery);
      if (!userDocs.empty) {
        const userRef = doc(db, 'users', userDocs.docs[0].id);
        await updateDoc(userRef, {
          twoFactorEnabled: !twoFactorEnabled,
          updatedAt: serverTimestamp()
        });
        setTwoFactorEnabled(!twoFactorEnabled);
        alert(twoFactorEnabled ? 'Two-factor authentication disabled' : 'Two-factor authentication enabled');
      }
    } catch (error) {
      console.error('Error toggling 2FA:', error);
      alert('Failed to update two-factor authentication setting');
    }
  };

  const updateAutoLogout = async () => {
    try {
      const userQuery = query(collection(db, 'users'), where('uid', '==', currentUser.uid));
      const userDocs = await getDocs(userQuery);
      if (!userDocs.empty) {
        const userRef = doc(db, 'users', userDocs.docs[0].id);
        await updateDoc(userRef, {
          autoLogoutMinutes: autoLogoutMinutes,
          updatedAt: serverTimestamp()
        });
        setShowAutoLogoutSettings(false);
        alert('Auto-logout settings updated');
      }
    } catch (error) {
      console.error('Error updating auto-logout:', error);
      alert('Failed to update auto-logout settings');
    }
  };

  const revokeDevice = async (deviceId) => {
    if (!window.confirm('Are you sure you want to revoke this device?')) return;
    try {
      const deviceRef = doc(db, 'devices', deviceId);
      await updateDoc(deviceRef, {
        isActive: false,
        revokedAt: serverTimestamp()
      });
      loadDeviceList();
      alert('Device revoked successfully');
    } catch (error) {
      console.error('Error revoking device:', error);
      alert('Failed to revoke device');
    }
  };

  useEffect(() => {
    loadThemeSettings();
  }, []);

  if (!currentUser) {
    return <div className="loading">Loading profile...</div>;
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="avatar-section">
          <div className="avatar">
            {profile.fullName ? profile.fullName.charAt(0).toUpperCase() : 'U'}
          </div>
          <h1>{profile.fullName || 'User'}</h1>
          <p>{profile.email}</p>
        </div>
      </div>

      <div className="profile-content">
        <div className="profile-section">
          <h2>Personal Information</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                value={profile.fullName}
                onChange={(e) => setProfile({...profile, fullName: e.target.value})}
                placeholder="Enter your full name"
              />
            </div>

            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={profile.username}
                onChange={(e) => setProfile({...profile, username: e.target.value})}
                placeholder="Enter username"
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({...profile, email: e.target.value})}
                placeholder="Enter email address"
                disabled
              />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({...profile, phone: e.target.value})}
                placeholder="Enter phone number"
              />
            </div>

            <div className="form-group">
              <label>Country</label>
              <select
                value={profile.country}
                onChange={(e) => setProfile({...profile, country: e.target.value})}
              >
                <option value="">Select country</option>
                <option value="nigeria">Nigeria</option>
                <option value="ghana">Ghana</option>
                <option value="kenya">Kenya</option>
                <option value="south-africa">South Africa</option>
              </select>
            </div>
          </div>

          <div className="section-actions">
            <button
              className="update-btn"
              onClick={updateProfile}
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Profile'}
            </button>
          </div>
        </div>

        <div className="profile-section">
          <h2>Advanced Security</h2>

          <div className="security-item">
            <div className="security-info">
              <h3>✓ Two-Factor Authentication</h3>
              <p>Add an extra layer of security to your account</p>
              <p className="status">{twoFactorEnabled ? '🟢 Enabled' : '🔴 Disabled'}</p>
            </div>
            <button
              className="security-btn"
              onClick={toggleTwoFactor}
            >
              {twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
            </button>
          </div>

          <div className="security-item">
            <div className="security-info">
              <h3>⏱️ Auto-Logout Settings</h3>
              <p>Automatically log out after period of inactivity</p>
              <p className="status">Logout after {autoLogoutMinutes} minutes of inactivity</p>
            </div>
            <button
              className="security-btn"
              onClick={() => setShowAutoLogoutSettings(!showAutoLogoutSettings)}
            >
              Configure
            </button>
          </div>

          {showAutoLogoutSettings && (
            <div className="auto-logout-settings">
              <div className="form-group">
                <label>Inactivity Timeout (minutes)</label>
                <select
                  value={autoLogoutMinutes}
                  onChange={(e) => setAutoLogoutMinutes(Number(e.target.value))}
                >
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes (default)</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>60 minutes</option>
                  <option value={0}>Never (disabled)</option>
                </select>
              </div>
              <div className="form-actions">
                <button
                  className="cancel-btn"
                  onClick={() => setShowAutoLogoutSettings(false)}
                >
                  Cancel
                </button>
                <button
                  className="save-btn"
                  onClick={updateAutoLogout}
                >
                  Save Settings
                </button>
              </div>
            </div>
          )}

          <div className="security-item">
            <div className="security-info">
              <h3>🖥️ Device Management</h3>
              <p>View and manage devices accessing your account</p>
              <p className="status">{deviceList.length} active {deviceList.length === 1 ? 'device' : 'devices'}</p>
            </div>
            <button
              className="security-btn"
              onClick={() => setShowDeviceManagement(!showDeviceManagement)}
            >
              {showDeviceManagement ? 'Hide' : 'View'} Devices
            </button>
          </div>

          {showDeviceManagement && (
            <div className="device-list">
              {deviceList.length > 0 ? (
                deviceList.map((device) => (
                  <div key={device.id} className="device-item">
                    <div className="device-info">
                      <h4>{device.deviceName || 'Unknown Device'}</h4>
                      <p className="device-type">{device.browser} on {device.os}</p>
                      <p className="device-ip">IP: {device.ipAddress}</p>
                      <p className="device-active">
                        Last active: {device.lastActive ? device.lastActive.toLocaleDateString() : 'Unknown'}
                      </p>
                    </div>
                    <button
                      className="revoke-btn"
                      onClick={() => revokeDevice(device.id)}
                    >
                      Revoke Access
                    </button>
                  </div>
                ))
              ) : (
                <p className="no-devices">No devices found</p>
              )}
            </div>
          )}

          <div className="security-item">
            <div className="security-info">
              <h3>📋 Login History</h3>
              <p>Recent login activity on your account</p>
            </div>
          </div>

          {loginHistory.length > 0 ? (
            <div className="login-history">
              {loginHistory.map((login) => (
                <div key={login.id} className="history-item">
                  <div className="history-info">
                    <p className="history-time">
                      {login.timestamp ? login.timestamp.toLocaleString() : 'Unknown time'}
                    </p>
                    <p className="history-device">{login.deviceName || 'Unknown Device'}</p>
                    <p className="history-location">{login.location || 'Location unknown'}</p>
                    <p className={`history-status ${login.successful ? 'success' : 'failed'}`}>
                      {login.successful ? '✓ Successful' : '✗ Failed'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-history">No login history available</p>
          )}
        </div>

        <div className="profile-section">
          <h2>Security Settings</h2>

          <div className="security-item">
            <div className="security-info">
              <h3>Transaction PIN</h3>
              <p>4-digit PIN required for all transactions</p>
              <div className="pin-display">
                {profile.pin ? '****' : 'Not set'}
              </div>
            </div>
            <button
              className="security-btn"
              onClick={setTransactionPIN}
            >
              {profile.pin ? 'Change PIN' : 'Set PIN'}
            </button>
          </div>

          <div className="security-item">
            <div className="security-info">
              <h3>Login Password</h3>
              <p>Change your account password</p>
            </div>
            <button
              className="security-btn"
              onClick={() => setShowChangePassword(!showChangePassword)}
            >
              Change Password
            </button>
          </div>

          {showChangePassword && (
            <div className="password-change-form">
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                  placeholder="Enter current password"
                />
              </div>

              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  placeholder="Enter new password"
                />
              </div>

              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                  placeholder="Confirm new password"
                />
              </div>

              <div className="form-actions">
                <button
                  className="cancel-btn"
                  onClick={() => setShowChangePassword(false)}
                >
                  Cancel
                </button>
                <button
                  className="change-btn"
                  onClick={changePassword}
                  disabled={loading}
                >
                  {loading ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="profile-section">
          <h2>Preferences</h2>

          <div className="preference-item">
            <div className="preference-info">
              <h3>🌙 Theme Settings</h3>
              <p>Customize your display preferences</p>
            </div>
          </div>

          <div className="theme-options">
            <div className="theme-option">
              <input
                type="radio"
                id="light-theme"
                name="theme"
                value="light"
                checked={themeSettings?.theme === 'light'}
                onChange={() => themeService.setTheme('light')}
              />
              <label htmlFor="light-theme">
                <span className="theme-icon">☀️</span>
                <span className="theme-label">Light</span>
              </label>
            </div>

            <div className="theme-option">
              <input
                type="radio"
                id="dark-theme"
                name="theme"
                value="dark"
                checked={themeSettings?.theme === 'dark'}
                onChange={() => themeService.setTheme('dark')}
              />
              <label htmlFor="dark-theme">
                <span className="theme-icon">🌙</span>
                <span className="theme-label">Dark</span>
              </label>
            </div>

            <div className="theme-option">
              <input
                type="radio"
                id="auto-theme"
                name="theme"
                value="auto"
                checked={themeSettings?.theme === 'auto'}
                onChange={() => themeService.setTheme('auto')}
              />
              <label htmlFor="auto-theme">
                <span className="theme-icon">🔄</span>
                <span className="theme-label">Auto (7PM - 7AM)</span>
              </label>
            </div>
          </div>

          {themeSettings?.theme === 'auto' && themeSettings?.autoSwitch && (
            <div className="auto-switch-info">
              <p className="info-title">✓ Auto-switching is active</p>
              <p className="info-text">Dark mode from 7:00 PM to 7:00 AM</p>
              {themeSettings?.isDarkModeHours && (
                <p className="info-status active">Currently: Dark Mode</p>
              )}
              {!themeSettings?.isDarkModeHours && (
                <p className="info-status">Currently: Light Mode</p>
              )}
            </div>
          )}

          <div className="preference-item toggle-preference">
            <div className="preference-info">
              <h3>Quick Dark Mode Toggle</h3>
              <p>{darkMode ? 'Dark mode is ON' : 'Dark mode is OFF'}</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={darkMode}
                onChange={toggleDarkMode}
              />
              <span className="slider"></span>
            </label>
          </div>
        </div>

        <div className="profile-section">
          <h2>About PAYLINK</h2>
          <div className="about-content">
            <p>
              PAYLINK is your all-in-one utility payment application, designed to make
              managing your essential services simple, secure, and convenient.
            </p>
            <p>
              With PAYLINK, you can pay for airtime, data, electricity, cable TV,
              internet, education, insurance, taxes, and more - all from one place.
            </p>
            <p>
              Our mission is to simplify your life by providing a seamless payment
              experience with top-tier security and customer support.
            </p>

            <div className="app-info">
              <p><strong>Version:</strong> 1.0.0</p>
              <p><strong>Platform:</strong> Web & Mobile</p>
              <p><strong>Support:</strong> support@paylink.com</p>
            </div>
          </div>
        </div>

        <div className="profile-section danger-zone">
          <h2>Account Actions</h2>
          <div className="danger-item">
            <div className="danger-info">
              <h3>Sign Out</h3>
              <p>Sign out of your PAYLINK account</p>
            </div>
            <button
              className="danger-btn"
              onClick={() => {
                if (('Are you sure you want to sign out?')) {
                  logout();
                }
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
