class BiometricAuth {
  static async isAvailable() {
    if (!window.PublicKeyCredential) {
      return false;
    }

    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return available;
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return false;
    }
  }

  static async registerBiometric(userId, username) {
    try {
      if (!await this.isAvailable()) {
        throw new Error('Biometric authentication is not available on this device');
      }

      // Generate a challenge
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userIdBytes = new TextEncoder().encode(userId);

      const credentialCreationOptions = {
        publicKey: {
          challenge,
          rp: {
            name: 'PAYLINK',
            id: window.location.hostname
          },
          user: {
            id: userIdBytes,
            name: username,
            displayName: username
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' }, // ES256
            { alg: -257, type: 'public-key' } // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            requireResidentKey: false
          },
          timeout: 60000,
          attestation: 'direct'
        }
      };

      const credential = await navigator.credentials.create(credentialCreationOptions);

      // Store the credential
      const biometricData = {
        credentialId: this.arrayBufferToBase64(credential.rawId),
        publicKey: this.arrayBufferToBase64(credential.response.getPublicKey()),
        counter: credential.response.getAuthenticatorData().byteLength,
        transports: credential.response.getTransports ? credential.response.getTransports() : []
      };

      // Save to user profile
      await this.saveBiometricCredential(userId, biometricData);

      return {
        success: true,
        credentialId: biometricData.credentialId
      };
    } catch (error) {
      console.error('Error registering biometric:', error);
      throw new Error(`Biometric registration failed: ${error.message}`);
    }
  }

  static async authenticateBiometric(userId) {
    try {
      if (!await this.isAvailable()) {
        throw new Error('Biometric authentication is not available');
      }

      // Get stored credential
      const storedCredential = await this.getBiometricCredential(userId);
      if (!storedCredential) {
        throw new Error('No biometric credential found. Please register first.');
      }

      const credentialRequestOptions = {
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          allowCredentials: [{
            id: this.base64ToArrayBuffer(storedCredential.credentialId),
            type: 'public-key',
            transports: storedCredential.transports || ['internal']
          }],
          userVerification: 'required',
          timeout: 60000
        }
      };

      const assertion = await navigator.credentials.get(credentialRequestOptions);

      // Verify the assertion (in production, this should be done on the server)
      const isValid = await this.verifyAssertion(assertion, storedCredential);

      if (isValid) {
        // Update counter
        await this.updateBiometricCounter(userId, assertion.response.authenticatorData);

        return {
          success: true,
          userId
        };
      } else {
        throw new Error('Biometric authentication failed');
      }
    } catch (error) {
      console.error('Error authenticating with biometric:', error);
      throw new Error(`Biometric authentication failed: ${error.message}`);
    }
  }

  static async saveBiometricCredential(userId, biometricData) {
    try {

      await User.findByIdAndUpdate(userId, {
        biometricEnabled: true,
        biometricCredential: biometricData,
        biometricRegisteredAt: new Date()
      });
    } catch (error) {
      console.error('Error saving biometric credential:', error);
      throw error;
    }
  }

  static async getBiometricCredential(userId) {
    try {

      const user = await User.findById(userId).select('biometricCredential');
      return user?.biometricCredential;
    } catch (error) {
      console.error('Error getting biometric credential:', error);
      return null;
    }
  }

  static async updateBiometricCounter(userId, authenticatorData) {
    try {
      // Extract counter from authenticator data (simplified)
      const counter = authenticatorData.byteLength;

      await User.findByIdAndUpdate(userId, {
        'biometricCredential.counter': counter,
        lastBiometricUse: new Date()
      });
    } catch (error) {
      console.error('Error updating biometric counter:', error);
    }
  }

  static async verifyAssertion(assertion, storedCredential) {
    try {
      // In production, this verification should be done on the server
      // For demo purposes, we'll do basic verification

      const clientDataJSON = JSON.parse(new TextDecoder().decode(assertion.response.clientDataJSON));

      // Verify challenge (in production, compare with stored challenge)
      if (clientDataJSON.type !== 'webauthn.get') {
        return false;
      }

      // Verify origin
      if (clientDataJSON.origin !== window.location.origin) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error verifying assertion:', error);
      return false;
    }
  }

  static async unregisterBiometric(userId) {
    try {

      await User.findByIdAndUpdate(userId, {
        biometricEnabled: false,
        biometricCredential: null,
        biometricRegisteredAt: null
      });

      return true;
    } catch (error) {
      console.error('Error unregistering biometric:', error);
      throw error;
    }
  }

  static async isBiometricEnabled(userId) {
    try {

      const user = await User.findById(userId).select('biometricEnabled');
      return user?.biometricEnabled || false;
    } catch (error) {
      console.error('Error checking biometric status:', error);
      return false;
    }
  }

  static async getBiometricStatus(userId) {
    try {

      const user = await User.findById(userId).select(
        'biometricEnabled biometricRegisteredAt lastBiometricUse'
      );

      const deviceAvailable = await this.isAvailable();

      return {
        enabled: user?.biometricEnabled || false,
        deviceSupported: deviceAvailable,
        registeredAt: user?.biometricRegisteredAt,
        lastUsed: user?.lastBiometricUse,
        canUse: deviceAvailable && user?.biometricEnabled
      };
    } catch (error) {
      console.error('Error getting biometric status:', error);
      return {
        enabled: false,
        deviceSupported: false,
        registeredAt: null,
        lastUsed: null,
        canUse: false
      };
    }
  }

  static arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  static base64ToArrayBuffer(base64) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // Fallback methods for devices without WebAuthn support
  static async registerBiometricFallback(userId) {
    // For devices without WebAuthn, we could use device fingerprinting
    // or other fallback methods, but this is less secure
    console.warn('Using biometric fallback - less secure');

    const deviceFingerprint = await this.getDeviceFingerprint();

    await this.saveBiometricCredential(userId, {
      type: 'fallback',
      fingerprint: deviceFingerprint,
      registeredAt: new Date()
    });

    return { success: true, type: 'fallback' };
  }

  static async authenticateBiometricFallback(userId) {
    const storedCredential = await this.getBiometricCredential(userId);

    if (!storedCredential || storedCredential.type !== 'fallback') {
      throw new Error('No fallback biometric credential found');
    }

    const currentFingerprint = await this.getDeviceFingerprint();

    if (currentFingerprint === storedCredential.fingerprint) {
      await this.updateBiometricCounter(userId, new ArrayBuffer(0));
      return { success: true, userId, type: 'fallback' };
    } else {
      throw new Error('Device fingerprint mismatch');
    }
  }

  static async getDeviceFingerprint() {
    // Create a simple device fingerprint
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('PAYLINK', 2, 2);

    const fingerprint = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      canvas: canvas.toDataURL()
    };

    // Create hash of fingerprint
    const fingerprintString = JSON.stringify(fingerprint);
    let hash = 0;
    for (let i = 0; i < fingerprintString.length; i++) {
      const char = fingerprintString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(36);
  }

  // Integration with login flow
  static async attemptBiometricLogin() {
    try {
      // This would be called during login if biometric is enabled
      const biometricStatus = await this.getBiometricStatus(/* userId from context */);

      if (!biometricStatus.canUse) {
        return { success: false, reason: 'Biometric not available or not enabled' };
      }

      const result = await this.authenticateBiometric(/* userId */);

      if (result.success) {
        // Proceed with login
        return { success: true, method: 'biometric' };
      }
    } catch (error) {
      console.error('Biometric login attempt failed:', error);
    }

    return { success: false, reason: 'Biometric authentication failed' };
  }

  // Integration with transaction PIN
  static async useBiometricForTransaction(userId) {
    try {
      const biometricStatus = await this.getBiometricStatus(userId);

      if (!biometricStatus.canUse) {
        return false;
      }

      const result = await this.authenticateBiometric(userId);
      return result.success;
    } catch (error) {
      console.error('Biometric transaction auth failed:', error);
      return false;
    }
  }

  // Security monitoring
  static async logBiometricEvent(userId, event, success) {
    try {

      await BiometricLog.create({
        userId,
        event,
        success,
        timestamp: new Date(),
        userAgent: navigator.userAgent,
        ipAddress: await this.getClientIP()
      });
    } catch (error) {
      console.error('Error logging biometric event:', error);
    }
  }

  static async getClientIP() {
    // In production, get IP from server request
    // For client-side, we can't reliably get the real IP
    return 'unknown';
  }

  static async getBiometricAnalytics(userId) {
    try {

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const stats = await BiometricLog.aggregate([
        {
          $match: {
            userId: require('mongoose').Types.ObjectId(userId),
            timestamp: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: '$event',
            count: { $sum: 1 },
            successful: {
              $sum: { $cond: ['$success', 1, 0] }
            }
          }
        }
      ]);

      const analytics = {
        totalAttempts: 0,
        successfulAttempts: 0,
        failedAttempts: 0,
        events: {}
      };

      stats.forEach(stat => {
        analytics.events[stat._id] = {
          total: stat.count,
          successful: stat.successful,
          failed: stat.count - stat.successful
        };

        analytics.totalAttempts += stat.count;
        analytics.successfulAttempts += stat.successful;
        analytics.failedAttempts += stat.count - stat.successful;
      });

      analytics.successRate = analytics.totalAttempts > 0
        ? (analytics.successfulAttempts / analytics.totalAttempts) * 100
        : 0;

      return analytics;
    } catch (error) {
      console.error('Error getting biometric analytics:', error);
      return {
        totalAttempts: 0,
        successfulAttempts: 0,
        failedAttempts: 0,
        successRate: 0,
        events: {}
      };
    }
  }

  static getBiometricTypes() {
    return {
      fingerprint: {
        name: 'Fingerprint',
        available: 'fingerprint' in navigator,
        icon: 'fingerprint'
      },
      face: {
        name: 'Face Recognition',
        available: 'FaceDetector' in window || 'webkitFaceDetector' in window,
        icon: 'face'
      },
      webauthn: {
        name: 'WebAuthn',
        available: 'PublicKeyCredential' in window,
        icon: 'security'
      }
    };
  }
}

export default BiometricAuth;
