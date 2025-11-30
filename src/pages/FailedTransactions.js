/**
 * FailedTransactions.js
 * Failed Transactions Management & Retry System
 * View failed transactions, manual retry, refund requests
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import transactionRetryService from '../services/transactionRetryService';
import LoadingSpinner from '../components/LoadingSpinner';
import './FailedTransactions.css';

const FailedTransactions = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [failedTransactions, setFailedTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [retryingId, setRetryingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, max_retries, refunded
  const [retryHistory, setRetryHistory] = useState(null);
  const [sortBy, setSortBy] = useState('date-desc'); // date-desc, date-asc, amount-desc, amount-asc

  // Fetch failed transactions
  useEffect(() => {
    if (!user?.uid) {
      navigate('/login');
      return;
    }
    loadFailedTransactions();
  }, [user?.uid, navigate]);

  // Filter and sort transactions
  useEffect(() => {
    let filtered = [...failedTransactions];

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(tx => tx.status === filterStatus);
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(tx =>
        tx.reference?.toLowerCase().includes(search) ||
        tx.provider?.toLowerCase().includes(search) ||
        tx.type?.toLowerCase().includes(search)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.failedAt) - new Date(a.failedAt);
        case 'date-asc':
          return new Date(a.failedAt) - new Date(b.failedAt);
        case 'amount-desc':
          return b.amount - a.amount;
        case 'amount-asc':
          return a.amount - b.amount;
        default:
          return 0;
      }
    });

    setFilteredTransactions(filtered);
  }, [failedTransactions, searchTerm, filterStatus, sortBy]);

  const loadFailedTransactions = async () => {
    try {
      setLoading(true);
      setError('');

      const transactions = await transactionRetryService.getFailedTransactions(user.uid, 100);
      setFailedTransactions(transactions || []);
    } catch (err) {
      console.error('Error loading failed transactions:', err);
      setError('Failed to load transaction data');
    } finally {
      setLoading(false);
    }
  };

  const handleRetryTransaction = async (transactionId) => {
    try {
      setRetryingId(transactionId);
      setError('');

      const result = await transactionRetryService.retryTransaction(transactionId);

      if (result.success) {
        alert('Retry initiated. This may take a few minutes.');
        // Reload transactions
        await loadFailedTransactions();
      } else {
        setError(result.message || 'Retry failed');
      }
    } catch (err) {
      console.error('Error retrying transaction:', err);
      setError(err.message || 'Failed to retry transaction');
    } finally {
      setRetryingId(null);
    }
  };

  const handleRequestRefund = async (transactionId) => {
    try {
      if (!window.confirm('Request refund for this transaction?')) return;

      setLoading(true);
      const result = await transactionRetryService.requestRefund(user.uid, transactionId);

      if (result.success) {
        alert('Refund request submitted. You will receive the amount within 24 hours.');
        await loadFailedTransactions();
      } else {
        setError(result.message || 'Refund request failed');
      }
    } catch (err) {
      console.error('Error requesting refund:', err);
      setError(err.message || 'Failed to request refund');
    } finally {
      setLoading(false);
    }
  };

  const handleViewRetryHistory = async (transactionId) => {
    try {
      const history = await transactionRetryService.getRetryHistory(transactionId);
      setRetryHistory(history);
    } catch (err) {
      console.error('Error loading retry history:', err);
      setError('Failed to load retry history');
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'pending': { label: 'Pending Retry', color: '#f59e0b' },
      'max_retries': { label: 'Max Retries Exceeded', color: '#ef4444' },
      'refunded': { label: 'Refunded', color: '#10b981' },
      'resolved': { label: 'Resolved', color: '#667eea' }
    };
    return statusMap[status] || { label: 'Unknown', color: '#6b7280' };
  };

  const getErrorIcon = (errorType) => {
    const iconMap = {
      'NETWORK_ERROR': '🌐',
      'TIMEOUT': '⏱',
      'SERVER_ERROR': '🖥',
      'TEMPORARY_FAILURE': '⚠',
      'RATE_LIMITED': '🚫'
    };
    return iconMap[errorType] || '❌';
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp?.toDate?.() || new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && failedTransactions.length === 0) {
    return (
      <div className="failed-transactions-page">
        <LoadingSpinner />
      </div>
    );
  }

  const statusInfo = selectedTransaction ? getStatusBadge(selectedTransaction.status) : null;

  return (
    <div className="failed-transactions-page">
      {/* Header */}
      <div className="transactions-header">
        <div className="header-content">
          <h1>🔄 Failed Transactions</h1>
          <p className="subtitle">
            View and retry failed transactions with automatic retry and refund options
          </p>
        </div>
        <div className="header-stats">
          <div className="stat-small">
            <p className="stat-number">{failedTransactions.length}</p>
            <p className="stat-label">Total Failed</p>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* Controls */}
      <div className="controls-section">
        {/* Search */}
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by reference, provider, or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>

        {/* Filters */}
        <div className="filter-controls">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending Retry</option>
            <option value="max_retries">Max Retries Exceeded</option>
            <option value="refunded">Refunded</option>
            <option value="resolved">Resolved</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="date-desc">Latest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="amount-desc">Highest Amount</option>
            <option value="amount-asc">Lowest Amount</option>
          </select>
        </div>
      </div>

      {/* Main Content */}
      <div className="content-container">
        {/* Transactions List */}
        <div className="transactions-list-section">
          <h3>Transactions ({filteredTransactions.length})</h3>

          {filteredTransactions.length > 0 ? (
            <div className="transactions-grid">
              {filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className={`transaction-card ${selectedTransaction?.id === tx.id ? 'selected' : ''}`}
                  onClick={() => setSelectedTransaction(tx)}
                >
                  <div className="tx-header">
                    <div className="tx-icon">{getErrorIcon(tx.errorType)}</div>
                    <div className="tx-info">
                      <p className="tx-type">{tx.type.toUpperCase()}</p>
                      <p className="tx-provider">{tx.provider}</p>
                    </div>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusBadge(tx.status).color }}
                    >
                      {getStatusBadge(tx.status).label}
                    </span>
                  </div>

                  <div className="tx-amount">
                    <p className="amount-label">Amount</p>
                    <p className="amount-value">₦{tx.amount?.toLocaleString()}</p>
                  </div>

                  <div className="tx-reference">
                    <p className="ref-label">Reference</p>
                    <p className="ref-value">{tx.reference}</p>
                  </div>

                  <div className="tx-date">
                    <p className="date-label">Failed</p>
                    <p className="date-value">{formatDate(tx.failedAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p className="empty-icon">✓</p>
              <p className="empty-title">No Failed Transactions</p>
              <p className="empty-message">
                {searchTerm ? 'No transactions match your search' : 'All your transactions were successful!'}
              </p>
            </div>
          )}
        </div>

        {/* Transaction Details */}
        {selectedTransaction && (
          <div className="transaction-details-panel">
            <div className="details-header">
              <h3>Transaction Details</h3>
              <button
                className="close-btn"
                onClick={() => setSelectedTransaction(null)}
              >
                ✕
              </button>
            </div>

            <div className="details-content">
              {/* Status */}
              <div className="detail-section">
                <label>Status</label>
                <div 
                  className="status-display"
                  style={{ borderLeftColor: statusInfo.color }}
                >
                  {statusInfo.label}
                </div>
              </div>

              {/* Basic Info */}
              <div className="detail-section">
                <label>Transaction ID</label>
                <p className="detail-value">{selectedTransaction.id}</p>
              </div>

              <div className="detail-section">
                <label>Type</label>
                <p className="detail-value">{selectedTransaction.type}</p>
              </div>

              <div className="detail-section">
                <label>Provider</label>
                <p className="detail-value">{selectedTransaction.provider}</p>
              </div>

              <div className="detail-section">
                <label>Amount</label>
                <p className="detail-value">₦{selectedTransaction.amount?.toLocaleString()}</p>
              </div>

              {/* Error Info */}
              <div className="detail-section">
                <label>Error Type</label>
                <p className="detail-value error">{selectedTransaction.errorType}</p>
              </div>

              <div className="detail-section">
                <label>Error Message</label>
                <p className="detail-value">{selectedTransaction.errorMessage}</p>
              </div>

              {/* Retry Info */}
              <div className="detail-section">
                <label>Retry Attempts</label>
                <p className="detail-value">
                  {selectedTransaction.retryCount || 0} / {selectedTransaction.maxRetries || 3}
                </p>
              </div>

              <div className="detail-section">
                <label>Failed At</label>
                <p className="detail-value">{formatDate(selectedTransaction.failedAt)}</p>
              </div>

              {selectedTransaction.lastRetryAt && (
                <div className="detail-section">
                  <label>Last Retry</label>
                  <p className="detail-value">{formatDate(selectedTransaction.lastRetryAt)}</p>
                </div>
              )}

              {/* Actions */}
              <div className="actions-section">
                {selectedTransaction.status === 'pending' && (
                  <>
                    <button
                      className="action-btn retry"
                      onClick={() => handleRetryTransaction(selectedTransaction.id)}
                      disabled={retryingId === selectedTransaction.id}
                    >
                      {retryingId === selectedTransaction.id ? '⏳ Retrying...' : '🔄 Retry Now'}
                    </button>
                    <button
                      className="action-btn refund"
                      onClick={() => handleRequestRefund(selectedTransaction.id)}
                    >
                      💰 Request Refund
                    </button>
                  </>
                )}

                {selectedTransaction.status === 'max_retries' && (
                  <button
                    className="action-btn refund"
                    onClick={() => handleRequestRefund(selectedTransaction.id)}
                  >
                    💰 Request Refund
                  </button>
                )}

                <button
                  className="action-btn history"
                  onClick={() => handleViewRetryHistory(selectedTransaction.id)}
                >
                  📜 Retry History
                </button>
              </div>
            </div>

            {/* Retry History Modal */}
            {retryHistory && (
              <div className="retry-history-modal">
                <div className="history-header">
                  <h4>Retry History</h4>
                  <button
                    className="close-history"
                    onClick={() => setRetryHistory(null)}
                  >
                    ✕
                  </button>
                </div>
                <div className="history-list">
                  {retryHistory.map((attempt, index) => (
                    <div key={index} className="history-item">
                      <p className="attempt-number">Attempt {index + 1}</p>
                      <p className="attempt-time">{formatDate(attempt.timestamp)}</p>
                      <p className={`attempt-status ${attempt.status.toLowerCase()}`}>
                        {attempt.status}
                      </p>
                      {attempt.error && (
                        <p className="attempt-error">{attempt.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FailedTransactions;
