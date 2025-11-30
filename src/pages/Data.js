import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import payflex from '../services/payflex';
import { validatePhone } from '../utils/validation';
import LoadingSpinner from '../components/LoadingSpinner';
import './Data.css';

const Data = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // State management
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [providers, setProviders] = useState([]);
  const [plans, setPlans] = useState([]); // Dynamically fetched plans
  const [plansLoading, setPlansLoading] = useState(false);

  // Fallback provider data
  const fallbackDataProviders = [
    { id: 'mtn', name: 'MTN', emoji: '🟡', color: '#FFD700' },
    { id: 'airtel', name: 'Airtel', emoji: '🔴', color: '#FF0000' },
    { id: 'glo', name: 'Glo', emoji: '🟢', color: '#00AA00' },
    { id: '9mobile', name: '9Mobile', emoji: '🟣', color: '#8B00FF' },
  ];

  // Fallback data plans (in case API fails)
  const fallbackDataPlans = {
    mtn: [
      { id: 'mtn-1gb', name: '1GB', price: 300, validity: '30 days' },
      { id: 'mtn-2gb', name: '2GB', price: 500, validity: '30 days' },
      { id: 'mtn-5gb', name: '5GB', price: 1200, validity: '30 days' },
      { id: 'mtn-10gb', name: '10GB', price: 2000, validity: '30 days' },
    ],
    airtel: [
      { id: 'airtel-1gb', name: '1GB', price: 300, validity: '30 days' },
      { id: 'airtel-2gb', name: '2GB', price: 500, validity: '30 days' },
      { id: 'airtel-5gb', name: '5GB', price: 1200, validity: '30 days' },
      { id: 'airtel-10gb', name: '10GB', price: 2000, validity: '30 days' },
    ],
    glo: [
      { id: 'glo-1gb', name: '1GB', price: 300, validity: '30 days' },
      { id: 'glo-2gb', name: '2GB', price: 500, validity: '30 days' },
      { id: 'glo-5gb', name: '5GB', price: 1200, validity: '30 days' },
      { id: 'glo-10gb', name: '10GB', price: 2000, validity: '30 days' },
    ],
    '9mobile': [
      { id: '9mobile-1gb', name: '1GB', price: 300, validity: '30 days' },
      { id: '9mobile-2gb', name: '2GB', price: 500, validity: '30 days' },
      { id: '9mobile-5gb', name: '5GB', price: 1200, validity: '30 days' },
      { id: '9mobile-10gb', name: '10GB', price: 2000, validity: '30 days' },
    ],
  };

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

  // Fetch providers on mount
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        setLoading(true);
        // Fetch REAL providers from PayFlex API
        const realProviders = await payflex.getProviders('data');
        
        if (realProviders && realProviders.length > 0) {
          const mappedProviders = realProviders.map(provider => ({
            id: provider.provider_id || provider.id,
            name: provider.provider_name || provider.name,
            emoji: getProviderEmoji(provider.provider_id || provider.id),
            color: getProviderColor(provider.provider_id || provider.id)
          }));
          setProviders(mappedProviders);
        } else {
          setProviders(fallbackDataProviders);
        }
        setError('');
      } catch (err) {
        console.error('Error fetching providers from PayFlex:', err);
        setProviders(fallbackDataProviders);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProviders();
  }, []);

  // Fetch data plans when provider is selected
  useEffect(() => {
    const fetchPlans = async () => {
      if (!selectedProvider) return;

      try {
        setPlansLoading(true);
        setError('');
        
        // Fetch REAL plans from PayFlex API
        const realPlans = await payflex.getDataPlans(selectedProvider.id);
        
        if (realPlans && realPlans.length > 0) {
          setPlans(realPlans);
        } else {
          // Fallback to local plans
          setPlans(fallbackDataPlans[selectedProvider.id] || []);
        }
      } catch (err) {
        console.error('Error fetching data plans from PayFlex:', err);
        // Fallback to local plans if API fails
        setPlans(fallbackDataPlans[selectedProvider.id] || []);
      } finally {
        setPlansLoading(false);
      }
    };
    
    fetchPlans();
  }, [selectedProvider]);

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
    setSelectedPlan(null);
    setError('');
    setStep(2);
  };

  // Handle plan selection
  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
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
        type: 'data',
        provider: selectedProvider.id,
        providerName: selectedProvider.name,
        planName: selectedPlan.name,
        planId: selectedPlan.id,
        amount: selectedPlan.price,
        phoneNumber,
        description: `Data - ${selectedProvider.name} ${selectedPlan.name} - ₦${selectedPlan.price.toLocaleString()}`
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
    <div className="data-step">
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

  // Render step 2: Select Plan
  const renderStep2 = () => (
    <div className="data-step">
      <div className="step-header">
        <h2>Select Data Plan</h2>
        <p>Choose how much data you want to buy for {selectedProvider?.name}</p>
      </div>

      {plansLoading ? (
        <div className="loading-plans">
          <LoadingSpinner message="Loading data plans..." />
        </div>
      ) : plans.length > 0 ? (
        <>
          <div className="plans-grid">
            {plans.map((plan) => (
              <button
                key={plan.id}
                className={`plan-card ${selectedPlan?.id === plan.id ? 'active' : ''}`}
                onClick={() => handlePlanSelect(plan)}
              >
                <div className="plan-size">{plan.name}</div>
                <div className="plan-price">₦{(plan.price || 0).toLocaleString()}</div>
                <div className="plan-validity">{plan.validity || '30 days'}</div>
              </button>
            ))}
          </div>

          <div className="step-actions">
            <button className="back-btn" onClick={() => setStep(1)}>← Back</button>
            <button 
              className="continue-btn" 
              onClick={() => setStep(3)}
              disabled={!selectedPlan}
            >
              Continue →
            </button>
          </div>
        </>
      ) : (
        <div className="no-plans">
          <p>No data plans available for {selectedProvider?.name}</p>
          <button className="back-btn" onClick={() => setStep(1)}>← Back</button>
        </div>
      )}
    </div>
  );

  // Render step 3: Phone Number & Review
  const renderStep3 = () => (
    <div className="data-step">
      <div className="step-header">
        <h2>Enter Phone Number</h2>
        <p>Confirm the number to receive data</p>
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

      {selectedPlan && phoneNumber && (
        <div className="summary-section">
          <h3>Review Your Order</h3>
          <div className="transaction-summary">
            <div className="summary-item">
              <span className="label">Network Provider</span>
              <span className="value">{selectedProvider?.name}</span>
            </div>
            <div className="summary-item">
              <span className="label">Data Plan</span>
              <span className="value">{selectedPlan.name}</span>
            </div>
            <div className="summary-item">
              <span className="label">Validity</span>
              <span className="value">{selectedPlan.validity}</span>
            </div>
            <div className="summary-item">
              <span className="label">Phone Number</span>
              <span className="value">{phoneNumber}</span>
            </div>
            <div className="summary-item highlight">
              <span className="label">Amount</span>
              <span className="value">₦{selectedPlan.price.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      <div className="step-actions">
        <button className="back-btn" onClick={() => setStep(2)}>← Back</button>
        <button 
          className="continue-btn" 
          onClick={handleProceed}
          disabled={!phoneNumber}
        >
          Verify with PIN →
        </button>
      </div>
    </div>
  );

  if (loading && providers.length === 0) {
    return <LoadingSpinner message="Loading data plans..." />;
  }

  return (
    <div className="data-page">
      <div className="data-header">
        <button className="back-icon" onClick={handleBack} title="Go back">
          ← Back
        </button>
        <div className="header-content">
          <h1>Buy Data</h1>
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

      <div className="data-content">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>

      <div className="data-footer">
        <p className="info-text">
          ⚡ <strong>Instant activation:</strong> Your data plan will be activated immediately
        </p>
      </div>
    </div>
  );
};

export default Data;
