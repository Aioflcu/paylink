import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ErrorBoundary from '../components/ErrorBoundary';
import { paymentAPI } from '../services/backendAPI';
import './Tax.css';

// Tax Configuration Data
const TAX_TYPES = {
  PERSONAL: {
    id: 'personal',
    name: 'Personal Tax',
    icon: '�',
    description: 'Individual income tax',
  },
  CORPORATE: {
    id: 'corporate',
    name: 'Corporate Tax',
    icon: '🏢',
    description: 'Business tax return',
  },
  PROPERTY: {
    id: 'property',
    name: 'Property Tax',
    icon: '🏠',
    description: 'Real estate tax',
  },
  CAPITAL_GAINS: {
    id: 'capital_gains',
    name: 'Capital Gains Tax',
    icon: '📈',
    description: 'Investment gains tax',
  },
};

const TAX_AUTHORITIES = {
  personal: {
    FIRS: {
      id: 'firs',
      name: 'FIRS',
      icon: '�️',
      description: 'Federal Inland Revenue Service',
    },
    STATE: {
      id: 'state',
      name: 'State Board',
      icon: '�',
      description: 'State Internal Revenue Board',
    },
  },
  corporate: {
    FIRS: {
      id: 'firs',
      name: 'FIRS',
      icon: '�️',
      description: 'Federal Inland Revenue Service',
    },
    FIRS_SPECIAL: {
      id: 'firs_special',
      name: 'FIRS Special',
      icon: '⭐',
      description: 'FIRS Compliance',
    },
  },
  property: {
    LOCAL: {
      id: 'local',
      name: 'Local Government',
      icon: '�️',
      description: 'Local tax authority',
    },
    STATE: {
      id: 'state',
      name: 'State Board',
      icon: '�',
      description: 'State property tax',
    },
  },
  capital_gains: {
    FIRS: {
      id: 'firs',
      name: 'FIRS',
      icon: '🏛️',
      description: 'Federal Inland Revenue Service',
    },
  },
};

const AMOUNT_PRESETS = [1000, 5000, 10000, 25000, 50000, 100000];

const Tax = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // State management
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTaxType, setSelectedTaxType] = useState(null);
  const [selectedAuthority, setSelectedAuthority] = useState(null);
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [taxID, setTaxID] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Validation Functions
  const isTaxIDValid = (id) => {
    return id.trim().length >= 3;
  };

  const isCurrentStepValid = () => {
    switch (currentStep) {
      case 1:
        return selectedTaxType !== null;
      case 2:
        return selectedAuthority !== null;
      case 3:
        return selectedAmount !== null || customAmount.trim() !== '';
      case 4:
        return isTaxIDValid(taxID) && (selectedTaxType === 'personal' || businessName.trim() !== '');
      case 5:
        return address.trim() !== '' && email.trim() !== '' && phone.trim() !== '';
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (isCurrentStepValid()) {
      setCurrentStep(currentStep + 1);
      setError('');
    } else {
      setError('Please fill in all required fields');
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError('');
    }
  };

  const getAmount = () => {
    return selectedAmount || parseInt(customAmount) || 0;
  };

  const handleSubmit = async () => {
    if (!isCurrentStepValid()) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const amount = getAmount();
      
      if (!amount || amount < 100) {
        throw new Error('Amount must be at least ₦100');
      }

      // Call backend payment API
      const result = await paymentAPI.payTax(
        selectedTaxType,
        taxID,
        amount,
        selectedAuthority
      );

      if (result.success) {
        // Navigate to success page
        navigate('/success', {
          state: {
            transactionId: result.transactionId,
            type: 'tax',
            taxType: selectedTaxType,
            taxID,
            amount,
            authority: selectedAuthority,
            fee: result.fee || 0,
            rewardPoints: result.rewardPoints || 0
          }
        });
      }
    } catch (error) {
      console.error('Tax payment error:', error);
      
      // Check if PIN is required
      if (error.status === 403 && error.data?.requiresPin) {
        navigate('/pin', {
          state: {
            type: 'tax',
            taxType: selectedTaxType,
            taxID,
            amount: getAmount(),
            authority: selectedAuthority,
            description: `Tax Payment - ${selectedTaxType} - ₦${getAmount().toLocaleString()}`,
            onPinVerified: async (pinHash) => {
              const pinResult = await paymentAPI.payTax(
                selectedTaxType,
                taxID,
                getAmount(),
                selectedAuthority,
                pinHash
              );
              return pinResult;
            }
          }
        });
      } else {
        setError(error.data?.error || error.message || 'Failed to process tax payment. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAmountSelect = (amount) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (e) => {
    const value = e.target.value;
    setCustomAmount(value);
    if (value) {
      setSelectedAmount(null);
    }
  };

  const dismissError = () => {
    setError('');
  };

  // Render Step 1: Tax Type Selection
  const renderStep1 = () => (
    <div className="tax-step">
      <div className="step-header">
        <h2>Select Tax Type</h2>
        <p>Choose the type of tax you want to pay</p>
      </div>

      <div className="tax-type-grid">
        {Object.values(TAX_TYPES).map((taxType) => (
          <div
            key={taxType.id}
            className={`tax-type-card ${selectedTaxType === taxType.id ? 'active' : ''}`}
            onClick={() => {
              setSelectedTaxType(taxType.id);
              setSelectedAuthority(null);
              setError('');
            }}
          >
            <div className="tax-icon">{taxType.icon}</div>
            <div className="tax-info">
              <h4>{taxType.name}</h4>
              <p className="tax-description">{taxType.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Render Step 2: Authority Selection
  const renderStep2 = () => {
    const authorities = selectedTaxType ? TAX_AUTHORITIES[selectedTaxType] : {};

    return (
      <div className="tax-step">
        <div className="step-header">
          <h2>Select Tax Authority</h2>
          <p>Choose the authority to pay your tax to</p>
        </div>

        <div className="tax-type-display">
          <div className="tax-icon">{TAX_TYPES[selectedTaxType]?.icon}</div>
          <div className="tax-name">{TAX_TYPES[selectedTaxType]?.name}</div>
        </div>

        <div className="authority-grid">
          {Object.values(authorities).map((authority) => (
            <div
              key={authority.id}
              className={`authority-card ${selectedAuthority === authority.id ? 'active' : ''}`}
              onClick={() => {
                setSelectedAuthority(authority.id);
                setError('');
              }}
            >
              <div className="authority-icon">{authority.icon}</div>
              <div className="authority-name">{authority.name}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render Step 3: Amount Selection
  const renderStep3 = () => (
    <div className="tax-step">
      <div className="step-header">
        <h2>Enter Amount</h2>
        <p>Select or enter the tax amount you want to pay</p>
      </div>

      <div className="amounts-grid">
        {AMOUNT_PRESETS.map((amount) => (
          <button
            key={amount}
            className={`amount-btn ${selectedAmount === amount ? 'active' : ''}`}
            onClick={() => handleAmountSelect(amount)}
          >
            ₦{amount.toLocaleString()}
          </button>
        ))}
      </div>

      <div className="custom-amount-section">
        <label htmlFor="customAmount">Or enter custom amount</label>
        <input
          id="customAmount"
          type="number"
          placeholder="Enter amount in ₦"
          value={customAmount}
          onChange={handleCustomAmountChange}
          min="100"
          step="100"
        />
      </div>

      {(selectedAmount || customAmount) && (
        <div className="info-box">
          <p>
            <strong>Amount to pay:</strong> ₦{(getAmount()).toLocaleString()}
          </p>
          <p style={{ fontSize: '12px' }}>
            Plus applicable transaction fees
          </p>
        </div>
      )}
    </div>
  );

  // Render Step 4: Tax Information
  const renderStep4 = () => (
    <div className="tax-step">
      <div className="step-header">
        <h2>Tax Information</h2>
        <p>Provide your tax identification details</p>
      </div>

      <div className="form-group">
        <label htmlFor="taxID">Tax ID *</label>
        <input
          id="taxID"
          type="text"
          placeholder="e.g., 123-4567-8910"
          value={taxID}
          onChange={(e) => setTaxID(e.target.value)}
        />
        <small>Your personal or company tax identification number</small>
      </div>

      {selectedTaxType !== 'personal' && (
        <div className="form-group">
          <label htmlFor="businessName">Business Name *</label>
          <input
            id="businessName"
            type="text"
            placeholder="Enter business name"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />
        </div>
      )}

      <div className="info-box">
        <p>
          <strong>Tax Type:</strong> {TAX_TYPES[selectedTaxType]?.name}
        </p>
        <p>
          <strong>Authority:</strong> {TAX_AUTHORITIES[selectedTaxType]?.[selectedAuthority]?.name}
        </p>
      </div>
    </div>
  );

  // Render Step 5: Contact Information & Summary
  const renderStep5 = () => (
    <div className="tax-step">
      <div className="step-header">
        <h2>Contact Information</h2>
        <p>Confirm your details</p>
      </div>

      <div className="form-group">
        <label htmlFor="email">Email Address *</label>
        <input
          id="email"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="phone">Phone Number *</label>
        <input
          id="phone"
          type="tel"
          placeholder="08012345678"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="address">Address *</label>
        <input
          id="address"
          type="text"
          placeholder="Enter your address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>

      {/* Summary Card */}
      <div className="summary-card">
        <div className="summary-row">
          <span className="label">Tax Type:</span>
          <span className="value">{TAX_TYPES[selectedTaxType]?.name}</span>
        </div>
        <div className="summary-row">
          <span className="label">Authority:</span>
          <span className="value">{TAX_AUTHORITIES[selectedTaxType]?.[selectedAuthority]?.name}</span>
        </div>
        <div className="summary-row">
          <span className="label">Tax ID:</span>
          <span className="value">{taxID}</span>
        </div>
        <div className="summary-row">
          <span className="label">Amount:</span>
          <span className="value amount">₦{(getAmount()).toLocaleString()}</span>
        </div>
      </div>

      <div className="info-box warning">
        <p>
          <strong>⚠️ Please Review:</strong> Ensure all details are correct before proceeding with payment.
          This action cannot be undone.
        </p>
      </div>
    </div>
  );

  return (
    <ErrorBoundary>
      <div className="tax-page">
        {/* Page Header */}
        <div className="page-header">
          <h1>Tax Payment</h1>
          <p>Secure and easy tax payments</p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="error-banner">
            <p>{error}</p>
            <button onClick={dismissError} aria-label="Close error">
              ✕
            </button>
          </div>
        )}

        {/* Step Indicator */}
        <div className="step-indicator">
          {[1, 2, 3, 4, 5].map((step) => (
            <div
              key={step}
              className={`step ${step === currentStep ? 'active' : ''} ${
                step < currentStep ? 'active' : ''
              }`}
            >
              {step < currentStep ? '✓' : step}
            </div>
          ))}
        </div>

        {/* Form Container */}
        <div className="tax-form">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && renderStep5()}

          {/* Form Actions */}
          <div className="form-actions">
            {currentStep > 1 && (
              <button
                className="btn secondary"
                onClick={handleBack}
                disabled={loading}
              >
                Back
              </button>
            )}
            {currentStep < 5 && (
              <button
                className="btn primary"
                onClick={handleNext}
                disabled={!isCurrentStepValid() || loading}
              >
                Next
              </button>
            )}
            {currentStep === 5 && (
              <button
                className="btn primary"
                onClick={handleSubmit}
                disabled={!isCurrentStepValid() || loading}
              >
                {loading ? 'Processing...' : 'Pay Now'}
              </button>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Tax;
