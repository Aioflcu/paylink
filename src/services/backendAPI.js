/**
 * Backend API Service
 * Handles all calls to the new backend endpoints
 */

import { auth } from '../firebase';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

/**
 * Get Firebase ID token for authentication
 */
const getToken = async () => {
  if (!auth.currentUser) {
    throw new Error('User not authenticated');
  }
  return await auth.currentUser.getIdToken();
};

/**
 * Get device ID (generate if not exists)
 */
const getDeviceId = () => {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
};

/**
 * Payment API Calls
 */
export const paymentAPI = {
  /**
   * Buy Airtime
   */
  buyAirtime: async (phone, amount, provider, pinHash = null) => {
    const token = await getToken();
    const response = await fetch(`${API_BASE_URL}/api/payments/airtime`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-device-id': getDeviceId()
      },
      body: JSON.stringify({
        phone,
        amount: parseInt(amount),
        provider,
        ...(pinHash && { pinHash })
      })
    });
    return handleResponse(response);
  },

  /**
   * Buy Data
   */
  buyData: async (phone, planId, provider, amount, pinHash = null) => {
    const token = await getToken();
    const response = await fetch(`${API_BASE_URL}/api/payments/data`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-device-id': getDeviceId()
      },
      body: JSON.stringify({
        phone,
        planId,
        provider,
        amount: parseInt(amount),
        ...(pinHash && { pinHash })
      })
    });
    return handleResponse(response);
  },

  /**
   * Pay Electricity
   */
  payElectricity: async (meterNumber, meterType, amount, disco, pinHash = null) => {
    const token = await getToken();
    const response = await fetch(`${API_BASE_URL}/api/payments/electricity`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-device-id': getDeviceId()
      },
      body: JSON.stringify({
        meterNumber,
        meterType,
        amount: parseInt(amount),
        disco,
        ...(pinHash && { pinHash })
      })
    });
    return handleResponse(response);
  },

  /**
   * Pay Cable TV
   */
  payCableTV: async (smartcardNumber, provider, planId, amount, pinHash = null) => {
    const token = await getToken();
    const response = await fetch(`${API_BASE_URL}/api/payments/cable`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-device-id': getDeviceId()
      },
      body: JSON.stringify({
        smartcardNumber,
        provider,
        planId,
        amount: parseInt(amount),
        ...(pinHash && { pinHash })
      })
    });
    return handleResponse(response);
  },

  /**
   * Buy Internet
   */
  buyInternet: async (customerId, provider, planId, amount, pinHash = null) => {
    const token = await getToken();
    const response = await fetch(`${API_BASE_URL}/api/payments/internet`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-device-id': getDeviceId()
      },
      body: JSON.stringify({
        customerId,
        provider,
        planId,
        amount: parseInt(amount),
        ...(pinHash && { pinHash })
      })
    });
    return handleResponse(response);
  },

  /**
   * Pay Education
   */
  payEducation: async (studentId, institution, amount, pinHash = null) => {
    const token = await getToken();
    const response = await fetch(`${API_BASE_URL}/api/payments/education`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-device-id': getDeviceId()
      },
      body: JSON.stringify({
        studentId,
        institution,
        amount: parseInt(amount),
        ...(pinHash && { pinHash })
      })
    });
    return handleResponse(response);
  },

  /**
   * Pay Insurance
   */
  payInsurance: async (policyNumber, provider, amount, pinHash = null) => {
    const token = await getToken();
    const response = await fetch(`${API_BASE_URL}/api/payments/insurance`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-device-id': getDeviceId()
      },
      body: JSON.stringify({
        policyNumber,
        provider,
        amount: parseInt(amount),
        ...(pinHash && { pinHash })
      })
    });
    return handleResponse(response);
  },

  /**
   * Buy Gift Card
   */
  buyGiftCard: async (giftCardCode, provider, amount, pinHash = null) => {
    const token = await getToken();
    const response = await fetch(`${API_BASE_URL}/api/payments/giftcard`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-device-id': getDeviceId()
      },
      body: JSON.stringify({
        giftCardCode,
        provider,
        amount: parseInt(amount),
        ...(pinHash && { pinHash })
      })
    });
    return handleResponse(response);
  },

  /**
   * Pay Tax
   */
  payTax: async (taxType, taxId, amount, authority, pinHash = null) => {
    const token = await getToken();
    const response = await fetch(`${API_BASE_URL}/api/payments/tax`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-device-id': getDeviceId()
      },
      body: JSON.stringify({
        taxType,
        taxId,
        amount: parseInt(amount),
        authority,
        ...(pinHash && { pinHash })
      })
    });
    return handleResponse(response);
  },

  /**
   * Get Transaction History
   */
  getHistory: async (limit = 50, type = null) => {
    const token = await getToken();
    const query = new URLSearchParams({ limit });
    if (type) query.append('type', type);
    
    const response = await fetch(`${API_BASE_URL}/api/payments/history?${query}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-device-id': getDeviceId()
      }
    });
    return handleResponse(response);
  },

  /**
   * Get Transaction Stats
   */
  getStats: async () => {
    const token = await getToken();
    const response = await fetch(`${API_BASE_URL}/api/payments/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-device-id': getDeviceId()
      }
    });
    return handleResponse(response);
  }
};

/**
 * Security API Calls
 */
export const securityAPI = {
  /**
   * Set Transaction PIN
   */
  setPin: async (pin) => {
    const token = await getToken();
    const response = await fetch(`${API_BASE_URL}/api/security/set-pin`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-device-id': getDeviceId()
      },
      body: JSON.stringify({ pin })
    });
    return handleResponse(response);
  },

  /**
   * Check PIN Status
   */
  checkPinStatus: async () => {
    const token = await getToken();
    const response = await fetch(`${API_BASE_URL}/api/security/pin-status`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-device-id': getDeviceId()
      }
    });
    return handleResponse(response);
  },

  /**
   * Change Password
   */
  changePassword: async (currentPassword, newPassword) => {
    const token = await getToken();
    const response = await fetch(`${API_BASE_URL}/api/security/change-password`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-device-id': getDeviceId()
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    return handleResponse(response);
  },

  /**
   * Enable 2FA
   */
  enable2FA: async () => {
    const token = await getToken();
    const response = await fetch(`${API_BASE_URL}/api/security/enable-2fa`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-device-id': getDeviceId()
      }
    });
    return handleResponse(response);
  },

  /**
   * Disable 2FA
   */
  disable2FA: async (pin) => {
    const token = await getToken();
    const response = await fetch(`${API_BASE_URL}/api/security/disable-2fa`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-device-id': getDeviceId()
      },
      body: JSON.stringify({ pin })
    });
    return handleResponse(response);
  },

  /**
   * Get 2FA Status
   */
  get2FAStatus: async () => {
    const token = await getToken();
    const response = await fetch(`${API_BASE_URL}/api/security/2fa-status`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-device-id': getDeviceId()
      }
    });
    return handleResponse(response);
  },

  /**
   * Get Login History
   */
  getLoginHistory: async (limit = 50) => {
    const token = await getToken();
    const response = await fetch(`${API_BASE_URL}/api/security/login-history?limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-device-id': getDeviceId()
      }
    });
    return handleResponse(response);
  },

  /**
   * Get Devices
   */
  getDevices: async () => {
    const token = await getToken();
    const response = await fetch(`${API_BASE_URL}/api/security/devices`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-device-id': getDeviceId()
      }
    });
    return handleResponse(response);
  },

  /**
   * Remove Device
   */
  removeDevice: async (deviceId) => {
    const token = await getToken();
    const response = await fetch(`${API_BASE_URL}/api/security/devices/${deviceId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-device-id': getDeviceId()
      }
    });
    return handleResponse(response);
  }
};

/**
 * Wallet API Calls
 */
export const walletAPI = {
  /**
   * Get Wallet Balance
   */
  getBalance: async () => {
    const token = await getToken();
    const response = await fetch(`${API_BASE_URL}/api/wallet/balance`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-device-id': getDeviceId()
      }
    });
    return handleResponse(response);
  },

  /**
   * Get Wallet Stats
   */
  getStats: async () => {
    const token = await getToken();
    const response = await fetch(`${API_BASE_URL}/api/wallet/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-device-id': getDeviceId()
      }
    });
    return handleResponse(response);
  },

  /**
   * Get Wallet Transactions
   */
  getTransactions: async (limit = 50, type = null) => {
    const token = await getToken();
    const query = new URLSearchParams({ limit });
    if (type) query.append('type', type);
    
    const response = await fetch(`${API_BASE_URL}/api/wallet/transactions?${query}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-device-id': getDeviceId()
      }
    });
    return handleResponse(response);
  },

  /**
   * Deposit Funds
   */
  deposit: async (amount, paymentMethod, reference = null) => {
    const token = await getToken();
    const response = await fetch(`${API_BASE_URL}/api/wallet/deposit`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-device-id': getDeviceId()
      },
      body: JSON.stringify({
        amount: parseInt(amount),
        paymentMethod,
        ...(reference && { reference })
      })
    });
    return handleResponse(response);
  },

  /**
   * Withdraw Funds
   */
  withdraw: async (amount, bankAccount, pin) => {
    const token = await getToken();
    const response = await fetch(`${API_BASE_URL}/api/wallet/withdraw`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-device-id': getDeviceId()
      },
      body: JSON.stringify({
        amount: parseInt(amount),
        bankAccount,
        pin
      })
    });
    return handleResponse(response);
  },

  /**
   * Verify Withdrawal Status
   */
  verifyWithdrawal: async (transactionId) => {
    const token = await getToken();
    const response = await fetch(`${API_BASE_URL}/api/wallet/withdraw/${transactionId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-device-id': getDeviceId()
      }
    });
    return handleResponse(response);
  }
};

/**
 * PayFlex Proxy API Calls (Public endpoints - no auth)
 */
export const payflexAPI = {
  /**
   * Get Providers for Service Type
   */
  getProviders: async (serviceType) => {
    const response = await fetch(`${API_BASE_URL}/api/payflex-proxy/providers/${serviceType}`);
    return handleResponse(response);
  },

  /**
   * Get Plans for Provider
   */
  getPlans: async (serviceType, providerCode) => {
    const query = new URLSearchParams({
      serviceType,
      providerCode
    });
    const response = await fetch(`${API_BASE_URL}/api/payflex-proxy/plans?${query}`);
    return handleResponse(response);
  },

  /**
   * Search Providers
   */
  searchProviders: async (serviceType, query) => {
    const params = new URLSearchParams({
      serviceType,
      query
    });
    const response = await fetch(`${API_BASE_URL}/api/payflex-proxy/search?${params}`);
    return handleResponse(response);
  }
};

/**
 * Handle API responses
 */
const handleResponse = async (response) => {
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.error || data.message || 'API Error');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

export default {
  paymentAPI,
  securityAPI,
  walletAPI,
  payflexAPI
};
