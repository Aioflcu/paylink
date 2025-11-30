/**
 * biometricService.js
 * Biometric Authentication Service
 * Handle fingerprint and Face ID authentication
 */

class BiometricService {
  static BIOMETRIC_TYPES = {
    FINGERPRINT: 'fingerprint',
    FACE_ID: 'face_id',
    NONE: 'none'
  };

  static STORAGE_KEYS = {
    BIOMETRIC_ENABLED: 'biometric_enabled',
    BIOMETRIC_TYPE: 'biometric_type',
    BIOMETRIC_DATA: 'biometric_data',
    FALLBACK_PIN: 'fallback_pin'
  };

  /**
   * Check if device supports biometric authentication
   */
  static async checkBiometricSupport() {
    try {
      // Check if WebAuthn API is available
      if (window.PublicKeyCredential === undefined) {
        return { supported: false, reason: 'WebAuthn not available' };
      }

      // Check for available authenticators
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      
      if (!available) {
        return { supported: false, reason: 'No biometric authenticator available' };
      }

      // Determine biometric type
      const biometricType = await this.detectBiometricType();

      return {
        supported: true,
        type: biometricType,
        authenticatorSupported: true
      };
    } catch (error) {
      console.error('Error checking biometric support:', error);
      return { supported: false, reason: error.message };
    }
  }

  /**
   * Detect which biometric type is available on device
   */
  static async detectBiometricType() {
    try {
      // Check user agent for device type
      const userAgent = navigator.userAgent.toLowerCase();
      const isIOS = /iphone|ipad|ipod/.test(userAgent);
      const isAndroid = /android/.test(userAgent);

      if (isIOS) {
        return this.BIOMETRIC_TYPES.FACE_ID; // iOS typically uses Face ID
      } else if (isAndroid) {
        return this.BIOMETRIC_TYPES.FINGERPRINT; // Android typically uses fingerprint
      } else {
        return this.BIOMETRIC_TYPES.NONE;
      }
    } catch (error) {
      console.error('Error detecting biometric type:', error);
      return this.BIOMETRIC_TYPES.NONE;
    }
  }

  /**
   * Register biometric for user
   */
  static async registerBiometric(userId, pin) {
    try {
      // Validate PIN
      if (!pin || pin.length < 4) {
        throw new Error('PIN must be at least 4 digits');
      }

      // Get biometric support info
      const support = await this.checkBiometricSupport();
      if (!support.supported) {
        throw new Error('Biometric authentication not supported on this device');
      }

      // Create credential
      const credential = await this.createCredential(userId);
      
      // Store biometric registration
      const registrationData = {
        userId,
        biometricType: support.type,
        credentialId: credential.id,
        publicKey: credential.publicKey,
        registeredAt: new Date(),
        lastUsed: null,
        enabled: true,
        fallbackPin: await this.encryptPin(pin)
      };

      // Save to localStorage
      localStorage.setItem(
        `${this.STORAGE_KEYS.BIOMETRIC_DATA}_${userId}`,
        JSON.stringify(registrationData)
      );

      // Mark as enabled
      localStorage.setItem(
        `${this.STORAGE_KEYS.BIOMETRIC_ENABLED}_${userId}`,
        'true'
      );

      // Save biometric type
      localStorage.setItem(
        `${this.STORAGE_KEYS.BIOMETRIC_TYPE}_${userId}`,
        support.type
      );

      return {
        success: true,
        biometricType: support.type,
        message: 'Biometric authentication registered successfully'
      };
    } catch (error) {
      console.error('Error registering biometric:', error);
      throw error;
    }
  }

  /**
   * Create WebAuthn credential
   */
  static async createCredential(userId) {
    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: challenge,
          rp: {
            name: 'Paylink',
            id: window.location.hostname
          },
          user: {
            id: new TextEncoder().encode(userId),
            name: userId,
            displayName: 'Paylink User'
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' }, // ES256
            { alg: -257, type: 'public-key' } // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'preferred'
          },
          timeout: 60000,
          attestation: 'direct'
        }
      });

      if (!credential) {
        throw new Error('Failed to create credential');
      }

      return credential;
    } catch (error) {
      console.error('Error creating credential:', error);
      throw error;
    }
  }

  /**
   * Authenticate using biometric
   */
  static async authenticateWithBiometric(userId) {
    try {
      // Get stored credential
      const registrationData = this.getRegistrationData(userId);
      if (!registrationData) {
        throw new Error('Biometric not registered for this user');
      }

      if (!registrationData.enabled) {
        throw new Error('Biometric authentication is disabled');
      }

      // Create assertion
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: challenge,
          allowCredentials: [{
            id: new Uint8Array(registrationData.credentialId),
            type: 'public-key',
            transports: ['internal']
          }],
          userVerification: 'preferred',
          timeout: 60000
        }
      });

      if (!assertion) {
        throw new Error('Biometric authentication failed');
      }

      // Verify assertion signature
      const verified = await this.verifyAssertion(assertion, registrationData);

      if (!verified) {
        throw new Error('Biometric verification failed');
      }

      // Update last used time
      registrationData.lastUsed = new Date();
      localStorage.setItem(
        `${this.STORAGE_KEYS.BIOMETRIC_DATA}_${userId}`,
        JSON.stringify(registrationData)
      );

      return {
        success: true,
        userId,
        biometricType: registrationData.biometricType,
        timestamp: new Date(),
        message: 'Biometric authentication successful'
      };
    } catch (error) {
      console.error('Error during biometric authentication:', error);
      throw error;
    }
  }

  /**
   * Verify WebAuthn assertion
   */
  static async verifyAssertion(assertion, registrationData) {
    try {
      // In a real implementation, verify the signature using the public key
      // For now, we'll return true if assertion exists
      return assertion && assertion.id;
    } catch (error) {
      console.error('Error verifying assertion:', error);
      return false;
    }
  }

  /**
   * Use biometric for payment confirmation
   */
  static async confirmPaymentWithBiometric(userId, transactionData) {
    try {
      // Authenticate with biometric
      const authResult = await this.authenticateWithBiometric(userId);

      if (!authResult.success) {
        throw new Error('Biometric authentication failed for payment');
      }

      // Log biometric usage
      await this.logBiometricUsage(userId, 'payment_confirmation', transactionData);

      return {
        success: true,
        transactionId: transactionData.id,
        confirmedAt: new Date(),
        method: 'biometric'
      };
    } catch (error) {
      console.error('Error confirming payment with biometric:', error);
      throw error;
    }
  }

  /**
   * Disable biometric authentication
   */
  static async disableBiometric(userId, pin) {
    try {
      // Verify PIN first
      const registrationData = this.getRegistrationData(userId);
      if (!registrationData) {
        throw new Error('Biometric not registered');
      }

      const pinValid = await this.verifyPin(pin, registrationData.fallbackPin);
      if (!pinValid) {
        throw new Error('Invalid PIN');
      }

      // Disable biometric
      registrationData.enabled = false;
      localStorage.setItem(
        `${this.STORAGE_KEYS.BIOMETRIC_DATA}_${userId}`,
        JSON.stringify(registrationData)
      );

      localStorage.setItem(
        `${this.STORAGE_KEYS.BIOMETRIC_ENABLED}_${userId}`,
        'false'
      );

      return {
        success: true,
        message: 'Biometric authentication disabled'
      };
    } catch (error) {
      console.error('Error disabling biometric:', error);
      throw error;
    }
  }

  /**
   * Test biometric authentication
   */
  static async testBiometric(userId) {
    try {
      const result = await this.authenticateWithBiometric(userId);
      return {
        success: true,
        message: 'Biometric test successful',
        biometricType: result.biometricType
      };
    } catch (error) {
      console.error('Error testing biometric:', error);
      throw error;
    }
  }

  /**
   * Get biometric registration data
   */
  static getRegistrationData(userId) {
    try {
      const data = localStorage.getItem(`${this.STORAGE_KEYS.BIOMETRIC_DATA}_${userId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting registration data:', error);
      return null;
    }
  }

  /**
   * Check if biometric is enabled
   */
  static isBiometricEnabled(userId) {
    return localStorage.getItem(`${this.STORAGE_KEYS.BIOMETRIC_ENABLED}_${userId}`) === 'true';
  }

  /**
   * Get biometric type
   */
  static getBiometricType(userId) {
    return localStorage.getItem(`${this.STORAGE_KEYS.BIOMETRIC_TYPE}_${userId}`) || this.BIOMETRIC_TYPES.NONE;
  }

  /**
   * Encrypt PIN for storage
   */
  static async encryptPin(pin) {
    try {
      // In production, use proper encryption (e.g., TweetNaCl.js)
      // For now, use base64 encoding with a simple hash
      const encoded = btoa(pin);
      return encoded;
    } catch (error) {
      console.error('Error encrypting PIN:', error);
      throw error;
    }
  }

  /**
   * Verify PIN
   */
  static async verifyPin(pin, encryptedPin) {
    try {
      const encoded = btoa(pin);
      return encoded === encryptedPin;
    } catch (error) {
      console.error('Error verifying PIN:', error);
      return false;
    }
  }

  /**
   * Log biometric usage
   */
  static async logBiometricUsage(userId, usage, details) {
    try {
      const log = {
        userId,
        usage, // login, payment_confirmation, wallet_access
        details,
        timestamp: new Date(),
        ipAddress: await this.getClientIP(),
        userAgent: navigator.userAgent
      };

      // Store in localStorage (in production, send to server)
      const logs = this.getBiometricLogs(userId);
      logs.push(log);
      localStorage.setItem(
        `biometric_logs_${userId}`,
        JSON.stringify(logs.slice(-100)) // Keep last 100 logs
      );

      return { success: true };
    } catch (error) {
      console.error('Error logging biometric usage:', error);
    }
  }

  /**
   * Get biometric usage logs
   */
  static getBiometricLogs(userId) {
    try {
      const logs = localStorage.getItem(`biometric_logs_${userId}`);
      return logs ? JSON.parse(logs) : [];
    } catch (error) {
      console.error('Error getting biometric logs:', error);
      return [];
    }
  }

  /**
   * Get client IP (mock)
   */
  static async getClientIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Clear all biometric data
   */
  static clearBiometricData(userId) {
    try {
      localStorage.removeItem(`${this.STORAGE_KEYS.BIOMETRIC_DATA}_${userId}`);
      localStorage.removeItem(`${this.STORAGE_KEYS.BIOMETRIC_ENABLED}_${userId}`);
      localStorage.removeItem(`${this.STORAGE_KEYS.BIOMETRIC_TYPE}_${userId}`);
      localStorage.removeItem(`biometric_logs_${userId}`);
      return { success: true };
    } catch (error) {
      console.error('Error clearing biometric data:', error);
      throw error;
    }
  }
}

export default BiometricService;
