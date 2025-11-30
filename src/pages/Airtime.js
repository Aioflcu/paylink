import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import payflex from '../services/payflex';
import { validatePhone } from '../utils/validation';
import LoadingSpinner from '../components/LoadingSpinner';
import './Airtime.css';

const Airtime = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // State management
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [providers, setProviders] = useState([]);
  const [dataPlans, setDataPlans] = useState([]); // For data bundle amounts from PayFlex

  // Provider data (fallback)
  const airtimeProviders = [
    { id: 'mtn', name: 'MTN', emoji: '🟡', color: '#FFD700' },
    { id: 'airtel', name: 'Airtel', emoji: '🔴', color: '#FF0000' },
    { id: 'glo', name: 'Glo', emoji: '🟢', color: '#00AA00' },
    { id: '9mobile', name: '9Mobile', emoji: '🟣', color: '#8B00FF' },
  ];

  // Fallback amounts if PayFlex API is unavailable
  const predefinedAmounts = [100, 200, 500, 1000, 2000, 5000];

  // Fetch providers on mount
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        setLoading(true);
        // Fetch REAL providers from PayFlex API
        const realProviders = await payflex.getProviders('airtime');
        
        if (realProviders && realProviders.length > 0) {
          // Map PayFlex providers to our format
          const mappedProviders = realProviders.map(provider => ({
            id: provider.provider_id || provider.id,
            name: provider.provider_name || provider.name,
            emoji: getProviderEmoji(provider.provider_id || provider.id),
            color: getProviderColor(provider.provider_id || provider.id)
          }));
          setProviders(mappedProviders);
        } else {
          // Fallback to local provider list if API fails
          setProviders(airtimeProviders);
        }
        setError('');
      } catch (err) {
        console.error('Error fetching providers from PayFlex:', err);
        // Fallback to hardcoded providers if API fails
        setProviders(airtimeProviders);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProviders();
  }, []);

  // Helper function to get emoji for provider
  const getProviderEmoji = (providerId) => {
    const emojiMap = {
      'mtn': '🟡',
      'airtel': '🔴',
      'glo': '🟢',
      '9mobile': '🟣'
    };
    return emojiMap[providerId?.toLowerCase()] || '📱';
  };

  // Helper function to get color for provider
  const getProviderColor = (providerId) => {
    const colorMap = {
      'mtn': '#FFD700',
      'airtel': '#FF0000',
      'glo': '#00AA00',
      '9mobile': '#8B00FF'
    };
    return colorMap[providerId?.toLowerCase()] || '#007AFF';
  };

  // Validate phone number
  const validatePhoneFunc = (phone) => {
    if (!phone) {
      setError('Please enter a phone number');
      return false;
    }
    
    if (!validatePhone(phone)) {
      setError('Please enter a valid Nigerian phone number (11 digits)');
      return false;
    }

    setError('');
    return true;
  };

  // Handle provider selection
  const handleProviderSelect = (provider) => {
    setSelectedProvider(provider);
    setError('');
    setStep(2);
  };

  // Handle amount selection
  const handleAmountSelect = (amt) => {
    if (!amt || parseFloat(amt) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    setAmount(amt.toString());
    setError('');
    setStep(3);
  };

  // Handle phone number input
  const handlePhoneChange = (e) => {
    setPhoneNumber(e.target.value);
    setError('');
  };

  // Proceed to PIN verification
  const handleProceed = () => {
    if (!validatePhoneFunc(phoneNumber)) {
      return;
    }

    // Navigate to PIN page with transaction data
    navigate('/pin', {
      state: {
        type: 'airtime',
        provider: selectedProvider.id,
        providerName: selectedProvider.name,
        amount: parseFloat(amount),
        phoneNumber,
        description: `Airtime - ${selectedProvider.name} - ₦${parseFloat(amount).toLocaleString()}`
      }
    });
  };

  // Handle back button
  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError('');
    } else {
      navigate('/dashboard');
    }
  };

  // Render step 1: Select Provider
  const renderStep1 = () => (
    <div className="airtime-step">
      <div className="step-header">
        <h2>Select Network Provider</h2>
        <p>Choose your mobile network operator</p>
      </div>

      <div className="providers-grid">
        {providers.map((provider) => (
          <button
            key={provider.id}
            className={`provider-card ${selectedProvider?.id === provider.id ? 'active' : ''}`}
            onClick={() => handleProviderSelect(provider)}
            style={{ borderTopColor: provider.color }}
          >
            <div className="provider-emoji">{provider.emoji}</div>
            <div className="provider-name">{provider.name}</div>
          </button>
        ))}
      </div>

      {selectedProvider && (
        <button className="continue-btn" onClick={() => setStep(2)}>
          Continue →
        </button>
      )}
    </div>
  );

  // Render step 2: Phone Number
  const renderStep2 = () => (
    <div className="airtime-step">
      <div className="step-header">
        <h2>Enter Phone Number</h2>
        <p>The phone number to recharge</p>
      </div>

      <div className="form-group">
        <label htmlFor="phone">Phone Number</label>
        <input
          id="phone"
          type="tel"
          placeholder="080 1234 5678"
          value={phoneNumber}
          onChange={handlePhoneChange}
          maxLength="11"
          autoFocus
        />
        <small>Nigerian number format (11 digits)</small>
      </div>

      <div className="step-actions">
        <button className="back-btn" onClick={() => setStep(1)}>← Back</button>
        <button 
          className="continue-btn" 
          onClick={() => validatePhone(phoneNumber) && setStep(3)}
          disabled={!phoneNumber}
        >
          Continue →
        </button>
      </div>
    </div>
  );

  // Render step 3: Amount Selection
  const renderStep3 = () => (
    <div className="airtime-step">
      <div className="step-header">
        <h2>Select Amount</h2>
        <p>Choose how much airtime to buy</p>
      </div>

      <div className="amount-selector">
        <div className="quick-amounts">
          {predefinedAmounts.map((amt) => (
            <button
              key={amt}
              className={`amount-btn ${amount === amt.toString() ? 'active' : ''}`}
              onClick={() => handleAmountSelect(amt)}
            >
              ₦{amt.toLocaleString()}
            </button>
          ))}
        </div>

        <div className="custom-amount">
          <label htmlFor="custom">Or enter custom amount</label>
          <input
            id="custom"
            type="number"
            placeholder="Enter amount"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setError('');
            }}
            min="100"
            step="50"
          />
        </div>
      </div>

      <div className="step-actions">
        <button className="back-btn" onClick={() => setStep(2)}>← Back</button>
        <button 
          className="continue-btn" 
          onClick={handleProceed}
          disabled={!amount || parseFloat(amount) <= 0}
        >
          Verify with PIN →
        </button>
      </div>
    </div>
  );

  // Render review summary
  const renderSummary = () => (
    <div className="transaction-summary">
      <div className="summary-item">
        <span className="label">Network Provider</span>
        <span className="value">{selectedProvider?.name}</span>
      </div>
      <div className="summary-item">
        <span className="label">Phone Number</span>
        <span className="value">{phoneNumber}</span>
      </div>
      <div className="summary-item highlight">
        <span className="label">Amount</span>
        <span className="value">₦{parseFloat(amount).toLocaleString()}</span>
      </div>
    </div>
  );

  if (loading && providers.length === 0) {
    return <LoadingSpinner message="Loading airtime options..." />;
  }

  return (
    <div className="airtime-page">
      <div className="airtime-header">
        <button className="back-icon" onClick={handleBack} title="Go back">
          ← Back
        </button>
        <div className="header-content">
          <h1>Buy Airtime</h1>
          <div className="step-indicator">
            Step {step} of 3
          </div>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      <div className="airtime-content">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && (
          <>
            {renderStep3()}
            {amount && selectedProvider && phoneNumber && (
              <div className="summary-section">
                <h3>Review Your Order</h3>
                {renderSummary()}
              </div>
            )}
          </>
        )}
      </div>

      <div className="airtime-footer">
        <p className="info-text">
          💡 <strong>Instant delivery:</strong> Your airtime will be delivered instantly to your phone
        </p>
      </div>
    </div>
  );
};

export default Airtime;
