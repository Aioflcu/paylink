import React, { useState } from 'react';
import './PINInput.css';

const PINInput = ({ onPINSubmit, length = 4, title = 'Enter Transaction PIN' }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, length);
    setPin(value);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (pin.length !== length) {
      setError(`PIN must be ${length} digits`);
      return;
    }

    setLoading(true);
    try {
      await onPINSubmit(pin);
    } catch (err) {
      setError(err.message || 'Invalid PIN. Please try again.');
    } finally {
      setLoading(false);
      setPin('');
    }
  };

  return (
    <div className="pin-input-container">
      <div className="pin-card">
        <h2>{title}</h2>
        <form onSubmit={handleSubmit}>
          <div className="pin-display">
            {Array.from({ length }).map((_, i) => (
              <div key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''}`}>
                {i < pin.length ? '●' : '○'}
              </div>
            ))}
          </div>

          <input
            type="text"
            inputMode="numeric"
            value={pin}
            onChange={handleInputChange}
            placeholder={`Enter ${length}-digit PIN`}
            maxLength={length}
            autoFocus
            disabled={loading}
            className="pin-input"
          />

          {error && <div className="pin-error">{error}</div>}

          <button
            type="submit"
            disabled={pin.length !== length || loading}
            className="pin-submit-btn"
          >
            {loading ? 'Verifying...' : 'Verify PIN'}
          </button>
        </form>

        <p className="pin-hint">This PIN is required for security</p>
      </div>
    </div>
  );
};

export default PINInput;
