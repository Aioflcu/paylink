import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import receiptService from '../services/receiptService';
import LoadingSpinner from '../components/LoadingSpinner';
import './Receipts.css';

const Receipts = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [receipts, setReceipts] = useState([]);
  const [filteredReceipts, setFilteredReceipts] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [filter, setFilter] = useState('all'); // all, airtime, data, electricity, cable, internet, education, tax
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date-desc'); // date-desc, date-asc, amount-desc, amount-asc
  const [error, setError] = useState('');

  // Fetch receipts on component mount
  useEffect(() => {
    if (user?.uid) {
      fetchReceipts();
    }
  }, [user?.uid]);

  // Apply filters and search
  useEffect(() => {
    let results = receipts;

    // Filter by type
    if (filter !== 'all') {
      results = results.filter((r) => r.type === filter);
    }

    // Search by provider, amount, reference
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      results = results.filter(
        (r) =>
          r.provider.toLowerCase().includes(term) ||
          r.transactionReference.toLowerCase().includes(term) ||
          r.amount.toString().includes(term) ||
          r.id.toLowerCase().includes(term)
      );
    }

    // Sort results
    results.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.timestamp) - new Date(a.timestamp);
        case 'date-asc':
          return new Date(a.timestamp) - new Date(b.timestamp);
        case 'amount-desc':
          return b.amount - a.amount;
        case 'amount-asc':
          return a.amount - b.amount;
        default:
          return 0;
      }
    });

    setFilteredReceipts(results);
  }, [receipts, filter, searchTerm, sortBy]);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await receiptService.getUserReceipts(user.uid, 100);
      setReceipts(data);
    } catch (err) {
      console.error('Error fetching receipts:', err);
      setError('Failed to load receipts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (receipt) => {
    try {
      receiptService.downloadPDF(receipt);
    } catch (err) {
      setError('Failed to download receipt.');
    }
  };

  const handleShareEmail = async (receipt) => {
    try {
      const email = user.email || prompt('Enter email address:');
      if (email) {
        await receiptService.shareViaEmail(receipt, email);
        alert('Receipt sent via email!');
      }
    } catch (err) {
      setError('Failed to send email.');
    }
  };

  const handleShareWhatsApp = (receipt) => {
    try {
      receiptService.shareViaWhatsApp(receipt);
    } catch (err) {
      setError('Failed to share via WhatsApp.');
    }
  };

  const handleDeleteReceipt = async (receiptId) => {
    if (window.confirm('Are you sure you want to delete this receipt?')) {
      try {
        await receiptService.deleteReceipt(user.uid, receiptId);
        setReceipts(receipts.filter((r) => r.id !== receiptId));
        setSelectedReceipt(null);
        alert('Receipt deleted successfully.');
      } catch (err) {
        setError('Failed to delete receipt.');
      }
    }
  };

  const handleExportCSV = () => {
    try {
      receiptService.exportToCSV(filteredReceipts);
      alert('Receipts exported successfully!');
    } catch (err) {
      setError('Failed to export receipts.');
    }
  };

  const getServiceTypeLabel = (type) => {
    const labels = {
      airtime: 'Airtime',
      data: 'Data',
      electricity: 'Electricity',
      cable: 'Cable TV',
      internet: 'Internet',
      education: 'Education',
      tax: 'Tax',
    };
    return labels[type] || type;
  };

  const getStatusBadgeClass = (status) => {
    return status === 'completed' ? 'badge-success' : status === 'pending' ? 'badge-warning' : 'badge-error';
  };

  if (loading && receipts.length === 0) {
    return <LoadingSpinner />;
  }

  if (!currentUser) {
    return (
      <div className="receipts-page">
        <div className="error-banner">
          <p>Please log in to view your receipts</p>
        </div>
      </div>
    );
  }

  return (
    <div className="receipts-page">
      <div className="page-header">
        <h1>Transaction Receipts</h1>
        <p>View, download, and share your transaction receipts</p>
      </div>

      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      <div className="receipts-container">
        {/* Filters and Search */}
        <div className="filters-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search by provider, reference, or amount..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="search-icon">🔍</span>
          </div>

          <div className="filter-controls">
            <div className="filter-group">
              <label>Type:</label>
              <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="all">All Transactions</option>
                <option value="airtime">Airtime</option>
                <option value="data">Data</option>
                <option value="electricity">Electricity</option>
                <option value="cable">Cable TV</option>
                <option value="internet">Internet</option>
                <option value="education">Education</option>
                <option value="tax">Tax</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Sort:</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="amount-desc">Highest Amount</option>
                <option value="amount-asc">Lowest Amount</option>
              </select>
            </div>

            <button className="btn primary small" onClick={handleExportCSV} disabled={filteredReceipts.length === 0}>
              📥 Export CSV
            </button>
          </div>
        </div>

        {/* Receipts List */}
        <div className="receipts-content">
          <div className="receipts-list">
            {filteredReceipts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📄</div>
                <h3>No Receipts Found</h3>
                <p>
                  {searchTerm || filter !== 'all'
                    ? 'Try adjusting your filters or search term'
                    : 'You don\'t have any receipts yet. Start by making a transaction!'}
                </p>
              </div>
            ) : (
              <div className="receipts-grid">
                {filteredReceipts.map((receipt) => (
                  <div
                    key={receipt.id}
                    className={`receipt-card ${selectedReceipt?.id === receipt.id ? 'active' : ''}`}
                    onClick={() => setSelectedReceipt(receipt)}
                  >
                    <div className="receipt-card-header">
                      <div className="receipt-type">
                        <span className="type-icon">{getServiceTypeEmoji(receipt.type)}</span>
                        <div className="type-info">
                          <h4>{getServiceTypeLabel(receipt.type)}</h4>
                          <p>{receipt.provider}</p>
                        </div>
                      </div>
                      <span className={`status-badge ${getStatusBadgeClass(receipt.status)}`}>
                        {receipt.status}
                      </span>
                    </div>

                    <div className="receipt-card-body">
                      <div className="amount">₦{receipt.amount.toLocaleString()}</div>
                      <div className="date">{formatDate(receipt.timestamp)}</div>
                      <div className="reference">Ref: {receipt.id.slice(-8)}</div>
                    </div>

                    <div className="receipt-card-footer">
                      <button
                        className="btn-small download"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(receipt);
                        }}
                        title="Download PDF"
                      >
                        ⬇️
                      </button>
                      <button
                        className="btn-small share"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShareEmail(receipt);
                        }}
                        title="Share via Email"
                      >
                        ✉️
                      </button>
                      <button
                        className="btn-small whatsapp"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShareWhatsApp(receipt);
                        }}
                        title="Share via WhatsApp"
                      >
                        💬
                      </button>
                      <button
                        className="btn-small delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteReceipt(receipt.id);
                        }}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Receipt Detail View */}
          {selectedReceipt && (
            <div className="receipt-detail">
              <div className="detail-header">
                <h3>Receipt Details</h3>
                <button className="close-btn" onClick={() => setSelectedReceipt(null)}>
                  ✕
                </button>
              </div>

              <div className="detail-content">
                <div className="detail-section">
                  <h4>Transaction Information</h4>
                  <div className="detail-row">
                    <span className="label">Receipt ID:</span>
                    <span className="value">{selectedReceipt.id}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Reference:</span>
                    <span className="value">{selectedReceipt.transactionReference}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Date & Time:</span>
                    <span className="value">{formatDateTime(selectedReceipt.timestamp)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Status:</span>
                    <span className={`badge ${getStatusBadgeClass(selectedReceipt.status)}`}>
                      {selectedReceipt.status}
                    </span>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Service Details</h4>
                  <div className="detail-row">
                    <span className="label">Service Type:</span>
                    <span className="value">{getServiceTypeLabel(selectedReceipt.type)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Provider:</span>
                    <span className="value">{selectedReceipt.provider}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Amount:</span>
                    <span className="value amount">₦{selectedReceipt.amount.toLocaleString()}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Payment Method:</span>
                    <span className="value">{selectedReceipt.paymentMethod}</span>
                  </div>
                </div>

                {selectedReceipt.details && Object.keys(selectedReceipt.details).length > 0 && (
                  <div className="detail-section">
                    <h4>Additional Details</h4>
                    {Object.entries(selectedReceipt.details).map(([key, value]) => (
                      <div className="detail-row" key={key}>
                        <span className="label">{formatDetailKey(key)}:</span>
                        <span className="value">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="detail-actions">
                  <button className="btn primary" onClick={() => handleDownload(selectedReceipt)}>
                    📥 Download PDF
                  </button>
                  <button className="btn secondary" onClick={() => handleShareEmail(selectedReceipt)}>
                    ✉️ Email
                  </button>
                  <button className="btn secondary" onClick={() => handleShareWhatsApp(selectedReceipt)}>
                    💬 WhatsApp
                  </button>
                  <button className="btn danger" onClick={() => handleDeleteReceipt(selectedReceipt.id)}>
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="receipts-stats">
        <div className="stat">
          <div className="stat-value">{receipts.length}</div>
          <div className="stat-label">Total Transactions</div>
        </div>
        <div className="stat">
          <div className="stat-value">
            ₦{receipts.reduce((sum, r) => sum + r.amount, 0).toLocaleString()}
          </div>
          <div className="stat-label">Total Amount</div>
        </div>
        <div className="stat">
          <div className="stat-value">
            {receipts.filter((r) => r.status === 'completed').length}
          </div>
          <div className="stat-label">Successful</div>
        </div>
      </div>
    </div>
  );
};

// Helper functions
function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(date) {
  const d = new Date(date);
  const dateStr = d.toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const timeStr = d.toLocaleTimeString('en-NG', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${dateStr} ${timeStr}`;
}

function getServiceTypeEmoji(type) {
  const emojis = {
    airtime: '📱',
    data: '📡',
    electricity: '⚡',
    cable: '📺',
    internet: '🌐',
    education: '🎓',
    tax: '📋',
  };
  return emojis[type] || '💳';
}

function formatDetailKey(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default Receipts;
