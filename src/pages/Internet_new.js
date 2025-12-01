import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import './Internet.css';

const Internet = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  // Internet providers
  const providers = [
    { id: 'smile', name: 'Smile', icon: '🌐', description: 'Wireless Broadband' },
    { id: 'spectranet', name: 'Spectranet', icon: '🌐', description: 'Fiber Broadband' },
    { id: 'swift', name: 'Swift', icon: '🌐', description: 'Fast Internet' },
  ];

  const internetPlans = {
    smile: [
      { id: 'smile-10gb', name: '10GB', price: 3000, speed: 'Up to 20Mbps', validity: '30 days' },
      { id: 'smile-20gb', name: '20GB', price: 5500, speed: 'Up to 20Mbps', validity: '30 days' },
      { id: 'smile-50gb', name: '50GB', price: 12000, speed: 'Up to 30Mbps', validity: '30 days' },
      { id: 'smile-100gb', name: '100GB', price: 20000, speed: 'Up to 30Mbps', validity: '30 days' },
    ],
    spectranet: [
      { id: 'spectranet-5gb', name: '5GB', price: 2500, speed: 'Up to 10Mbps', validity: '30 days' },
      { id: 'spectranet-10gb', name: '10GB', price: 4500, speed: 'Up to 25Mbps', validity: '30 days' },
    ],
    swift: [
      { id: 'swift-7gb', name: '7GB', price: 2000, speed: 'Up to 15Mbps', validity: '30 days' },
      { id: 'swift-15gb', name: '15GB', price: 3500, speed: 'Up to 15Mbps', validity: '30 days' },
    ],
  };

  const [formData, setFormData] = useState({
    provider: '',
    phoneNumber: '',
    plan: '',
    amount: 0,
  });

  const [selectedProvider, setSelectedProvider] = useState(null);

  const handleProviderSelect = (provider) => {
    setError('');
    setFormData({ ...formData, provider: provider.id, plan: '', amount: 0 });
    setSelectedProvider(provider);
    setStep(2);
  };

  const handlePlanSelect = (plan) => {
    setError('');
    setFormData({ ...formData, plan: plan.id, amount: plan.price });
    setStep(3);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError('');
  };

  const handleBackStep = () => {
    if (step > 1) {
      setError('');
      setStep(step - 1);
    }
  };

  const handleProceedToPin = () => {
    if (!formData.phoneNumber) {
      setError('Please enter your phone number');
      return;
    }
    if (!formData.amount) {
      setError('Please select a plan');
      return;
    }

    navigate('/pin', {
      state: {
        type: 'internet',
        provider: selectedProvider?.name,
        phoneNumber: formData.phoneNumber,
        plan: formData.plan,
        amount: formData.amount,
        description: `Internet: ${selectedProvider?.name} - ₦${formData.amount}`,
      },
    });
  };

  const renderStep1 = () => (
    <div className="internet-step">
      <div className="step-header">
        <h2>Select Provider</h2>
        <p>Choose your preferred internet provider</p>
      </div>

      <div className="provider-grid">
        {providers.map((provider) => (
          <button
            key={provider.id}
            className={`provider-card ${formData.provider === provider.id ? 'active' : ''}`}
            onClick={() => handleProviderSelect(provider)}
          >
            <div className="provider-icon">{provider.icon}</div>
            <h4>{provider.name}</h4>
            <p>{provider.description}</p>
          </button>
        ))}
      </div>
    </div>
  );

  const renderStep2 = () => {
    const plans = internetPlans[formData.provider] || [];
    return (
      <div className="internet-step">
        <div className="step-header">
          <h2>Select Plan</h2>
          <p>Choose a data plan</p>
        </div>

        <div className="plans-list">
          {plans.map((plan) => (
            <button
              key={plan.id}
              className={`plan-card ${formData.plan === plan.id ? 'active' : ''}`}
              onClick={() => handlePlanSelect(plan)}
            >
              <div className="plan-name">{plan.name}</div>
              <div className="plan-speed">{plan.speed}</div>
              <div className="plan-price">₦{plan.price.toLocaleString()}</div>
            </button>
          ))}
        </div>

        <div className="form-actions">
          <button className="btn secondary" onClick={handleBackStep}>
            Back
          </button>
        </div>
      </div>
    );
  };

  const renderStep3 = () => (
    <div className="internet-step">
      <div className="step-header">
        <h2>Enter Phone Number</h2>
        <p>Where to send your internet service</p>
      </div>

      <div className="form-group">
        <label>Phone Number *</label>
        <input
          type="tel"
          name="phoneNumber"
          placeholder="e.g., 08012345678"
          value={formData.phoneNumber}
          onChange={handleInputChange}
        />
      </div>

      <div className="form-actions">
        <button className="btn secondary" onClick={handleBackStep}>
          Back
        </button>
        <button className="btn primary" onClick={() => setStep(4)}>
          Review
        </button>
      </div>
    </div>
  );

  const renderStep4 = () => {
    const plan = internetPlans[formData.provider]?.find((p) => p.id === formData.plan);
    return (
      <div className="internet-step">
        <div className="step-header">
          <h2>Confirm Purchase</h2>
          <p>Review your order</p>
        </div>

        <div className="summary-card">
          <div className="summary-row">
            <span className="label">Provider</span>
            <span className="value">{selectedProvider?.name}</span>
          </div>
          <div className="summary-row">
            <span className="label">Plan</span>
            <span className="value">{plan?.name}</span>
          </div>
          <div className="summary-row">
            <span className="label">Amount</span>
            <span className="value amount">₦{plan?.price.toLocaleString()}</span>
          </div>
          <div className="summary-row">
            <span className="label">Phone</span>
            <span className="value">{formData.phoneNumber}</span>
          </div>
        </div>

        <div className="form-actions">
          <button className="btn secondary" onClick={handleBackStep}>
            Back
          </button>
          <button className="btn primary" onClick={handleProceedToPin}>
            Proceed to PIN
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!currentUser) {
    return (
      <div className="internet-page">
        <div className="error-banner">
          <p>Please log in to access Internet services</p>
        </div>
      </div>
    );
  }

  return (
    <div className="internet-page">
      <div className="page-header">
        <h1>Internet Services</h1>
        <p>High-speed internet at your fingertips</p>
      </div>

      <div className="step-indicator">
        <div className={`step ${step >= 1 ? 'active' : ''}`}>1</div>
        <div className={`step ${step >= 2 ? 'active' : ''}`}>2</div>
        <div className={`step ${step >= 3 ? 'active' : ''}`}>3</div>
        <div className={`step ${step >= 4 ? 'active' : ''}`}>4</div>
      </div>

      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      <div className="internet-form">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </div>
    </div>
  );
};

export default Internet;
