import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import receiptService from '../services/receiptService';
import './Success.css';

const Success = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const transactionData = location.state?.transactionData || location.state || {};
  const { type, provider, amount, phoneNumber, meterNumber, meterType, disco, smartCardNumber, plan, accountNumber, transactionId, reference, message } = transactionData;

  const handleDownloadReceipt = () => {
    // Simulate receipt download
    alert('Receipt downloaded successfully!');
  };

  const handleShareReceipt = () => {
    // Simulate receipt sharing
    alert('Receipt shared successfully!');
  };

  const handleNewTransaction = () => {
    navigate('/dashboard');
  };

  return (
    <div className="success-page">
      <div className="success-icon">✓</div>
      <h1>Transaction Successful!</h1>
      <div className="transaction-details">
        <h2>Transaction Details</h2>
        <div className="details-grid">
          <div className="detail-item">
            <span className="label">Type:</span>
            <span className="value">{type}</span>
          </div>
          <div className="detail-item">
            <span className="label">Provider:</span>
            <span className="value">{provider}</span>
          </div>
          {amount && (
            <div className="detail-item">
              <span className="label">Amount:</span>
              <span className="value">₦{amount}</span>
            </div>
          )}
          {phoneNumber && (
            <div className="detail-item">
              <span className="label">Phone:</span>
              <span className="value">{phoneNumber}</span>
            </div>
          )}
          {meterNumber && (
            <div className="detail-item">
              <span className="label">Meter Number:</span>
              <span className="value">{meterNumber}</span>
            </div>
          )}
          {meterType && (
            <div className="detail-item">
              <span className="label">Meter Type:</span>
              <span className="value">{meterType}</span>
            </div>
          )}
          {disco && (
            <div className="detail-item">
              <span className="label">Disco:</span>
              <span className="value">{disco}</span>
            </div>
          )}
          {smartCardNumber && (
            <div className="detail-item">
              <span className="label">Smart Card:</span>
              <span className="value">{smartCardNumber}</span>
            </div>
          )}
          {plan && (
            <div className="detail-item">
              <span className="label">Plan:</span>
              <span className="value">{plan}</span>
            </div>
          )}
          {accountNumber && (
            <div className="detail-item">
              <span className="label">Account:</span>
              <span className="value">{accountNumber}</span>
            </div>
          )}
          {reference && (
            <div className="detail-item">
              <span className="label">Reference:</span>
              <span className="value">{reference}</span>
            </div>
          )}
          <div className="detail-item">
            <span className="label">Date:</span>
            <span className="value">{new Date().toLocaleString()}</span>
          </div>
          {message && (
            <div className="detail-item">
              <span className="label">Status:</span>
              <span className="value">{message}</span>
            </div>
          )}
        </div>
      </div>
      <div className="action-buttons">
        <button onClick={handleDownloadReceipt} className="download-btn">Download Receipt</button>
        <button onClick={handleShareReceipt} className="share-btn">Share Receipt</button>
        <button onClick={handleNewTransaction} className="new-transaction-btn">New Transaction</button>
      </div>
    </div>
  );
};

export default Success;
