 import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { formatCurrency } from '../utils/validation';
import LoadingSpinner from '../components/LoadingSpinner';
import './TransactionHistory.css';

const TransactionHistory = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    type: 'all',
    category: 'all',
    startDate: '',
    endDate: '',
    search: ''
  });
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    fetchTransactions();
  }, [currentUser, navigate]);

  useEffect(() => {
    applyFilters();
  }, [transactions, filters]);

  const fetchTransactions = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      setError('');
      
      const transactionsQuery = query(
        collection(db, 'transactions'),
        where('userId', '==', currentUser.uid),
        orderBy('timestamp', 'desc')
      );

      const querySnapshot = await getDocs(transactionsQuery);
      const transactionsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setTransactions(transactionsList);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError('Failed to load transactions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Filter by type
    if (filters.type !== 'all') {
      filtered = filtered.filter(t => t.type === filters.type);
    }

    // Filter by category
    if (filters.category !== 'all') {
      filtered = filtered.filter(t => t.category?.toLowerCase() === filters.category.toLowerCase());
    }

    // Filter by date range
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      filtered = filtered.filter(t => {
        const tDate = t.timestamp?.toDate ? t.timestamp.toDate() : new Date(t.timestamp);
        return tDate >= startDate;
      });
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(t => {
        const tDate = t.timestamp?.toDate ? t.timestamp.toDate() : new Date(t.timestamp);
        return tDate <= endDate;
      });
    }

    // Filter by search
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(t =>
        (t.reference?.toLowerCase() || '').includes(searchTerm) ||
        (t.provider?.toLowerCase() || '').includes(searchTerm) ||
        (t.category?.toLowerCase() || '').includes(searchTerm) ||
        (t.description?.toLowerCase() || '').includes(searchTerm)
      );
    }

    setFilteredTransactions(filtered);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-NG');
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('en-NG');
  };

  const getTransactionIcon = (category) => {
    const icons = {
      airtime: '📱',
      data: '📶',
      electricity: '⚡',
      cabletv: '📺',
      cable_tv: '📺',
      internet: '🌐',
      education: '🎓',
      insurance: '🛡️',
      tax: '�',
      giftcard: '🎁',
      gift_card: '🎁',
      'wallet deposit': '💰',
      deposit: '💰',
      withdrawal: '💸',
      savings: '�'
    };
    return icons[category?.toLowerCase()] || '💳';
  };

  const formatAmount = (amount, type) => {
    const formatted = Math.abs(amount || 0).toLocaleString('en-NG');
    return type === 'credit' ? `+₦${formatted}` : `-₦${formatted}`;
  };

  const downloadReceipt = (transaction) => {
    const receiptContent = `
PAYLINK RECEIPT
================

Transaction ID: ${transaction.reference || 'N/A'}
Date: ${formatDate(transaction.timestamp)}
Time: ${formatDateTime(transaction.timestamp)}

Type: ${(transaction.type || 'N/A').toUpperCase()}
Category: ${(transaction.category || 'N/A').toUpperCase()}
Provider: ${transaction.provider || transaction.category || 'PAYLINK'}

Amount: ₦${(transaction.amount || 0).toLocaleString('en-NG')}
Description: ${transaction.description || 'N/A'}

Status: ${(transaction.status || 'COMPLETED').toUpperCase()}

Thank you for using PAYLINK!
================
    `;

    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PAYLINK_Receipt_${transaction.reference || transaction.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const shareReceipt = (transaction) => {
    if (navigator.share) {
      navigator.share({
        title: 'PAYLINK Receipt',
        text: `Transaction Receipt - ${transaction.reference}`,
        url: window.location.href
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(`PAYLINK Receipt - ${transaction.reference}`);
      alert('Receipt details copied to clipboard!');
    }
  };

  const getMonthlyTotal = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    return transactions
      .filter(t => {
        const tDate = t.timestamp?.toDate ? t.timestamp.toDate() : new Date(t.timestamp);
        return tDate.getMonth() === currentMonth &&
               tDate.getFullYear() === currentYear &&
               t.type === 'debit';
      })
      .reduce((total, t) => total + (t.amount || 0), 0);
  };

  if (loading) {
    return <LoadingSpinner message="Loading Transaction History..." />;
  }

  return (
    <div className="transaction-history-page">
      <div className="page-header">
        <h1>Transaction History</h1>
        <p>View and manage all your transactions</p>
      </div>

      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      <div className="filters-section">
        <div className="filter-controls">
          <div className="filter-group">
            <label>Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({...filters, type: e.target.value})}
            >
              <option value="all">All Types</option>
              <option value="credit">Credits</option>
              <option value="debit">Debits</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Category</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({...filters, category: e.target.value})}
            >
              <option value="all">All Categories</option>
              <option value="airtime">Airtime</option>
              <option value="data">Data</option>
              <option value="electricity">Electricity</option>
              <option value="cabletv">Cable TV</option>
              <option value="internet">Internet</option>
              <option value="education">Education</option>
              <option value="insurance">Insurance</option>
              <option value="tax">Tax</option>
              <option value="giftcard">Gift Card</option>
              <option value="savings">Savings</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Search</label>
            <input
              type="text"
              placeholder="Search by reference or provider"
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
            />
          </div>
        </div>

        <div className="date-range">
          <span>From:</span>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({...filters, startDate: e.target.value})}
          />
          <span>To:</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({...filters, endDate: e.target.value})}
          />
        </div>
      </div>

      <div className="summary-stats">
        <div className="stat-card">
          <h3>Total Transactions</h3>
          <div className="stat-amount">{filteredTransactions.length}</div>
        </div>
        <div className="stat-card">
          <h3>This Month Spent</h3>
          <div className="stat-amount">₦{getMonthlyTotal().toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <h3>Credits</h3>
          <div className="stat-amount">
            {filteredTransactions.filter(t => t.type === 'credit').length}
          </div>
        </div>
        <div className="stat-card">
          <h3>Debits</h3>
          <div className="stat-amount">
            {filteredTransactions.filter(t => t.type === 'debit').length}
          </div>
        </div>
      </div>

      <div className="transactions-list">
        {filteredTransactions.length === 0 ? (
          <div className="no-transactions">
            <p>No transactions found matching your filters.</p>
          </div>
        ) : (
          filteredTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className={`transaction-card ${transaction.type}`}
              onClick={() => setSelectedTransaction(transaction)}
            >
              <div className="transaction-icon">
                {getTransactionIcon(transaction.category)}
              </div>
              <div className="transaction-details">
                <div className="transaction-header">
                  <h4>{transaction.provider || transaction.category}</h4>
                  <div className="transaction-amount">
                    <span className={transaction.type}>
                      {formatAmount(transaction.amount, transaction.type)}
                    </span>
                  </div>
                </div>
                <div className="transaction-meta">
                  <span>{formatDate(transaction.timestamp)}</span>
                  <span className={`status ${transaction.status || 'success'}`}>
                    {(transaction.status || 'success').toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="transaction-actions">
                <button
                  className="action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadReceipt(transaction);
                  }}
                  title="Download Receipt"
                >
                  📄
                </button>
                <button
                  className="action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    shareReceipt(transaction);
                  }}
                  title="Share Receipt"
                >
                  📤
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedTransaction && (
        <div className="transaction-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Transaction Details</h3>
              <button
                className="close-btn"
                onClick={() => setSelectedTransaction(null)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <span className="label">Reference:</span>
                <span className="value">{selectedTransaction.reference || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="label">Date:</span>
                <span className="value">
                  {formatDateTime(selectedTransaction.timestamp)}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">Type:</span>
                <span className="value">{selectedTransaction.type || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="label">Category:</span>
                <span className="value">{selectedTransaction.category || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="label">Provider:</span>
                <span className="value">{selectedTransaction.provider || 'PAYLINK'}</span>
              </div>
              <div className="detail-row">
                <span className="label">Amount:</span>
                <span className="value">₦{(selectedTransaction.amount || 0).toLocaleString('en-NG')}</span>
              </div>
              <div className="detail-row">
                <span className="label">Description:</span>
                <span className="value">{selectedTransaction.description || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="label">Status:</span>
                <span className="value">{(selectedTransaction.status || 'success').toUpperCase()}</span>
              </div>
            </div>
            <div className="modal-actions">
              <button
                className="btn secondary"
                onClick={() => setSelectedTransaction(null)}
              >
                Close
              </button>
              <button
                className="btn primary"
                onClick={() => downloadReceipt(selectedTransaction)}
              >
                Download Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;
