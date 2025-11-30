import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import payflex from '../services/payflex';
import LoadingSpinner from '../components/LoadingSpinner';
import './CableTV.css';

const CableTV = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  // Cable TV providers with icons and descriptions
  const providers = [
    { id: 'dstv', name: 'DSTV', icon: '📺', description: 'Digital Satellite TV' },
    { id: 'gotv', name: 'GOtv', icon: '📺', description: 'Cable & Online TV' },
    { id: 'startimes', name: 'Startimes', icon: '📺', description: 'TV & Movies' },
  ];

  // Cable plans by provider
  const cablePlans = {
    dstv: [
      { id: 'dstv-padi', name: 'Padi', price: 1850, channels: '40+' },
      { id: 'dstv-yanga', name: 'Yanga', price: 2565, channels: '100+' },
      { id: 'dstv-confam', name: 'Confam', price: 4615, channels: '120+' },
      { id: 'dstv-compact', name: 'Compact', price: 7900, channels: '150+' },
      { id: 'dstv-premium', name: 'Premium', price: 13800, channels: '180+' },
    ],
    gotv: [
      { id: 'gotv-smallie', name: 'Smallie', price: 800, channels: '40+' },
      { id: 'gotv-jolli', name: 'Jolli', price: 2460, channels: '100+' },
      { id: 'gotv-max', name: 'Max', price: 3600, channels: '120+' },
    ],
    startimes: [
      { id: 'startimes-basic', name: 'Basic', price: 900, channels: '40+' },
      { id: 'startimes-classic', name: 'Classic', price: 1300, channels: '80+' },
      { id: 'startimes-unique', name: 'Unique', price: 1800, channels: '100+' },
      { id: 'startimes-supreme', name: 'Supreme', price: 2700, channels: '120+' },
    ],
  };

  const [formData, setFormData] = useState({
    provider: '',
    plan: '',
    smartCard: '',
    phone: '',
  });

  const [selectedProvider, setSelectedProvider] = useState(null);

  // Get selected provider object
  const getSelectedProviderObject = () => {
    return providers.find((p) => p.id === formData.provider);
  };

  // Validation: Smartcard must be 10-14 digits and valid with PayFlex
  const validateSmartCard = async () => {
    const card = formData.smartCard.trim();
    if (!/^\d{10,14}$/.test(card)) {
      setError('Smart card number must be 10-14 digits');
      return false;
    }

    // Validate smartcard with PayFlex API
    try {
      setLoading(true);
      const isValid = await payflex.validateSmartcard(card);
      if (!isValid) {
        setError('Invalid smart card number. Please check and try again.');
        return false;
      }
    } catch (err) {
      console.error('Error validating smart card:', err);
      // Allow to continue even if validation fails
    } finally {
      setLoading(false);
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
      smartCard: '',
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

  const handleNextStep = async () => {
    if (step === 2) {
      if (!formData.plan) {
        setError('Please select a subscription plan');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!await validateSmartCard()) return;
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
    const plan = cablePlans[formData.provider].find((p) => p.id === formData.plan);

    navigate('/pin', {
      state: {
        type: 'cabletv',
        provider: providerObj?.name,
        plan: plan?.name,
        smartCard: formData.smartCard,
        amount: plan?.price,
        phone: formData.phone,
        description: `Cable TV: ${providerObj?.name} - ${plan?.name} (${formData.smartCard})`,
      },
    });
  };

  const renderStep1 = () => (
    <div className="cabletv-step">
      <div className="step-header">
        <h2>Select Cable TV Provider</h2>
        <p>Choose your preferred cable TV service</p>
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
    <div className="cabletv-step">
      <div className="step-header">
        <h2>Select Subscription Plan</h2>
        <p>Pick a plan that suits your needs</p>
      </div>

      <div className="provider-display">
        <div className="provider-icon">{selectedProvider?.icon}</div>
        <div className="provider-name">{selectedProvider?.name}</div>
      </div>

      <div className="plans-grid">
        {cablePlans[formData.provider].map((plan) => (
          <button
            key={plan.id}
            className={`plan-card ${formData.plan === plan.id ? 'active' : ''}`}
            onClick={() => handlePlanSelect(plan.id)}
          >
            <div className="plan-name">{plan.name}</div>
            <div className="plan-price">₦{plan.price.toLocaleString()}</div>
            <div className="plan-channels">{plan.channels} Channels</div>
          </button>
        ))}
      </div>

      <div className="info-box">
        <p>
          <strong>Note:</strong> Plans include access to all selected channels. Subscription is valid for 30 days from
          activation.
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
    <div className="cabletv-step">
      <div className="step-header">
        <h2>Enter Subscription Details</h2>
        <p>Provide your smart card and contact information</p>
      </div>

      <div className="form-group">
        <label>Smart Card Number</label>
        <input
          type="text"
          name="smartCard"
          placeholder="Enter 10-14 digit smart card number"
          value={formData.smartCard}
          onChange={handleInputChange}
          maxLength="14"
        />
        <small>Found on your cable TV smart card</small>
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
          <strong>Requirements:</strong> Smart card number must be 10-14 digits. Your phone number will be used for
          confirmation.
        </p>
      </div>

      <div className="form-actions">
        <button className="btn secondary" onClick={handleBackStep}>
          Back
        </button>
        <button className="btn primary" onClick={handleNextStep} disabled={!formData.smartCard || !formData.phone}>
          Review
        </button>
      </div>
    </div>
  );

  const renderStep4 = () => {
    const plan = cablePlans[formData.provider].find((p) => p.id === formData.plan);

    return (
      <div className="cabletv-step">
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
            <span className="label">Channels</span>
            <span className="value">{plan?.channels}</span>
          </div>
          <div className="summary-row">
            <span className="label">Smart Card</span>
            <span className="value">****{formData.smartCard.slice(-4)}</span>
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
            <strong>Important:</strong> Ensure your smart card number is correct before confirming. Charges apply
            immediately upon successful payment.
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
      <div className="cabletv-page">
        <div className="error-banner">
          <p>Please log in to access Cable TV services</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cabletv-page">
      <div className="page-header">
        <h1>Cable TV Subscription</h1>
        <p>Quick, easy, and secure cable TV subscription</p>
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

      <div className="cabletv-form">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </div>
    </div>
  );
};

export default CableTV;
