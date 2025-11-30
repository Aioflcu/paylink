import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import payflex from '../services/payflex';
import LoadingSpinner from '../components/LoadingSpinner';
import './Electricity.css';

const Electricity = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDisco, setSelectedDisco] = useState(null);

  const [formData, setFormData] = useState({
    disco: '',
    meterNumber: '',
    meterType: 'prepaid',
    amount: '',
    phone: ''
  });

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  // All 15 major Nigerian DISCOs
  const discos = [
    { id: 'abuja', name: 'Abuja Electric (AEDC)', state: 'FCT', icon: '⚡' },
    { id: 'benin', name: 'Benin Electric (BEDC)', state: 'Edo/Delta', icon: '⚡' },
    { id: 'eko', name: 'Eko Electric (EKEDC)', state: 'Lagos', icon: '⚡' },
    { id: 'enugu', name: 'Enugu Electric (EEDC)', state: 'Enugu/Abia/Ebonyi/Anambra', icon: '⚡' },
    { id: 'ibadan', name: 'Ibadan Electric (IBEDC)', state: 'Oyo/Osun/Kwara', icon: '⚡' },
    { id: 'ikedc', name: 'Ikeja Electric (IKEDC)', state: 'Lagos', icon: '⚡' },
    { id: 'jos', name: 'Jos Electric (JEDC)', state: 'Plateau/Bauchi', icon: '⚡' },
    { id: 'kano', name: 'Kano Electric (KEDC)', state: 'Kano/Katsina/Jigawa', icon: '⚡' },
    { id: 'kaduna', name: 'Kaduna Electric (KADC)', state: 'Kaduna', icon: '⚡' },
    { id: 'port_harcourt', name: 'Port Harcourt Electric (PHEDC)', state: 'Rivers', icon: '⚡' },
    { id: 'sokoto', name: 'Sokoto Electric (SEDC)', state: 'Sokoto/Kebbi/Zamfara', icon: '⚡' },
    { id: 'warri', name: 'Warri Electric (WEDC)', state: 'Delta', icon: '⚡' },
    { id: 'yola', name: 'Yola Electric (YEDC)', state: 'Adamawa/Taraba', icon: '⚡' },
    { id: 'katsina', name: 'Katsina Electric (KAEDCO)', state: 'Katsina', icon: '⚡' },
    { id: 'maiduguri', name: 'Maiduguri Electric (MEDC)', state: 'Borno/Yobe', icon: '⚡' },
  ];

  const meterTypes = [
    { value: 'prepaid', label: 'Prepaid (Pay as you go)' },
    { value: 'postpaid', label: 'Postpaid (Monthly billing)' }
  ];

  const handleDiscoSelect = (disco) => {
    setSelectedDisco(disco);
    setFormData(prev => ({ ...prev, disco: disco.id }));
    setError('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const validateMeterNumber = async () => {
    const meterNum = formData.meterNumber.trim();
    if (!meterNum) {
      setError('Meter number is required');
      return false;
    }
    if (!/^\d{10,11}$/.test(meterNum)) {
      setError('Meter number must be 10-11 digits');
      return false;
    }

    // Validate meter with PayFlex API
    try {
      setLoading(true);
      const isValid = await payflex.validateMeterNumber(meterNum);
      if (!isValid) {
        setError('Invalid meter number. Please check and try again.');
        return false;
      }
    } catch (err) {
      console.error('Error validating meter:', err);
      // Allow to continue even if validation fails (PayFlex API might be down)
      // In production, you might want to require this
    } finally {
      setLoading(false);
    }

    return true;
  };

  const validateAmount = () => {
    const amt = parseFloat(formData.amount);
    if (!formData.amount || amt <= 0) {
      setError('Amount must be greater than 0');
      return false;
    }
    if (amt < 1000) {
      setError('Minimum amount is ₦1,000');
      return false;
    }
    if (amt > 500000) {
      setError('Maximum amount is ₦500,000');
      return false;
    }
    return true;
  };

  const validatePhone = () => {
    const phone = formData.phone.trim();
    if (!phone) {
      setError('Phone number is required');
      return false;
    }
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      setError('Please enter a valid phone number');
      return false;
    }
    return true;
  };

  const handleNextStep = async () => {
    if (step === 1) {
      if (!formData.disco) {
        setError('Please select a DISCO');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!await validateMeterNumber()) return;
      if (!formData.meterType) {
        setError('Please select meter type');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!validateAmount()) return;
      if (!validatePhone()) return;
      setStep(4);
    }
  };

  const handleProceedToPin = () => {
    navigate('/pin', {
      state: {
        type: 'electricity',
        provider: selectedDisco?.name || formData.disco,
        discoId: formData.disco,
        meterNumber: formData.meterNumber,
        meterType: formData.meterType,
        amount: parseFloat(formData.amount),
        phone: formData.phone,
        description: `Electricity: ${selectedDisco?.name} - ${formData.meterNumber}`
      }
    });
  };

  const renderStep1 = () => (
    <div className="electricity-step">
      <div className="step-header">
        <h2>Select DISCO</h2>
        <p>Choose your electricity distribution company</p>
      </div>
      
      <div className="disco-grid">
        {discos.map((disco) => (
          <button
            key={disco.id}
            className={`disco-card ${selectedDisco?.id === disco.id ? 'active' : ''}`}
            onClick={() => handleDiscoSelect(disco)}
          >
            <div className="disco-icon">{disco.icon}</div>
            <div className="disco-info">
              <h4>{disco.name}</h4>
              <p className="disco-state">{disco.state}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="electricity-step">
      <div className="step-header">
        <h2>Meter Details</h2>
        <p>Enter your meter number and type</p>
      </div>

      <div className="form-group">
        <label>Selected DISCO</label>
        <div className="disco-display">
          <span className="disco-icon">⚡</span>
          <span className="disco-name">{selectedDisco?.name}</span>
        </div>
      </div>

      <div className="form-group">
        <label>Meter Number *</label>
        <input
          type="text"
          name="meterNumber"
          placeholder="Enter 10-11 digit meter number"
          value={formData.meterNumber}
          onChange={handleInputChange}
          maxLength="11"
          inputMode="numeric"
        />
        <small>Usually found on your meter or electricity bill</small>
      </div>

      <div className="form-group">
        <label>Meter Type *</label>
        <select
          name="meterType"
          value={formData.meterType}
          onChange={handleInputChange}
          required
        >
          {meterTypes.map(type => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="electricity-step">
      <div className="step-header">
        <h2>Amount & Contact</h2>
        <p>Enter the amount and your contact number</p>
      </div>

      <div className="form-group">
        <label>Amount (₦) *</label>
        <input
          type="number"
          name="amount"
          placeholder="5000"
          value={formData.amount}
          onChange={handleInputChange}
          min="1000"
          max="500000"
          step="100"
        />
        <small>Min: ₦1,000 | Max: ₦500,000</small>
      </div>

      <div className="form-group">
        <label>Phone Number *</label>
        <input
          type="tel"
          name="phone"
          placeholder="0801234567"
          value={formData.phone}
          onChange={handleInputChange}
        />
      </div>

      <div className="info-box">
        <p>
          <strong>Meter:</strong> {formData.meterNumber}
        </p>
        <p>
          <strong>Type:</strong> {formData.meterType === 'prepaid' ? 'Prepaid' : 'Postpaid'}
        </p>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="electricity-step">
      <div className="step-header">
        <h2>Confirm Purchase</h2>
        <p>Review your electricity purchase details</p>
      </div>

      <div className="summary-card">
        <div className="summary-row">
          <span className="label">DISCO:</span>
          <span className="value">{selectedDisco?.name}</span>
        </div>
        <div className="summary-row">
          <span className="label">Meter Number:</span>
          <span className="value">{formData.meterNumber}</span>
        </div>
        <div className="summary-row">
          <span className="label">Meter Type:</span>
          <span className="value">{formData.meterType === 'prepaid' ? 'Prepaid' : 'Postpaid'}</span>
        </div>
        <div className="summary-row">
          <span className="label">Amount:</span>
          <span className="value amount">₦{parseFloat(formData.amount).toLocaleString('en-NG')}</span>
        </div>
        <div className="summary-row">
          <span className="label">Phone:</span>
          <span className="value">{formData.phone}</span>
        </div>
      </div>

      <div className="info-box warning">
        <p>⚠️ You will be prompted to enter your 4-digit PIN to complete this transaction.</p>
      </div>
    </div>
  );

  if (loading) {
    return <LoadingSpinner message="Processing..." />;
  }

  return (
    <div className="electricity-page">
      <div className="page-header">
        <h1>⚡ Electricity</h1>
        <p>Pay your electricity bills instantly</p>
      </div>

      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      <div className="step-indicator">
        <div className={`step ${step >= 1 ? 'active' : ''}`}>1</div>
        <div className={`step ${step >= 2 ? 'active' : ''}`}>2</div>
        <div className={`step ${step >= 3 ? 'active' : ''}`}>3</div>
        <div className={`step ${step >= 4 ? 'active' : ''}`}>4</div>
      </div>

      <div className="electricity-form">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </div>

      <div className="form-actions">
        {step > 1 && (
          <button
            className="btn secondary"
            onClick={() => setStep(step - 1)}
            disabled={loading}
          >
            ← Back
          </button>
        )}
        {step < 4 && (
          <button
            className="btn primary"
            onClick={handleNextStep}
            disabled={loading}
          >
            Continue →
          </button>
        )}
        {step === 4 && (
          <button
            className="btn primary"
            onClick={handleProceedToPin}
            disabled={loading}
          >
            Proceed to PIN
          </button>
        )}
      </div>
    </div>
  );
};

export default Electricity;
