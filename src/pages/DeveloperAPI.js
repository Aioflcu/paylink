import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp, limit } from 'firebase/firestore';
import CryptoJS from 'crypto-js';
import './DeveloperAPI.css';

const DeveloperAPI = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [apiKeys, setApiKeys] = useState([]);
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [usage, setUsage] = useState({
    totalRequests: 0,
    requestsThisMonth: 0,
    averageResponseTime: 145,
    successRate: 99.8
  });

  const API_LIMITS = {
    free: { requestsPerDay: 1000, rateLimit: '10 req/sec' },
    pro: { requestsPerDay: 50000, rateLimit: '100 req/sec' },
    enterprise: { requestsPerDay: 'Unlimited', rateLimit: '1000 req/sec' }
  };

  const API_ENDPOINTS = [
    {
      method: 'POST',
      path: '/api/transactions',
      description: 'Create a new transaction',
      rateLimit: '100 req/min'
    },
    {
      method: 'GET',
      path: '/api/transactions/:id',
      description: 'Get transaction details',
      rateLimit: '1000 req/min'
    },
    {
      method: 'GET',
      path: '/api/wallet/balance',
      description: 'Get wallet balance',
      rateLimit: '1000 req/min'
    },
    {
      method: 'POST',
      path: '/api/airtime/purchase',
      description: 'Purchase airtime',
      rateLimit: '100 req/min'
    },
    {
      method: 'POST',
      path: '/api/data/purchase',
      description: 'Purchase data bundle',
      rateLimit: '100 req/min'
    },
    {
      method: 'GET',
      path: '/api/beneficiaries',
      description: 'List beneficiaries',
      rateLimit: '1000 req/min'
    }
  ];

  useEffect(() => {
    if (currentUser) {
      loadAPIKeys();
      loadUsage();
    }
  }, [currentUser]);

  const loadAPIKeys = async () => {
    try {
      if (currentUser) {
        const keysRef = query(
          collection(db, 'apiKeys'),
          where('userId', '==', currentUser.uid)
        );
        const keyDocs = await getDocs(keysRef);
        const keys = keyDocs.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()
        }));
        setApiKeys(keys);
      }
    } catch (error) {
      console.error('Error loading API keys:', error);
    }
  };

  const loadUsage = async () => {
    try {
      // Simulated usage data - would come from actual API tracking
      setUsage({
        totalRequests: Math.floor(Math.random() * 100000),
        requestsThisMonth: Math.floor(Math.random() * 50000),
        averageResponseTime: Math.floor(Math.random() * 200) + 50,
        successRate: (98 + Math.random() * 2).toFixed(1)
      });
    } catch (error) {
      console.error('Error loading usage:', error);
    }
  };

  const generateAPIKey = async () => {
    if (!keyName.trim()) {
      alert('Please enter a name for the API key');
      return;
    }

    setLoading(true);
    try {
      const key = this.generateRandomKey();
      const keyHash = this.hashKey(key);

      await addDoc(collection(db, 'apiKeys'), {
        userId: currentUser.uid,
        name: keyName,
        keyHash: keyHash,
        keyDisplay: `${key.substring(0, 8)}...${key.substring(key.length - 4)}`,
        status: 'active',
        tier: 'free',
        requestsThisMonth: 0,
        totalRequests: 0,
        createdAt: serverTimestamp()
      });

      setKeyName('');
      setShowKeyForm(false);
      loadAPIKeys();

      // Show the full key once
      alert(`API Key: ${key}\n\nSave this key securely. You won't be able to see it again!`);
    } catch (error) {
      console.error('Error generating API key:', error);
      alert('Failed to generate API key');
    } finally {
      setLoading(false);
    }
  };

  const generateRandomKey = () => {
    return 'pk_' + Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  };

  const hashKey = (key) => {
    // Use crypto-js for hashing
    return CryptoJS.SHA256(key).toString();
  };

  const deleteAPIKey = async (keyId) => {
    if (!window.confirm('Are you sure you want to delete this API key?')) return;

    try {
      setLoading(true);
      await deleteDoc(doc(db, 'apiKeys', keyId));
      loadAPIKeys();
      alert('API key deleted successfully');
    } catch (error) {
      console.error('Error deleting API key:', error);
      alert('Failed to delete API key');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, keyId) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="developer-api-page">
      <div className="dev-header">
        <h1>🚀 Developer API</h1>
        <p>Integrate PayLink payments into your application</p>
      </div>

      <div className="dev-content">
        {/* Tab Navigation */}
        <div className="dev-tabs">
          <button
            className={`dev-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`dev-tab ${activeTab === 'keys' ? 'active' : ''}`}
            onClick={() => setActiveTab('keys')}
          >
            API Keys
          </button>
          <button
            className={`dev-tab ${activeTab === 'docs' ? 'active' : ''}`}
            onClick={() => setActiveTab('docs')}
          >
            Documentation
          </button>
          <button
            className={`dev-tab ${activeTab === 'usage' ? 'active' : ''}`}
            onClick={() => setActiveTab('usage')}
          >
            Usage
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="dev-section">
            <h2>Welcome to PayLink Developer API</h2>
            <p className="intro-text">
              Build powerful payment applications with our comprehensive API. 
              Process airtime, data, electricity, and more with ease.
            </p>

            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">🔐</div>
                <h3>Secure</h3>
                <p>Industry-standard encryption and security protocols</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">⚡</div>
                <h3>Fast</h3>
                <p>Ultra-fast response times, optimized for performance</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">📊</div>
                <h3>Reliable</h3>
                <p>99.9% uptime guarantee with redundant infrastructure</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">🌍</div>
                <h3>Global</h3>
                <p>Support for multiple countries and payment methods</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">📱</div>
                <h3>Easy to Use</h3>
                <p>Simple REST API with comprehensive documentation</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">💬</div>
                <h3>Support</h3>
                <p>24/7 developer support and active community</p>
              </div>
            </div>

            <div className="quick-start">
              <h3>Quick Start</h3>
              <ol>
                <li>Create an API key from the "API Keys" section</li>
                <li>Review the documentation and endpoints</li>
                <li>Make your first API request</li>
                <li>Handle responses and errors</li>
              </ol>
            </div>
          </div>
        )}

        {/* API Keys Tab */}
        {activeTab === 'keys' && (
          <div className="dev-section">
            <div className="keys-header">
              <h2>API Keys</h2>
              <button
                className="create-key-btn"
                onClick={() => setShowKeyForm(!showKeyForm)}
              >
                + Create New Key
              </button>
            </div>

            {showKeyForm && (
              <div className="key-form">
                <input
                  type="text"
                  placeholder="Enter key name (e.g., Production, Development)"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  className="key-input"
                />
                <div className="form-actions">
                  <button
                    className="cancel-btn"
                    onClick={() => setShowKeyForm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="generate-btn"
                    onClick={generateAPIKey}
                    disabled={loading}
                  >
                    {loading ? 'Generating...' : 'Generate Key'}
                  </button>
                </div>
              </div>
            )}

            {apiKeys.length > 0 ? (
              <div className="keys-list">
                {apiKeys.map(key => (
                  <div key={key.id} className="key-item">
                    <div className="key-info">
                      <div className="key-name">{key.name}</div>
                      <div className="key-display">
                        <code>{key.keyDisplay}</code>
                        <button
                          className="copy-btn"
                          onClick={() => copyToClipboard(key.keyDisplay, key.id)}
                        >
                          {copiedKey === key.id ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                      <div className="key-meta">
                        <span className="key-status active">● Active</span>
                        <span className="key-created">
                          Created {key.createdAt?.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <button
                      className="delete-key-btn"
                      onClick={() => deleteAPIKey(key.id)}
                      disabled={loading}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No API keys yet. Create one to get started!</p>
              </div>
            )}
          </div>
        )}

        {/* Documentation Tab */}
        {activeTab === 'docs' && (
          <div className="dev-section">
            <h2>API Documentation</h2>

            <div className="doc-section">
              <h3>Base URL</h3>
              <code className="code-block">https://api.paylink.com/v1</code>
            </div>

            <div className="doc-section">
              <h3>Authentication</h3>
              <p>Include your API key in the request header:</p>
              <code className="code-block">Authorization: Bearer YOUR_API_KEY</code>
            </div>

            <div className="doc-section">
              <h3>Endpoints</h3>
              <div className="endpoints-list">
                {API_ENDPOINTS.map((endpoint, idx) => (
                  <div key={idx} className="endpoint-item">
                    <div className="endpoint-method" data-method={endpoint.method}>
                      {endpoint.method}
                    </div>
                    <div className="endpoint-info">
                      <p className="endpoint-path"><code>{endpoint.path}</code></p>
                      <p className="endpoint-desc">{endpoint.description}</p>
                      <p className="endpoint-limit">Rate: {endpoint.rateLimit}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="doc-section">
              <h3>Response Format</h3>
              <code className="code-block">{`{
  "success": true,
  "data": { ... },
  "message": "Operation successful",
  "timestamp": "2025-11-20T10:30:00Z"
}`}</code>
            </div>

            <div className="doc-section">
              <h3>Error Handling</h3>
              <code className="code-block">{`{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Invalid API key"
  },
  "timestamp": "2025-11-20T10:30:00Z"
}`}</code>
            </div>
          </div>
        )}

        {/* Usage Tab */}
        {activeTab === 'usage' && (
          <div className="dev-section">
            <h2>API Usage</h2>

            <div className="usage-grid">
              <div className="usage-card">
                <div className="usage-icon">📊</div>
                <p className="usage-label">Total Requests</p>
                <p className="usage-value">{usage.totalRequests.toLocaleString()}</p>
              </div>

              <div className="usage-card">
                <div className="usage-icon">📈</div>
                <p className="usage-label">This Month</p>
                <p className="usage-value">{usage.requestsThisMonth.toLocaleString()}</p>
              </div>

              <div className="usage-card">
                <div className="usage-icon">⚡</div>
                <p className="usage-label">Avg Response Time</p>
                <p className="usage-value">{usage.averageResponseTime}ms</p>
              </div>

              <div className="usage-card">
                <div className="usage-icon">✓</div>
                <p className="usage-label">Success Rate</p>
                <p className="usage-value">{usage.successRate}%</p>
              </div>
            </div>

            <div className="plans-section">
              <h3>Available Plans</h3>
              <div className="plans-grid">
                {Object.entries(API_LIMITS).map(([plan, limits]) => (
                  <div key={plan} className="plan-card">
                    <h4>{plan.charAt(0).toUpperCase() + plan.slice(1)}</h4>
                    <ul className="plan-features">
                      <li>
                        <span className="check">✓</span>
                        Requests/Day: {limits.requestsPerDay}
                      </li>
                      <li>
                        <span className="check">✓</span>
                        Rate Limit: {limits.rateLimit}
                      </li>
                      <li>
                        <span className="check">✓</span>
                        Priority Support
                      </li>
                    </ul>
                    <button className="upgrade-btn">
                      {plan === 'free' ? 'Current Plan' : 'Upgrade'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeveloperAPI;
