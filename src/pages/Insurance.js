import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { paymentAPI } from '../services/backendAPI';
import './Insurance.css';

const Insurance = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const insuranceTypes = [
    { id: 'health', name: 'Health Insurance', icon: '🏥', description: 'Medical coverage and healthcare' },
    { id: 'life', name: 'Life Insurance', icon: '💙', description: 'Life coverage and protection' },
    { id: 'auto', name: 'Auto Insurance', icon: '🚗', description: 'Vehicle protection and coverage' },
    { id: 'home', name: 'Home Insurance', icon: '🏠', description: 'Property and home protection' },
  ];

  const plans = {
    health: [
      { id: 'basic-health', name: 'Basic Health Plan', amount: '5000', coverage: '₦500,000', features: ['Outpatient care', 'Basic consultations'] },
      { id: 'premium-health', name: 'Premium Health Plan', amount: '15000', coverage: '₦2,000,000', features: ['Full coverage', 'Emergency care', 'Dental'] },
      { id: 'family-health', name: 'Family Health Plan', amount: '25000', coverage: '₦5,000,000', features: ['Family coverage', 'Maternity', 'All services'] },
    ],
    life: [
      { id: 'term-life', name: 'Term Life Insurance', amount: '10000', coverage: '₦1,000,000', features: ['Death benefit', '10-year term'] },
      { id: 'whole-life', name: 'Whole Life Insurance', amount: '50000', coverage: '₦5,000,000', features: ['Lifetime coverage', 'Cash value'] },
    ],
    auto: [
      { id: 'third-party', name: 'Third Party Auto', amount: '15000', coverage: 'Comprehensive', features: ['Third party liability', 'Property damage'] },
      { id: 'comprehensive', name: 'Comprehensive Auto', amount: '35000', coverage: 'Full coverage', features: ['All risks', 'Theft protection', 'Personal accident'] },
    ],
    home: [
      { id: 'basic-home', name: 'Basic Home Insurance', amount: '20000', coverage: '₦2,000,000', features: ['Fire damage', 'Theft protection'] },
      { id: 'premium-home', name: 'Premium Home Insurance', amount: '50000', coverage: '₦10,000,000', features: ['All risks', 'Flood coverage', 'Comprehensive'] },
    ],
  };

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setStep(2);
    setError('');
  };

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    setStep(3);
  };

  const handleConfirmPurchase = () => {
    setStep(4);
  };

  const handlePurchase = async () => {
    setLoading(true);
    try {
      setError('');

      // Call backend payment API
      const result = await paymentAPI.payInsurance(
        selectedPlan.id,
        selectedType.id,
        parseFloat(selectedPlan.amount)
      );

      if (result.success) {
        // Navigate to success page
        navigate('/success', {
          state: {
            transactionId: result.transactionId,
            type: 'insurance',
            insuranceType: selectedType.name,
            planName: selectedPlan.name,
            coverage: selectedPlan.coverage,
            amount: selectedPlan.amount,
            fee: result.fee || 0,
            rewardPoints: result.rewardPoints || 0
          }
        });
      }
    } catch (error) {
      console.error('Payment error:', error);
      
      // Check if PIN is required
      if (error.status === 403 && error.data?.requiresPin) {
        setStep(3); // Show PIN entry step
        navigate('/pin', {
          state: {
            type: 'insurance',
            insuranceType: selectedType.name,
            planName: selectedPlan.name,
            amount: selectedPlan.amount,
            onPinVerified: async (pinHash) => {
              const pinResult = await paymentAPI.payInsurance(
                selectedPlan.id,
                selectedType.id,
                parseFloat(selectedPlan.amount),
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

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  return (
    <div className="insurance-container">
      <div className="insurance-header">
        <button className="back-btn" onClick={() => step > 1 ? setStep(step - 1) : navigate('/dashboard')}>
          ← Back
        </button>
        <h1>Insurance</h1>
      </div>

      <div className="step-indicator">
        <div className={`step ${step >= 1 ? 'active' : ''}`}>1</div>
        <div className={`step ${step >= 2 ? 'active' : ''}`}>2</div>
        <div className={`step ${step >= 3 ? 'active' : ''}`}>3</div>
        <div className={`step ${step >= 4 ? 'active' : ''}`}>4</div>
      </div>

      <div className="insurance-content">
        {error && <div className="error-message">{error}</div>}

        {step === 1 && (
          <div className="type-selection">
            <h2>Select Insurance Type</h2>
            <div className="types-grid">
              {insuranceTypes.map((type) => (
                <button
                  key={type.id}
                  className="type-card"
                  onClick={() => handleTypeSelect(type)}
                >
                  <div className="type-icon">{type.icon}</div>
                  <div className="type-info">
                    <h3 className="type-name">{type.name}</h3>
                    <p className="type-description">{type.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="plan-selection">
            <h2>Select Plan</h2>
            <div className="type-info">
              <div className="selected-type">
                <span className="type-icon">{selectedType.icon}</span>
                <span className="type-name">{selectedType.name}</span>
              </div>
            </div>
            <div className="plans-grid">
              {plans[selectedType.id]?.map((plan) => (
                <button
                  key={plan.id}
                  className="plan-card"
                  onClick={() => handlePlanSelect(plan)}
                >
                  <div className="plan-header">
                    <h3 className="plan-name">{plan.name}</h3>
                    <div className="plan-amount">{formatAmount(plan.amount)}</div>
                  </div>
                  <div className="plan-coverage">
                    <span>Coverage: {plan.coverage}</span>
                  </div>
                  <div className="plan-features">
                    <h4>Features:</h4>
                    <ul>
                      {plan.features.map((feature, index) => (
                        <li key={index}>{feature}</li>
                      ))}
                    </ul>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="confirm-purchase">
            <h2>Confirm Purchase</h2>
            <div className="purchase-summary">
              <div className="summary-item">
                <span>Insurance Type:</span>
                <div className="type-display">
                  <span className="type-icon">{selectedType.icon}</span>
                  <span>{selectedType.name}</span>
                </div>
              </div>
              <div className="summary-item">
                <span>Plan:</span>
                <span>{selectedPlan.name}</span>
              </div>
              <div className="summary-item">
                <span>Coverage:</span>
                <span className="coverage">{selectedPlan.coverage}</span>
              </div>
              <div className="summary-item">
                <span>Premium Amount:</span>
                <span className="amount">{formatAmount(selectedPlan.amount)}</span>
              </div>
              <div className="summary-item">
                <span>Wallet Balance:</span>
                <span>₦0.00</span> {/* TODO: Get real balance */}
              </div>
            </div>

            <div className="plan-details">
              <h3>Plan Features</h3>
              <ul className="features-list">
                {selectedPlan.features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
            </div>

            <div className="purchase-actions">
              <button className="cancel-btn" onClick={() => setStep(2)}>
                Change Plan
              </button>
              <button className="confirm-btn" onClick={handleConfirmPurchase}>
                Confirm Purchase
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="pin-verification">
            <h2>Enter Transaction PIN</h2>
            <div className="final-summary">
              <div className="summary-item">
                <span>Insurance Type:</span>
                <div className="type-display">
                  <span className="type-icon">{selectedType.icon}</span>
                  <span>{selectedType.name}</span>
                </div>
              </div>
              <div className="summary-item">
                <span>Plan:</span>
                <span>{selectedPlan.name}</span>
              </div>
              <div className="summary-item">
                <span>Amount:</span>
                <span className="amount">{formatAmount(selectedPlan.amount)}</span>
              </div>
            </div>

            <div className="pin-input-container">
              {/* TODO: Implement PIN input component */}
              <div className="pin-placeholder">
                PIN Input Component Here
              </div>
            </div>

            <button
              className="purchase-btn"
              onClick={handlePurchase}
              disabled={loading}
            >
              {loading ? 'Processing...' : `Pay ${formatAmount(selectedPlan.amount)}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Insurance;
