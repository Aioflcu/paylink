import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, orderBy, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import LoadingSpinner from '../components/LoadingSpinner';
import './NotificationCenter.css';

const NotificationCenter = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [notificationPreferences, setNotificationPreferences] = useState({
    deposit: true,
    payment: true,
    security: true,
    balance: true,
    features: true
  });

  // Load notifications
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const loadNotifications = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, 'notifications'),
          where('userId', '==', currentUser.uid),
          orderBy('timestamp', 'desc')
        );
        const snapshot = await getDocs(q);
        const notifs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setNotifications(notifs);
        filterNotifications(notifs, 'all', '');
      } catch (err) {
        console.error('Error loading notifications:', err);
        setError('Failed to load notifications');
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [currentUser, navigate]);

  // Filter notifications
  const filterNotifications = (notifs, type, search) => {
    let filtered = notifs;

    if (type !== 'all') {
      filtered = filtered.filter(n => n.type === type);
    }

    if (search.trim()) {
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.message.toLowerCase().includes(search.toLowerCase())
      );
    }

    setFilteredNotifications(filtered);
  };

  // Handle filter change
  const handleFilterChange = (type) => {
    setFilterType(type);
    filterNotifications(notifications, type, searchTerm);
  };

  // Handle search
  const handleSearch = (term) => {
    setSearchTerm(term);
    filterNotifications(notifications, filterType, term);
  };

  // Mark as read
  const markAsRead = async (notificationId) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true,
        readAt: new Date()
      });
      
      setNotifications(notifications.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      ));
      filterNotifications(
        notifications.map(n => n.id === notificationId ? { ...n, read: true } : n),
        filterType,
        searchTerm
      );
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const unreadNotifs = notifications.filter(n => !n.read);
      for (const notif of unreadNotifs) {
        await updateDoc(doc(db, 'notifications', notif.id), {
          read: true,
          readAt: new Date()
        });
      }
      
      const updated = notifications.map(n => ({ ...n, read: true }));
      setNotifications(updated);
      filterNotifications(updated, filterType, searchTerm);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
      const updated = notifications.filter(n => n.id !== notificationId);
      setNotifications(updated);
      filterNotifications(updated, filterType, searchTerm);
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  // Delete all notifications
  const deleteAllNotifications = async () => {
    if (!window.confirm('Delete all notifications? This cannot be undone.')) return;
    
    try {
      for (const notif of notifications) {
        await deleteDoc(doc(db, 'notifications', notif.id));
      }
      setNotifications([]);
      setFilteredNotifications([]);
    } catch (err) {
      console.error('Error deleting all notifications:', err);
    }
  };

  // Save preferences
  const savePreferences = async () => {
    try {
      // In a real app, save to Firestore user preferences
      localStorage.setItem('notificationPreferences', JSON.stringify(notificationPreferences));
      alert('Preferences saved successfully!');
    } catch (err) {
      console.error('Error saving preferences:', err);
    }
  };

  // Get notification icon
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'deposit':
        return '💰';
      case 'payment':
        return '✅';
      case 'security':
        return '🔒';
      case 'balance':
        return '⚠️';
      case 'features':
        return '✨';
      default:
        return '📢';
    }
  };

  // Get notification color
  const getNotificationColor = (type) => {
    switch (type) {
      case 'deposit':
        return 'green';
      case 'payment':
        return 'blue';
      case 'security':
        return 'red';
      case 'balance':
        return 'orange';
      case 'features':
        return 'purple';
      default:
        return 'gray';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="notification-center">
      {/* Header */}
      <div className="nc-header">
        <div className="nc-header-content">
          <h1>📬 Notifications</h1>
          <p className="nc-subtitle">Stay updated with your activities</p>
        </div>
        {unreadCount > 0 && (
          <div className="unread-badge">{unreadCount}</div>
        )}
      </div>

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      {/* Controls */}
      <div className="nc-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="🔍 Search notifications..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="nc-actions">
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className="btn-action btn-mark-all">
              ✓ Mark All as Read
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={deleteAllNotifications} className="btn-action btn-delete-all">
              🗑️ Delete All
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="nc-filters">
        <button
          className={`filter-tab ${filterType === 'all' ? 'active' : ''}`}
          onClick={() => handleFilterChange('all')}
        >
          All ({notifications.length})
        </button>
        <button
          className={`filter-tab ${filterType === 'deposit' ? 'active' : ''}`}
          onClick={() => handleFilterChange('deposit')}
        >
          💰 Deposits
        </button>
        <button
          className={`filter-tab ${filterType === 'payment' ? 'active' : ''}`}
          onClick={() => handleFilterChange('payment')}
        >
          ✅ Payments
        </button>
        <button
          className={`filter-tab ${filterType === 'security' ? 'active' : ''}`}
          onClick={() => handleFilterChange('security')}
        >
          🔒 Security
        </button>
        <button
          className={`filter-tab ${filterType === 'balance' ? 'active' : ''}`}
          onClick={() => handleFilterChange('balance')}
        >
          ⚠️ Balance
        </button>
        <button
          className={`filter-tab ${filterType === 'features' ? 'active' : ''}`}
          onClick={() => handleFilterChange('features')}
        >
          ✨ Features
        </button>
      </div>

      {/* Notifications List */}
      <div className="nc-list">
        {filteredNotifications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No notifications</h3>
            <p>
              {filterType === 'all'
                ? 'You\'re all caught up!'
                : `No ${filterType} notifications`}
            </p>
          </div>
        ) : (
          filteredNotifications.map(notif => (
            <div
              key={notif.id}
              className={`notification-card ${notif.read ? 'read' : 'unread'} ${getNotificationColor(notif.type)}`}
            >
              <div className="nc-icon">{getNotificationIcon(notif.type)}</div>
              
              <div className="nc-content">
                <h3 className="nc-title">{notif.title}</h3>
                <p className="nc-message">{notif.message}</p>
                {notif.details && (
                  <div className="nc-details">{notif.details}</div>
                )}
                <div className="nc-meta">
                  <span className="nc-time">
                    {notif.timestamp
                      ? new Date(notif.timestamp.toDate()).toLocaleString()
                      : 'Just now'}
                  </span>
                  <span className={`nc-type ${notif.type}`}>{notif.type}</span>
                </div>
              </div>

              <div className="nc-actions">
                {!notif.read && (
                  <button
                    onClick={() => markAsRead(notif.id)}
                    className="btn-icon"
                    title="Mark as read"
                  >
                    ✓
                  </button>
                )}
                <button
                  onClick={() => deleteNotification(notif.id)}
                  className="btn-icon btn-delete"
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Settings */}
      <div className="nc-settings">
        <h2>⚙️ Notification Preferences</h2>
        
        <div className="preferences-grid">
          <label className="preference-item">
            <input
              type="checkbox"
              checked={notificationPreferences.deposit}
              onChange={(e) => setNotificationPreferences({
                ...notificationPreferences,
                deposit: e.target.checked
              })}
            />
            <span>💰 Deposit Alerts</span>
          </label>

          <label className="preference-item">
            <input
              type="checkbox"
              checked={notificationPreferences.payment}
              onChange={(e) => setNotificationPreferences({
                ...notificationPreferences,
                payment: e.target.checked
              })}
            />
            <span>✅ Payment Confirmations</span>
          </label>

          <label className="preference-item">
            <input
              type="checkbox"
              checked={notificationPreferences.security}
              onChange={(e) => setNotificationPreferences({
                ...notificationPreferences,
                security: e.target.checked
              })}
            />
            <span>🔒 Security Alerts</span>
          </label>

          <label className="preference-item">
            <input
              type="checkbox"
              checked={notificationPreferences.balance}
              onChange={(e) => setNotificationPreferences({
                ...notificationPreferences,
                balance: e.target.checked
              })}
            />
            <span>⚠️ Balance Alerts</span>
          </label>

          <label className="preference-item">
            <input
              type="checkbox"
              checked={notificationPreferences.features}
              onChange={(e) => setNotificationPreferences({
                ...notificationPreferences,
                features: e.target.checked
              })}
            />
            <span>✨ Feature Updates</span>
          </label>
        </div>

        <button onClick={savePreferences} className="btn-save-prefs">
          💾 Save Preferences
        </button>
      </div>
    </div>
  );
};

export default NotificationCenter;
