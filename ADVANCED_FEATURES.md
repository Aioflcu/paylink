# PAYLINK Advanced Features Implementation Guide

## Phase 14: Professional Upgrades for PAYLINK

This document outlines the implementation of advanced features to elevate PAYLINK to a professional-grade application.

---

## 1️⃣ AI Fraud Detection System

### Implementation Steps:
1. **Create Fraud Detection Service** (`src/services/fraudDetection.js`):
```javascript
class FraudDetectionService {
  static detectSuspiciousActivity(userId, activity) {
    const alerts = [];

    // Check for unusual location login
    if (this.isUnusualLocation(userId, activity.location)) {
      alerts.push('Unusual login location detected');
    }

    // Check for multiple failed PIN attempts
    if (activity.failedPinAttempts > 3) {
      alerts.push('Multiple failed PIN attempts');
    }

    // Check for large sudden purchases
    if (this.isLargePurchase(userId, activity.amount)) {
      alerts.push('Large sudden purchase detected');
    }

    // Check for device change
    if (this.isNewDevice(userId, activity.device)) {
      alerts.push('New device login detected');
    }

    return alerts;
  }

  static isUnusualLocation(userId, location) {
    // Compare with user's historical login locations
    // Use IP geolocation API
    return false; // Implementation needed
  }

  static isLargePurchase(userId, amount) {
    // Compare with user's average transaction amount
    return false; // Implementation needed
  }

  static isNewDevice(userId, device) {
    // Compare with user's registered devices
    return false; // Implementation needed
  }
}
```

2. **Integrate with Authentication**:
   - Add fraud checks in login flow
   - Trigger temporary lock + OTP verification on suspicious activity

3. **Database Schema Updates**:
   - Add `loginHistory` collection to track user sessions
   - Store device fingerprints, IP addresses, locations

---

## 2️⃣ Smart Receipt Generator

### Implementation Steps:
1. **Create Receipt Service** (`src/services/receiptGenerator.js`):
```javascript
class ReceiptGenerator {
  static generateReceipt(transaction, user) {
    return {
      serviceLogo: this.getServiceLogo(transaction.category),
      qrCode: this.generateQRCode(transaction.reference),
      transactionRef: transaction.reference,
      timestamp: transaction.createdAt,
      userName: user.fullName,
      amount: transaction.amount,
      breakdown: this.calculateBreakdown(transaction),
      verificationUrl: `https://paylink.com/verify/${transaction.reference}`
    };
  }

  static generateQRCode(data) {
    // Use QR code library to generate scannable code
    return 'qr_code_data_url';
  }

  static getServiceLogo(category) {
    const logos = {
      airtime: '/logos/mtn.png',
      electricity: '/logos/ekedc.png',
      // ... other logos
    };
    return logos[category];
  }

  static calculateBreakdown(transaction) {
    // Calculate fees, taxes, etc.
    return {
      subtotal: transaction.amount,
      fee: 0,
      tax: 0,
      total: transaction.amount
    };
  }
}
```

2. **PDF Generation**:
   - Use `jspdf` library for PDF creation
   - Include receipt data with proper formatting

3. **Sharing Features**:
   - WhatsApp sharing: `window.open('whatsapp://send?text=Receipt: ${receiptUrl}')`
   - Email sharing: Use mailto links
   - Cloud backup: Store receipts in Firebase Storage

---

## 3️⃣ Reward Points System (LOYALTY ENGINE)

### Implementation Steps:
1. **Points Calculation Logic**:
```javascript
const POINTS_RATES = {
  airtime: { rate: 1, perAmount: 100 }, // 1 point per ₦100
  electricity: { rate: 2, perAmount: 500 }, // 2 points per ₦500
  data: { rate: 1, perAmount: 200 }, // 1 point per ₦200
};

class RewardSystem {
  static calculatePoints(category, amount) {
    const rate = POINTS_RATES[category];
    if (!rate) return 0;

    return Math.floor((amount / rate.perAmount) * rate.rate);
  }

  static redeemPoints(userId, points, rewardType) {
    // Implement redemption logic
    const rewards = {
      discount: { points: 100, value: 50 }, // 100 points = ₦50 discount
      airtime: { points: 200, value: 100 }, // 200 points = ₦100 airtime
      data: { points: 150, value: 200 }, // 150 points = 200MB data
    };

    // Process redemption
  }
}
```

2. **Database Updates**:
   - Add `points` field to User model
   - Create `rewards` collection for redemption history

3. **UI Components**:
   - Points balance display
   - Redemption options
   - Points history

---

## 4️⃣ In-App Ticketing & Customer Support

### Implementation Steps:
1. **Ticket System**:
```javascript
// Ticket model
const ticketSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  subject: String,
  description: String,
  status: { type: String, enum: ['open', 'in-progress', 'resolved'], default: 'open' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  attachments: [String],
  messages: [{
    sender: { type: String, enum: ['user', 'admin'] },
    message: String,
    timestamp: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});
```

2. **Real-time Chat**:
   - Use Socket.io for real-time messaging
   - Admin dashboard for ticket management

3. **File Upload**:
   - Implement file upload for screenshots
   - Store attachments in Firebase Storage

---

## 5️⃣ Two Different Wallet Types

### Implementation Steps:
1. **Wallet Schema Update**:
```javascript
const walletSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  mainBalance: { type: Number, default: 0 },
  savingsBalance: { type: Number, default: 0 },
  savingsLocked: { type: Boolean, default: true },
  interestRate: { type: Number, default: 0.05 }, // 5% annual interest
  lastInterestDate: Date
});
```

2. **Transfer Between Wallets**:
   - Allow moving funds between main and savings wallets
   - Implement interest calculation for savings wallet

3. **UI Updates**:
   - Separate balance displays
   - Transfer buttons
   - Savings wallet lock/unlock functionality

---

## 6️⃣ Beneficiary Management System

### Implementation Steps:
1. **Beneficiary Model**:
```javascript
const beneficiarySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  nickname: String,
  type: { type: String, enum: ['meter', 'cable', 'phone', 'internet', 'tax'] },
  details: {
    meterNumber: String,
    cableSmartcard: String,
    phoneNumber: String,
    internetAccount: String,
    taxId: String
  },
  provider: String,
  lastUsed: Date
});
```

2. **Quick Purchase Feature**:
   - Auto-fill forms with beneficiary data
   - One-click purchase buttons

3. **Management UI**:
   - Add/edit/delete beneficiaries
   - Categorize by service type

---

## 7️⃣ User Login Insights

### Implementation Steps:
1. **Login Tracking**:
```javascript
const loginHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  timestamp: { type: Date, default: Date.now },
  ipAddress: String,
  location: {
    country: String,
    city: String,
    coordinates: { lat: Number, lng: Number }
  },
  device: {
    type: String, // mobile, desktop
    browser: String,
    os: String,
    fingerprint: String
  },
  suspicious: { type: Boolean, default: false }
});
```

2. **Location Detection**:
   - Use IP geolocation services
   - Store approximate location data

3. **Security Alerts**:
   - Send notifications for suspicious logins
   - Require additional verification

---

## 8️⃣ Virtual Card Integration

### Implementation Steps:
1. **Virtual Card Service**:
```javascript
class VirtualCardService {
  static async createVirtualCard(userId) {
    // Integrate with virtual card provider (e.g., Flutterwave, Paystack)
    const cardData = await this.callProviderAPI('create-card', {
      userId,
      currency: 'NGN'
    });

    return {
      cardNumber: cardData.maskedNumber,
      expiry: cardData.expiry,
      cvv: cardData.cvv,
      cardId: cardData.id
    };
  }

  static async fundCard(cardId, amount, sourceWallet) {
    // Transfer from wallet to card
  }

  static async freezeCard(cardId) {
    // Freeze/unfreeze card
  }
}
```

2. **Card Management UI**:
   - Card creation interface
   - Funding options
   - Transaction history
   - Security controls

---

## 9️⃣ Face ID / Fingerprint Login

### Implementation Steps:
1. **Biometric Authentication**:
```javascript
class BiometricAuth {
  static async isAvailable() {
    if (window.PublicKeyCredential) {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
    return false;
  }

  static async registerBiometric(userId) {
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'PAYLINK' },
        user: {
          id: new Uint8Array(Buffer.from(userId)),
          name: userId,
          displayName: userId
        },
        pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required'
        }
      }
    });

    // Store credential in database
    return credential;
  }

  static async authenticateBiometric() {
    // Implement authentication flow
  }
}
```

2. **Integration Points**:
   - Login page
   - Wallet access
   - Transaction confirmation

---

## 🔟 Daily/Weekly/Monthly Spend Analytics

### Implementation Steps:
1. **Analytics Service**:
```javascript
class AnalyticsService {
  static async getSpendAnalytics(userId, period = 'monthly') {
    const transactions = await Transaction.find({
      userId,
      createdAt: { $gte: this.getPeriodStart(period) }
    });

    const analytics = {
      totalSpent: transactions.reduce((sum, t) => sum + t.amount, 0),
      categoryBreakdown: this.groupByCategory(transactions),
      weeklyTrend: this.calculateWeeklyTrend(transactions),
      topCategories: this.getTopCategories(transactions),
      averageTransaction: this.calculateAverage(transactions)
    };

    return analytics;
  }

  static groupByCategory(transactions) {
    return transactions.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});
  }

  static calculateWeeklyTrend(transactions) {
    // Group by week and calculate totals
    return {};
  }
}
```

2. **Charts Integration**:
   - Use Chart.js or Recharts for visualizations
   - Pie charts for category breakdown
   - Line charts for spending trends

---

## 1️⃣1️⃣ Push Notification Centre

### Implementation Steps:
1. **Notification System**:
```javascript
const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: ['deposit', 'withdrawal', 'purchase', 'alert', 'promo'] },
  title: String,
  message: String,
  data: Object, // Additional data for actions
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
```

2. **Push Notifications**:
   - Integrate Firebase Cloud Messaging (FCM)
   - Request notification permissions
   - Handle foreground/background notifications

3. **In-App Notification Center**:
   - List all notifications
   - Mark as read
   - Action buttons (e.g., view transaction)

---

## 1️⃣2️⃣ Offline Mode (Mini Cache System)

### Implementation Steps:
1. **Cache Service**:
```javascript
class CacheService {
  static cacheData(key, data) {
    try {
      localStorage.setItem(`paylink_${key}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Cache storage failed:', error);
    }
  }

  static getCachedData(key, maxAge = 24 * 60 * 60 * 1000) { // 24 hours
    try {
      const cached = localStorage.getItem(`paylink_${key}`);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > maxAge) {
        this.clearCache(key);
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  }

  static clearCache(key) {
    localStorage.removeItem(`paylink_${key}`);
  }
}
```

2. **Offline Data**:
   - Last dashboard balance
   - Recent transactions (last 10)
   - Saved beneficiaries
   - User profile data

3. **Sync on Reconnect**:
   - Detect online status
   - Sync cached data when back online

---

## 1️⃣3️⃣ Referral Program

### Implementation Steps:
1. **Referral System**:
```javascript
const referralSchema = new mongoose.Schema({
  referrerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  refereeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  referralCode: { type: String, unique: true },
  status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
  rewards: {
    referrer: { type: Number, default: 0 },
    referee: { type: Number, default: 0 }
  },
  createdAt: { type: Date, default: Date.now }
});
```

2. **Referral Logic**:
   - Generate unique referral codes
   - Track signups via referral links
   - Award bonuses on successful referrals

3. **Dashboard**:
   - Referral link generation
   - Referral statistics
   - Earnings tracking

---

## 1️⃣4️⃣ Admin Dashboard (Developers Side)

### Implementation Steps:
1. **Separate Admin App**:
   - Create admin dashboard with React
   - Admin authentication system

2. **Admin Features**:
```javascript
// Admin routes
app.get('/api/admin/users', adminAuth, async (req, res) => {
  const users = await User.find().select('-password -pin');
  res.json({ users });
});

app.get('/api/admin/transactions', adminAuth, async (req, res) => {
  const transactions = await Transaction.find()
    .populate('userId', 'fullName email')
    .sort({ createdAt: -1 });
  res.json({ transactions });
});

app.get('/api/admin/wallets', adminAuth, async (req, res) => {
  const wallets = await Wallet.find().populate('userId', 'fullName email');
  res.json({ wallets });
});
```

3. **Monitoring Tools**:
   - API usage statistics
   - Failed transaction monitoring
   - Callback log viewer
   - Settlement reports

---

## 1️⃣5️⃣ Developer API Access (Future Expansion)

### Implementation Steps:
1. **API Key Management**:
```javascript
const apiKeySchema = new mongoose.Schema({
  developerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: String,
  key: { type: String, unique: true },
  permissions: [String], // ['airtime', 'data', 'electricity']
  usageLimit: { type: Number, default: 1000 },
  usageCount: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
});
```

2. **Rate Limiting**:
   - Implement API rate limiting
   - Track usage per developer

3. **Documentation**:
   - API documentation portal
   - Code examples
   - Testing sandbox

---

## 1️⃣6️⃣ Automatic Night Mode

### Implementation Steps:
1. **Theme Detection**:
```javascript
class ThemeService {
  static getCurrentTheme() {
    const hour = new Date().getHours();
    return hour >= 19 || hour < 7 ? 'dark' : 'light';
  }

  static setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('paylink_theme', theme);
  }

  static initTheme() {
    const savedTheme = localStorage.getItem('paylink_theme');
    const autoTheme = this.getCurrentTheme();

    const theme = savedTheme || autoTheme;
    this.setTheme(theme);

    // Set up automatic switching if no manual preference
    if (!savedTheme) {
      setInterval(() => {
        const newTheme = this.getCurrentTheme();
        if (newTheme !== this.getCurrentTheme()) {
          this.setTheme(newTheme);
        }
      }, 60 * 60 * 1000); // Check every hour
    }
  }
}
```

2. **CSS Variables**:
```css
:root {
  --bg-color: #ffffff;
  --text-color: #333333;
  --primary-color: #667eea;
}

[data-theme="dark"] {
  --bg-color: #1a1a1a;
  --text-color: #ffffff;
  --primary-color: #764ba2;
}
```

---

## 1️⃣7️⃣ Bulk Purchase System (For Businesses)

### Implementation Steps:
1. **Bulk Purchase Interface**:
```javascript
class BulkPurchaseService {
  static async processBulkPurchase(userId, purchases) {
    const results = [];

    for (const purchase of purchases) {
      try {
        const result = await this.processSinglePurchase(userId, purchase);
        results.push({ ...purchase, status: 'success', result });
      } catch (error) {
        results.push({ ...purchase, status: 'failed', error: error.message });
      }
    }

    return results;
  }

  static async processSinglePurchase(userId, purchase) {
    // Individual purchase logic
  }
}
```

2. **CSV Upload**:
   - File upload component
   - CSV parsing
   - Validation and preview

3. **Bulk Processing**:
   - Queue system for large batches
   - Progress tracking
   - Error reporting

---

## 1️⃣8️⃣ Split Bills Feature

### Implementation Steps:
1. **Bill Split Model**:
```javascript
const billSplitSchema = new mongoose.Schema({
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: String,
  totalAmount: Number,
  participants: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: Number,
    paid: { type: Boolean, default: false },
    paidAt: Date
  }],
  service: {
    type: String, // electricity, data, cable
    provider: String,
    accountNumber: String
  },
  status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});
```

2. **Split Logic**:
   - Create split bill
   - Send invitations to participants
   - Track payments
   - Auto-complete when all paid

3. **Notifications**:
   - Payment reminders
   - Completion notifications

---

## 1️⃣9️⃣ Transaction Retry System

### Implementation Steps:
1. **Retry Logic**:
```javascript
class TransactionRetryService {
  static async retryTransaction(transactionId, maxRetries = 3) {
    const transaction = await Transaction.findById(transactionId);

    if (transaction.retryCount >= maxRetries) {
      // Initiate refund
      await this.initiateRefund(transaction);
      return { status: 'refunded' };
    }

    try {
      // Retry the transaction with PayFlex
      const result = await this.callPayFlexAPI(transaction);

      // Update transaction status
      transaction.status = 'success';
      transaction.reference = result.reference;
      await transaction.save();

      return { status: 'success', result };
    } catch (error) {
      transaction.retryCount += 1;
      await transaction.save();

      // Retry again after delay
      setTimeout(() => {
        this.retryTransaction(transactionId, maxRetries);
      }, 5000 * transaction.retryCount); // Exponential backoff

      return { status: 'retrying' };
    }
  }

  static async initiateRefund(transaction) {
    // Refund logic - credit back to wallet
    const wallet = await Wallet.findOne({ userId: transaction.userId });
    wallet.balance += transaction.amount;
    await wallet.save();

    transaction.status = 'refunded';
    await transaction.save();
  }
}
```

2. **Error Handling**:
   - Categorize errors (temporary vs permanent)
   - Appropriate retry strategies

---

## 2️⃣0️⃣ Auto Top-Up Feature

### Implementation Steps:
1. **Auto Top-Up Rules**:
```javascript
const autoTopupSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  ruleType: { type: String, enum: ['balance', 'data', 'electricity'] },
  threshold: Number, // e.g., balance < 500
  action: {
    type: String, // airtime, data, electricity
    amount: Number,
    provider: String,
    accountNumber: String
  },
  active: { type: Boolean, default: true },
  lastTriggered: Date
});
```

2. **Monitoring Service**:
```javascript
class AutoTopupService {
  static async checkAndTrigger(userId) {
    const rules = await AutoTopup.find({ userId, active: true });

    for (const rule of rules) {
      const shouldTrigger = await this.evaluateRule(rule);

      if (shouldTrigger && this.canTrigger(rule)) {
        await this.executeTopup(rule);
        rule.lastTriggered = new Date();
        await rule.save();
      }
    }
  }

  static async evaluateRule(rule) {
    // Check balance, data usage, etc.
    return false; // Implementation needed
  }

  static canTrigger(rule) {
    // Check cooldown period
    if (!rule.lastTriggered) return true;

    const cooldownHours = 24; // 24 hour cooldown
    const timeSinceLast = Date.now() - rule.lastTriggered.getTime();
    return timeSinceLast > cooldownHours * 60 * 60 * 1000;
  }
}
```

3. **Background Processing**:
   - Cron jobs or scheduled tasks
   - Real-time monitoring for balance changes

---

## Implementation Priority

1. **High Priority**: Fraud Detection, Smart Receipts, Reward Points, Two Wallets, Beneficiary Management
2. **Medium Priority**: Login Insights, Virtual Cards, Biometrics, Analytics, Notifications, Offline Mode
3. **Low Priority**: Referral Program, Admin Dashboard, Developer API, Night Mode, Bulk Purchase, Split Bills, Transaction Retry, Auto Top-Up

Each feature should be implemented incrementally with proper testing and user feedback.
