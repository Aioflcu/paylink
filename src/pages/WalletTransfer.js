import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import LoadingSpinner from '../components/LoadingSpinner';
import './WalletTransfer.css';

const WalletTransfer = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [mainWallet, setMainWallet] = useState(0);
  const [savingsWallet, setSavingsWallet] = useState(0);
  const [interestEarned, setInterestEarned] = useState(0);
  const [interestRate, setInterestRate] = useState(5); // 5% annual interest
  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [transferType, setTransferType] = useState('main-to-savings');
  const [amount, setAmount] = useState('');
  const [transferHistory, setTransferHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('transfer');

  // Load wallet data
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const loadWalletData = async () => {
      try {
        setLoading(true);
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          setMainWallet(userData.mainWallet || 0);
          setSavingsWallet(userData.savingsWallet || 0);
          setInterestEarned(userData.interestEarned || 0);
          setInterestRate(userData.interestRate || 5);
        }

        // Load transfer history
        const transfersRef = collection(db, 'walletTransfers');
        const transfersSnap = await getDocs(
          query(
            transfersRef,
            where('userId', '==', currentUser.uid),
            orderBy('timestamp', 'desc'),
            limit(20)
          )
        );
        setTransferHistory(transfersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error('Error loading wallet data:', err);
        setError('Failed to load wallet data');
      } finally {
        setLoading(false);
      }
    };

    loadWalletData();
  }, [currentUser, navigate]);

  // Handle transfer
  const handleTransfer = async () => {
    setError('');
    setSuccess('');

    try {
      const transferAmount = parseFloat(amount);

      // Validation
      if (!amount || transferAmount <= 0) {
        setError('Please enter a valid amount');
        return;
      }

      if (transferAmount > 100000) {
        setError('Maximum transfer amount is ₦100,000');
        return;
      }

      if (transferType === 'main-to-savings') {
        if (transferAmount > mainWallet) {
          setError('Insufficient balance in Main Wallet');
          return;
        }
      } else if (transferType === 'savings-to-main') {
        if (transferAmount > savingsWallet) {
          setError('Insufficient balance in Savings Wallet');
          return;
        }

        // Check minimum savings lock
        if (savingsWallet - transferAmount < 500) {
          setError('Minimum ₦500 must remain in Savings Wallet');
          return;
        }
      }

      setTransferring(true);

      // Update wallets
      const userRef = doc(db, 'users', currentUser.uid);
      const newMainWallet = transferType === 'main-to-savings'
        ? mainWallet - transferAmount
        : mainWallet + transferAmount;
      const newSavingsWallet = transferType === 'main-to-savings'
        ? savingsWallet + transferAmount
        : savingsWallet - transferAmount;

      await updateDoc(userRef, {
        mainWallet: newMainWallet,
        savingsWallet: newSavingsWallet
      });

      // Record transfer
      const transfersRef = collection(db, 'walletTransfers');
      await addDoc(transfersRef, {
        userId: currentUser.uid,
        type: transferType,
        amount: transferAmount,
        fromBalance: transferType === 'main-to-savings' ? mainWallet : savingsWallet,
        toBalance: transferType === 'main-to-savings' ? savingsWallet : savingsWallet,
        timestamp: serverTimestamp(),
        status: 'completed'
      });

      // Update UI
      setMainWallet(newMainWallet);
      setSavingsWallet(newSavingsWallet);
      setSuccess(`Successfully transferred ₦${transferAmount.toLocaleString()}`);
      setAmount('');

      // Reload history
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      console.error('Error during transfer:', err);
      setError('Transfer failed. Please try again.');
    } finally {
      setTransferring(false);
    }
  };

  // Calculate monthly interest
  const calculateMonthlyInterest = () => {
    return (savingsWallet * interestRate) / 12 / 100;
  };

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(value);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="wallet-transfer">
      {/* Header */}
      <div className="wt-header">
        <h1>💳 Wallet Transfer</h1>
        <p className="wt-subtitle">Transfer funds between your wallets</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Wallet Cards */}
      <div className="wallet-cards">
        {/* Main Wallet */}
        <div className="wallet-card main">
          <div className="wallet-icon">💰</div>
          <div className="wallet-content">
            <h3>Main Wallet</h3>
            <p className="wallet-balance">{formatCurrency(mainWallet)}</p>
            <span className="wallet-label">For payments & transfers</span>
          </div>
        </div>

        {/* Transfer Arrow */}
        <div className="transfer-arrow">
          <button
            className={`arrow-btn ${transferType === 'main-to-savings' ? 'active' : ''}`}
            onClick={() => setTransferType('main-to-savings')}
            title="Transfer to Savings"
          >
            ↓
          </button>
          <button
            className={`arrow-btn ${transferType === 'savings-to-main' ? 'active' : ''}`}
            onClick={() => setTransferType('savings-to-main')}
            title="Transfer to Main"
          >
            ↑
          </button>
        </div>

        {/* Savings Wallet */}
        <div className="wallet-card savings">
          <div className="wallet-icon">🏦</div>
          <div className="wallet-content">
            <h3>Savings Wallet</h3>
            <p className="wallet-balance">{formatCurrency(savingsWallet)}</p>
            <span className="wallet-label">Earns {interestRate}% annual interest</span>
          </div>
          {interestEarned > 0 && (
            <div className="interest-earned">
              Interest earned: {formatCurrency(interestEarned)}
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <h4>Total Balance</h4>
            <p className="stat-value">{formatCurrency(mainWallet + savingsWallet)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💹</div>
          <div className="stat-info">
            <h4>Monthly Interest</h4>
            <p className="stat-value">{formatCurrency(calculateMonthlyInterest())}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-info">
            <h4>Interest Rate</h4>
            <p className="stat-value">{interestRate}% per year</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✨</div>
          <div className="stat-info">
            <h4>Total Interest</h4>
            <p className="stat-value">{formatCurrency(interestEarned)}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="wt-tabs">
        <button
          className={`tab-btn ${activeTab === 'transfer' ? 'active' : ''}`}
          onClick={() => setActiveTab('transfer')}
        >
          ↔️ Transfer Funds
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📜 Transfer History
        </button>
        <button
          className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          ℹ️ Information
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'transfer' && (
        <div className="wt-form-section">
          <div className="form-group">
            <label>Transfer Type</label>
            <div className="transfer-options">
              <button
                className={`transfer-option ${transferType === 'main-to-savings' ? 'active' : ''}`}
                onClick={() => setTransferType('main-to-savings')}
              >
                <span className="option-icon">💰 → 🏦</span>
                <span className="option-text">Main to Savings</span>
              </button>
              <button
                className={`transfer-option ${transferType === 'savings-to-main' ? 'active' : ''}`}
                onClick={() => setTransferType('savings-to-main')}
              >
                <span className="option-icon">🏦 → 💰</span>
                <span className="option-text">Savings to Main</span>
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Amount to Transfer</label>
            <div className="amount-input-group">
              <span className="currency-symbol">₦</span>
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
                max="100000"
                disabled={transferring}
              />
            </div>
            <div className="amount-info">
              {transferType === 'main-to-savings'
                ? `Available: ${formatCurrency(mainWallet)}`
                : `Available: ${formatCurrency(savingsWallet)}`}
            </div>
          </div>

          <div className="quick-amounts">
            <p className="quick-label">Quick amounts:</p>
            <div className="quick-buttons">
              {[5000, 10000, 20000, 50000].map(qty => (
                <button
                  key={qty}
                  className="quick-btn"
                  onClick={() => setAmount(qty.toString())}
                  disabled={
                    transferType === 'main-to-savings'
                      ? qty > mainWallet
                      : qty > savingsWallet
                  }
                >
                  {formatCurrency(qty)}
                </button>
              ))}
            </div>
          </div>

          <div className="transfer-summary">
            <h4>Transfer Summary</h4>
            <div className="summary-row">
              <span>From:</span>
              <span>{transferType === 'main-to-savings' ? 'Main Wallet' : 'Savings Wallet'}</span>
            </div>
            <div className="summary-row">
              <span>To:</span>
              <span>{transferType === 'main-to-savings' ? 'Savings Wallet' : 'Main Wallet'}</span>
            </div>
            <div className="summary-row">
              <span>Amount:</span>
              <span className="highlight">{amount ? formatCurrency(parseFloat(amount)) : '₦0'}</span>
            </div>
            <div className="summary-row">
              <span>Fee:</span>
              <span>Free</span>
            </div>
          </div>

          <button
            className="btn-transfer"
            onClick={handleTransfer}
            disabled={transferring || !amount}
          >
            {transferring ? '⏳ Processing...' : '✓ Confirm Transfer'}
          </button>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="wt-history-section">
          {transferHistory.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h3>No transfers yet</h3>
              <p>Your transfer history will appear here</p>
            </div>
          ) : (
            <div className="history-list">
              {transferHistory.map(transfer => (
                <div key={transfer.id} className="history-card">
                  <div className="history-icon">
                    {transfer.type === 'main-to-savings' ? '→' : '←'}
                  </div>
                  <div className="history-content">
                    <h4 className="history-title">
                      {transfer.type === 'main-to-savings'
                        ? 'Main → Savings'
                        : 'Savings → Main'}
                    </h4>
                    <p className="history-date">
                      {transfer.timestamp
                        ? new Date(transfer.timestamp.toDate()).toLocaleString()
                        : 'Just now'}
                    </p>
                  </div>
                  <div className="history-amount">
                    <p className="amount">{formatCurrency(transfer.amount)}</p>
                    <span className={`status ${transfer.status}`}>{transfer.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'info' && (
        <div className="wt-info-section">
          <div className="info-card">
            <h3>💰 Main Wallet</h3>
            <p>Use your Main Wallet for:</p>
            <ul>
              <li>Paying for utilities (airtime, data, electricity)</li>
              <li>Cable TV subscriptions</li>
              <li>Internet bills</li>
              <li>Transferring to other users</li>
              <li>Daily transactions</li>
            </ul>
          </div>

          <div className="info-card">
            <h3>🏦 Savings Wallet</h3>
            <p>Use your Savings Wallet to:</p>
            <ul>
              <li>Save money safely</li>
              <li>Earn interest (currently {interestRate}% annual)</li>
              <li>Build emergency fund</li>
              <li>Plan for future expenses</li>
              <li>Minimum balance: ₦500</li>
            </ul>
          </div>

          <div className="info-card">
            <h3>📊 How Interest Works</h3>
            <p>Your Savings Wallet earns interest automatically:</p>
            <ul>
              <li>Annual interest rate: {interestRate}%</li>
              <li>Calculated monthly on your balance</li>
              <li>Interest credited on 1st of each month</li>
              <li>No minimum hold period required</li>
              <li>Interest compounds monthly</li>
            </ul>
          </div>

          <div className="info-card warning">
            <h3>⚠️ Transfer Rules</h3>
            <ul>
              <li>Minimum transfer: ₦100</li>
              <li>Maximum transfer: ₦100,000</li>
              <li>Transfers are instant</li>
              <li>No transfer fees</li>
              <li>Savings Wallet minimum: ₦500 (can't transfer below)</li>
              <li>Unlimited transfers per day</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletTransfer;
