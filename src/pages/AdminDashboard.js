import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, limit, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import AnalyticsChart from '../components/AnalyticsChart';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [adminStats, setAdminStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalTransactions: 0,
    totalRevenue: 0,
    failedTransactions: 0,
    suspiciousActivities: 0
  });
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [failedTxns, setFailedTxns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    if (currentUser) {
      loadAdminStats();
      loadUsers();
      loadTransactions();
      loadFailedTransactions();
      generateRevenueTrendData();
      generateUserGrowthData();
      generateTransactionTypesData();
    }
  }, [currentUser]);

  const loadAdminStats = async () => {
    try {
      // Total users
      const usersRef = collection(db, 'users');
      const userDocs = await getDocs(usersRef);
      const totalUsers = userDocs.size;

      // Active users (logged in last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const activeUsers = userDocs.docs.filter(doc => {
        const lastLogin = doc.data().lastLogin?.toDate?.() || new Date(doc.data().lastLogin);
        return lastLogin > sevenDaysAgo;
      }).length;

      // Total transactions
      const txnsRef = collection(db, 'transactions');
      const txnDocs = await getDocs(txnsRef);
      const totalTransactions = txnDocs.size;

      // Total revenue
      const totalRevenue = txnDocs.docs.reduce((sum, doc) => {
        const data = doc.data();
        return sum + (data.amount || 0);
      }, 0);

      // Failed transactions
      const failedTxns = txnDocs.docs.filter(doc => doc.data().status === 'failed').length;

      // Suspicious activities
      const fraudRef = collection(db, 'fraudChecks');
      const fraudDocs = await getDocs(query(fraudRef, where('action', '==', 'block')));
      const suspiciousActivities = fraudDocs.size;

      setAdminStats({
        totalUsers,
        activeUsers,
        totalTransactions,
        totalRevenue,
        failedTransactions: failedTxns,
        suspiciousActivities
      });
    } catch (error) {
      console.error('Error loading admin stats:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const usersRef = collection(db, 'users');
      const userDocs = await getDocs(usersRef);
      const userList = userDocs.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()
      }));
      setUsers(userList);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      const txnsRef = query(
        collection(db, 'transactions'),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      const txnDocs = await getDocs(txnsRef);
      const txnList = txnDocs.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.()
      }));
      setTransactions(txnList);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const loadFailedTransactions = async () => {
    try {
      const failedRef = query(
        collection(db, 'transactions'),
        where('status', '==', 'failed'),
        orderBy('timestamp', 'desc'),
        limit(20)
      );
      const failedDocs = await getDocs(failedRef);
      const failedList = failedDocs.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.()
      }));
      setFailedTxns(failedList);
    } catch (error) {
      console.error('Error loading failed transactions:', error);
    }
  };

  const generateRevenueTrendData = async () => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const transactionsRef = query(
        collection(db, 'transactions'),
        where('timestamp', '>=', thirtyDaysAgo),
        where('status', '==', 'success'),
        orderBy('timestamp', 'asc')
      );

      const querySnapshot = await getDocs(transactionsRef);
      const dailyRevenue = {};

      querySnapshot.forEach(doc => {
        const data = doc.data();
        const date = data.timestamp?.toDate?.() || new Date(data.timestamp);
        const dayKey = date.toISOString().split('T')[0];
        const amount = data.amount || 0;

        dailyRevenue[dayKey] = (dailyRevenue[dayKey] || 0) + amount;
      });

      const trendData = Object.entries(dailyRevenue)
        .map(([date, revenue]) => ({
          date,
          revenue: revenue / 100, // Convert to Naira
          formattedDate: new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          })
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      setRevenueTrendData(trendData);
    } catch (error) {
      console.error('Error generating revenue trend data:', error);
      setRevenueTrendData([]);
    }
  };

  const generateUserGrowthData = async () => {
    try {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const usersRef = query(
        collection(db, 'users'),
        where('createdAt', '>=', ninetyDaysAgo),
        orderBy('createdAt', 'asc')
      );

      const querySnapshot = await getDocs(usersRef);
      const dailyUsers = {};

      querySnapshot.forEach(doc => {
        const data = doc.data();
        const date = data.createdAt?.toDate?.() || new Date(data.createdAt);
        const dayKey = date.toISOString().split('T')[0];

        dailyUsers[dayKey] = (dailyUsers[dayKey] || 0) + 1;
      });

      let cumulativeUsers = 0;
      const growthData = Object.entries(dailyUsers)
        .map(([date, newUsers]) => {
          cumulativeUsers += newUsers;
          return {
            date,
            newUsers,
            totalUsers: cumulativeUsers,
            formattedDate: new Date(date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            })
          };
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      setUserGrowthData(growthData);
    } catch (error) {
      console.error('Error generating user growth data:', error);
      setUserGrowthData([]);
    }
  };

  const generateTransactionTypesData = async () => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const transactionsRef = query(
        collection(db, 'transactions'),
        where('timestamp', '>=', thirtyDaysAgo),
        where('status', '==', 'success')
      );

      const querySnapshot = await getDocs(transactionsRef);
      const typeCounts = {};

      querySnapshot.forEach(doc => {
        const type = doc.data().type || 'other';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });

      const total = Object.values(typeCounts).reduce((sum, count) => sum + count, 0);
      const pieData = Object.entries(typeCounts)
        .map(([type, count]) => ({
          name: type.charAt(0).toUpperCase() + type.slice(1),
          value: count,
          percentage: ((count / total) * 100).toFixed(1)
        }))
        .sort((a, b) => b.value - a.value);

      setTransactionTypesData(pieData);
    } catch (error) {
      console.error('Error generating transaction types data:', error);
      setTransactionTypesData([]);
    }
  };

  const suspendUser = async (userId) => {
    if (!window.confirm('Are you sure you want to suspend this user?')) return;
    
    try {
      setLoading(true);
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        accountStatus: 'suspended',
        suspendedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      alert('User suspended successfully');
      loadUsers();
    } catch (error) {
      console.error('Error suspending user:', error);
      alert('Failed to suspend user');
    } finally {
      setLoading(false);
    }
  };

  const resolveFailedTransaction = async (transactionId) => {
    try {
      setLoading(true);
      const txnRef = doc(db, 'transactions', transactionId);
      await updateDoc(txnRef, {
        status: 'resolved',
        resolvedAt: serverTimestamp()
      });
      alert('Transaction marked as resolved');
      loadFailedTransactions();
    } catch (error) {
      console.error('Error resolving transaction:', error);
      alert('Failed to resolve transaction');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || user.accountStatus === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="admin-dashboard-page">
      <div className="admin-header">
        <h1>🔐 Admin Dashboard</h1>
        <p>System management and monitoring</p>
      </div>

      <div className="admin-content">
        {/* Statistics Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-info">
              <p className="stat-label">Total Users</p>
              <p className="stat-value">{adminStats.totalUsers.toLocaleString()}</p>
              <p className="stat-change">+{adminStats.activeUsers} active</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">💳</div>
            <div className="stat-info">
              <p className="stat-label">Total Transactions</p>
              <p className="stat-value">{adminStats.totalTransactions.toLocaleString()}</p>
              <p className="stat-change">₦{(adminStats.totalRevenue / 1000000).toFixed(1)}M revenue</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">❌</div>
            <div className="stat-info">
              <p className="stat-label">Failed Transactions</p>
              <p className="stat-value">{adminStats.failedTransactions.toLocaleString()}</p>
              <p className="stat-change">Requires attention</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🚨</div>
            <div className="stat-info">
              <p className="stat-label">Suspicious Activities</p>
              <p className="stat-value">{adminStats.suspiciousActivities.toLocaleString()}</p>
              <p className="stat-change">Blocked transactions</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="admin-tabs">
          <button
            className={`admin-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Users
          </button>
          <button
            className={`admin-tab ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            Transactions
          </button>
          <button
            className={`admin-tab ${activeTab === 'failed' ? 'active' : ''}`}
            onClick={() => setActiveTab('failed')}
          >
            Failed Txns
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="admin-section">
            <h2>System Overview</h2>
            <div className="overview-grid">
              <div className="overview-card">
                <h3>Platform Health</h3>
                <div className="health-indicator">
                  <div className="health-item">
                    <span className="health-label">Server Status</span>
                    <span className="health-badge online">● Online</span>
                  </div>
                  <div className="health-item">
                    <span className="health-label">Database</span>
                    <span className="health-badge online">● Operational</span>
                  </div>
                  <div className="health-item">
                    <span className="health-label">Payment Gateway</span>
                    <span className="health-badge online">● Connected</span>
                  </div>
                </div>
              </div>

              <div className="overview-card">
                <h3>Quick Stats</h3>
                <div className="quick-stats">
                  <div className="quick-stat">
                    <p className="qs-label">Today's Revenue</p>
                    <p className="qs-value">₦{(adminStats.totalRevenue / 100).toLocaleString()}</p>
                  </div>
                  <div className="quick-stat">
                    <p className="qs-label">Success Rate</p>
                    <p className="qs-value">
                      {adminStats.totalTransactions > 0
                        ? (((adminStats.totalTransactions - adminStats.failedTransactions) / adminStats.totalTransactions) * 100).toFixed(1)
                        : 0}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="admin-section">
            <h2>User Management</h2>
            <div className="filters">
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {filteredUsers.length > 0 ? (
              <div className="users-table">
                <div className="table-header">
                  <div className="col-name">Name</div>
                  <div className="col-email">Email</div>
                  <div className="col-joined">Joined</div>
                  <div className="col-status">Status</div>
                  <div className="col-action">Action</div>
                </div>
                {filteredUsers.map(user => (
                  <div key={user.id} className="table-row">
                    <div className="col-name">{user.fullName || 'N/A'}</div>
                    <div className="col-email">{user.email}</div>
                    <div className="col-joined">{user.createdAt?.toLocaleDateString()}</div>
                    <div className="col-status">
                      <span className={`status-badge ${user.accountStatus || 'active'}`}>
                        {user.accountStatus || 'active'}
                      </span>
                    </div>
                    <div className="col-action">
                      {user.accountStatus !== 'suspended' && (
                        <button
                          className="action-btn suspend"
                          onClick={() => suspendUser(user.id)}
                          disabled={loading}
                        >
                          Suspend
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-state">No users found</p>
            )}
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="admin-section">
            <h2>Recent Transactions</h2>
            {transactions.length > 0 ? (
              <div className="transactions-table">
                <div className="table-header">
                  <div className="col-id">ID</div>
                  <div className="col-type">Type</div>
                  <div className="col-amount">Amount</div>
                  <div className="col-date">Date</div>
                  <div className="col-status">Status</div>
                </div>
                {transactions.map(txn => (
                  <div key={txn.id} className="table-row">
                    <div className="col-id">{txn.id.substring(0, 8)}</div>
                    <div className="col-type">{txn.type}</div>
                    <div className="col-amount">₦{(txn.amount || 0).toLocaleString()}</div>
                    <div className="col-date">{txn.timestamp?.toLocaleDateString()}</div>
                    <div className="col-status">
                      <span className={`status-badge ${txn.status}`}>{txn.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-state">No transactions found</p>
            )}
          </div>
        )}

        {/* Failed Transactions Tab */}
        {activeTab === 'failed' && (
          <div className="admin-section">
            <h2>Failed Transactions ({failedTxns.length})</h2>
            {failedTxns.length > 0 ? (
              <div className="failed-txns-list">
                {failedTxns.map(txn => (
                  <div key={txn.id} className="failed-txn-item">
                    <div className="txn-details">
                      <p className="txn-id">ID: {txn.id.substring(0, 12)}</p>
                      <p className="txn-desc">{txn.description || txn.type}</p>
                      <p className="txn-error">{txn.errorMessage || 'No error details'}</p>
                    </div>
                    <div className="txn-amount">₦{(txn.amount || 0).toLocaleString()}</div>
                    <div className="txn-date">{txn.timestamp?.toLocaleDateString()}</div>
                    <button
                      className="resolve-btn"
                      onClick={() => resolveFailedTransaction(txn.id)}
                      disabled={loading}
                    >
                      Resolve
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-state">No failed transactions</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
