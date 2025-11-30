import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ message = 'Processing...', size = 'medium' }) => {
  return (
    <div className={`loading-overlay loading-${size}`}>
      <div className="spinner-container">
        <div className="spinner"></div>
        <p className="loading-message">{message}</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;
