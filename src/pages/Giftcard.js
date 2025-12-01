import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymentAPI } from '../services/backendAPI';
import './Giftcard.css';

const Giftcard = () => {
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedAmount, setSelectedAmount] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const providers = [
    { id: 'amazon', name: 'Amazon', logo: '🛒', description: 'Amazon Gift Cards' },
    { id: 'google-play', name: 'Google Play', logo: '🎮', description: 'Google Play Gift Cards' },
    { id: 'itunes', name: 'iTunes', logo: '🎵', description: 'Apple iTunes Gift Cards' },
    { id: 'steam', name: 'Steam', logo: '🎯', description: 'Steam Gift Cards' },
    { id: 'netflix', name: 'Netflix', logo: '📺', description: 'Netflix Gift Cards' },
    { id: 'spotify', name: 'Spotify', logo: '🎧', description: 'Spotify Gift Cards' },
    { id: 'playstation', name: 'PlayStation', logo: '🎮', description: 'PlayStation Store Gift Cards' },
    { id: 'xbox', name: 'Xbox', logo: '🎮', description: 'Xbox Gift Cards' }
  ];

  const amounts = ['1000', '2500', '5000', '10000', '25000', '50000'];

  const handlePurchase = async () => {
    if (!selectedProvider || !selectedAmount || !recipientEmail || !recipientName) {
      alert('Please fill in all required fields');
      return;
    }

    const amount = customAmount || selectedAmount;

    setLoading(true);
    try {
      // Call backend payment API
      const result = await paymentAPI.buyGiftCard(
        selectedProvider,
        parseFloat(amount)
      );

      if (result.success) {
        navigate('/success', {
          state: {
            transactionId: result.transactionId,
            type: 'giftcard',
            provider: providers.find(p => p.id === selectedProvider),
            amount: parseFloat(amount),
            recipientEmail,
            recipientName,
            message,
            fee: result.fee || 0,
            rewardPoints: result.rewardPoints || 0
          }
        });
      }
    } catch (error) {
      console.error('Payment error:', error);
      
      // Check if PIN is required
      if (error.status === 403 && error.data?.requiresPin) {
        navigate('/pin', {
          state: {
            type: 'giftcard',
            provider: providers.find(p => p.id === selectedProvider)?.name,
            amount: parseFloat(amount),
            description: `Gift Card - ${providers.find(p => p.id === selectedProvider)?.name} - ₦${parseFloat(amount).toLocaleString()}`,
            onPinVerified: async (pinHash) => {
              const pinResult = await paymentAPI.buyGiftCard(
                selectedProvider,
                parseFloat(amount),
                pinHash
              );
              return pinResult;
            }
          }
        });
      } else {
        alert(error.data?.error || 'Purchase failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="giftcard-page">
      <div className="page-header">
        <h1>Gift Cards</h1>
        <p>Send digital gift cards to friends and family</p>
      </div>

      <div className="giftcard-content">
        <div className="provider-selection">
          <h2>Select Gift Card Provider</h2>
          <div className="providers-grid">
            {providers.map((provider) => (
              <div
                key={provider.id}
                className={`provider-card ${selectedProvider === provider.id ? 'selected' : ''}`}
                onClick={() => setSelectedProvider(provider.id)}
              >
                <div className="provider-logo">{provider.logo}</div>
                <h3>{provider.name}</h3>
                <p>{provider.description}</p>
              </div>
            ))}
          </div>
        </div>

        {selectedProvider && (
          <div className="amount-selection">
            <h2>Select Gift Card Amount</h2>
            <div className="amounts-grid">
              {amounts.map((amount) => (
                <button
                  key={amount}
                  className={`amount-btn ${selectedAmount === amount ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedAmount(amount);
                    setCustomAmount('');
                  }}
                >
                  ₦{parseInt(amount).toLocaleString()}
                </button>
              ))}
            </div>

            <div className="custom-amount">
              <label>Or enter custom amount:</label>
              <input
                type="number"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setSelectedAmount('');
                }}
                placeholder="Enter gift card amount"
                min="500"
                step="100"
              />
            </div>
          </div>
        )}

        {(selectedAmount || customAmount) && (
          <div className="recipient-details">
            <h2>Recipient Details</h2>
            <div className="details-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Recipient Name *</label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Enter recipient's full name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Recipient Email *</label>
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="Enter recipient's email address"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Personal Message (Optional)</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add a personal message to your gift card..."
                  rows="4"
                  maxLength="500"
                />
                <small className="char-count">{message.length}/500 characters</small>
              </div>
            </div>
          </div>
        )}

        <div className="preview-section">
          {(selectedAmount || customAmount) && recipientName && recipientEmail && (
            <div className="giftcard-preview">
              <h3>Gift Card Preview</h3>
              <div className="preview-card">
                <div className="preview-header">
                  <div className="provider-info">
                    <span className="provider-logo">
                      {providers.find(p => p.id === selectedProvider)?.logo}
                    </span>
                    <span className="provider-name">
                      {providers.find(p => p.id === selectedProvider)?.name}
                    </span>
                  </div>
                  <div className="amount-display">
                    ₦{(customAmount || selectedAmount).toLocaleString()}
                  </div>
                </div>
                <div className="preview-body">
                  <p className="to-text">To: {recipientName}</p>
                  {message && (
                    <p className="message-text">"{message}"</p>
                  )}
                  <p className="from-text">From: You</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="purchase-section">
          <button
            className="purchase-btn"
            onClick={handlePurchase}
            disabled={!selectedProvider || !(selectedAmount || customAmount) || !recipientEmail || !recipientName || loading}
          >
            {loading ? 'Processing...' : 'Purchase Gift Card'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Giftcard;
