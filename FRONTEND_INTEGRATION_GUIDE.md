# 🔗 Frontend-Backend Integration Guide

**For:** Frontend developers integrating with new backend payment system  
**Status:** Backend ready - waiting for frontend integration  
**Last Updated:** Session 5

---

## 📡 API Base URL

```javascript
// In your environment
const API_BASE_URL = 'http://localhost:5000'; // Development
// or
const API_BASE_URL = 'https://your-production-domain.com'; // Production
```

---

## 🔑 Authentication

All payment/security/wallet requests require a Firebase ID token:

```javascript
// In your API service
const headers = {
  'Authorization': `Bearer ${await auth.currentUser.getIdToken()}`,
  'Content-Type': 'application/json',
  'x-device-id': deviceId // Required for device tracking
};
```

---

## 💳 Payment Endpoints

### Buy Airtime

```javascript
// Request
POST /api/payments/airtime
{
  "phone": "09012345678",
  "amount": 100,           // in kobo
  "provider": "MTN",       // Get from /api/payflex-proxy/providers/airtime
  "pinHash": "abc123..."   // Optional if user has PIN set
}

// Response (Success)
{
  "success": true,
  "message": "Airtime bought successfully",
  "transaction": {
    "id": "txn_123...",
    "amount": 100,
    "fee": 50,
    "totalAmount": 150,
    "rewardPoints": 1,
    "status": "completed"
  }
}

// Response (Failure)
{
  "error": "Insufficient wallet balance",
  "required": 150,
  "available": 50
}
```

### Buy Data

```javascript
// Request
POST /api/payments/data
{
  "phone": "09012345678",
  "planId": "data_5gb",     // Get from /api/payflex-proxy/plans
  "provider": "MTN",
  "amount": 500,
  "pinHash": "abc123..."    // Optional
}

// Response (Success)
{
  "success": true,
  "message": "Data bought successfully",
  "transaction": {
    "id": "txn_456...",
    "amount": 500,
    "fee": 50,
    "totalAmount": 550,
    "rewardPoints": 5,
    "status": "completed"
  }
}
```

### Pay Electricity

```javascript
// Request
POST /api/payments/electricity
{
  "meterNumber": "12345678901",
  "meterType": "prepaid",           // or "postpaid"
  "amount": 5000,
  "disco": "EKEDC",                 // Get from /api/payflex-proxy/providers/electricity
  "pinHash": "abc123..."            // Optional
}

// Response (Success)
{
  "success": true,
  "message": "Electricity bill paid successfully",
  "transaction": {
    "id": "txn_789...",
    "amount": 5000,
    "fee": 100,
    "totalAmount": 5100,
    "rewardPoints": 25,
    "status": "completed"
  }
}
```

### Pay Cable TV

```javascript
// Request
POST /api/payments/cable
{
  "smartcardNumber": "123456789",
  "provider": "DSTV",               // Get from /api/payflex-proxy/providers/cable
  "planId": "premium",              // Get from /api/payflex-proxy/plans
  "amount": 10000,
  "pinHash": "abc123..."            // Optional
}

// Response (Success)
{
  "success": true,
  "message": "Cable TV subscription paid successfully",
  "transaction": {
    "id": "txn_...",
    "amount": 10000,
    "fee": 50,
    "totalAmount": 10050,
    "rewardPoints": 100,
    "status": "completed"
  }
}
```

### Buy Internet

```javascript
// Request
POST /api/payments/internet
{
  "customerId": "CUST123",
  "provider": "SpectraNet",         // Get from /api/payflex-proxy/providers/internet
  "planId": "50mbps",               // Get from /api/payflex-proxy/plans
  "amount": 3000,
  "pinHash": "abc123..."            // Optional
}
```

### Pay Education

```javascript
// Request
POST /api/payments/education
{
  "studentId": "STU123",
  "institution": "University of Lagos",
  "amount": 50000,
  "pinHash": "abc123..."            // Optional
}
```

### Pay Insurance

```javascript
// Request
POST /api/payments/insurance
{
  "policyNumber": "POL123456",
  "provider": "Allianz",            // Get from /api/payflex-proxy/providers/insurance
  "amount": 10000,
  "pinHash": "abc123..."            // Optional
}
```

### Buy Gift Card

```javascript
// Request
POST /api/payments/giftcard
{
  "giftCardCode": "AMAZON123",
  "provider": "Amazon",             // Get from /api/payflex-proxy/providers/giftcard
  "amount": 5000,
  "pinHash": "abc123..."            // Optional
}
```

### Pay Tax

```javascript
// Request
POST /api/payments/tax
{
  "taxType": "income_tax",
  "taxId": "TAX123",
  "authority": "FIRS",              // Get from /api/payflex-proxy/providers/tax
  "amount": 25000,
  "pinHash": "abc123..."            // Optional
}
```

---

## 📊 Transaction History & Stats

### Get Transaction History

```javascript
// Request
GET /api/payments/history?limit=50&type=airtime

// Query Parameters:
// - limit: number (default: 50)
// - type: string (optional) - Filter by type: airtime|data|electricity|cable|internet|education|insurance|giftcard|tax|deposit|withdraw

// Response
{
  "success": true,
  "transactions": [
    {
      "id": "txn_123...",
      "type": "airtime",
      "amount": 100,
      "fee": 50,
      "totalAmount": 150,
      "status": "completed",
      "provider": "MTN",
      "createdAt": "2024-01-15T10:30:00Z",
      "completedAt": "2024-01-15T10:31:15Z"
    },
    // ... more transactions
  ]
}
```

### Get Transaction Stats

```javascript
// Request
GET /api/payments/stats

// Response
{
  "success": true,
  "stats": {
    "totalTransactions": 45,
    "totalAmount": 125000,
    "totalFees": 3500,
    "typeBreakdown": {
      "airtime": 15,
      "data": 20,
      "electricity": 5,
      "cable": 3,
      "education": 2
    }
  }
}
```

---

## 🔐 Security Endpoints

### Set Transaction PIN

```javascript
// Request
POST /api/security/set-pin
{
  "pin": "1234"  // 4-digit PIN (will be hashed)
}

// Response
{
  "success": true,
  "message": "Transaction PIN set successfully"
}
```

### Check PIN Status

```javascript
// Request
GET /api/security/pin-status

// Response
{
  "success": true,
  "pinSet": true  // or false
}
```

### Enable 2FA

```javascript
// Request
POST /api/security/enable-2fa

// Response
{
  "success": true,
  "message": "2FA enabled successfully",
  "secret": "JBSWY3DP3BQVG6TJUAQ..." // For QR code generation
}

// Frontend: Use speakeasy to generate QR code
// npm install speakeasy qrcode
```

### Disable 2FA

```javascript
// Request
POST /api/security/disable-2fa
{
  "pin": "1234"  // User's PIN required for security
}

// Response
{
  "success": true,
  "message": "2FA disabled successfully"
}
```

### Get 2FA Status

```javascript
// Request
GET /api/security/2fa-status

// Response
{
  "success": true,
  "twoFactorEnabled": true  // or false
}
```

### Get Login History

```javascript
// Request
GET /api/security/login-history?limit=50

// Response
{
  "success": true,
  "history": [
    {
      "timestamp": "2024-01-15T10:30:00Z",
      "ipAddress": "192.168.1.1",
      "deviceName": "Chrome on MacOS",
      "userAgent": "Mozilla/5.0...",
      "status": "success"  // or "failed"
    },
    // ... more login records (max 50)
  ]
}
```

### Get All Devices

```javascript
// Request
GET /api/security/devices

// Response
{
  "success": true,
  "devices": [
    {
      "deviceId": "device_123...",
      "deviceName": "Chrome on MacOS",
      "userAgent": "Mozilla/5.0...",
      "ipAddress": "192.168.1.1",
      "lastActive": "2024-01-15T10:30:00Z",
      "createdAt": "2024-01-10T15:20:00Z"
    },
    // ... more devices
  ]
}
```

### Remove Device

```javascript
// Request
DELETE /api/security/devices/device_123

// Response
{
  "success": true,
  "message": "Device removed successfully"
}
```

---

## 💰 Wallet Endpoints

### Get Wallet Balance

```javascript
// Request
GET /api/wallet/balance

// Response
{
  "success": true,
  "walletBalance": 50000,    // in kobo
  "rewardPoints": 125        // loyalty points
}
```

### Get Wallet Stats

```javascript
// Request
GET /api/wallet/stats

// Response
{
  "success": true,
  "stats": {
    "totalTransactions": 45,
    "totalAmount": 125000,
    "totalFees": 3500,
    "typeBreakdown": {
      "airtime": 15,
      "data": 20,
      // ... etc
    }
  }
}
```

### Get Wallet Transactions

```javascript
// Request
GET /api/wallet/transactions?limit=50&type=deposit

// Response
{
  "success": true,
  "transactions": [
    {
      "id": "txn_123...",
      "type": "deposit",
      "amount": 10000,
      "status": "completed",
      "createdAt": "2024-01-15T10:30:00Z"
    },
    // ... more transactions
  ]
}
```

### Deposit Funds

```javascript
// Request
POST /api/wallet/deposit
{
  "amount": 50000,           // in kobo
  "paymentMethod": "paystack", // or "flutterwave", "monnify"
  "reference": "ref_123..."  // From payment gateway
}

// Response (Success)
{
  "success": true,
  "message": "Deposit successful",
  "transaction": {
    "id": "txn_456...",
    "amount": 50000,
    "status": "completed",
    "walletBalance": 100000
  }
}

// Response (Pending)
{
  "success": true,
  "message": "Deposit initiated. Awaiting payment confirmation.",
  "transaction": {
    "id": "txn_456...",
    "amount": 50000,
    "status": "pending",
    "reference": "ref_123..."
  }
}
```

### Withdraw Funds

```javascript
// Request
POST /api/wallet/withdraw
{
  "amount": 25000,           // in kobo
  "bankAccount": "0123456789",
  "pin": "1234"              // User's transaction PIN
}

// Response
{
  "success": true,
  "message": "Withdrawal request submitted. Processing in progress.",
  "transaction": {
    "id": "txn_789...",
    "amount": 25000,
    "status": "pending",
    "bankAccount": "0123456789",
    "walletBalance": 75000
  }
}
```

### Verify Withdrawal Status

```javascript
// Request
GET /api/wallet/withdraw/txn_789

// Response
{
  "success": true,
  "transaction": {
    "id": "txn_789...",
    "status": "completed",      // or "pending", "failed"
    "amount": 25000,
    "recipient": "0123456789",
    "createdAt": "2024-01-15T10:30:00Z",
    "completedAt": "2024-01-15T11:45:00Z"
  }
}
```

---

## 🌐 Live Provider & Plan Data (PayFlex Proxy)

**No authentication required for these endpoints** - they return live data from PayFlex API

### Get Providers for Service Type

```javascript
// Request
GET /api/payflex-proxy/providers/:serviceType

// Service Types:
// - airtime
// - data
// - electricity
// - cable
// - internet
// - education
// - insurance
// - giftcard
// - tax

// Example:
GET /api/payflex-proxy/providers/airtime

// Response
{
  "success": true,
  "serviceType": "airtime",
  "providers": [
    {
      "code": "MTN",
      "name": "MTN Nigeria",
      "icon": "https://...",
      "description": "MTN Mobile Services"
    },
    {
      "code": "AIRTEL",
      "name": "Airtel Africa",
      "icon": "https://...",
      "description": "Airtel Mobile Services"
    },
    {
      "code": "GLO",
      "name": "Globacom",
      "icon": "https://...",
      "description": "Globacom Mobile Services"
    },
    {
      "code": "9MOBILE",
      "name": "9Mobile",
      "icon": "https://...",
      "description": "9Mobile Mobile Services"
    }
  ]
}
```

### Get Plans for Provider

```javascript
// Request
GET /api/payflex-proxy/plans?serviceType=data&providerCode=MTN

// Response
{
  "success": true,
  "serviceType": "data",
  "providerCode": "MTN",
  "plans": [
    {
      "planId": "data_500mb",
      "name": "500MB",
      "price": 150,           // in kobo
      "validity": "1 month",
      "description": "500MB Data Plan"
    },
    {
      "planId": "data_1gb",
      "name": "1GB",
      "price": 260,
      "validity": "1 month",
      "description": "1GB Data Plan"
    },
    {
      "planId": "data_2gb",
      "name": "2GB",
      "price": 500,
      "validity": "1 month",
      "description": "2GB Data Plan"
    },
    {
      "planId": "data_5gb",
      "name": "5GB",
      "price": 1100,
      "validity": "1 month",
      "description": "5GB Data Plan"
    }
  ]
}
```

### Search Providers

```javascript
// Request
GET /api/payflex-proxy/search?serviceType=electricity&query=EKEDC

// Response
{
  "success": true,
  "serviceType": "electricity",
  "query": "EKEDC",
  "providers": [
    {
      "code": "EKEDC",
      "name": "Eko Electricity Distribution Company",
      "icon": "https://...",
      "description": "EKEDC - Lagos & Environs"
    }
  ]
}
```

---

## 📱 Frontend Integration Example

### React Component Example - Airtime Page

```javascript
import React, { useState, useEffect } from 'react';
import { auth } from './firebase-config';

const AirtimePage = () => {
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [provider, setProvider] = useState('');
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch providers on mount
  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const response = await fetch(
        'http://localhost:5000/api/payflex-proxy/providers/airtime'
      );
      const data = await response.json();
      if (data.success) {
        setProviders(data.providers);
      }
    } catch (err) {
      console.error('Failed to fetch providers:', err);
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(
        'http://localhost:5000/api/payments/airtime',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-device-id': localStorage.getItem('deviceId')
          },
          body: JSON.stringify({
            phone,
            amount: parseInt(amount),
            provider,
            // pinHash: hashPin(pin) // if PIN required
          })
        }
      );

      const data = await response.json();

      if (data.success) {
        alert(`Success! Transaction ID: ${data.transaction.id}`);
        // Update wallet balance
        // Show reward points earned
      } else {
        setError(data.error || data.message);
      }
    } catch (err) {
      setError('Payment failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handlePayment}>
      <input
        type="tel"
        placeholder="Phone number"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        required
      />

      <select value={provider} onChange={(e) => setProvider(e.target.value)} required>
        <option value="">Select provider</option>
        {providers.map((p) => (
          <option key={p.code} value={p.code}>
            {p.name}
          </option>
        ))}
      </select>

      <input
        type="number"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
      />

      {error && <div className="error">{error}</div>}

      <button type="submit" disabled={loading}>
        {loading ? 'Processing...' : 'Buy Airtime'}
      </button>
    </form>
  );
};

export default AirtimePage;
```

---

## 🔄 Error Handling

All endpoints return errors in this format:

```javascript
// 400 Bad Request - Invalid input
{
  "error": "Phone number is required",
  "message": "Validation failed"
}

// 403 Forbidden - PIN required or invalid
{
  "error": "Invalid transaction PIN",
  "requiresPin": true  // Indicates user needs to set PIN
}

// 500 Internal Server Error - PayFlex API failure
{
  "error": "Payment processing failed",
  "message": "Failed to connect to PayFlex API",
  "transactionId": "txn_123..."  // For support reference
}
```

---

## 🧪 Testing API Locally

```bash
# Install httpie or use curl
brew install httpie  # Mac
# or apt-get install httpie  # Linux

# Get token from Firebase (replace with real token)
TOKEN="your_firebase_id_token"

# Test airtime endpoint
http POST http://localhost:5000/api/payments/airtime \
  Authorization:"Bearer $TOKEN" \
  phone=09012345678 \
  amount:=100 \
  provider=MTN

# Test balance endpoint
http GET http://localhost:5000/api/wallet/balance \
  Authorization:"Bearer $TOKEN"

# Test providers endpoint (no auth needed)
http GET http://localhost:5000/api/payflex-proxy/providers/airtime
```

---

**Status:** ✅ All endpoints ready for integration!
