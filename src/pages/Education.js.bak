import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import './Education.css';

const Education = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  // Education services with icons and descriptions
  const services = [
    { id: 'school-fees', name: 'School Fees', icon: '🎓', description: 'Tuition & fees' },
    { id: 'exam-registration', name: 'Exam Registration', icon: '📝', description: 'JAMB, WAEC, NECO' },
    { id: 'textbooks', name: 'Textbooks', icon: '📚', description: 'Course materials' },
    { id: 'accommodation', name: 'Hostel/Accommodation', icon: '🏠', description: 'Lodging fees' },
    { id: 'tuition', name: 'Tuition Fees', icon: '💰', description: 'Online courses' },
  ];

  // Amount presets
  const amountPresets = [
    { label: '₦5,000', value: 5000 },
    { label: '₦10,000', value: 10000 },
    { label: '₦25,000', value: 25000 },
    { label: '₦50,000', value: 50000 },
    { label: '₦100,000', value: 100000 },
    { label: '₦200,000', value: 200000 },
  ];

  const [formData, setFormData] = useState({
    service: '',
    amount: '',
    fullName: '',
    matricNumber: '',
    institution: '',
    faculty: '',
    department: '',
    phone: '',
  });

  const [selectedService, setSelectedService] = useState(null);

  // Get selected service object
  const getSelectedServiceObject = () => {
    return services.find((s) => s.id === formData.service);
  };

  // Validation: Matric number at least 3 characters
  const validateMatricNumber = () => {
    const matric = formData.matricNumber.trim();
    if (matric.length < 3) {
      setError('Matriculation number must be at least 3 characters');
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

  const handleServiceSelect = (service) => {
    setError('');
    setFormData({
      ...formData,
      service: service.id,
      amount: '',
    });
    setSelectedService(service);
    setStep(2);
  };

  const handleAmountSelect = (amount) => {
    setError('');
    setFormData({
      ...formData,
      amount: amount.toString(),
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
      if (!formData.amount) {
        setError('Please select or enter an amount');
        return;
      }
      if (parseFloat(formData.amount) < 1000) {
        setError('Amount must be at least ₦1,000');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!formData.fullName.trim()) {
        setError('Full name is required');
        return;
      }
      if (!validateMatricNumber()) return;
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
    const serviceObj = getSelectedServiceObject();

    navigate('/pin', {
      state: {
        type: 'education',
        service: serviceObj?.name,
        amount: parseFloat(formData.amount),
        fullName: formData.fullName,
        matricNumber: formData.matricNumber,
        institution: formData.institution,
        phone: formData.phone,
        description: `Education: ${serviceObj?.name} - ${formData.fullName} (${formData.matricNumber})`,
      },
    });
  };

  const renderStep1 = () => (
    <div className="education-step">
      <div className="step-header">
        <h2>Select Education Service</h2>
        <p>Choose the type of educational payment</p>
      </div>

      <div className="service-grid">
        {services.map((service) => (
          <button
            key={service.id}
            className={`service-card ${formData.service === service.id ? 'active' : ''}`}
            onClick={() => handleServiceSelect(service)}
          >
            <div className="service-icon">{service.icon}</div>
            <div className="service-info">
              <h4>{service.name}</h4>
              <p className="service-description">{service.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="education-step">
      <div className="step-header">
        <h2>Enter Amount</h2>
        <p>Select a preset amount or enter a custom amount</p>
      </div>

      <div className="service-display">
        <div className="service-icon">{selectedService?.icon}</div>
        <div className="service-name">{selectedService?.name}</div>
      </div>

      <div className="amounts-grid">
        {amountPresets.map((preset) => (
          <button
            key={preset.value}
            className={`amount-btn ${formData.amount === preset.value.toString() ? 'active' : ''}`}
            onClick={() => handleAmountSelect(preset.value)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="custom-amount-section">
        <label>Or enter custom amount (₦):</label>
        <input
          type="number"
          name="amount"
          value={formData.amount}
          onChange={handleInputChange}
          placeholder="Enter amount (minimum ₦1,000)"
          min="1000"
          step="500"
        />
      </div>

      <div className="info-box">
        <p>
          <strong>Note:</strong> Minimum amount is ₦1,000. Maximum is ₦500,000 per transaction.
        </p>
      </div>

      <div className="form-actions">
        <button className="btn secondary" onClick={handleBackStep}>
          Back
        </button>
        <button className="btn primary" onClick={handleNextStep} disabled={!formData.amount}>
          Next
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="education-step">
      <div className="step-header">
        <h2>Enter Your Details</h2>
        <p>Provide your personal and institutional information</p>
      </div>

      <div className="form-group">
        <label>Full Name *</label>
        <input
          type="text"
          name="fullName"
          placeholder="Enter your full name"
          value={formData.fullName}
          onChange={handleInputChange}
        />
        <small>As it appears on your official documents</small>
      </div>

      <div className="form-group">
        <label>Matriculation/ID Number *</label>
        <input
          type="text"
          name="matricNumber"
          placeholder="Enter your matric or ID number"
          value={formData.matricNumber}
          onChange={handleInputChange}
        />
        <small>Your student or institutional ID</small>
      </div>

      <div className="form-group">
        <label>Institution (Optional)</label>
        <input
          type="text"
          name="institution"
          placeholder="e.g., University of Ibadan"
          value={formData.institution}
          onChange={handleInputChange}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Faculty (Optional)</label>
          <input
            type="text"
            name="faculty"
            placeholder="e.g., Science"
            value={formData.faculty}
            onChange={handleInputChange}
          />
        </div>
        <div className="form-group">
          <label>Department (Optional)</label>
          <input
            type="text"
            name="department"
            placeholder="e.g., Computer Science"
            value={formData.department}
            onChange={handleInputChange}
          />
        </div>
      </div>

      <div className="form-group">
        <label>Phone Number *</label>
        <input
          type="tel"
          name="phone"
          placeholder="Enter your phone number"
          value={formData.phone}
          onChange={handleInputChange}
        />
        <small>For transaction confirmation and receipt</small>
      </div>

      <div className="info-box">
        <p>
          <strong>Required fields:</strong> Full name, matric number, and phone number are required to proceed.
        </p>
      </div>

      <div className="form-actions">
        <button className="btn secondary" onClick={handleBackStep}>
          Back
        </button>
        <button
          className="btn primary"
          onClick={handleNextStep}
          disabled={!formData.fullName || !formData.matricNumber || !formData.phone}
        >
          Review
        </button>
      </div>
    </div>
  );

  const renderStep4 = () => {
    return (
      <div className="education-step">
        <div className="step-header">
          <h2>Confirm Payment</h2>
          <p>Review your education payment details</p>
        </div>

        <div className="summary-card">
          <div className="summary-row">
            <span className="label">Service Type</span>
            <span className="value">{selectedService?.name}</span>
          </div>
          <div className="summary-row">
            <span className="label">Amount</span>
            <span className="value amount">₦{parseFloat(formData.amount).toLocaleString()}</span>
          </div>
          <div className="summary-row">
            <span className="label">Full Name</span>
            <span className="value">{formData.fullName}</span>
          </div>
          <div className="summary-row">
            <span className="label">Matric Number</span>
            <span className="value">****{formData.matricNumber.slice(-4)}</span>
          </div>
          {formData.institution && (
            <div className="summary-row">
              <span className="label">Institution</span>
              <span className="value">{formData.institution}</span>
            </div>
          )}
          {formData.faculty && (
            <div className="summary-row">
              <span className="label">Faculty</span>
              <span className="value">{formData.faculty}</span>
            </div>
          )}
          <div className="summary-row">
            <span className="label">Phone</span>
            <span className="value">****{formData.phone.slice(-4)}</span>
          </div>
        </div>

        <div className="info-box warning">
          <p>
            <strong>Important:</strong> Ensure all details are correct before proceeding. Charges apply immediately upon
            successful payment.
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
      <div className="education-page">
        <div className="error-banner">
          <p>Please log in to access Education services</p>
        </div>
      </div>
    );
  }

  return (
    <div className="education-page">
      <div className="page-header">
        <h1>Education Payments</h1>
        <p>Pay for school fees, exams, and educational services</p>
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

      <div className="education-form">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </div>
    </div>
  );
};

export default Education;
