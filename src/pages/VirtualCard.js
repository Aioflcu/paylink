import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import './VirtualCard.css';

const VirtualCard = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('card');
  const [cardData, setCardData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardHolder: '',
    balance: 0,
    spentThisMonth: 0,
    status: 'active'
  });
  const [cardLimits, setCardLimits] = useState({
    dailyLimit: 50000,
    monthlyLimit: 500000,
    singleTransactionLimit: 100000
  });
  const [transactions, setTransactions] = useState([]);
  const [showLimitSettings, setShowLimitSettings] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadCardData();
      loadCardLimits();
      loadCardTransactions();
    }
  }, [currentUser]);

  const loadCardData = async () => {
    try {
      if (currentUser) {
        const cardRef = query(
          collection(db, 'virtualCards'),
          where('userId', '==', currentUser.uid),
          limit(1)
        );
        const cardDocs = await getDocs(cardRef);
        
        if (!cardDocs.empty) {
          setCardData({
            ...cardDocs.docs[0].data(),
            id: cardDocs.docs[0].id
          });
        } else {
          // Generate new card if doesn't exist
          await generateNewCard();
        }
      }
    } catch (error) {
      console.error('Error loading card data:', error);
    }
  };

  const loadCardLimits = async () => {
    try {
      if (currentUser) {
        const limitsRef = query(
          collection(db, 'cardLimits'),
          where('userId', '==', currentUser.uid),
          limit(1)
        );
        const limitsDocs = await getDocs(limitsRef);
        
        if (!limitsDocs.empty) {
          setCardLimits(limitsDocs.docs[0].data());
        }
      }
    } catch (error) {
      console.error('Error loading card limits:', error);
    }
  };

  const loadCardTransactions = async () => {
    try {
      if (currentUser) {
        const txnRef = query(
          collection(db, 'virtualCardTransactions'),
          where('userId', '==', currentUser.uid),
          orderBy('timestamp', 'desc'),
          limit(20)
        );
        const txnDocs = await getDocs(txnRef);
        const txns = txnDocs.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate?.()
        }));
        setTransactions(txns);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const generateNewCard = async () => {
    try {
      setLoading(true);
      const cardNumber = this.generateCardNumber();
      const expiryDate = this.generateExpiryDate();
      const cvv = this.generateCVV();

      const newCard = {
        userId: currentUser.uid,
        cardNumber: cardNumber,
        cardNumberMasked: `**** **** **** ${cardNumber.slice(-4)}`,
        expiryDate: expiryDate,
        cvv: cvv,
        cardHolder: currentUser.displayName || 'PAYLINK USER',
        balance: 0,
        spentThisMonth: 0,
        status: 'active',
        createdAt: serverTimestamp(),
        isDefault: true
      };

      const docRef = await addDoc(collection(db, 'virtualCards'), newCard);
      
      setCardData({
        ...newCard,
        id: docRef.id
      });

      // Create card limits
      await addDoc(collection(db, 'cardLimits'), {
        userId: currentUser.uid,
        virtualCardId: docRef.id,
        dailyLimit: 50000,
        monthlyLimit: 500000,
        singleTransactionLimit: 100000,
        dailySpent: 0,
        monthlySpent: 0,
        createdAt: serverTimestamp()
      });

      alert('Virtual card created successfully!');
    } catch (error) {
      console.error('Error generating card:', error);
      alert('Failed to create virtual card');
    } finally {
      setLoading(false);
    }
  };

  const generateCardNumber = () => {
    let cardNumber = '5399'; // Starts with Mastercard prefix
    for (let i = 0; i < 12; i++) {
      cardNumber += Math.floor(Math.random() * 10);
    }
    return cardNumber;
  };

  const generateExpiryDate = () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 3); // Valid for 3 years
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${month}/${year}`;
  };

  const generateCVV = () => {
    return String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  };

  const toggleCardStatus = async () => {
    try {
      setLoading(true);
      const newStatus = cardData.status === 'active' ? 'inactive' : 'active';
      
      const cardRef = doc(db, 'virtualCards', cardData.id);
      await updateDoc(cardRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      setCardData({
        ...cardData,
        status: newStatus
      });

      alert(`Card ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`);
    } catch (error) {
      console.error('Error updating card status:', error);
      alert('Failed to update card status');
    } finally {
      setLoading(false);
    }
  };

  const updateCardLimits = async () => {
    try {
      setLoading(true);
      const limitsRef = query(
        collection(db, 'cardLimits'),
        where('userId', '==', currentUser.uid),
        limit(1)
      );
      const limitsDocs = await getDocs(limitsRef);

      if (!limitsDocs.empty) {
        const limitsDocRef = doc(db, 'cardLimits', limitsDocs.docs[0].id);
        await updateDoc(limitsDocRef, {
          dailyLimit: cardLimits.dailyLimit,
          monthlyLimit: cardLimits.monthlyLimit,
          singleTransactionLimit: cardLimits.singleTransactionLimit,
          updatedAt: serverTimestamp()
        });
      }

      setShowLimitSettings(false);
      alert('Card limits updated successfully!');
    } catch (error) {
      console.error('Error updating limits:', error);
      alert('Failed to update card limits');
    } finally {
      setLoading(false);
    }
  };

  const fundCard = async () => {
    const amount = prompt('Enter amount to fund (₦):');
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      const fundAmount = Number(amount);

      // Get user wallet
      const userQuery = query(collection(db, 'users'), where('uid', '==', currentUser.uid));
      const userDocs = await getDocs(userQuery);

      if (!userDocs.empty) {
        const userData = userDocs.docs[0].data();
        if ((userData.mainWallet || 0) < fundAmount) {
          alert('Insufficient balance in your main wallet');
          return;
        }

        // Deduct from main wallet
        const userRef = doc(db, 'users', userDocs.docs[0].id);
        await updateDoc(userRef, {
          mainWallet: (userData.mainWallet || 0) - fundAmount,
          updatedAt: serverTimestamp()
        });

        // Add to virtual card
        const cardRef = doc(db, 'virtualCards', cardData.id);
        await updateDoc(cardRef, {
          balance: (cardData.balance || 0) + fundAmount,
          updatedAt: serverTimestamp()
        });

        // Record transaction
        await addDoc(collection(db, 'virtualCardTransactions'), {
          userId: currentUser.uid,
          type: 'fund',
          amount: fundAmount,
          description: 'Funded virtual card',
          status: 'completed',
          timestamp: serverTimestamp()
        });

        setCardData({
          ...cardData,
          balance: (cardData.balance || 0) + fundAmount
        });

        alert(`Virtual card funded with ₦${fundAmount.toLocaleString()}`);
      }
    } catch (error) {
      console.error('Error funding card:', error);
      alert('Failed to fund card');
    } finally {
      setLoading(false);
    }
  };

  const withdrawFromCard = async () => {
    const amount = prompt('Enter amount to withdraw (₦):');
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const withdrawAmount = Number(amount);
    if (withdrawAmount > (cardData.balance || 0)) {
      alert('Insufficient balance on virtual card');
      return;
    }

    try {
      setLoading(true);

      // Add to main wallet
      const userQuery = query(collection(db, 'users'), where('uid', '==', currentUser.uid));
      const userDocs = await getDocs(userQuery);

      if (!userDocs.empty) {
        const userData = userDocs.docs[0].data();
        const userRef = doc(db, 'users', userDocs.docs[0].id);
        await updateDoc(userRef, {
          mainWallet: (userData.mainWallet || 0) + withdrawAmount,
          updatedAt: serverTimestamp()
        });

        // Deduct from virtual card
        const cardRef = doc(db, 'virtualCards', cardData.id);
        await updateDoc(cardRef, {
          balance: (cardData.balance || 0) - withdrawAmount,
          updatedAt: serverTimestamp()
        });

        // Record transaction
        await addDoc(collection(db, 'virtualCardTransactions'), {
          userId: currentUser.uid,
          type: 'withdraw',
          amount: withdrawAmount,
          description: 'Withdrew from virtual card',
          status: 'completed',
          timestamp: serverTimestamp()
        });

        setCardData({
          ...cardData,
          balance: (cardData.balance || 0) - withdrawAmount
        });

        alert(`Withdrew ₦${withdrawAmount.toLocaleString()} from virtual card`);
      }
    } catch (error) {
      console.error('Error withdrawing:', error);
      alert('Failed to withdraw from card');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="virtual-card-page">
      <div className="vc-header">
        <h1>💳 Virtual Card</h1>
        <p>Manage your virtual payment card</p>
      </div>

      <div className="vc-content">
        {/* Tab Navigation */}
        <div className="vc-tabs">
          <button
            className={`vc-tab ${activeTab === 'card' ? 'active' : ''}`}
            onClick={() => setActiveTab('card')}
          >
            Card
          </button>
          <button
            className={`vc-tab ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            Transactions
          </button>
          <button
            className={`vc-tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </div>

        {/* Card Tab */}
        {activeTab === 'card' && (
          <div className="vc-section">
            {cardData.cardNumber ? (
              <>
                <div className="card-display">
                  <div className={`card-chip ${cardData.status === 'active' ? 'active' : 'inactive'}`}>
                    {cardData.status === 'active' ? '💳 Active' : '🔒 Inactive'}
                  </div>
                  <div className="card-content">
                    <div className="card-number-display">
                      {cardData.cardNumberMasked}
                    </div>
                    <div className="card-details">
                      <div className="detail-item">
                        <p className="detail-label">Card Holder</p>
                        <p className="detail-value">{cardData.cardHolder}</p>
                      </div>
                      <div className="detail-item">
                        <p className="detail-label">Expires</p>
                        <p className="detail-value">{cardData.expiryDate}</p>
                      </div>
                    </div>
                    <div className="card-footer">
                      <span className="card-type">Mastercard</span>
                      <span className="card-status">
                        {cardData.status === 'active' ? '✓ Active' : '✗ Inactive'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="card-stats">
                  <div className="stat-item">
                    <p className="stat-label">Card Balance</p>
                    <p className="stat-value">₦{(cardData.balance || 0).toLocaleString()}</p>
                  </div>
                  <div className="stat-item">
                    <p className="stat-label">Spent This Month</p>
                    <p className="stat-value">₦{(cardData.spentThisMonth || 0).toLocaleString()}</p>
                  </div>
                </div>

                <div className="card-actions">
                  <button
                    className="vc-btn fund-btn"
                    onClick={fundCard}
                    disabled={loading}
                  >
                    💰 Fund Card
                  </button>
                  <button
                    className="vc-btn withdraw-btn"
                    onClick={withdrawFromCard}
                    disabled={loading || !cardData.balance}
                  >
                    💸 Withdraw
                  </button>
                  <button
                    className={`vc-btn toggle-btn ${cardData.status === 'active' ? 'deactivate' : 'activate'}`}
                    onClick={toggleCardStatus}
                    disabled={loading}
                  >
                    {cardData.status === 'active' ? '🔒 Deactivate' : '✓ Activate'}
                  </button>
                </div>
              </>
            ) : (
              <div className="empty-card">
                <p>No virtual card yet</p>
                <button
                  className="vc-btn create-btn"
                  onClick={generateNewCard}
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Virtual Card'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="vc-section">
            <h2>Transaction History</h2>
            {transactions.length > 0 ? (
              <div className="transaction-list">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="transaction-item">
                    <div className="txn-icon">
                      {transaction.type === 'fund' && '💰'}
                      {transaction.type === 'withdraw' && '💸'}
                      {transaction.type === 'payment' && '💳'}
                    </div>
                    <div className="txn-info">
                      <p className="txn-description">{transaction.description}</p>
                      <p className="txn-date">
                        {transaction.timestamp?.toLocaleDateString()}
                      </p>
                    </div>
                    <div className="txn-amount">
                      <p className={`amount ${transaction.type === 'fund' || transaction.type === 'withdraw' ? 'neutral' : 'payment'}`}>
                        {transaction.type === 'withdraw' || transaction.type === 'payment' ? '-' : '+'}
                        ₦{transaction.amount.toLocaleString()}
                      </p>
                      <p className="status">{transaction.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-state">No transactions yet</p>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="vc-section">
            <h2>Card Settings</h2>

            <div className="settings-group">
              <h3>Transaction Limits</h3>
              {showLimitSettings ? (
                <div className="limit-form">
                  <div className="form-group">
                    <label>Daily Limit (₦)</label>
                    <input
                      type="number"
                      value={cardLimits.dailyLimit}
                      onChange={(e) => setCardLimits({
                        ...cardLimits,
                        dailyLimit: Number(e.target.value)
                      })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Monthly Limit (₦)</label>
                    <input
                      type="number"
                      value={cardLimits.monthlyLimit}
                      onChange={(e) => setCardLimits({
                        ...cardLimits,
                        monthlyLimit: Number(e.target.value)
                      })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Single Transaction Limit (₦)</label>
                    <input
                      type="number"
                      value={cardLimits.singleTransactionLimit}
                      onChange={(e) => setCardLimits({
                        ...cardLimits,
                        singleTransactionLimit: Number(e.target.value)
                      })}
                    />
                  </div>
                  <div className="form-actions">
                    <button
                      className="vc-btn cancel-btn"
                      onClick={() => setShowLimitSettings(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="vc-btn save-btn"
                      onClick={updateCardLimits}
                      disabled={loading}
                    >
                      Save Limits
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="limit-display">
                    <div className="limit-item">
                      <p className="limit-label">Daily Limit</p>
                      <p className="limit-value">₦{cardLimits.dailyLimit.toLocaleString()}</p>
                    </div>
                    <div className="limit-item">
                      <p className="limit-label">Monthly Limit</p>
                      <p className="limit-value">₦{cardLimits.monthlyLimit.toLocaleString()}</p>
                    </div>
                    <div className="limit-item">
                      <p className="limit-label">Single Transaction</p>
                      <p className="limit-value">₦{cardLimits.singleTransactionLimit.toLocaleString()}</p>
                    </div>
                  </div>
                  <button
                    className="vc-btn edit-btn"
                    onClick={() => setShowLimitSettings(true)}
                  >
                    ✏️ Edit Limits
                  </button>
                </>
              )}
            </div>

            <div className="settings-group">
              <h3>Card Information</h3>
              <div className="info-display">
                <div className="info-item">
                  <p className="info-label">Card Holder Name</p>
                  <p className="info-value">{cardData.cardHolder}</p>
                </div>
                <div className="info-item">
                  <p className="info-label">Card Status</p>
                  <p className={`info-value status ${cardData.status}`}>
                    {cardData.status === 'active' ? '🟢 Active' : '🔴 Inactive'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VirtualCard;
