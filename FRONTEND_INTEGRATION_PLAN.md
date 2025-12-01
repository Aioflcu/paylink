# 🔗 Frontend Integration - Implementation Plan

**Status:** ⏳ **IN PROGRESS**  
**Backend Status:** ✅ **READY**  
**Frontend Status:** ⏳ **Starting integration**  

---

## 📋 What Needs to Be Done

All backend endpoints are ready. Now we need to update the frontend pages to call them instead of local processing.

### ✅ API Service Created

New file: `/src/services/backendAPI.js`
- ✅ Payment API calls (9 payment types + history + stats)
- ✅ Security API calls (PIN, 2FA, password, devices, login history)
- ✅ Wallet API calls (balance, deposits, withdrawals)
- ✅ PayFlex Proxy API calls (live providers, plans, search)

**Features:**
- ✅ Automatic Firebase token injection
- ✅ Automatic device ID generation
- ✅ Standard error handling
- ✅ Centralized API base URL

---

## 🎯 Frontend Pages to Update

### Priority 1: Payment Pages (CRITICAL)
These are the main pages users use. Must fetch live providers and submit to backend.

- [ ] **Airtime.js** 
  - [ ] Replace PayFlex service with backendAPI.payflexAPI
  - [ ] Fetch live providers: `payflexAPI.getProviders('airtime')`
  - [ ] Submit to backend: `paymentAPI.buyAirtime()`

- [ ] **Data.js**
  - [ ] Replace PayFlex service with backendAPI
  - [ ] Fetch providers & plans dynamically
  - [ ] Submit to backend: `paymentAPI.buyData()`

- [ ] **Electricity.js**
  - [ ] Fetch live providers
  - [ ] Submit to backend: `paymentAPI.payElectricity()`

- [ ] **CableTV.js**
  - [ ] Fetch live providers & plans
  - [ ] Submit to backend: `paymentAPI.payCableTV()`

- [ ] **Internet.js**
  - [ ] Fetch live providers & plans
  - [ ] Submit to backend: `paymentAPI.buyInternet()`

- [ ] **Education.js**
  - [ ] Keep current flow
  - [ ] Submit to backend: `paymentAPI.payEducation()`

- [ ] **Insurance.js**
  - [ ] Fetch live providers
  - [ ] Submit to backend: `paymentAPI.payInsurance()`

- [ ] **Giftcard.js**
  - [ ] Fetch live providers
  - [ ] Submit to backend: `paymentAPI.buyGiftCard()`

- [ ] **Tax.js**
  - [ ] Fetch live providers
  - [ ] Submit to backend: `paymentAPI.payTax()`

### Priority 2: Security Pages (HIGH)
These handle user security features that don't work currently.

- [ ] **TransactionPIN.js**
  - [ ] Update PIN setting: `securityAPI.setPin(pin)`
  - [ ] Check PIN status: `securityAPI.checkPinStatus()`
  - [ ] Show if PIN is set/not set

- [ ] **SecuritySettings.js** (Create if missing)
  - [ ] Enable 2FA: `securityAPI.enable2FA()`
  - [ ] Disable 2FA: `securityAPI.disable2FA(pin)`
  - [ ] Check 2FA status: `securityAPI.get2FAStatus()`
  - [ ] Change password: `securityAPI.changePassword()`

- [ ] **LoginHistory.js**
  - [ ] Fetch login history: `securityAPI.getLoginHistory()`
  - [ ] Display IP, device, timestamp, status

- [ ] **DeviceManagement.js** (Create if missing)
  - [ ] List devices: `securityAPI.getDevices()`
  - [ ] Remove device: `securityAPI.removeDevice(deviceId)`

### Priority 3: Wallet Pages (MEDIUM)
These handle wallet operations that fail currently.

- [ ] **Wallet.js**
  - [ ] Fetch balance: `walletAPI.getBalance()`
  - [ ] Update on page load and after transactions

- [ ] **Deposits.js** (Create if missing)
  - [ ] Submit deposit: `walletAPI.deposit(amount, method)`
  - [ ] Show success/pending status

- [ ] **Withdrawals.js** (Create if missing)
  - [ ] Submit withdrawal: `walletAPI.withdraw(amount, account, pin)`
  - [ ] Verify status: `walletAPI.verifyWithdrawal(txId)`

### Priority 4: History Pages (LOW)
These display transaction data.

- [ ] **TransactionHistory.js**
  - [ ] Fetch history: `paymentAPI.getHistory(limit, type)`
  - [ ] Display all transactions with filtering

---

## 📝 Implementation Pattern

### Before (Local Processing)
```javascript
// Old way - payment processed locally, no backend
const handlePayment = async () => {
  const result = processPaymentLocally({...});
  navigate('/success');
}
```

### After (Backend Integration)
```javascript
// New way - backend processes payment
const handlePayment = async () => {
  try {
    setLoading(true);
    const result = await paymentAPI.buyAirtime(
      phone,
      amount,
      provider,
      pinHash // optional
    );
    
    if (result.success) {
      // Show success with transaction ID
      navigate('/success', {
        state: {
          transactionId: result.transaction.id,
          amount: result.transaction.amount,
          fee: result.transaction.fee,
          rewardPoints: result.transaction.rewardPoints
        }
      });
    }
  } catch (error) {
    setError(error.data?.error || error.message);
  } finally {
    setLoading(false);
  }
}
```

---

## 🔑 Key Integration Points

### 1. Fetch Live Providers
```javascript
import { payflexAPI } from '../services/backendAPI';

useEffect(() => {
  const fetchProviders = async () => {
    try {
      const data = await payflexAPI.getProviders('airtime');
      setProviders(data.providers);
    } catch (error) {
      console.error('Failed to fetch providers:', error);
      // Fallback to hardcoded list
    }
  };
  
  fetchProviders();
}, []);
```

### 2. Fetch Live Plans
```javascript
const handleProviderSelect = async (provider) => {
  try {
    const data = await payflexAPI.getPlans('data', provider.code);
    setPlans(data.plans); // Has pricing!
  } catch (error) {
    console.error('Failed to fetch plans:', error);
  }
};
```

### 3. Submit Payment
```javascript
import { paymentAPI } from '../services/backendAPI';

const handleSubmitPayment = async () => {
  try {
    setLoading(true);
    const result = await paymentAPI.buyAirtime(
      phoneNumber,
      amount,
      provider.code,
      pinHash // if PIN required
    );
    
    // Show transaction ID
    alert(`Payment successful! ID: ${result.transaction.id}`);
  } catch (error) {
    // Backend returns error details
    setError(error.data?.error || 'Payment failed');
  } finally {
    setLoading(false);
  }
};
```

### 4. Handle PIN Requirement
```javascript
try {
  const result = await paymentAPI.buyAirtime(...);
} catch (error) {
  if (error.status === 403 && error.data?.error?.includes('PIN')) {
    // User needs to set PIN first
    navigate('/security/set-pin');
  }
}
```

---

## 🚦 Status Indicators

### For Each Page:

```javascript
// Check if PIN is set before payment
const [pinSet, setPinSet] = useState(null);

useEffect(() => {
  const checkPin = async () => {
    try {
      const data = await securityAPI.checkPinStatus();
      setPinSet(data.pinSet);
    } catch (error) {
      console.error('Failed to check PIN:', error);
    }
  };
  
  if (currentUser) checkPin();
}, [currentUser]);

// In payment handler
if (!pinSet) {
  alert('Please set a transaction PIN first');
  navigate('/security/set-pin');
  return;
}
```

---

## 🧪 Testing Checklist

For each payment page:
- [ ] Live providers fetch correctly
- [ ] Live plans/pricing display
- [ ] Payment submits to backend
- [ ] Success message shows transaction ID
- [ ] Error handling works
- [ ] Wallet balance updates after payment
- [ ] Reward points displayed

For security pages:
- [ ] PIN setting works
- [ ] 2FA enable/disable works
- [ ] Login history displays correctly
- [ ] Device management works
- [ ] Password change works

For wallet pages:
- [ ] Balance displays correctly
- [ ] Deposits/withdrawals work
- [ ] Transaction history loads
- [ ] Filter by type works

---

## 📊 Estimated Time

| Task | Estimated Time | Status |
|------|----------------|--------|
| Airtime integration | 30 min | ⏳ |
| Data integration | 30 min | ⏳ |
| Electricity integration | 20 min | ⏳ |
| CableTV integration | 20 min | ⏳ |
| Internet integration | 20 min | ⏳ |
| Education integration | 15 min | ⏳ |
| Insurance integration | 15 min | ⏳ |
| Giftcard integration | 15 min | ⏳ |
| Tax integration | 15 min | ⏳ |
| TransactionPIN integration | 20 min | ⏳ |
| Security pages | 45 min | ⏳ |
| Wallet pages | 45 min | ⏳ |
| Testing | 60 min | ⏳ |
| **TOTAL** | **~6 hours** | **⏳** |

---

## ✅ Done

- [x] Backend fully implemented
- [x] Backend API service (`backendAPI.js`) created
- [x] Documentation complete

---

## ⏳ Next Steps

1. **Start with Priority 1 pages** (Airtime → Data → Electricity → etc.)
2. **Update each page to:**
   - Import `paymentAPI` and `payflexAPI`
   - Fetch live providers on mount
   - Submit to backend on payment
   - Display transaction ID on success
3. **Test each payment flow** with real or mock data
4. **Move to Priority 2 pages** (Security features)
5. **Move to Priority 3 pages** (Wallet features)

---

**Status:** Backend ready ✅ | Frontend integration starting ⏳

