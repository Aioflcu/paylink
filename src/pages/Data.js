import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { paymentAPI, payflexAPI } from '../services/backendAPI';
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

  // Fallback data plans (in case API fails) - based on current Nigerian market rates
  const fallbackDataPlans = {
    mtn: [
      { id: 'mtn-500mb', name: '500MB', price: 200, validity: '7 days' },
      { id: 'mtn-1gb', name: '1GB', price: 405, validity: '30 days' },
      { id: 'mtn-2gb', name: '2GB', price: 810, validity: '30 days' },
      { id: 'mtn-5gb', name: '5GB', price: 2000, validity: '30 days' },
      { id: 'mtn-10gb', name: '10GB', price: 3900, validity: '30 days' },
    ],
    airtel: [
      { id: 'airtel-500mb', name: '500MB', price: 200, validity: '7 days' },
      { id: 'airtel-1gb', name: '1GB', price: 400, validity: '30 days' },
      { id: 'airtel-2gb', name: '2GB', price: 800, validity: '30 days' },
      { id: 'airtel-5gb', name: '5GB', price: 1950, validity: '30 days' },
      { id: 'airtel-10gb', name: '10GB', price: 3800, validity: '30 days' },
    ],
    glo: [
      { id: 'glo-500mb', name: '500MB', price: 150, validity: '7 days' },
      { id: 'glo-1gb', name: '1GB', price: 290, validity: '30 days' },
      { id: 'glo-2gb', name: '2GB', price: 580, validity: '30 days' },
      { id: 'glo-5gb', name: '5GB', price: 1450, validity: '30 days' },
      { id: 'glo-10gb', name: '10GB', price: 2900, validity: '30 days' },
    ],
    '9mobile': [
      { id: '9mobile-500mb', name: '500MB', price: 200, validity: '7 days' },
      { id: '9mobile-1gb', name: '1GB', price: 400, validity: '30 days' },
      { id: '9mobile-2gb', name: '2GB', price: 800, validity: '30 days' },
      { id: '9mobile-5gb', name: '5GB', price: 2000, validity: '30 days' },
      { id: '9mobile-10gb', name: '10GB', price: 3900, validity: '30 days' },
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
        // Fetch REAL providers from backend API
        const data = await payflexAPI.getProviders('data');
        
        if (data && data.providers && data.providers.length > 0) {
          const mappedProviders = data.providers.map(provider => ({
            id: provider.provider_id || provider.id,
            code: provider.code || provider.provider_id || provider.id,
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
        console.error('Error fetching providers:', err);
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
        
        console.log(`Fetching data plans for provider: ${selectedProvider.id}`);
        
        // Fetch REAL plans from backend API
        const data = await payflexAPI.getPlans('data', selectedProvider.code || selectedProvider.id);
        
        console.log('Backend API response:', data);
        
        if (data && data.plans && data.plans.length > 0) {
          // Normalize backend plans
          const normalized = data.plans.map((p) => {
            const id = p.id || p.plan_id || p.package_id || p.bundle_id;
            const name = p.name || p.plan_name || p.package_name || 'Unknown Plan';
            const price = Number(p.price || p.amount || 0) || 0;
            const validity = p.validity || p.duration || '30 days';
            
            return { id, name, price, validity };
          });
          
          console.log('Normalized plans:', normalized);
          setPlans(normalized);
        } else {
          setPlans(fallbackDataPlans[selectedProvider.id] || []);
          setError('Live data unavailable, showing standard rates');
        }
      } catch (err) {
        console.error('Error fetching data plans:', err);
        setPlans(fallbackDataPlans[selectedProvider.id] || []);
        setError('Unable to fetch live rates, showing standard rates');
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

  // Proceed to payment submission
  const handleProceed = async () => {
    if (!validatePhoneFunc(phoneNumber)) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Call backend payment API
      const result = await paymentAPI.buyData(
        phoneNumber,
        selectedPlan.id,
        selectedProvider.code || selectedProvider.id,
        selectedPlan.price
      );

      if (result.success) {
        // Navigate to success page
        navigate('/success', {
          state: {
            transactionId: result.transactionId,
            type: 'data',
            provider: selectedProvider.name,
            plan: selectedPlan.name,
            amount: selectedPlan.price,
            fee: result.fee || 0,
            rewardPoints: result.rewardPoints || 0,
            description: `Data - ${selectedProvider.name} ${selectedPlan.name} - ₦${selectedPlan.price.toLocaleString()}`
          }
        });
      }
    } catch (error) {
      console.error('Payment error:', error);
      
      // Check if PIN is required
      if (error.status === 403 && error.data?.requiresPin) {
        navigate('/pin', {
          state: {
            type: 'data',
            provider: selectedProvider.id,
            providerName: selectedProvider.name,
            planName: selectedPlan.name,
            planId: selectedPlan.id,
            amount: selectedPlan.price,
            phoneNumber,
            description: `Data - ${selectedProvider.name} ${selectedPlan.name} - ₦${selectedPlan.price.toLocaleString()}`,
            onPinVerified: async (pinHash) => {
              // Retry with PIN after verification
              const pinResult = await paymentAPI.buyData(
                phoneNumber,
                selectedPlan.id,
                selectedProvider.code || selectedProvider.id,
                selectedPlan.price,
                pinHash
              );
              return pinResult;
            }
          }
        });
      } else {
        setError(error.data?.error || error.message || 'Payment failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
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
