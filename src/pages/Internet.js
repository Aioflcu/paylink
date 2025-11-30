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

  // Internet providers with icons and descriptions
  const providers = [
    { id: 'smile', name: 'Smile', icon: '🌐', description: 'Wireless Broadband' },
    { id: 'spectranet', name: 'Spectranet', icon: '🌐', description: 'Fiber Broadband' },
    { id: 'swift', name: 'Swift', icon: '🌐', description: 'Fast Internet' },
  ];

  // Internet plans by provider
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
      { id: 'spectranet-20gb', name: '20GB', price: 8000, speed: 'Up to 25Mbps', validity: '30 days' },
      { id: 'spectranet-50gb', name: '50GB', price: 15000, speed: 'Up to 50Mbps', validity: '30 days' },
    ],
    swift: [
      { id: 'swift-7gb', name: '7GB', price: 2000, speed: 'Up to 15Mbps', validity: '30 days' },
      { id: 'swift-15gb', name: '15GB', price: 3500, speed: 'Up to 15Mbps', validity: '30 days' },
      { id: 'swift-30gb', name: '30GB', price: 6500, speed: 'Up to 25Mbps', validity: '30 days' },
      { id: 'swift-60gb', name: '60GB', price: 12000, speed: 'Up to 25Mbps', validity: '30 days' },
    ],
  };

  const [formData, setFormData] = useState({
    provider: '',
    plan: '',
    accountNumber: '',
    phone: '',
  });

  const [selectedProvider, setSelectedProvider] = useState(null);

  // Get selected provider object
  const getSelectedProviderObject = () => {
    return providers.find((p) => p.id === formData.provider);
  };

  // Validation: Account number must be at least 5 characters
  const validateAccountNumber = () => {
    const account = formData.accountNumber.trim();
    if (account.length < 5) {
      setError('Account number must be at least 5 characters');
      return false;
    }
    return true;
  };

  // Validation: Phone must be at least 10 digits
  const validatePhone = () => {
    const phone = formData.phone.trim();
    if (!/^\d{10,}$/.test(phone.replace(/\D/g, ''))) {
      setError('Phone number must have at least 10 digits');
      return false;
    }
    return true;
  };

  const handleProviderSelect = (provider) => {
    setError('');
    setFormData({
      ...formData,
      provider: provider.id,
      plan: '',
      accountNumber: '',
      phone: '',
    });
    setSelectedProvider(provider);
    setStep(2);
  };

  const handlePlanSelect = (planId) => {
    setError('');
    setFormData({
      ...formData,
      plan: planId,
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    setError('');
  };

  const handleNextStep = () => {
    if (step === 2) {
      if (!formData.plan) {
        setError('Please select an internet plan');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!validateAccountNumber()) return;
      if (!validatePhone()) return;
      setStep(4);
    }
  };

  const handleBackStep = () => {
    if (step > 1) {
      setError('');
      setStep(step - 1);
    }
  };

  const handleProceedToPin = () => {
    const providerObj = getSelectedProviderObject();
    const plan = internetPlans[formData.provider].find((p) => p.id === formData.plan);

    navigate('/pin', {
      state: {
        type: 'internet',
        provider: providerObj?.name,
        plan: plan?.name,
        accountNumber: formData.accountNumber,
        amount: plan?.price,
        phone: formData.phone,
        description: `Internet: ${providerObj?.name} - ${plan?.name} (${formData.accountNumber})`,
      },
    });
  };

  const renderStep1 = () => (
    <div className="internet-step">
      <div className="step-header">
        <h2>Select Internet Provider</h2>
        <p>Choose your preferred internet service provider</p>
      </div>

      <div className="provider-grid">
        {providers.map((provider) => (
          <button
            key={provider.id}
            className={`provider-card ${formData.provider === provider.id ? 'active' : ''}`}
            onClick={() => handleProviderSelect(provider)}
          >
            <div className="provider-icon">{provider.icon}</div>
            <div className="provider-info">
              <h4>{provider.name}</h4>
              <p className="provider-description">{provider.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="internet-step">
      <div className="step-header">
        <h2>Select Data Plan</h2>
        <p>Pick a plan that suits your needs</p>
      </div>

      <div className="provider-display">
        <div className="provider-icon">{selectedProvider?.icon}</div>
        <div className="provider-name">{selectedProvider?.name}</div>
      </div>

      <div className="plans-grid">
        {internetPlans[formData.provider].map((plan) => (
          <button
            key={plan.id}
            className={`plan-card ${formData.plan === plan.id ? 'active' : ''}`}
            onClick={() => handlePlanSelect(plan.id)}
          >
            <div className="plan-name">{plan.name}</div>
            <div className="plan-price">₦{plan.price.toLocaleString()}</div>
            <div className="plan-details">
              <div className="plan-speed">{plan.speed}</div>
              <div className="plan-validity">{plan.validity}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="info-box">
        <p>
          <strong>Note:</strong> Plans include unlimited access within the selected data quota. Speed may vary by
          location.
        </p>
      </div>

      <div className="form-actions">
        <button className="btn secondary" onClick={handleBackStep}>
          Back
        </button>
        <button className="btn primary" onClick={handleNextStep} disabled={!formData.plan}>
          Next
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="internet-step">
      <div className="step-header">
        <h2>Enter Account Details</h2>
        <p>Provide your account and contact information</p>
      </div>

      <div className="form-group">
        <label>Account Number</label>
        <input
          type="text"
          name="accountNumber"
          placeholder="Enter your account number"
          value={formData.accountNumber}
          onChange={handleInputChange}
        />
        <small>Your account number from your ISP</small>
      </div>

      <div className="form-group">
        <label>Phone Number</label>
        <input
          type="tel"
          name="phone"
          placeholder="Enter your phone number"
          value={formData.phone}
          onChange={handleInputChange}
        />
        <small>For transaction receipt and confirmation</small>
      </div>

      <div className="info-box">
        <p>
          <strong>Requirements:</strong> Account number must be at least 5 characters. Your phone number will be used
          for confirmation.
        </p>
      </div>

      <div className="form-actions">
        <button className="btn secondary" onClick={handleBackStep}>
          Back
        </button>
        <button className="btn primary" onClick={handleNextStep} disabled={!formData.accountNumber || !formData.phone}>
          Review
        </button>
      </div>
    </div>
  );

  const renderStep4 = () => {
    const plan = internetPlans[formData.provider].find((p) => p.id === formData.plan);

    return (
      <div className="internet-step">
        <div className="step-header">
          <h2>Confirm Purchase</h2>
          <p>Review your order before proceeding</p>
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
            <span className="label">Speed</span>
            <span className="value">{plan?.speed}</span>
          </div>
          <div className="summary-row">
            <span className="label">Validity</span>
            <span className="value">{plan?.validity}</span>
          </div>
          <div className="summary-row">
            <span className="label">Account</span>
            <span className="value">****{formData.accountNumber.slice(-4)}</span>
          </div>
          <div className="summary-row">
            <span className="label">Phone</span>
            <span className="value">****{formData.phone.slice(-4)}</span>
          </div>
          <div className="summary-row">
            <span className="label">Amount</span>
            <span className="value amount">₦{plan?.price.toLocaleString()}</span>
          </div>
        </div>

        <div className="info-box warning">
          <p>
            <strong>Important:</strong> Ensure your account number is correct. Service activation may take a few
            minutes after payment.
          </p>
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
