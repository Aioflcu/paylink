/**
 * PayFlex API Integration Service
 * Handles all utility bill payments (airtime, data, electricity, cable TV, internet, etc.)
 */

import { db } from '../firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

class PayFlexService {
  constructor() {
    // Use backend proxy (http://localhost:5000) instead of direct API calls for CORS safety
    this.backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
    // Fallback to direct PayFlex if backend unavailable
    this.apiUrl = process.env.REACT_APP_PAYFLEX_API_URL || 'https://api.payflex.co';
    this.apiKey = process.env.REACT_APP_PAYFLEX_API_KEY;
  }

  /**
   * Get available providers for a utility type
   * @param {string} utilityType - Type of utility (airtime, data, electricity, etc.)
   * @returns {Promise<array>} List of available providers
   */
  async getProviders(utilityType) {
    try {
      // Try backend first
      const backendResponse = await fetch(`${this.backendUrl}/api/payflex/providers/${utilityType}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (backendResponse.ok) {
        const data = await backendResponse.json();
        console.log('[PayFlex] Backend providers response:', data);
        
        // Handle various response structures
        const providers = Array.isArray(data) ? data : (data.data || data.providers || []);
        console.log('[PayFlex] Extracted providers array:', providers);
        return providers;
      }

      // Fallback to direct API
      console.warn('[PayFlex] Backend unavailable, falling back to direct API for providers');
      const response = await fetch(`${this.apiUrl}/providers/${utilityType}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`PayFlex API returned ${response.status}`);
      }

      const data = await response.json();
      console.log('[PayFlex] Direct API providers response:', data);
      
      const providers = Array.isArray(data) ? data : (data.data || data.providers || []);
      console.log('[PayFlex] Extracted providers array:', providers);
      return providers;
    } catch (error) {
      console.error('[PayFlex] Error fetching providers:', error);
      return []; // Return empty array so fallback is used
    }
  }

  /**
   * Get available data plans for a provider
   * @param {string} provider - Provider ID (e.g., 'mtn', 'airtel')
   * @returns {Promise<array>} List of available plans
   */
  async getDataPlans(provider) {
    try {
      // Try backend first
      const backendResponse = await fetch(`${this.backendUrl}/api/payflex/plans/data/${provider}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (backendResponse.ok) {
        const data = await backendResponse.json();
        console.log('[PayFlex] Backend response:', data);
        
        // Handle various response structures from PayFlex
        const plans = Array.isArray(data) ? data : (data.data || data.plans || []);
        console.log('[PayFlex] Extracted plans array:', plans);
        return plans;
      }

      // Fallback to direct API
      console.warn('[PayFlex] Backend unavailable, falling back to direct API');
      const response = await fetch(`${this.apiUrl}/plans/data/${provider}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`PayFlex API returned ${response.status}`);
      }

      const data = await response.json();
      console.log('[PayFlex] Direct API response:', data);
      
      const plans = Array.isArray(data) ? data : (data.data || data.plans || []);
      console.log('[PayFlex] Extracted plans array:', plans);
      return plans;
    } catch (error) {
      console.error('[PayFlex] Error fetching data plans:', error);
      return []; // Return empty array so fallback is used
    }
  }

  /**
   * Validate a phone number
   * @param {string} phoneNumber - Phone number to validate
   * @param {string} provider - Provider ID
   * @returns {Promise<boolean>} Validation result
   */
  async validatePhoneNumber(phoneNumber, provider) {
    try {
      const response = await fetch(`${this.apiUrl}/validate/phone`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: phoneNumber,
          provider
        })
      });

      if (!response.ok) {
        throw new Error('Failed to validate phone number');
      }

      const data = await response.json();
      return data.data.valid || false;
    } catch (error) {
      console.error('Error validating phone number:', error);
      return false;
    }
  }

  /**
   * Validate a meter number for electricity
   * @param {string} meterNumber - Meter number to validate
   * @param {string} disco - Electricity provider ID
   * @param {string} meterType - Type of meter (prepaid/postpaid)
   * @returns {Promise<object>} Customer details if valid
   */
  async validateMeterNumber(meterNumber, disco, meterType) {
    try {
      const response = await fetch(`${this.apiUrl}/validate/meter`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          meter_number: meterNumber,
          disco,
          meter_type: meterType
        })
      });

      if (!response.ok) {
        throw new Error('Failed to validate meter number');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error validating meter number:', error);
      throw error;
    }
  }

  /**
   * Validate a smartcard number for cable TV
   * @param {string} smartcardNumber - Smartcard number to validate
   * @param {string} provider - Cable provider ID
   * @returns {Promise<object>} Customer details if valid
   */
  async validateSmartcard(smartcardNumber, provider) {
    try {
      const response = await fetch(`${this.apiUrl}/validate/smartcard`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          smartcard_number: smartcardNumber,
          provider
        })
      });

      if (!response.ok) {
        throw new Error('Failed to validate smartcard');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error validating smartcard:', error);
      throw error;
    }
  }

  /**
   * Purchase airtime
   * @param {object} purchaseDetails - Details of the purchase
   * @returns {Promise<object>} Purchase confirmation
   */
  async buyAirtime(purchaseDetails) {
    try {
      const {
        phoneNumber,
        provider,
        amount,
        userId
      } = purchaseDetails;

      const response = await fetch(`${this.apiUrl}/topup/airtime`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: phoneNumber,
          provider,
          amount
        })
      });

      if (!response.ok) {
        throw new Error('Failed to purchase airtime');
      }

      const data = await response.json();

      // Record transaction in Firestore
      await this.recordTransaction(userId, {
        category: 'Airtime',
        provider,
        amount,
        reference: data.data.reference,
        status: data.data.status,
        details: `Airtime - ${provider.toUpperCase()} - ₦${amount}`
      });

      return data.data;
    } catch (error) {
      console.error('Airtime purchase error:', error);
      throw error;
    }
  }

  /**
   * Purchase data bundle
   * @param {object} purchaseDetails - Details of the purchase
   * @returns {Promise<object>} Purchase confirmation
   */
  async buyData(purchaseDetails) {
    try {
      const {
        phoneNumber,
        provider,
        planId,
        amount,
        userId
      } = purchaseDetails;

      const response = await fetch(`${this.apiUrl}/topup/data`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: phoneNumber,
          provider,
          plan_id: planId,
          amount
        })
      });

      if (!response.ok) {
        throw new Error('Failed to purchase data');
      }

      const data = await response.json();

      // Record transaction
      await this.recordTransaction(userId, {
        category: 'Data',
        provider,
        amount,
        reference: data.data.reference,
        status: data.data.status,
        details: `Data Bundle - ${provider.toUpperCase()} - ₦${amount}`
      });

      return data.data;
    } catch (error) {
      console.error('Data purchase error:', error);
      throw error;
    }
  }

  /**
   * Pay electricity bill
   * @param {object} purchaseDetails - Details of the purchase
   * @returns {Promise<object>} Payment confirmation
   */
  async payElectricity(purchaseDetails) {
    try {
      const {
        meterNumber,
        disco,
        meterType,
        amount,
        userId
      } = purchaseDetails;

      const response = await fetch(`${this.apiUrl}/bills/electricity`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          meter_number: meterNumber,
          disco,
          meter_type: meterType,
          amount
        })
      });

      if (!response.ok) {
        throw new Error('Failed to pay electricity bill');
      }

      const data = await response.json();

      // Record transaction
      await this.recordTransaction(userId, {
        category: 'Electricity',
        provider: disco,
        amount,
        reference: data.data.reference,
        status: data.data.status,
        details: `Electricity - ${disco.toUpperCase()} - Meter: ${meterNumber}`
      });

      return data.data;
    } catch (error) {
      console.error('Electricity payment error:', error);
      throw error;
    }
  }

  /**
   * Pay cable TV subscription
   * @param {object} purchaseDetails - Details of the purchase
   * @returns {Promise<object>} Payment confirmation
   */
  async payCableTV(purchaseDetails) {
    try {
      const {
        smartcardNumber,
        provider,
        amount,
        userId
      } = purchaseDetails;

      const response = await fetch(`${this.apiUrl}/bills/cabletv`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          smartcard_number: smartcardNumber,
          provider,
          amount
        })
      });

      if (!response.ok) {
        throw new Error('Failed to pay cable TV bill');
      }

      const data = await response.json();

      // Record transaction
      await this.recordTransaction(userId, {
        category: 'Cable TV',
        provider,
        amount,
        reference: data.data.reference,
        status: data.data.status,
        details: `Cable TV - ${provider.toUpperCase()} - Card: ${smartcardNumber}`
      });

      return data.data;
    } catch (error) {
      console.error('Cable TV payment error:', error);
      throw error;
    }
  }

  /**
   * Pay internet bill
   * @param {object} purchaseDetails - Details of the purchase
   * @returns {Promise<object>} Payment confirmation
   */
  async payInternet(purchaseDetails) {
    try {
      const {
        provider,
        amount,
        userId,
        accountNumber = ''
      } = purchaseDetails;

      const response = await fetch(`${this.apiUrl}/bills/internet`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider,
          amount,
          account_number: accountNumber
        })
      });

      if (!response.ok) {
        throw new Error('Failed to pay internet bill');
      }

      const data = await response.json();

      // Record transaction
      await this.recordTransaction(userId, {
        category: 'Internet',
        provider,
        amount,
        reference: data.data.reference,
        status: data.data.status,
        details: `Internet - ${provider.toUpperCase()} - ₦${amount}`
      });

      return data.data;
    } catch (error) {
      console.error('Internet payment error:', error);
      throw error;
    }
  }

  /**
   * Record transaction in Firestore
   * @param {string} userId - User ID
   * @param {object} transactionData - Transaction details
   * @returns {Promise<string>} Transaction document ID
   */
  async recordTransaction(userId, transactionData) {
    try {
      const docRef = await addDoc(collection(db, 'transactions'), {
        userId,
        type: 'debit',
        timestamp: Timestamp.now(),
        ...transactionData
      });
      return docRef.id;
    } catch (error) {
      console.error('Error recording transaction:', error);
      throw error;
    }
  }

  /**
   * Get transaction history for utilities
   * @param {string} userId - User ID
   * @param {string} category - Transaction category (optional)
   * @returns {Promise<array>} Transaction history
   */
  async getTransactionHistory(userId, category = null) {
    try {
      // This would be implemented with Firestore queries
      // For now, return empty array (actual implementation in utils/transactionService.js)
      return [];
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default new PayFlexService();
