import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { securityAPI } from '../services/backendAPI';
import LoadingSpinner from '../components/LoadingSpinner';
import './DeviceManagement.css';

const DeviceManagement = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentUser?.uid) {
      navigate('/login');
      return;
    }

    const loadDevices = async () => {
      try {
        setLoading(true);
        const list = await securityAPI.getDevices(currentUser.uid);
        setDevices(list || []);
      } catch (err) {
        console.error('Failed to load devices', err);
        setError('Unable to load devices');
      } finally {
        setLoading(false);
      }
    };

    loadDevices();
  }, [currentUser, navigate]);

  const handleRemoveDevice = async (deviceId) => {
    if (!window.confirm('Remove this device? This will revoke its access.')) return;

    try {
      setLoading(true);
      await securityAPI.removeDevice(currentUser.uid, deviceId);
      const list = await securityAPI.getDevices(currentUser.uid);
      setDevices(list || []);
      alert('Device removed');
    } catch (err) {
      console.error('Failed to remove device', err);
      setError('Failed to remove device');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="device-management-page">
      <h1>Manage Devices</h1>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      {devices.length === 0 ? (
        <div className="empty-state">
          <p className="empty-icon">📱</p>
          <p className="empty-title">No Devices</p>
          <p className="empty-message">You have not registered any devices.</p>
        </div>
      ) : (
        <div className="devices-list">
          {devices.map((d) => (
            <div key={d.id} className="device-item">
              <div className="device-main">
                <div className="device-meta">
                  <p className="device-name">{d.name || d.model || 'Unknown device'}</p>
                  <p className="device-info">{d.os} • {d.browser}</p>
                  <p className="device-registered">Added {new Date(d.registeredAt).toLocaleString()}</p>
                </div>

                <div className="device-actions">
                  {d.isCurrentDevice ? (
                    <span className="badge current">Current</span>
                  ) : (
                    <button onClick={() => handleRemoveDevice(d.id)} className="remove-btn">Remove</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DeviceManagement;
