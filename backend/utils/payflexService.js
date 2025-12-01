/**
 * PayFlex API Integration
 * Handles all communication with PayFlex API for bills, airtime, data, and other services
 */

const axios = require('axios');

const PAYFLEX_BASE_URL = process.env.PAYFLEX_API_URL || 'https://api.onepipe.io/api/v1/services';
const PAYFLEX_API_KEY = process.env.PAYFLEX_API_KEY;

class PayFlexService {
  constructor() {
    this.client = axios.create({
      baseURL: PAYFLEX_BASE_URL,
      headers: {
        Authorization: `Bearer ${PAYFLEX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Get all service providers
   */
  async getProviders(serviceType) {
    try {
      const response = await this.client.get('/providers', {
        params: { serviceType },
      });

      if (response.data && response.data.data) {
        return response.data.data;
      }

      return [];
    } catch (error) {
      console.error('Error fetching providers:', error.message);
      throw new Error(`Failed to fetch ${serviceType} providers`);
    }
  }

  /**
   * Get plans/packages for a specific provider
   */
  async getPlans(providerCode, serviceType) {
    try {
      const response = await this.client.get(`/plans/${providerCode}`, {
        params: { serviceType },
      });

      if (response.data && response.data.data) {
        return response.data.data;
      }

      return [];
    } catch (error) {
      console.error('Error fetching plans:', error.message);
      throw new Error(`Failed to fetch plans for provider ${providerCode}`);
    }
  }

  /**
   * Process Airtime purchase
   */
  async buyAirtime(phone, amount, provider) {
    try {
      const response = await this.client.post('/buy-airtime', {
        phone,
        amount,
        provider,
        reference: `airtime_${Date.now()}`,
      });

      return this._normalizeResponse(response.data);
    } catch (error) {
      console.error('Error buying airtime:', error.message);
      throw error;
    }
  }

  /**
   * Process Data purchase
   */
  async buyData(phone, planId, provider) {
    try {
      const response = await this.client.post('/buy-data', {
        phone,
        planId,
        provider,
        reference: `data_${Date.now()}`,
      });

      return this._normalizeResponse(response.data);
    } catch (error) {
      console.error('Error buying data:', error.message);
      throw error;
    }
  }

  /**
   * Pay Electricity bill
   */
  async payElectricity(meterNumber, amount, disco, meterType) {
    try {
      const response = await this.client.post('/pay-electricity', {
        meterNumber,
        amount,
        disco,
        meterType, // prepaid or postpaid
        reference: `electricity_${Date.now()}`,
      });

      return this._normalizeResponse(response.data);
    } catch (error) {
      console.error('Error paying electricity bill:', error.message);
      throw error;
    }
  }

  /**
   * Pay Cable TV subscription
   */
  async payCableTV(smartcardNumber, amount, provider, planId) {
    try {
      const response = await this.client.post('/pay-cable', {
        smartcardNumber,
        amount,
        provider,
        planId,
        reference: `cable_${Date.now()}`,
      });

      return this._normalizeResponse(response.data);
    } catch (error) {
      console.error('Error paying cable TV bill:', error.message);
      throw error;
    }
  }

  /**
   * Pay Internet bill
   */
  async buyInternet(customerId, amount, provider, planId) {
    try {
      const response = await this.client.post('/buy-internet', {
        customerId,
        amount,
        provider,
        planId,
        reference: `internet_${Date.now()}`,
      });

      return this._normalizeResponse(response.data);
    } catch (error) {
      console.error('Error buying internet:', error.message);
      throw error;
    }
  }

  /**
   * Pay Education fees / School tuition
   */
  async payEducation(studentId, amount, institution, reference) {
    try {
      const response = await this.client.post('/pay-education', {
        studentId,
        amount,
        institution,
        reference: reference || `education_${Date.now()}`,
      });

      return this._normalizeResponse(response.data);
    } catch (error) {
      console.error('Error paying education fees:', error.message);
      throw error;
    }
  }

  /**
   * Pay Insurance premium
   */
  async payInsurance(policyNumber, amount, provider) {
    try {
      const response = await this.client.post('/pay-insurance', {
        policyNumber,
        amount,
        provider,
        reference: `insurance_${Date.now()}`,
      });

      return this._normalizeResponse(response.data);
    } catch (error) {
      console.error('Error paying insurance:', error.message);
      throw error;
    }
  }

  /**
   * Buy Gift Card
   */
  async buyGiftCard(giftCardCode, amount, provider) {
    try {
      const response = await this.client.post('/buy-giftcard', {
        giftCardCode,
        amount,
        provider,
        reference: `giftcard_${Date.now()}`,
      });

      return this._normalizeResponse(response.data);
    } catch (error) {
      console.error('Error buying gift card:', error.message);
      throw error;
    }
  }

  /**
   * Pay Tax
   */
  async payTax(taxType, taxId, amount, authority) {
    try {
      const response = await this.client.post('/pay-tax', {
        taxType,
        taxId,
        amount,
        authority,
        reference: `tax_${Date.now()}`,
      });

      return this._normalizeResponse(response.data);
    } catch (error) {
      console.error('Error paying tax:', error.message);
      throw error;
    }
  }

  /**
   * Verify transaction status with PayFlex
   */
  async verifyTransaction(reference) {
    try {
      const response = await this.client.get('/verify', {
        params: { reference },
      });

      return this._normalizeResponse(response.data);
    } catch (error) {
      console.error('Error verifying transaction:', error.message);
      throw error;
    }
  }

  /**
   * Normalize PayFlex response to standard format
   */
  _normalizeResponse(data) {
    return {
      success: data.success !== false && data.status !== 'failed',
      status: data.status || (data.success ? 'success' : 'failed'),
      transactionId: data.transactionId || data.reference || null,
      amount: data.amount || null,
      message: data.message || '',
      data: data.data || data,
    };
  }

  /**
   * Get account balance (if PayFlex provides it)
   */
  async getBalance() {
    try {
      const response = await this.client.get('/balance');
      return response.data;
    } catch (error) {
      console.error('Error fetching balance:', error.message);
      throw error;
    }
  }
}

module.exports = new PayFlexService();
