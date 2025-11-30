import React, { useState } from 'react';
import './AmountSelector.css';

const AmountSelector = ({ 
  presetAmounts = [100, 200, 500, 1000, 2000, 5000], 
  onAmountSelect,
  maxAmount = 100000,
  minAmount = 100,
  currency = '₦'
}) => {
  const [customAmount, setCustomAmount] = useState('');
  const [selectedAmount, setSelectedAmount] = useState(null);

  const handlePresetClick = (amount) => {
    setSelectedAmount(amount);
    setCustomAmount('');
    onAmountSelect(amount);
  };

  const handleCustomChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    setCustomAmount(value);
    setSelectedAmount(null);

    if (value) {
      const numValue = parseInt(value);
      if (numValue >= minAmount && numValue <= maxAmount) {
        onAmountSelect(numValue);
      }
    }
  };

  const displayAmount = selectedAmount || (customAmount ? parseInt(customAmount) : null);

  return (
    <div className="amount-selector">
      <h3>Select Amount</h3>
      
      <div className="presets-grid">
        {presetAmounts.map((amount) => (
          <button
            key={amount}
            className={`preset-btn ${selectedAmount === amount ? 'active' : ''}`}
            onClick={() => handlePresetClick(amount)}
          >
            {currency}{amount.toLocaleString()}
          </button>
        ))}
      </div>

      <div className="custom-amount">
        <label htmlFor="custom-amount-input">Or enter custom amount</label>
        <div className="custom-input-wrapper">
          <span className="currency-symbol">{currency}</span>
          <input
            id="custom-amount-input"
            type="text"
            inputMode="numeric"
            placeholder="Enter amount"
            value={customAmount}
            onChange={handleCustomChange}
            maxLength="7"
          />
        </div>
        {customAmount && (
          <p className="amount-hint">
            {parseInt(customAmount) < minAmount && `Minimum amount is ${currency}${minAmount}`}
            {parseInt(customAmount) > maxAmount && `Maximum amount is ${currency}${maxAmount}`}
          </p>
        )}
      </div>

      {displayAmount && (
        <div className="amount-display">
          <p>You will purchase</p>
          <h2>{currency}{displayAmount.toLocaleString()}</h2>
        </div>
      )}
    </div>
  );
};

export default AmountSelector;
