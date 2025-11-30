import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import LoadingSpinner from '../components/LoadingSpinner';
import './SplitBills.css';

const SplitBills = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState([]);
  const [activeTab, setActiveTab] = useState('create');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [creating, setCreating] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    totalAmount: '',
    billType: 'electricity',
    participants: [],
    newParticipant: '',
    dueDate: ''
  });

  const [participants, setParticipants] = useState([
    { id: 1, name: 'You', email: currentUser?.email, amount: 0, paid: true }
  ]);

  // Load bills
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const loadBills = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, 'splitBills'),
          where('createdBy', '==', currentUser.uid),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        setBills(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Error loading bills:', err);
        setError('Failed to load bills');
      } finally {
        setLoading(false);
      }
    };

    loadBills();
  }, [currentUser, navigate]);

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'totalAmount' ? parseFloat(value) || '' : value
    }));
  };

  // Add participant
  const handleAddParticipant = () => {
    if (!formData.newParticipant.trim()) {
      setError('Please enter participant name or email');
      return;
    }

    const newParticipant = {
      id: participants.length + 1,
      name: formData.newParticipant,
      email: formData.newParticipant,
      amount: 0,
      paid: false
    };

    setParticipants([...participants, newParticipant]);
    setFormData(prev => ({
      ...prev,
      newParticipant: ''
    }));
    setError('');
  };

  // Remove participant
  const handleRemoveParticipant = (id) => {
    if (id === 1) {
      setError('Cannot remove yourself from the bill');
      return;
    }
    setParticipants(participants.filter(p => p.id !== id));
  };

  // Calculate split amount
  const calculateSplitAmount = () => {
    if (!formData.totalAmount || participants.length === 0) return 0;
    return formData.totalAmount / participants.length;
  };

  // Create bill
  const handleCreateBill = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.title.trim()) {
      setError('Please enter a bill title');
      return;
    }

    if (!formData.totalAmount || formData.totalAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (participants.length < 2) {
      setError('Please add at least one other participant');
      return;
    }

    try {
      setCreating(true);
      const splitAmount = calculateSplitAmount();

      const billData = {
        title: formData.title,
        description: formData.description,
        totalAmount: formData.totalAmount,
        billType: formData.billType,
        splitAmount,
        participants: participants.map(p => ({
          name: p.name,
          email: p.email,
          amount: splitAmount,
          paid: p.id === 1
        })),
        createdBy: currentUser.uid,
        createdByName: currentUser.displayName || currentUser.email,
        status: 'active',
        dueDate: formData.dueDate || null,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'splitBills'), billData);

      setBills([{ id: docRef.id, ...billData }, ...bills]);
      setSuccess('Bill created successfully!');
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        totalAmount: '',
        billType: 'electricity',
        participants: [],
        newParticipant: '',
        dueDate: ''
      });
      setParticipants([
        { id: 1, name: 'You', email: currentUser.email, amount: 0, paid: true }
      ]);
      setActiveTab('history');
    } catch (err) {
      console.error('Error creating bill:', err);
      setError('Failed to create bill');
    } finally {
      setCreating(false);
    }
  };

  // Mark as paid
  const markAsPaid = async (billId, participantEmail) => {
    try {
      const bill = bills.find(b => b.id === billId);
      const updatedParticipants = bill.participants.map(p =>
        p.email === participantEmail ? { ...p, paid: true } : p
      );

      await updateDoc(doc(db, 'splitBills', billId), {
        participants: updatedParticipants
      });

      setBills(bills.map(b =>
        b.id === billId ? { ...b, participants: updatedParticipants } : b
      ));
      setSuccess('Marked as paid');
    } catch (err) {
      console.error('Error updating bill:', err);
      setError('Failed to update bill');
    }
  };

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(value);
  };

  const splitAmount = calculateSplitAmount();
  const unpaidCount = participants.filter(p => !p.paid && p.id !== 1).length;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="split-bills">
      {/* Header */}
      <div className="sb-header">
        <h1>💸 Split Bills</h1>
        <p className="sb-subtitle">Create bills and split costs with friends</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Tabs */}
      <div className="sb-tabs">
        <button
          className={`tab-btn ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setActiveTab('create')}
        >
          ➕ Create Bill
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📜 Bill History ({bills.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'settlement' ? 'active' : ''}`}
          onClick={() => setActiveTab('settlement')}
        >
          ✓ Settlement
        </button>
      </div>

      {/* Create Tab */}
      {activeTab === 'create' && (
        <div className="sb-form-section">
          <form onSubmit={handleCreateBill} className="sb-form">
            <div className="form-group">
              <label>Bill Title</label>
              <input
                type="text"
                name="title"
                placeholder="e.g., House Rent, Dinner"
                value={formData.title}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Description (Optional)</label>
              <textarea
                name="description"
                placeholder="Add details about the bill..."
                value={formData.description}
                onChange={handleInputChange}
                rows="2"
              ></textarea>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Bill Type</label>
                <select
                  name="billType"
                  value={formData.billType}
                  onChange={handleInputChange}
                >
                  <option value="electricity">⚡ Electricity</option>
                  <option value="internet">🌐 Internet</option>
                  <option value="water">💧 Water</option>
                  <option value="food">🍜 Food</option>
                  <option value="rent">🏠 Rent</option>
                  <option value="entertainment">🎬 Entertainment</option>
                  <option value="other">📋 Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>Total Amount</label>
                <div className="amount-input">
                  <span>₦</span>
                  <input
                    type="number"
                    name="totalAmount"
                    placeholder="0"
                    value={formData.totalAmount}
                    onChange={handleInputChange}
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Due Date (Optional)</label>
                <input
                  type="date"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Participants */}
            <div className="participants-section">
              <h3>👥 Participants</h3>

              <div className="participants-list">
                {participants.map(p => (
                  <div key={p.id} className="participant-item">
                    <span className="p-name">{p.name}</span>
                    <span className="p-amount">{formatCurrency(splitAmount)}</span>
                    {p.id !== 1 && (
                      <button
                        type="button"
                        className="btn-remove"
                        onClick={() => handleRemoveParticipant(p.id)}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="add-participant">
                <input
                  type="text"
                  placeholder="Name or email of person to split with"
                  value={formData.newParticipant}
                  onChange={(e) => setFormData(prev => ({ ...prev, newParticipant: e.target.value }))}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddParticipant()}
                />
                <button
                  type="button"
                  className="btn-add-p"
                  onClick={handleAddParticipant}
                >
                  + Add
                </button>
              </div>
            </div>

            {/* Summary */}
            {formData.totalAmount && (
              <div className="bill-summary">
                <h3>📊 Bill Summary</h3>
                <div className="summary-row">
                  <span>Total Amount:</span>
                  <span className="highlight">{formatCurrency(formData.totalAmount)}</span>
                </div>
                <div className="summary-row">
                  <span>Number of People:</span>
                  <span>{participants.length}</span>
                </div>
                <div className="summary-row">
                  <span>Split Per Person:</span>
                  <span className="highlight">{formatCurrency(splitAmount)}</span>
                </div>
              </div>
            )}

            <button type="submit" className="btn-create" disabled={creating}>
              {creating ? '⏳ Creating...' : '✓ Create Bill'}
            </button>
          </form>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="sb-history-section">
          {bills.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h3>No bills yet</h3>
              <p>Create your first bill to start splitting costs</p>
            </div>
          ) : (
            <div className="bills-list">
              {bills.map(bill => (
                <div key={bill.id} className="bill-card">
                  <div className="bill-header">
                    <h3 className="bill-title">{bill.title}</h3>
                    <span className={`bill-status ${bill.status}`}>{bill.status}</span>
                  </div>

                  <div className="bill-details">
                    <div className="detail-item">
                      <span className="label">Total Amount:</span>
                      <span className="value">{formatCurrency(bill.totalAmount)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Per Person:</span>
                      <span className="value">{formatCurrency(bill.splitAmount)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Type:</span>
                      <span className="value">{bill.billType}</span>
                    </div>
                  </div>

                  <div className="bill-participants">
                    <h4>Participants ({bill.participants.length})</h4>
                    {bill.participants.map((p, idx) => (
                      <div key={idx} className="bill-participant">
                        <span className="p-name">{p.name}</span>
                        <span className={`p-status ${p.paid ? 'paid' : 'unpaid'}`}>
                          {p.paid ? '✓ Paid' : '⏳ Pending'}
                        </span>
                        {p.email !== currentUser.email && (
                          <button
                            className="btn-mark"
                            onClick={() => markAsPaid(bill.id, p.email)}
                          >
                            Mark Paid
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Settlement Tab */}
      {activeTab === 'settlement' && (
        <div className="sb-settlement-section">
          <h3>💳 Settlement Status</h3>
          {bills.length === 0 ? (
            <div className="empty-state">
              <p>No bills to settle</p>
            </div>
          ) : (
            <div className="settlement-list">
              {bills.map(bill => {
                const unpaid = bill.participants.filter(p => !p.paid);
                return (
                  <div key={bill.id} className="settlement-item">
                    <div className="settlement-header">
                      <h4>{bill.title}</h4>
                      <span className="settlement-amount">{formatCurrency(bill.totalAmount)}</span>
                    </div>
                    {unpaid.length === 0 ? (
                      <div className="all-paid">✓ All settled</div>
                    ) : (
                      <div className="unpaid-list">
                        {unpaid.map((p, idx) => (
                          <div key={idx} className="unpaid-item">
                            <span>{p.name} owes {formatCurrency(bill.splitAmount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SplitBills;
