/**
 * BulkPurchase.js
 * Bulk Purchase Component
 * Buy airtime, data, electricity, or cable TV in bulk with discounts
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import bulkPurchaseService from '../services/bulkPurchaseService';
import LoadingSpinner from '../components/LoadingSpinner';
import './BulkPurchase.css';

const BulkPurchase = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // Form state
  const [serviceType, setServiceType] = useState('airtime');
  const [provider, setProvider] = useState('MTN');
  const [selectedItem, setSelectedItem] = useState('₦100');
  const [quantity, setQuantity] = useState(1);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [notes, setNotes] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showOrderSummary, setShowOrderSummary] = useState(false);
  const [orderHistory, setOrderHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('order');

  // Service providers by type
  const PROVIDERS = {
    airtime: ['MTN', 'Airtel', 'Glo', '9mobile'],
    data: ['MTN', 'Airtel', 'Glo', '9mobile'],
    electricity: ['AEDC', 'BEDC', 'EKEDC', 'IBEDC', 'IKEDC', 'KEDCO', 'PHED', 'YEDC'],
    cable: ['DStv', 'GOtv', 'Startimes']
  };

  useEffect(() => {
    if (!user?.uid) {
      navigate('/login');
      return;
    }
    loadOrderHistory();
    loadStats();
  }, [user?.uid, navigate]);

  const loadOrderHistory = async () => {
    try {
      const orders = await bulkPurchaseService.getUserBulkOrders(user.uid, 10);
      setOrderHistory(orders);
    } catch (err) {
      console.error('Error loading order history:', err);
    }
  };

  const loadStats = async () => {
    try {
      const bulkStats = await bulkPurchaseService.getBulkOrderStats(user.uid);
      setStats(bulkStats);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  // Get available items for service type
  const getAvailableItems = () => {
    return bulkPurchaseService.getAvailableItems(serviceType);
  };

  // Calculate pricing
  const unitPrice = parseInt(Object.values(getAvailableItems())[Object.keys(getAvailableItems()).indexOf(selectedItem)] || 0);
  const pricing = bulkPurchaseService.calculateBulkPrice(serviceType, unitPrice, quantity);

  // Get discount tiers
  const discountTiers = bulkPurchaseService.getDiscountTiers(serviceType);

  // Get next tier info
  const nextTier = bulkPurchaseService.getNextTierDiscount(serviceType, quantity);

  const handleServiceChange = (type) => {
    setServiceType(type);
    setProvider(PROVIDERS[type][0]);
    setSelectedItem(Object.keys(getAvailableItems())[0]);
    setError('');
  };

  const handleQuantityChange = (value) => {
    const num = parseInt(value);
    if (num >= 1 && num <= 1000) {
      setQuantity(num);
    }
  };

  const handleCreateOrder = async () => {
    try {
      setError('');

      // Validate
      if (!selectedItem || quantity < 1 || pricing.totalPrice <= 0) {
        setError('Please complete all fields');
        return;
      }

      if (serviceType === 'airtime' || serviceType === 'data') {
        if (!phoneNumber || phoneNumber.length < 10) {
          setError('Please enter a valid phone number');
          return;
        }
      }

      setLoading(true);

      const orderData = {
        serviceType,
        provider,
        selectedItem,
        quantity,
        unitPrice: pricing.unitPrice,
        totalPrice: pricing.totalPrice,
        discountAmount: pricing.discountAmount,
        phoneNumber: phoneNumber || null,
        accountNumber: accountNumber || null,
        notes
      };

      const result = await bulkPurchaseService.createBulkOrder(user.uid, orderData);

      setSuccess(`Order created successfully! Order #${result.orderNumber}`);
      setShowOrderSummary(true);

      // Reset form
      setTimeout(() => {
        setQuantity(1);
        setNotes('');
        setPhoneNumber('');
        setAccountNumber('');
        setSuccess('');
        loadOrderHistory();
        loadStats();
      }, 2000);
    } catch (err) {
      console.error('Error creating order:', err);
      setError(err.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  if (!user?.uid) {
    return <div className="loading"><LoadingSpinner /></div>;
  }

  const availableItems = getAvailableItems();

  return (
    <div className="bulk-purchase-page">
      {/* Header */}
      <div className="bulk-header">
        <div className="header-content">
          <h1>🛒 Bulk Purchase</h1>
          <p className="subtitle">Buy in bulk and save more with our special discounts</p>
        </div>
      </div>

      {/* Error/Success Banners */}
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      {success && (
        <div className="success-banner">
          <span>✓ {success}</span>
          <button onClick={() => setSuccess('')}>✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="bulk-tabs">
        <button
          className={`tab-button ${activeTab === 'order' ? 'active' : ''}`}
          onClick={() => setActiveTab('order')}
        >
          📝 Create Order
        </button>
        <button
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📋 Order History
        </button>
        <button
          className={`tab-button ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          📊 Statistics
        </button>
      </div>

      {/* Create Order Tab */}
      {activeTab === 'order' && (
        <div className="bulk-content">
          {/* Service Type Selector */}
          <div className="service-selector">
            <h3>Select Service Type</h3>
            <div className="service-buttons">
              {['airtime', 'data', 'electricity', 'cable'].map(type => (
                <button
                  key={type}
                  className={`service-btn ${serviceType === type ? 'active' : ''}`}
                  onClick={() => handleServiceChange(type)}
                >
                  <span className="service-icon">
                    {type === 'airtime' && '📱'}
                    {type === 'data' && '🌐'}
                    {type === 'electricity' && '⚡'}
                    {type === 'cable' && '📺'}
                  </span>
                  <span className="service-name">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Order Form */}
          <div className="bulk-form">
            <div className="form-row">
              <div className="form-group">
                <label>Provider</label>
                <select value={provider} onChange={(e) => setProvider(e.target.value)}>
                  {PROVIDERS[serviceType].map(prov => (
                    <option key={prov} value={prov}>{prov}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Item</label>
                <select value={selectedItem} onChange={(e) => setSelectedItem(e.target.value)}>
                  {Object.keys(availableItems).map(item => (
                    <option key={item} value={item}>
                      {item} (₦{availableItems[item]})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Quantity</label>
                <div className="quantity-input">
                  <button onClick={() => handleQuantityChange(quantity - 1)}>−</button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    min="1"
                    max="1000"
                  />
                  <button onClick={() => handleQuantityChange(quantity + 1)}>+</button>
                </div>
                <small>Max: 1000 units</small>
              </div>
            </div>

            {(serviceType === 'airtime' || serviceType === 'data') && (
              <div className="form-row">
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
            )}

            {(serviceType === 'electricity' || serviceType === 'cable') && (
              <div className="form-row">
                <div className="form-group">
                  <label>Account/Meter Number</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Enter account or meter number"
                  />
                </div>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label>Additional Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any special instructions or notes"
                  rows="3"
                />
              </div>
            </div>
          </div>

          {/* Discount Information */}
          <div className="discount-info">
            <h3>💰 Discount Tiers</h3>
            <div className="tiers-grid">
              {discountTiers.map((tier, idx) => (
                <div
                  key={idx}
                  className={`tier-card ${quantity >= tier.min && quantity <= (typeof tier.max === 'number' ? tier.max : Infinity) ? 'active' : ''}`}
                >
                  <div className="tier-range">
                    {tier.min}-{tier.max} units
                  </div>
                  <div className="tier-discount">{tier.discount}% OFF</div>
                </div>
              ))}
            </div>

            {nextTier && (
              <div className="next-tier-info">
                <p>🎯 Buy {nextTier.quantityNeeded} more items to get {nextTier.nextDiscount}% discount!</p>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="order-summary">
            <h3>Order Summary</h3>
            <div className="summary-item">
              <span>Item:</span>
              <strong>{selectedItem} × {quantity}</strong>
            </div>
            <div className="summary-item">
              <span>Unit Price:</span>
              <strong>₦{pricing.unitPrice.toLocaleString()}</strong>
            </div>
            <div className="summary-item">
              <span>Subtotal:</span>
              <strong>₦{pricing.subtotal.toLocaleString()}</strong>
            </div>
            {pricing.discountAmount > 0 && (
              <>
                <div className="summary-item highlight">
                  <span>Discount ({pricing.discountPercent}%):</span>
                  <strong style={{ color: '#10b981' }}>-₦{pricing.discountAmount.toLocaleString()}</strong>
                </div>
              </>
            )}
            <div className="summary-divider"></div>
            <div className="summary-item total">
              <span>Total Price:</span>
              <strong>₦{pricing.totalPrice.toLocaleString()}</strong>
            </div>

            {pricing.discountAmount > 0 && (
              <div className="savings-badge">
                ✓ You save ₦{pricing.discountAmount.toLocaleString()} ({pricing.discountPercent}%)
              </div>
            )}
          </div>

          {/* Create Order Button */}
          <div className="form-actions">
            <button
              className="btn-create"
              onClick={handleCreateOrder}
              disabled={loading || !selectedItem}
            >
              {loading ? '⏳ Creating Order...' : '✓ Create Order'}
            </button>
          </div>
        </div>
      )}

      {/* Order History Tab */}
      {activeTab === 'history' && (
        <div className="bulk-content">
          <h3>Recent Orders</h3>
          {orderHistory.length > 0 ? (
            <div className="order-history-list">
              {orderHistory.map(order => (
                <div key={order.id} className="order-card">
                  <div className="order-header">
                    <div className="order-info">
                      <p className="order-number">Order #{order.orderNumber}</p>
                      <p className="order-service">{order.serviceType} - {order.provider}</p>
                    </div>
                    <div className={`order-status ${order.status}`}>{order.status}</div>
                  </div>
                  <div className="order-body">
                    <div className="order-detail">
                      <span>Item:</span>
                      <strong>{order.selectedItem}</strong>
                    </div>
                    <div className="order-detail">
                      <span>Quantity:</span>
                      <strong>{order.quantity}</strong>
                    </div>
                    <div className="order-detail">
                      <span>Total:</span>
                      <strong>₦{order.totalPrice.toLocaleString()}</strong>
                    </div>
                    {order.discountAmount > 0 && (
                      <div className="order-detail discount">
                        <span>Saved:</span>
                        <strong>₦{order.discountAmount.toLocaleString()}</strong>
                      </div>
                    )}
                  </div>
                  <div className="order-footer">
                    <small>{new Date(order.createdAt).toLocaleDateString('en-NG')}</small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No orders yet. Create your first bulk purchase!</p>
              <button className="btn-primary" onClick={() => setActiveTab('order')}>
                Create Order
              </button>
            </div>
          )}
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === 'stats' && (
        <div className="bulk-content">
          <h3>Your Bulk Purchase Statistics</h3>
          {stats && (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">📦</div>
                  <div className="stat-content">
                    <p className="stat-label">Total Orders</p>
                    <p className="stat-value">{stats.totalOrders}</p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">💰</div>
                  <div className="stat-content">
                    <p className="stat-label">Total Spent</p>
                    <p className="stat-value">₦{stats.totalSpent?.toLocaleString() || '0'}</p>
                  </div>
                </div>

                <div className="stat-card highlight">
                  <div className="stat-icon">✨</div>
                  <div className="stat-content">
                    <p className="stat-label">Total Saved</p>
                    <p className="stat-value">₦{stats.totalSaved?.toLocaleString() || '0'}</p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">📊</div>
                  <div className="stat-content">
                    <p className="stat-label">Units Purchased</p>
                    <p className="stat-value">{stats.totalQuantity}</p>
                  </div>
                </div>
              </div>

              <div className="stats-details">
                <h4>By Service Type</h4>
                <div className="service-stats">
                  {Object.entries(stats.byService).map(([service, data]) => (
                    <div key={service} className="service-stat">
                      <p className="service-name">{service}</p>
                      <p><small>Orders: {data.count}</small></p>
                      <p><small>Spent: ₦{data.spent.toLocaleString()}</small></p>
                      <p className="saved"><small>Saved: ₦{data.saved.toLocaleString()}</small></p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="stats-details">
                <h4>By Status</h4>
                <div className="status-breakdown">
                  {Object.entries(stats.byStatus).map(([status, count]) => (
                    <div key={status} className="status-item">
                      <span className="status-name">{status}</span>
                      <span className="status-count">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default BulkPurchase;
