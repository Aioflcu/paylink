import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc as firebaseDoc, serverTimestamp } from 'firebase/firestore';
import { getDoc } from 'firebase/firestore';
import LoadingSpinner from '../components/LoadingSpinner';
import './Savings.css';

const Savings = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [walletBalance, setWalletBalance] = useState(0);
  const [savings, setSavings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedSavings, setSelectedSavings] = useState(null);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const [formData, setFormData] = useState({
    planName: '',
    targetAmount: '',
    initialAmount: '',
    interestRate: '5', // 5% default
    interval: 'monthly', // daily, weekly, monthly
    lockDays: '0'
  });

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    fetchSavingsData();
  }, [currentUser, navigate]);

  const fetchSavingsData = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      setError('');

      // Fetch wallet balance
      const userDoc = await getDoc(firebaseDoc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        setWalletBalance(userDoc.data().walletBalance || 0);
      }

      // Fetch savings plans
      const savingsQuery = query(
        collection(db, 'savings'),
        where('userId', '==', currentUser.uid)
      );

      const querySnapshot = await getDocs(savingsQuery);
      const savingsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setSavings(savingsList);
    } catch (err) {
      console.error('Error fetching savings data:', error);
      setError('Failed to load savings plans. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateInterest = (principal, rate, days, interval) => {
    // Compound interest formula: A = P(1 + r/100/freq)^(freq*t)
    let frequency = 365; // daily
    if (interval === 'weekly') frequency = 52;
    if (interval === 'monthly') frequency = 12;

    const dailyRate = rate / 100 / frequency;
    const interest = principal * (Math.pow(1 + dailyRate, days) - 1);
    return Math.round(interest * 100) / 100;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!formData.planName.trim()) {
      setError('Plan name is required');
      return false;
    }
    if (!formData.targetAmount || parseFloat(formData.targetAmount) <= 0) {
      setError('Target amount must be greater than 0');
      return false;
    }
    if (!formData.initialAmount || parseFloat(formData.initialAmount) <= 0) {
      setError('Initial amount must be greater than 0');
      return false;
    }
    if (parseFloat(formData.initialAmount) > walletBalance) {
      setError('Insufficient wallet balance');
      return false;
    }
    if (parseFloat(formData.interestRate) < 0 || parseFloat(formData.interestRate) > 100) {
      setError('Interest rate must be between 0 and 100%');
      return false;
    }
    return true;
  };

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setError('');
      setSuccess('');

      const targetAmount = parseFloat(formData.targetAmount);
      const initialAmount = parseFloat(formData.initialAmount);
      const interestRate = parseFloat(formData.interestRate);

      // Create savings plan
      const planData = {
        userId: currentUser.uid,
        planName: formData.planName.trim(),
        targetAmount,
        currentAmount: initialAmount,
        initialAmount,
        interestRate,
        interval: formData.interval,
        lockDays: parseInt(formData.lockDays) || 0,
        withdrawalCount: 0,
        maxWithdrawals: 3,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        maturityDate: new Date(Date.now() + parseInt(formData.lockDays) * 24 * 60 * 60 * 1000),
        status: 'active'
      };

      const planRef = await addDoc(collection(db, 'savings'), planData);

      // Deduct from wallet
      const userRef = firebaseDoc(db, 'users', currentUser.uid);
      const newBalance = walletBalance - initialAmount;
      await updateDoc(userRef, {
        walletBalance: newBalance
      });

      // Record transaction
      await addDoc(collection(db, 'transactions'), {
        userId: currentUser.uid,
        type: 'debit',
        category: 'savings',
        amount: initialAmount,
        description: `Savings: ${formData.planName}`,
        reference: `PAYLINK_SAVINGS_${Date.now()}`,
        status: 'success',
        timestamp: serverTimestamp()
      });

      setWalletBalance(newBalance);
      setFormData({
        planName: '',
        targetAmount: '',
        initialAmount: '',
        interestRate: '5',
        interval: 'monthly',
        lockDays: '0'
      });
      setShowForm(false);
      setSuccess('Savings plan created successfully! 🎉');
      
      // Refresh savings list
      await fetchSavingsData();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error creating savings plan:', err);
      setError('Failed to create savings plan. Please try again.');
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (!selectedSavings) return;

    try {
      setError('');
      setSuccess('');

      const amount = parseFloat(withdrawAmount);

      // Validation
      if (!amount || amount <= 0) {
        setError('Withdrawal amount must be greater than 0');
        return;
      }
      if (amount > selectedSavings.currentAmount) {
        setError('Insufficient savings balance');
        return;
      }
      if (selectedSavings.withdrawalCount >= selectedSavings.maxWithdrawals) {
        setError('Maximum withdrawals (3) reached for this plan');
        return;
      }

      // Check lock period
      const lockExpiryDate = new Date(selectedSavings.createdAt?.toDate?.() || selectedSavings.createdAt);
      lockExpiryDate.setDate(lockExpiryDate.getDate() + selectedSavings.lockDays);
      if (new Date() < lockExpiryDate) {
        setError(`Plan is locked until ${lockExpiryDate.toLocaleDateString()}`);
        return;
      }

      // Calculate accrued interest since last update
      const daysSinceCreation = Math.floor(
        (Date.now() - (selectedSavings.updatedAt?.toDate?.() || selectedSavings.updatedAt).getTime()) / (24 * 60 * 60 * 1000)
      );
      const accruedInterest = calculateInterest(
        selectedSavings.currentAmount,
        selectedSavings.interestRate,
        daysSinceCreation,
        selectedSavings.interval
      );

      const newBalance = selectedSavings.currentAmount + accruedInterest - amount;
      const newWithdrawalCount = selectedSavings.withdrawalCount + 1;

      // Update savings plan
      const savingsRef = firebaseDoc(db, 'savings', selectedSavings.id);
      await updateDoc(savingsRef, {
        currentAmount: newBalance,
        withdrawalCount: newWithdrawalCount,
        updatedAt: serverTimestamp()
      });

      // Update wallet
      const userRef = firebaseDoc(db, 'users', currentUser.uid);
      const newWalletBalance = walletBalance + amount;
      await updateDoc(userRef, {
        walletBalance: newWalletBalance
      });

      // Record transaction
      await addDoc(collection(db, 'transactions'), {
        userId: currentUser.uid,
        type: 'credit',
        category: 'savings_withdrawal',
        amount,
        description: `Withdrawal from: ${selectedSavings.planName}`,
        reference: `PAYLINK_WITHDRAWAL_${Date.now()}`,
        status: 'success',
        timestamp: serverTimestamp()
      });

      setWalletBalance(newWalletBalance);
      setWithdrawAmount('');
      setShowWithdrawForm(false);
      setSuccess(`Withdrawal successful! Amount: ₦${amount.toLocaleString('en-NG')}`);

      // Refresh data
      await fetchSavingsData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error withdrawing from savings:', err);
      setError('Failed to process withdrawal. Please try again.');
    }
  };

  const handleDeletePlan = async (planId) => {
    if (!window.confirm('Are you sure you want to delete this plan? This action cannot be undone.')) {
      return;
    }

    try {
      setError('');

      const planToDelete = savings.find(s => s.id === planId);
      const refundAmount = planToDelete.currentAmount;

      // Delete from Firestore
      const savingsRef = firebaseDoc(db, 'savings', planId);
      await deleteDoc(savingsRef);

      // Refund to wallet
      const userRef = firebaseDoc(db, 'users', currentUser.uid);
      const newWalletBalance = walletBalance + refundAmount;
      await updateDoc(userRef, {
        walletBalance: newWalletBalance
      });

      // Record refund transaction
      await addDoc(collection(db, 'transactions'), {
        userId: currentUser.uid,
        type: 'credit',
        category: 'savings_refund',
        amount: refundAmount,
        description: `Refund from deleted plan: ${planToDelete.planName}`,
        reference: `PAYLINK_REFUND_${Date.now()}`,
        status: 'success',
        timestamp: serverTimestamp()
      });

      setWalletBalance(newWalletBalance);
      setSelectedSavings(null);
      setSuccess('Plan deleted and amount refunded to wallet');

      // Refresh data
      await fetchSavingsData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting savings plan:', err);
      setError('Failed to delete plan. Please try again.');
    }
  };

  const getInterestAccrued = (plan) => {
    const daysSinceCreation = Math.floor(
      (Date.now() - (plan.updatedAt?.toDate?.() || plan.updatedAt).getTime()) / (24 * 60 * 60 * 1000)
    );
    return calculateInterest(plan.currentAmount, plan.interestRate, daysSinceCreation, plan.interval);
  };

  const isLocked = (plan) => {
    const lockExpiryDate = new Date(plan.createdAt?.toDate?.() || plan.createdAt);
    lockExpiryDate.setDate(lockExpiryDate.getDate() + plan.lockDays);
    return new Date() < lockExpiryDate;
  };

  const getProgressPercentage = (plan) => {
    return Math.min((plan.currentAmount / plan.targetAmount) * 100, 100);
  };

  if (loading) {
    return <LoadingSpinner message="Loading Savings Plans..." />;
  }

  return (
    <div className="savings-page">
      <div className="page-header">
        <div className="header-content">
          <h1>💰 Savings Plans</h1>
          <p>Build wealth with PAYLINK savings plans</p>
        </div>
        <button
          className="create-savings-btn"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? '✕ Cancel' : '+ Create Plan'}
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      {success && (
        <div className="success-banner">
          <p>{success}</p>
          <button onClick={() => setSuccess('')}>×</button>
        </div>
      )}

      <div className="wallet-info">
        <h3>Wallet Balance</h3>
        <p className="balance">₦{walletBalance.toLocaleString('en-NG')}</p>
      </div>

      {showForm && (
        <div className="savings-form">
          <h2>Create New Savings Plan</h2>
          <form onSubmit={handleCreatePlan}>
            <div className="form-row">
              <div className="form-group">
                <label>Plan Name *</label>
                <input
                  type="text"
                  name="planName"
                  placeholder="e.g., Vacation Fund, House Fund"
                  value={formData.planName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Target Amount (₦) *</label>
                <input
                  type="number"
                  name="targetAmount"
                  placeholder="1000000"
                  value={formData.targetAmount}
                  onChange={handleInputChange}
                  min="1000"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Initial Amount (₦) *</label>
                <input
                  type="number"
                  name="initialAmount"
                  placeholder="50000"
                  value={formData.initialAmount}
                  onChange={handleInputChange}
                  min="1000"
                  max={walletBalance}
                  required
                />
                <small>Available: ₦{walletBalance.toLocaleString('en-NG')}</small>
              </div>
              <div className="form-group">
                <label>Interest Rate (%) *</label>
                <input
                  type="number"
                  name="interestRate"
                  placeholder="5"
                  value={formData.interestRate}
                  onChange={handleInputChange}
                  min="0"
                  max="100"
                  step="0.5"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Compounding Interval *</label>
                <select
                  name="interval"
                  value={formData.interval}
                  onChange={handleInputChange}
                  required
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div className="form-group">
                <label>Lock Period (Days)</label>
                <input
                  type="number"
                  name="lockDays"
                  placeholder="0"
                  value={formData.lockDays}
                  onChange={handleInputChange}
                  min="0"
                  max="3650"
                />
                <small>0 = No lock period</small>
              </div>
            </div>

            <button type="submit" className="submit-btn">
              Create Savings Plan
            </button>
          </form>
        </div>
      )}

      {selectedSavings && showWithdrawForm && (
        <div className="withdraw-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Withdraw from {selectedSavings.planName}</h3>
              <button
                className="close-btn"
                onClick={() => {
                  setShowWithdrawForm(false);
                  setWithdrawAmount('');
                }}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleWithdraw} className="modal-body">
              <div className="info-box">
                <p><strong>Current Balance:</strong> ₦{selectedSavings.currentAmount.toLocaleString('en-NG')}</p>
                <p><strong>Interest Accrued:</strong> ₦{getInterestAccrued(selectedSavings).toLocaleString('en-NG')}</p>
                <p><strong>Withdrawals Used:</strong> {selectedSavings.withdrawalCount}/3</p>
                {isLocked(selectedSavings) && (
                  <p className="warning">
                    ⚠️ Plan is locked. Withdrawals available from {new Date(
                      new Date(selectedSavings.createdAt?.toDate?.() || selectedSavings.createdAt).getTime() +
                      selectedSavings.lockDays * 24 * 60 * 60 * 1000
                    ).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className="form-group">
                <label>Withdrawal Amount (₦) *</label>
                <input
                  type="number"
                  placeholder="Enter amount"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  min="1000"
                  max={selectedSavings.currentAmount}
                  required
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => {
                    setShowWithdrawForm(false);
                    setWithdrawAmount('');
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn primary">
                  Withdraw
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="savings-list">
        {savings.length === 0 ? (
          <div className="empty-state">
            <p>📊 No savings plans yet.</p>
            <p>Create your first savings plan to start growing your wealth!</p>
          </div>
        ) : (
          savings.map((plan) => (
            <div
              key={plan.id}
              className={`savings-card ${isLocked(plan) ? 'locked' : ''}`}
              onClick={() => setSelectedSavings(selectedSavings?.id === plan.id ? null : plan)}
            >
              <div className="savings-card-header">
                <div className="plan-info">
                  <h3>{plan.planName}</h3>
                  <p className="plan-meta">
                    {plan.interestRate}% interest • {plan.interval}
                  </p>
                </div>
                <div className="plan-status">
                  {isLocked(plan) && <span className="lock-badge">🔒 Locked</span>}
                  <span className="amount-badge">
                    ₦{plan.currentAmount.toLocaleString('en-NG')}
                  </span>
                </div>
              </div>

              <div className="progress-section">
                <div className="progress-info">
                  <span>Target: ₦{plan.targetAmount.toLocaleString('en-NG')}</span>
                  <span>{getProgressPercentage(plan).toFixed(1)}%</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${getProgressPercentage(plan)}%` }}
                  ></div>
                </div>
              </div>

              <div className="savings-details">
                <div className="detail-item">
                  <span>Initial Amount:</span>
                  <span>₦{plan.initialAmount.toLocaleString('en-NG')}</span>
                </div>
                <div className="detail-item">
                  <span>Interest Accrued:</span>
                  <span className="interest">+₦{getInterestAccrued(plan).toLocaleString('en-NG')}</span>
                </div>
                <div className="detail-item">
                  <span>Withdrawals:</span>
                  <span>{plan.withdrawalCount}/3</span>
                </div>
                {plan.lockDays > 0 && (
                  <div className="detail-item">
                    <span>Lock Until:</span>
                    <span>
                      {new Date(
                        new Date(plan.createdAt?.toDate?.() || plan.createdAt).getTime() +
                        plan.lockDays * 24 * 60 * 60 * 1000
                      ).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              {selectedSavings?.id === plan.id && (
                <div className="expanded-actions">
                  <button
                    className="btn primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowWithdrawForm(true);
                    }}
                    disabled={isLocked(plan) || plan.withdrawalCount >= 3}
                  >
                    Withdraw
                  </button>
                  <button
                    className="btn danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePlan(plan.id);
                    }}
                  >
                    Delete Plan
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Savings;
