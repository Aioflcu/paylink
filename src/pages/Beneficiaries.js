import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import LoadingSpinner from '../components/LoadingSpinner';
import './Beneficiaries.css';

const Beneficiaries = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [filteredBeneficiaries, setFilteredBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    nickname: '',
    type: 'phone',
    phoneNumber: '',
    meterNumber: '',
    smartcard: '',
    accountNumber: '',
    provider: ''
  });

  // Load beneficiaries
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const loadBeneficiaries = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, 'beneficiaries'),
          where('userId', '==', currentUser.uid)
        );
        const snapshot = await getDocs(q);
        const benefs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setBeneficiaries(benefs);
        filterBeneficiaries(benefs, 'all', '');
      } catch (err) {
        console.error('Error loading beneficiaries:', err);
        setError('Failed to load beneficiaries');
      } finally {
        setLoading(false);
      }
    };

    loadBeneficiaries();
  }, [currentUser, navigate]);

  // Filter beneficiaries
  const filterBeneficiaries = (benefs, type, search) => {
    let filtered = benefs;

    if (type !== 'all') {
      filtered = filtered.filter(b => b.type === type);
    }

    if (search.trim()) {
      filtered = filtered.filter(b =>
        b.nickname.toLowerCase().includes(search.toLowerCase()) ||
        (b.phoneNumber && b.phoneNumber.includes(search)) ||
        (b.meterNumber && b.meterNumber.includes(search)) ||
        (b.smartcard && b.smartcard.includes(search))
      );
    }

    setFilteredBeneficiaries(filtered);
  };

  // Handle filter
  const handleFilterChange = (type) => {
    setFilterType(type);
    filterBeneficiaries(beneficiaries, type, searchTerm);
  };

  // Handle search
  const handleSearch = (term) => {
    setSearchTerm(term);
    filterBeneficiaries(beneficiaries, filterType, term);
  };

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle type change
  const handleTypeChange = (type) => {
    setFormData(prev => ({
      ...prev,
      type,
      phoneNumber: '',
      meterNumber: '',
      smartcard: '',
      accountNumber: '',
      provider: ''
    }));
  };

  // Validate form
  const validateForm = () => {
    if (!formData.nickname.trim()) {
      setError('Please enter a nickname');
      return false;
    }

    if (formData.type === 'phone' && !formData.phoneNumber.trim()) {
      setError('Please enter a phone number');
      return false;
    }

    if (formData.type === 'meter' && !formData.meterNumber.trim()) {
      setError('Please enter a meter number');
      return false;
    }

    if (formData.type === 'smartcard' && !formData.smartcard.trim()) {
      setError('Please enter a smartcard number');
      return false;
    }

    if (formData.type === 'account' && !formData.accountNumber.trim()) {
      setError('Please enter an account number');
      return false;
    }

    return true;
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) return;

    try {
      const benef = {
        userId: currentUser.uid,
        nickname: formData.nickname,
        type: formData.type,
        phoneNumber: formData.phoneNumber || null,
        meterNumber: formData.meterNumber || null,
        smartcard: formData.smartcard || null,
        accountNumber: formData.accountNumber || null,
        provider: formData.provider || null,
        updatedAt: serverTimestamp()
      };

      if (editingId) {
        // Update existing
        await updateDoc(doc(db, 'beneficiaries', editingId), benef);
        setBeneficiaries(beneficiaries.map(b => b.id === editingId ? { id: editingId, ...benef } : b));
        setSuccess('Beneficiary updated successfully');
        setEditingId(null);
      } else {
        // Add new
        benef.createdAt = serverTimestamp();
        const docRef = await addDoc(collection(db, 'beneficiaries'), benef);
        setBeneficiaries([...beneficiaries, { id: docRef.id, ...benef }]);
        setSuccess('Beneficiary added successfully');
      }

      filterBeneficiaries(
        editingId
          ? beneficiaries.map(b => b.id === editingId ? { id: editingId, ...benef } : b)
          : [...beneficiaries, { id: 'new', ...benef }],
        filterType,
        searchTerm
      );

      setFormData({
        nickname: '',
        type: 'phone',
        phoneNumber: '',
        meterNumber: '',
        smartcard: '',
        accountNumber: '',
        provider: ''
      });
      setShowForm(false);
    } catch (err) {
      console.error('Error saving beneficiary:', err);
      setError('Failed to save beneficiary');
    }
  };

  // Handle edit
  const handleEdit = (beneficiary) => {
    setFormData({
      nickname: beneficiary.nickname,
      type: beneficiary.type,
      phoneNumber: beneficiary.phoneNumber || '',
      meterNumber: beneficiary.meterNumber || '',
      smartcard: beneficiary.smartcard || '',
      accountNumber: beneficiary.accountNumber || '',
      provider: beneficiary.provider || ''
    });
    setEditingId(beneficiary.id);
    setShowForm(true);
  };

  // Handle delete
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this beneficiary?')) return;

    try {
      await deleteDoc(doc(db, 'beneficiaries', id));
      const updated = beneficiaries.filter(b => b.id !== id);
      setBeneficiaries(updated);
      filterBeneficiaries(updated, filterType, searchTerm);
      setSuccess('Beneficiary deleted');
    } catch (err) {
      console.error('Error deleting beneficiary:', err);
      setError('Failed to delete beneficiary');
    }
  };

  // Get icon for type
  const getTypeIcon = (type) => {
    switch (type) {
      case 'phone':
        return '📱';
      case 'meter':
        return '⚡';
      case 'smartcard':
        return '📺';
      case 'account':
        return '🌐';
      default:
        return '👤';
    }
  };

  // Get type label
  const getTypeLabel = (type) => {
    switch (type) {
      case 'phone':
        return 'Phone Number';
      case 'meter':
        return 'Electricity Meter';
      case 'smartcard':
        return 'Cable Smartcard';
      case 'account':
        return 'Internet Account';
      default:
        return type;
    }
  };

  // Get beneficiary display value
  const getDisplayValue = (beneficiary) => {
    switch (beneficiary.type) {
      case 'phone':
        return beneficiary.phoneNumber;
      case 'meter':
        return beneficiary.meterNumber;
      case 'smartcard':
        return beneficiary.smartcard;
      case 'account':
        return beneficiary.accountNumber;
      default:
        return '';
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="beneficiaries">
      {/* Header */}
      <div className="benef-header">
        <h1>👥 Beneficiaries</h1>
        <p className="benef-subtitle">Manage your saved beneficiaries for quick purchases</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Controls */}
      <div className="benef-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="🔍 Search beneficiaries..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="search-input"
          />
        </div>
        <button
          className="btn-add"
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setFormData({
              nickname: '',
              type: 'phone',
              phoneNumber: '',
              meterNumber: '',
              smartcard: '',
              accountNumber: '',
              provider: ''
            });
          }}
        >
          {showForm ? '✕ Cancel' : '+ Add Beneficiary'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="benef-form-section">
          <h3>{editingId ? 'Edit Beneficiary' : 'Add New Beneficiary'}</h3>
          
          <form onSubmit={handleSubmit} className="benef-form">
            <div className="form-group">
              <label>Nickname</label>
              <input
                type="text"
                name="nickname"
                placeholder="e.g., Mom's Phone"
                value={formData.nickname}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Beneficiary Type</label>
              <div className="type-selector">
                {[
                  { value: 'phone', label: '📱 Phone Number', icon: '📱' },
                  { value: 'meter', label: '⚡ Meter Number', icon: '⚡' },
                  { value: 'smartcard', label: '📺 Smartcard', icon: '📺' },
                  { value: 'account', label: '🌐 Account', icon: '🌐' }
                ].map(option => (
                  <button
                    key={option.value}
                    type="button"
                    className={`type-btn ${formData.type === option.value ? 'active' : ''}`}
                    onClick={() => handleTypeChange(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {formData.type === 'phone' && (
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  name="phoneNumber"
                  placeholder="09012345678"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  required
                />
              </div>
            )}

            {formData.type === 'meter' && (
              <>
                <div className="form-group">
                  <label>Meter Number</label>
                  <input
                    type="text"
                    name="meterNumber"
                    placeholder="1234567890"
                    value={formData.meterNumber}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Provider (DISCO)</label>
                  <select
                    name="provider"
                    value={formData.provider}
                    onChange={handleInputChange}
                  >
                    <option value="">Select DISCO</option>
                    <option value="AEDC">Abuja</option>
                    <option value="BEDC">Benin</option>
                    <option value="EEDC">Enugu</option>
                    <option value="IBEDC">Ibadan</option>
                    <option value="KEDCO">Kano</option>
                    <option value="PHCN">Lagos</option>
                  </select>
                </div>
              </>
            )}

            {formData.type === 'smartcard' && (
              <>
                <div className="form-group">
                  <label>Smartcard Number</label>
                  <input
                    type="text"
                    name="smartcard"
                    placeholder="1234567890"
                    value={formData.smartcard}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Provider</label>
                  <select
                    name="provider"
                    value={formData.provider}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Provider</option>
                    <option value="DSTV">DSTV</option>
                    <option value="GOtv">GOtv</option>
                    <option value="Startimes">Startimes</option>
                  </select>
                </div>
              </>
            )}

            {formData.type === 'account' && (
              <>
                <div className="form-group">
                  <label>Account Number</label>
                  <input
                    type="text"
                    name="accountNumber"
                    placeholder="1234567890"
                    value={formData.accountNumber}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Provider</label>
                  <select
                    name="provider"
                    value={formData.provider}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Provider</option>
                    <option value="Smile">Smile</option>
                    <option value="Spectranet">Spectranet</option>
                    <option value="Swift">Swift</option>
                  </select>
                </div>
              </>
            )}

            <div className="form-actions">
              <button type="submit" className="btn-save">
                {editingId ? '✓ Update' : '+ Save'} Beneficiary
              </button>
              <button
                type="button"
                className="btn-cancel"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="benef-filters">
        <button
          className={`filter-tab ${filterType === 'all' ? 'active' : ''}`}
          onClick={() => handleFilterChange('all')}
        >
          All ({beneficiaries.length})
        </button>
        <button
          className={`filter-tab ${filterType === 'phone' ? 'active' : ''}`}
          onClick={() => handleFilterChange('phone')}
        >
          📱 Phone
        </button>
        <button
          className={`filter-tab ${filterType === 'meter' ? 'active' : ''}`}
          onClick={() => handleFilterChange('meter')}
        >
          ⚡ Meter
        </button>
        <button
          className={`filter-tab ${filterType === 'smartcard' ? 'active' : ''}`}
          onClick={() => handleFilterChange('smartcard')}
        >
          📺 Cable
        </button>
        <button
          className={`filter-tab ${filterType === 'account' ? 'active' : ''}`}
          onClick={() => handleFilterChange('account')}
        >
          🌐 Account
        </button>
      </div>

      {/* List */}
      <div className="benef-list">
        {filteredBeneficiaries.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <h3>No beneficiaries</h3>
            <p>
              {filterType === 'all'
                ? 'Add your first beneficiary for quick purchases'
                : `No ${getTypeLabel(filterType)} beneficiaries yet`}
            </p>
            <button
              className="btn-add-empty"
              onClick={() => setShowForm(true)}
            >
              + Add Beneficiary
            </button>
          </div>
        ) : (
          filteredBeneficiaries.map(benef => (
            <div key={benef.id} className="benef-card">
              <div className="benef-icon">{getTypeIcon(benef.type)}</div>
              
              <div className="benef-content">
                <h3 className="benef-nickname">{benef.nickname}</h3>
                <div className="benef-details">
                  <span className="benef-type">{getTypeLabel(benef.type)}</span>
                  <span className="benef-value">{getDisplayValue(benef)}</span>
                </div>
                {benef.provider && (
                  <div className="benef-provider">
                    Provider: <strong>{benef.provider}</strong>
                  </div>
                )}
              </div>

              <div className="benef-actions">
                <button
                  className="btn-quick"
                  title="Quick Purchase"
                >
                  💳 Quick
                </button>
                <button
                  className="btn-edit"
                  onClick={() => handleEdit(benef)}
                  title="Edit"
                >
                  ✏️
                </button>
                <button
                  className="btn-delete"
                  onClick={() => handleDelete(benef.id)}
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Beneficiaries;
