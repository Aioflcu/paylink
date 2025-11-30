import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, collection, addDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import walletService from '../services/walletService';
import LoadingSpinner from '../components/LoadingSpinner';
import './Wallet.css';

const Wallet = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [walletBalance, setWalletBalance] = useState(0);
  const [hideBalance, setHideBalance] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [withdrawData, setWithdrawData] = useState({
    amount: '',
    bankName: '',
    accountNumber: '',
    accountName: ''
  });

  useEffect(() => {
    fetchWalletData();
  }, [currentUser]);

  const fetchWalletData = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      
      // Fetch user wallet balance
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        setWalletBalance(userDoc.data().walletBalance || 0);
      }

      // Fetch recent transactions
      const transactionsQuery = query(
        collection(db, 'transactions'),
        where('userId', '==', currentUser.uid),
        orderBy('timestamp', 'desc'),
        limit(5)
      );
      const transactionsSnapshot = await getDocs(transactionsQuery);
      setRecentTransactions(transactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));

      setError('');
    } catch (err) {
      console.error('Error fetching wallet data:', err);
      setError('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const initializePaystackPayment = async (amount) => {
    try {
      if (!amount || amount < 100) {
        setError('Minimum deposit amount is ₦100');
        return;
      }

      setLoading(true);
      setError('');

      // Load Paystack script dynamically
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      document.head.appendChild(script);

      script.onload = () => {
        if (window.PaystackPop) {
          const handler = window.PaystackPop.setup({
            key: process.env.REACT_APP_PAYSTACK_PUBLIC_KEY,
            email: currentUser.email,
            amount: amount * 100, // Paystack expects amount in kobo
            currency: 'NGN',
            ref: `PAYLINK_${Date.now()}_${currentUser.uid.slice(0, 8)}`,
            onClose: () => {
              setError('Payment cancelled. Wallet not funded.');
              setLoading(false);
            },
            onSuccess: async (response) => {
              try {
                // Verify payment and update wallet
                await walletService.deposit(currentUser.uid, amount, response.reference);
                
                // Record transaction
                await addDoc(collection(db, 'transactions'), {
                  userId: currentUser.uid,
                  type: 'credit',
                  category: 'Wallet Deposit',
                  amount: amount,
                  reference: response.reference,
                  status: 'success',
                  timestamp: new Date(),
                  description: `Wallet deposit of ₦${amount.toLocaleString()}`
                });

                // Update local state
                setWalletBalance(walletBalance + amount);
                setDepositAmount('');
                setShowDeposit(false);
                setError('');
                
                // Show success feedback
                alert(`✓ Wallet funded successfully with ₦${amount.toLocaleString()}`);
                
                // Refresh transactions
                fetchWalletData();
              } catch (err) {
                console.error('Error processing deposit:', err);
                setError('Payment successful but failed to update wallet. Please contact support.');
              } finally {
                setLoading(false);
              }
            }
          });
          handler.openIframe();
        } else {
          setError('Paystack failed to load. Please check your internet connection.');
          setLoading(false);
        }
      };

      script.onerror = () => {
        setError('Failed to load payment provider');
        setLoading(false);
      };
    } catch (err) {
      console.error('Error initializing payment:', err);
      setError('Failed to initialize payment');
      setLoading(false);
    }
  };

  const handleQuickDeposit = (amount) => {
    setDepositAmount(amount.toString());
  };

  const handleProceedDeposit = () => {
    initializePaystackPayment(parseFloat(depositAmount));
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    
    try {
      if (!withdrawData.amount || parseFloat(withdrawData.amount) <= 0) {
        setError('Please enter a valid amount');
        return;
      }

      if (parseFloat(withdrawData.amount) > walletBalance) {
        setError('Insufficient balance');
        return;
      }

      if (!withdrawData.bankName || !withdrawData.accountNumber || !withdrawData.accountName) {
        setError('Please fill in all bank details');
        return;
      }

      setLoading(true);
      const withdrawAmount = parseFloat(withdrawData.amount);

      // Update wallet balance
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        walletBalance: walletBalance - withdrawAmount
      });

      // Record transaction
      await addDoc(collection(db, 'transactions'), {
        userId: currentUser.uid,
        type: 'debit',
        category: 'Bank Withdrawal',
        amount: withdrawAmount,
        bankName: withdrawData.bankName,
        accountNumber: withdrawData.accountNumber,
        accountName: withdrawData.accountName,
        status: 'pending',
        timestamp: new Date(),
        description: `Withdrawal to ${withdrawData.bankName} account`
      });

      // Update local state
      setWalletBalance(walletBalance - withdrawAmount);
      setWithdrawData({
        amount: '',
        bankName: '',
        accountNumber: '',
        accountName: ''
      });
      setShowWithdraw(false);
      setError('');

      alert(`✓ Withdrawal of ₦${withdrawAmount.toLocaleString()} initiated. This will be processed within 24 hours.`);
      fetchWalletData();
    } catch (err) {
      console.error('Error processing withdrawal:', err);
      setError('Failed to process withdrawal');
    } finally {
      setLoading(false);
    }
  };

  if (loading && recentTransactions.length === 0) {
    return <LoadingSpinner message="Loading wallet..." />;
  }

  return (
    <div className="wallet-page">
      <div className="wallet-header">
        <h1>My Wallet</h1>
        <p className="wallet-subtitle">Manage your account funds securely</p>
      </div>

      {error && (
        <div className="error-message">
          <span>{error}</span>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      <div className="wallet-balance-card">
        <div className="balance-header">
          <div>
            <h2>Wallet Balance</h2>
            <p className="balance-subtitle">Available funds</p>
          </div>
          <button
            className="eye-toggle"
            onClick={() => setHideBalance(!hideBalance)}
            title={hideBalance ? 'Show balance' : 'Hide balance'}
          >
            {hideBalance ? '👁️' : '👁️‍�️'}
          </button>
        </div>
        
        <div className="balance-amount">
          <span className="currency">₦</span>
          <span className="amount">
            {hideBalance ? '****' : walletBalance.toLocaleString('en-NG', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </span>
        </div>

        <div className="balance-actions">
          <button
            className="action-btn fund-btn"
            onClick={() => setShowDeposit(!showDeposit)}
          >
            💳 Fund Wallet
          </button>
          <button
            className="action-btn withdraw-btn"
            onClick={() => setShowWithdraw(!showWithdraw)}
          >
            🏦 Withdraw
          </button>
        </div>
      </div>

      {showDeposit && (
        <div className="deposit-section">
          <h3>Deposit Funds</h3>
          <div className="deposit-form">
            <div className="form-group">
              <label htmlFor="amount">Amount (₦)</label>
              <input
                id="amount"
                type="number"
                value={depositAmount}
                onChange={(e) => {
                  setDepositAmount(e.target.value);
                  setError('');
                }}
                placeholder="Enter amount"
                min="100"
                step="50"
              />
              <small>Minimum: ₦100</small>
            </div>

            <div className="section-title">Quick Amounts</div>
            <div className="quick-amounts">
              <button onClick={() => handleQuickDeposit(1000)}>₦1,000</button>
              <button onClick={() => handleQuickDeposit(2000)}>₦2,000</button>
              <button onClick={() => handleQuickDeposit(5000)}>₦5,000</button>
              <button onClick={() => handleQuickDeposit(10000)}>₦10,000</button>
              <button onClick={() => handleQuickDeposit(20000)}>₦20,000</button>
              <button onClick={() => handleQuickDeposit(50000)}>₦50,000</button>
            </div>

            <button
              className="proceed-btn"
              onClick={handleProceedDeposit}
              disabled={loading || !depositAmount}
            >
              {loading ? '🔄 Processing...' : '💳 Proceed to Payment'}
            </button>
          </div>
        </div>
      )}

      {showWithdraw && (
        <div className="withdraw-section">
          <h3>Withdraw Funds</h3>
          <form onSubmit={handleWithdraw} className="withdraw-form">
            <div className="form-group">
              <label htmlFor="withdraw-amount">Amount (₦)</label>
              <input
                id="withdraw-amount"
                type="number"
                value={withdrawData.amount}
                onChange={(e) => {
                  setWithdrawData({...withdrawData, amount: e.target.value});
                  setError('');
                }}
                placeholder="Enter amount to withdraw"
                min="100"
                max={walletBalance}
                step="50"
              />
              <small>Available: ₦{walletBalance.toLocaleString()}</small>
            </div>

            <div className="form-group">
              <label htmlFor="bank-name">Bank Name</label>
              <input
                id="bank-name"
                type="text"
                value={withdrawData.bankName}
                onChange={(e) => setWithdrawData({...withdrawData, bankName: e.target.value})}
                placeholder="e.g., GTBank, Access Bank"
              />
            </div>

            <div className="form-group">
              <label htmlFor="account-number">Account Number</label>
              <input
                id="account-number"
                type="text"
                value={withdrawData.accountNumber}
                onChange={(e) => setWithdrawData({...withdrawData, accountNumber: e.target.value})}
                placeholder="10-digit account number"
                maxLength="10"
              />
            </div>

            <div className="form-group">
              <label htmlFor="account-name">Account Name</label>
              <input
                id="account-name"
                type="text"
                value={withdrawData.accountName}
                onChange={(e) => setWithdrawData({...withdrawData, accountName: e.target.value})}
                placeholder="Full name on account"
              />
            </div>

            <button
              type="submit"
              className="proceed-btn"
              disabled={loading}
            >
              {loading ? '🔄 Processing...' : '✓ Confirm Withdrawal'}
            </button>
          </form>
          <div className="withdraw-info">
            <p>⏱️ Withdrawals are processed within 24 hours to your bank account</p>
          </div>
        </div>
      )}

      <div className="recent-section">
        <div className="section-header">
          <h3>Recent Transactions</h3>
          <button
            className="view-all-btn"
            onClick={() => navigate('/transactions')}
          >
            View All →
          </button>
        </div>

        {recentTransactions.length > 0 ? (
          <div className="transactions-list">
            {recentTransactions.map((transaction) => (
              <div key={transaction.id} className="transaction-item">
                <div className="transaction-info">
                  <p className="transaction-type">{transaction.category}</p>
                  <p className="transaction-date">
                    {transaction.timestamp?.toDate?.()?.toLocaleDateString?.() || 'N/A'}
                  </p>
                </div>
                <div className="transaction-amount">
                  <p className={`amount ${transaction.type}`}>
                    {transaction.type === 'credit' ? '+' : '-'}₦{transaction.amount.toLocaleString()}
                  </p>
                  <p className="transaction-status">{transaction.status}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No transactions yet</p>
          </div>
        )}
      </div>

      <div className="wallet-features">
        <div className="feature-card">
          <div className="feature-icon">💰</div>
          <h4>Quick Access</h4>
          <p>Instant wallet topup with Paystack</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📊</div>
          <h4>Track Spending</h4>
          <p>Monitor all transactions in one place</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🔒</div>
          <h4>Secure & Safe</h4>
          <p>Bank-grade encryption for your safety</p>
        </div>
      </div>
    </div>
  );
};

export default Wallet;
