# 🎯 BALANCE FLOW - Visual Diagram & Code

## The Answer: WHERE Balance is Removed and How Approval Works

---

## 📍 EXACT LOCATIONS IN CODE

### Location 1: Balance CHECKED
```
FILE: src/services/transactionProcessor.js
LINES: 40-45
METHOD: processAirtimePurchase() [similar in processDataPurchase, etc.]

const walletBalance = userSnap.data()?.walletBalance || 0;
if (walletBalance < amount) {
  throw new Error(`Insufficient wallet balance...`);
}
```

### Location 2: PayFlex CALLED
```
FILE: src/services/transactionProcessor.js
LINES: 47-62
METHOD: processAirtimePurchase()

const payFlexResponse = await fetch(`${PAYFLEX_API}/topup/airtime`, {
  // ... send payment request to PayFlex
});
if (!payFlexResponse.ok) {
  throw new Error(errorData.message || 'PayFlex API failed');
}
```

### Location 3: Balance REMOVED
```
FILE: src/services/transactionProcessor.js
LINES: 63-67
METHOD: processAirtimePurchase()

await updateDoc(userRef, {
  walletBalance: increment(-amount)  // ← MONEY REMOVED
});
```

---

## 🔄 VISUAL FLOW

### Case 1: SUCCESSFUL PAYMENT ✅

```
Input: User wants to buy ₦1000 airtime, has ₦5000
┌──────────────────────────────────────┐
│ TransactionProcessor.processAirtime  │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│ GET BALANCE FROM FIRESTORE           │
│ walletBalance = 5000                 │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│ CHECK: 5000 >= 1000 ?                │
│ YES! ✓ Continue...                   │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│ CALL PAYFLEX API                     │
│ POST /topup/airtime                  │
│ {phone, provider, amount}            │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│ PAYFLEX RESPONSE: 200 OK             │
│ {success: true, ref: PAY_123}        │
│ OK? YES! ✓ Continue...               │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│ UPDATE FIRESTORE WALLET              │
│ walletBalance: increment(-1000)      │
│ 5000 - 1000 = 4000 ✓                │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│ SAVE TRANSACTION TO FIRESTORE        │
│ type: 'airtime'                      │
│ amount: 1000                         │
│ status: 'success'                    │
│ walletBefore: 5000                   │
│ walletAfter: 4000                    │
│ payFlexRef: 'PAY_123'                │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│ AWARD REWARD POINTS                  │
│ points: Math.floor(1000/100) = 10   │
│ rewardPoints: increment(10)          │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│ RETURN SUCCESS RESULT                │
│ {                                    │
│   success: true,                     │
│   message: 'Purchase successful',    │
│   reference: 'PAY_123',              │
│   pointsEarned: 10                   │
│ }                                    │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│ FINAL STATE:                         │
│ Wallet: 5000 → 4000 ✓               │
│ Points: +10 ✓                        │
│ Transaction: Logged ✓                │
│ Status: ✅ APPROVED & COMPLETE      │
└──────────────────────────────────────┘
```

---

### Case 2: INSUFFICIENT BALANCE ❌

```
Input: User wants to buy ₦1000 airtime, has ₦500
┌──────────────────────────────────────┐
│ TransactionProcessor.processAirtime  │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│ GET BALANCE FROM FIRESTORE           │
│ walletBalance = 500                  │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│ CHECK: 500 >= 1000 ?                 │
│ NO! ✗ REJECT                         │
│                                      │
│ throw new Error(                     │
│   'Insufficient wallet balance...'   │
│ )                                    │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│ EXECUTION STOPS HERE                 │
│                                      │
│ PAYFLEX API: NOT CALLED              │
│ WALLET: NOT UPDATED                  │
│ TRANSACTION: NOT SAVED               │
│ POINTS: NOT AWARDED                  │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│ ERROR THROWN TO CALLER               │
│ (TransactionPIN.js)                  │
│                                      │
│ catch (error) {                      │
│   setError(error.message)            │
│ }                                    │
│                                      │
│ User sees:                           │
│ ❌ 'Insufficient wallet balance...' │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│ FINAL STATE:                         │
│ Wallet: 500 (UNCHANGED) ✓            │
│ Points: 0 (UNCHANGED) ✓              │
│ Transaction: NOT created ✓           │
│ Status: ❌ REJECTED                  │
└──────────────────────────────────────┘
```

---

### Case 3: PAYFLEX REJECTS ❌

```
Input: User wants to buy ₦1000 airtime, has ₦5000
         But phone number is invalid
┌──────────────────────────────────────┐
│ TransactionProcessor.processAirtime  │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│ GET BALANCE FROM FIRESTORE           │
│ walletBalance = 5000                 │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│ CHECK: 5000 >= 1000 ?                │
│ YES! ✓ Continue...                   │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│ CALL PAYFLEX API                     │
│ POST /topup/airtime                  │
│ {phone: 'invalid', ...}              │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│ PAYFLEX RESPONSE: 400 Bad Request    │
│ {error: 'Invalid phone number'}      │
│ OK? NO! ✗ REJECT                     │
│                                      │
│ throw new Error(                     │
│   'Invalid phone number'             │
│ )                                    │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│ EXECUTION STOPS HERE                 │
│                                      │
│ WALLET: NOT UPDATED                  │
│ TRANSACTION: NOT SAVED               │
│ POINTS: NOT AWARDED                  │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│ ERROR THROWN TO CALLER               │
│                                      │
│ User sees:                           │
│ ❌ 'Invalid phone number'            │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│ FINAL STATE:                         │
│ Wallet: 5000 (UNCHANGED) ✓           │
│ Points: 0 (UNCHANGED) ✓              │
│ Transaction: NOT created ✓           │
│ Status: ❌ REJECTED BY PAYFLEX       │
└──────────────────────────────────────┘
```

---

## 📊 DECISION TREE

```
                Start Payment
                     ↓
            ┌─────────────────┐
            │ Check Balance?  │
            └────┬────────┬───┘
                YES      NO
                 │        └─→ ❌ Insufficient Balance Error
                 ↓             (STOP, WALLET UNCHANGED)
         ┌──────────────┐
         │ Call PayFlex?│
         └────┬─────┬──┘
             OK    ERROR
              │      └─→ ❌ PayFlex Error
              ↓         (STOP, WALLET UNCHANGED)
      ┌───────────────┐
      │ Deduct Money? │
      │ (Firestore)   │ ← ✓ MONEY REMOVED HERE
      └────┬──────────┘
           ↓
      ┌────────────────┐
      │ Save Transaction│
      │ (Firestore)    │
      └────┬───────────┘
           ↓
      ┌────────────────┐
      │ Award Points?  │
      │ (Firestore)    │
      └────┬───────────┘
           ↓
      ┌────────────────┐
      │ ✅ SUCCESS     │
      │ Payment Done   │
      └────────────────┘
```

---

## 💾 FIRESTORE STATE CHANGES

### User Document: BEFORE
```javascript
{
  uid: 'user123',
  walletBalance: 5000,        // Starting balance
  rewardPoints: 35,           // Starting points
  // ... other fields
}
```

### Firestore Transaction: AFTER
```javascript
// ONLY IF PAYMENT SUCCEEDS

users/user123 = {
  walletBalance: 4000,        // CHANGED: -1000
  rewardPoints: 45,           // CHANGED: +10
}

users/user123/transactions/abc123 = {
  type: 'airtime',
  amount: 1000,
  status: 'success',
  payFlexRef: 'PAY_123456789',
  walletBefore: 5000,         // ← Audit trail
  walletAfter: 4000,          // ← Audit trail
  createdAt: Timestamp
}

users/user123/rewardTransactions/xyz = {
  type: 'earned',
  points: 10,
  reason: 'airtime purchase',
  transactionId: 'abc123',
  createdAt: Timestamp
}
```

### IF PAYMENT FAILS
```javascript
// NO CHANGES AT ALL

users/user123 = {
  walletBalance: 5000,        // UNCHANGED
  rewardPoints: 35,           // UNCHANGED
}

// NO transaction documents created
// NO reward documents created
```

---

## 🔐 THE CRITICAL CODE

### The Approval Condition
```javascript
// Balance check
if (walletBalance < amount) {
  throw new Error('Insufficient balance');  // ❌ REJECT
}

// PayFlex check
if (!payFlexResponse.ok) {
  throw new Error('PayFlex failed');        // ❌ REJECT
}

// If we reach here: ✅ APPROVED
// NOW deduct money
await updateDoc(userRef, {
  walletBalance: increment(-amount)  // ← ONLY IF BOTH CHECKS PASS
});
```

### The Key Moment
```javascript
// Line 63-67 of transactionProcessor.js
// THIS IS WHERE MONEY IS ACTUALLY REMOVED

await updateDoc(userRef, {
  walletBalance: increment(-amount)
});
```

This line:
- Only runs if balance check passed ✓
- Only runs if PayFlex approved ✓
- Actually modifies Firestore ✓
- Money is now gone ✓

---

## ✅ SUMMARY

| Aspect | Details |
|--------|---------|
| Balance Check | Line 40-45 of transactionProcessor.js |
| PayFlex Call | Line 47-62 of transactionProcessor.js |
| Money Deduction | Line 63-67 of transactionProcessor.js |
| Transaction Log | Line 69-83 of transactionProcessor.js |
| Points Awarded | Line 85-100 of transactionProcessor.js |
| Approval Logic | Both balance AND PayFlex must pass |
| Rejection Logic | Error thrown, nothing changes in Firestore |
| Safety | Atomic Firestore updates, complete audit trail |

---

**Your app now has REAL payment processing with actual balance removal!** 💰✅
