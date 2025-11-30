/**
 * Paystack Payment Integration Service
 * Handles all Paystack payment operations for PAYLINK
 */

class PaystackService {
  constructor() {
    this.publicKey = process.env.REACT_APP_PAYSTACK_PUBLIC_KEY;
    this.apiUrl = process.env.REACT_APP_PAYSTACK_API_URL || 'https://api.paystack.co';
    this.isLoaded = false;
  }

  /**
   * Load Paystack script dynamically
   * @returns {Promise<boolean>} True if successfully loaded
   */
  async loadPaystack() {
    return new Promise((resolve, reject) => {
      if (window.PaystackPop) {
        this.isLoaded = true;
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;

      script.onload = () => {
        if (window.PaystackPop) {
          this.isLoaded = true;
          resolve(true);
        } else {
          reject(new Error('Paystack failed to initialize'));
        }
      };

      script.onerror = () => {
        reject(new Error('Failed to load Paystack script'));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Initialize and open Paystack payment modal
   * @param {object} options - Payment options
   * @returns {Promise<void>}
   */
  async initiatePayment(options) {
    try {
      await this.loadPaystack();

      const {
        email,
        amount, // Amount in NGN
        userId,
        firstName = '',
        lastName = '',
        phone = '',
        onSuccess,
        onClose,
        metadata = {}
      } = options;

      // Validate required fields
      if (!email || !amount || !userId) {
        throw new Error('Missing required payment information');
      }

      // Generate unique reference
      const reference = `PAYLINK_${Date.now()}_${userId.slice(0, 8)}`;

      const paymentConfig = {
        key: this.publicKey,
        email,
        amount: amount * 100, // Convert to kobo
        currency: 'NGN',
        ref: reference,
        firstName,
        lastName,
        phone,
        metadata: {
          userId,
          ...metadata
        },
        onClose: () => {
          if (typeof onClose === 'function') {
            onClose();
          }
        },
        onSuccess: (response) => {
          if (typeof onSuccess === 'function') {
            onSuccess(response);
          }
        }
      };

      const handler = window.PaystackPop.setup(paymentConfig);
      handler.openIframe();
    } catch (error) {
      console.error('Paystack payment error:', error);
      throw error;
    }
  }

  /**
   * Verify payment on the backend
   * @param {string} reference - Paystack transaction reference
   * @returns {Promise<object>} Verification response
   */
  async verifyPayment(reference) {
    try {
      const response = await fetch(`${this.apiUrl}/transaction/verify/${reference}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.REACT_APP_PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Payment verification failed');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Payment verification error:', error);
      throw error;
    }
  }

  /**
   * Get transaction details
   * @param {string} reference - Transaction reference
   * @returns {Promise<object>} Transaction details
   */
  async getTransactionDetails(reference) {
    try {
      const response = await fetch(`${this.apiUrl}/transaction/${reference}`, {
        headers: {
          Authorization: `Bearer ${process.env.REACT_APP_PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch transaction details');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching transaction details:', error);
      throw error;
    }
  }

  /**
   * Create a payment plan for recurring payments
   * @param {object} planDetails - Plan configuration
   * @returns {Promise<object>} Created plan details
   */
  async createPaymentPlan(planDetails) {
    try {
      const {
        name,
        amount, // Amount in NGN
        interval, // 'daily', 'weekly', 'monthly', 'quarterly', 'annually'
        description = ''
      } = planDetails;

      const response = await fetch(`${this.apiUrl}/plan`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.REACT_APP_PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          amount: amount * 100, // Convert to kobo
          interval,
          description
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create payment plan');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Payment plan creation error:', error);
      throw error;
    }
  }

  /**
   * Subscribe user to a payment plan
   * @param {object} subscriptionDetails - Subscription configuration
   * @returns {Promise<object>} Subscription response
   */
  async subscribeToPaymentPlan(subscriptionDetails) {
    try {
      const {
        email,
        amount, // Amount in NGN
        planCode,
        authorization,
        startDate
      } = subscriptionDetails;

      const response = await fetch(`${this.apiUrl}/subscription`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.REACT_APP_PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          amount: amount * 100, // Convert to kobo
          plan: planCode,
          authorization,
          start_date: startDate
        })
      });

      if (!response.ok) {
        throw new Error('Failed to subscribe to payment plan');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Payment plan subscription error:', error);
      throw error;
    }
  }

  /**
   * Charge authorization (for recurring payments)
   * @param {string} email - Customer email
   * @param {number} amount - Amount in NGN
   * @param {string} authorizationCode - Paystack authorization code
   * @returns {Promise<object>} Charge response
   */
  async chargeAuthorization(email, amount, authorizationCode) {
    try {
      const response = await fetch(`${this.apiUrl}/charge_authorization`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.REACT_APP_PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          amount: amount * 100, // Convert to kobo
          authorization_code: authorizationCode
        })
      });

      if (!response.ok) {
        throw new Error('Failed to charge authorization');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Authorization charge error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default new PaystackService();
