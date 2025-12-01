import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { getInitials, formatCurrency } from '../utils/validation';
import LoadingSpinner from '../components/LoadingSpinner';
import './Dashboard.css';

const Dashboard = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [showBalance, setShowBalance] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!currentUser) {
        navigate('/login');
        return;
      }

      try {
        // Fetch user data
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
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
        const transactions = transactionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRecentTransactions(transactions);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [currentUser, navigate]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const utilities = [
    { name: 'Airtime', icon: '📱', path: '/airtime', color: '#FF6B6B' },
    { name: 'Data', icon: '📊', path: '/data', color: '#4ECDC4' },
    { name: 'Electricity', icon: '⚡', path: '/electricity', color: '#FFE66D' },
    { name: 'Cable TV', icon: '📺', path: '/cabletv', color: '#95E1D3' },
    { name: 'Internet', icon: '🌐', path: '/internet', color: '#A8E6CF' },
    { name: 'Education', icon: '🎓', path: '/education', color: '#C7CEEA' },
    { name: 'Insurance', icon: '🛡️', path: '/insurance', color: '#B4A7D6' },
    { name: 'Gift Cards', icon: '🎁', path: '/giftcard', color: '#FFB6B9' },
    { name: 'Tax', icon: '📋', path: '/tax', color: '#FEC8D8' },
  ];

  if (loading) {
    return <LoadingSpinner message="Loading Dashboard..." />;
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-inner">
          <div className="header-left">
          <button
            className="hamburger-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            title="Menu"
          >
            ☰
          </button>
          <div
            className="avatar-badge"
            onClick={() => navigate('/profile')}
            role="button"
            tabIndex={0}
            title="Go to Profile"
          >
            {getInitials(userData?.fullName || currentUser?.email || 'User')}
          </div>
          <div className="user-info">
            <p className="user-name">{userData?.fullName || 'User'}</p>
            <p className="user-email">{currentUser?.email}</p>
          </div>
          </div>

          <div className="header-right">
          <button
            className="header-btn history-btn"
            onClick={() => navigate('/transactions')}
            title="History"
          >
            📋 History
          </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="mobile-menu">
          <button onClick={() => navigate('/profile')}>👤 Profile</button>
          <button onClick={() => navigate('/wallet')}>💰 Wallet</button>
          <button onClick={() => navigate('/savings')}>🏦 Savings</button>
          <button onClick={() => navigate('/transactions')}>📋 Transactions</button>
          <hr />
          <button onClick={handleLogout} className="logout-btn">
            🚪 Logout
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="dashboard-main">
          {/* Wallet Section - Seamless */}
          <div className="wallet-section-seamless">
            <div className="wallet-strip">
              <div className="wallet-left stacked">
                <div className="balance-display compact">
                  <span className="currency">₦</span>
                  <span className="amount">
                    {showBalance ? walletBalance.toLocaleString() : '••••••'}
                  </span>
                  <button
                    className="eye-icon"
                    onClick={() => setShowBalance(!showBalance)}
                    title={showBalance ? 'Hide balance' : 'Show balance'}
                  >
                    {showBalance ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>

                <div className="wallet-actions-vertical">
                  <button
                    className="action-btn topup"
                    onClick={() => navigate('/wallet')}
                    title="Top up"
                  >
                    <span className="btn-icon">➕</span>
                    <span className="btn-label">Top up</span>
                  </button>
                  <button
                    className="action-btn withdraw"
                    onClick={() => navigate('/wallet')}
                    title="Withdraw"
                  >
                    <span className="btn-icon">⬆️</span>
                    <span className="btn-label">Withdraw</span>
                  </button>
                </div>
              </div>

              <div className="wallet-right">
                {/* reserved for shortcuts or quick actions on the right */}
              </div>
            </div>
          </div>

        {/* Quick Stats */}
        <section className="quick-stats">
          <div className="stat-card">
            <p className="stat-label">Transactions</p>
            <p className="stat-value">{recentTransactions.length}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Points</p>
            <p className="stat-value">{userData?.points || 0}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Savings</p>
            <p className="stat-value">{userData?.savingsCount || 0}</p>
          </div>
        </section>

        {/* Utilities Grid */}
        <section className="utilities-section">
          <h3 className="section-title">Pay Your Bills</h3>
          <div className="utilities-grid">
            {utilities.map((utility) => (
              <button
                key={utility.name}
                className="utility-card"
                onClick={() => navigate(utility.path)}
                style={{ '--card-color': utility.color }}
              >
                <div className="utility-icon">{utility.icon}</div>
                <span className="utility-name">{utility.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Recent Transactions */}
        {recentTransactions.length > 0 && (
          <section className="recent-transactions">
            <div className="section-header">
              <h3 className="section-title">Recent Transactions</h3>
              <button
                className="view-all-btn"
                onClick={() => navigate('/transactions')}
              >
                View All →
              </button>
            </div>

            <div className="transactions-list">
              {recentTransactions.map((transaction) => (
                <div key={transaction.id} className="transaction-item">
                  <div className="transaction-left">
                    <p className="transaction-type">{transaction.category}</p>
                    <p className="transaction-date">
                      {new Date(transaction.timestamp).toLocaleDateString('en-NG', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="transaction-amount">
                    <span
                      className={`amount ${
                        transaction.type === 'credit' ? 'credit' : 'debit'
                      }`}
                    >
                      {transaction.type === 'credit' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recommendations */}
        <section className="recommendations">
          <h3 className="section-title">Quick Links</h3>
          <div className="recommendations-grid">
            <button
              className="recommendation-card"
              onClick={() => navigate('/savings')}
            >
              <span className="icon">🏦</span>
              <p>Start Saving</p>
            </button>
            <button
              className="recommendation-card"
              onClick={() => navigate('/pin')}
            >
              <span className="icon">🔐</span>
              <p>Manage PIN</p>
            </button>
            <button
              className="recommendation-card"
              onClick={() => navigate('/profile')}
            >
              <span className="icon">⚙️</span>
              <p>Settings</p>
            </button>
          </div>
        </section>
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <button className="nav-item active" title="Home">
          🏠 Home
        </button>
        <button className="nav-item" onClick={() => navigate('/wallet')} title="Wallet">
          💰 Wallet
        </button>
        <button className="nav-item" onClick={() => navigate('/transactions')} title="Transactions">
          📋 History
        </button>
        <button className="nav-item" onClick={() => navigate('/profile')} title="Profile">
          👤 Profile
        </button>
      </nav>
    </div>
  );
};

export default Dashboard;
