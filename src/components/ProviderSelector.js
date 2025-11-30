import React from 'react';
import './ProviderSelector.css';

const ProviderSelector = ({ providers, onSelect, selectedProvider }) => {
  return (
    <div className="provider-selector">
      <h3>Select Provider</h3>
      <div className="providers-grid">
        {providers.map((provider) => (
          <div
            key={provider.id}
            className={`provider-card ${selectedProvider?.id === provider.id ? 'active' : ''}`}
            onClick={() => onSelect(provider)}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onSelect(provider);
              }
            }}
          >
            <div className="provider-icon">
              {provider.icon ? (
                <img src={provider.icon} alt={provider.name} />
              ) : (
                <span>{provider.name.charAt(0)}</span>
              )}
            </div>
            <div className="provider-name">{provider.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProviderSelector;
