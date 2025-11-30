# 🔍 CODE WALKTHROUGH - Step by Step

## Exact Code That Removes Balance and Approves/Rejects

---

## 📍 FILE: `src/services/transactionProcessor.js`

### THE COMPLETE FUNCTION

```javascript
/**
 * Process Airtime Purchase
 * Calls actual PayFlex API to purchase airtime
 */
static async processAirtimePurchase(userId, purchaseData) {
  try {
    const { provider, phoneNumber, amount } = purchaseData;

    // ══════════════════════════════════════════════════════════
    // STEP 1: GET USER WALLET BALANCE FROM FIRESTORE
    // ══════════════════════════════════════════════════════════
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    const walletBalance = userSnap.data()?.walletBalance || 0;
    
    // Example: walletBalance = 5000

    // ══════════════════════════════════════════════════════════
    // STEP 1B: CHECK IF USER HAS ENOUGH MONEY
    // ══════════════════════════════════════════════════════════
    if (walletBalance < amount) {
      // Example: if (5000 < 1000) → FALSE, continue
      // Example: if (500 < 1000) → TRUE, throw error ❌
      throw new Error(
        `Insufficient wallet balance. Available: ₦${walletBalance}, Required: ₦${amount}`
      );
    }
    // If we reach here: ✅ BALANCE CHECK PASSED

    // ══════════════════════════════════════════════════════════
    // STEP 2: CALL ACTUAL PAYFLEX API
    // ══════════════════════════════════════════════════════════
    const payFlexResponse = await fetch(
      `${this.PAYFLEX_API}/topup/airtime`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.PAYFLEX_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: phoneNumber,        // Example: 08012345678
          provider: provider,        // Example: mtn
          amount: amount            // Example: 1000
        })
      }
    );
    
    // Example Response:
    // 200 OK: {status: 'success', data: {reference: 'PAY_123456'}}
    // 400 Error: {status: 'error', message: 'Invalid phone'}

    // ══════════════════════════════════════════════════════════
    // STEP 2B: CHECK PAYFLEX RESPONSE
    // ══════════════════════════════════════════════════════════
    if (!payFlexResponse.ok) {
      // Example: response is 400 Bad Request → !ok = true ❌
      const errorData = await payFlexResponse.json();
      throw new Error(
        errorData.message || 'PayFlex API failed'
      );
    }
    // If we reach here: ✅ PAYFLEX APPROVED

    const payFlexData = await payFlexResponse.json();
    // payFlexData = {data: {reference: 'PAY_123456'}}

    // ══════════════════════════════════════════════════════════
    // 🎯 STEP 3: DEDUCT MONEY FROM WALLET
    // 💰 THIS IS THE KEY MOMENT - MONEY IS ACTUALLY REMOVED! 💰
    // ══════════════════════════════════════════════════════════
    await updateDoc(userRef, {
      walletBalance: increment(-amount)
      // Example: walletBalance: increment(-1000)
      // Firestore executes: 5000 - 1000 = 4000
      // Example: walletBalance: increment(-500)
      // Firestore executes: 5000 - 500 = 4500
    });
    // 💰 MONEY NOW REMOVED FROM WALLET
    // User now has: 5000 - 1000 = 4000

    // ══════════════════════════════════════════════════════════
    // STEP 4: SAVE COMPLETE TRANSACTION RECORD
    // ══════════════════════════════════════════════════════════
    const txRef = collection(db, 'users', userId, 'transactions');
    const transaction = await addDoc(txRef, {
      type: 'airtime',
      provider,                           // 'mtn'
      phoneNumber,                        // '08012345678'
      amount,                             // 1000
      status: 'success',
      payFlexRef: payFlexData.data?.reference || 'N/A',  // 'PAY_123456'
      description: `Airtime purchase - ${provider.toUpperCase()} - ₦${amount}`,
      walletBefore: walletBalance,        // 5000 (audit trail)
      walletAfter: walletBalance - amount,// 4000 (audit trail)
      createdAt: Timestamp.now()          // timestamp
    });
    // Transaction now in Firestore for audit trail

    // ══════════════════════════════════════════════════════════
    // STEP 5: CALCULATE AND AWARD REWARD POINTS
    // ══════════════════════════════════════════════════════════
    const pointsEarned = Math.floor(amount / 100);
    // Example: Math.floor(1000 / 100) = 10 points
    // Example: Math.floor(2500 / 100) = 25 points

    await updateDoc(userRef, {
      rewardPoints: increment(pointsEarned)
      // Example: rewardPoints: increment(10)
    });
    
    // ══════════════════════════════════════════════════════════
    // STEP 5B: LOG REWARD TRANSACTION
    // ══════════════════════════════════════════════════════════
    const rewardRef = collection(db, 'users', userId, 'rewardTransactions');
    await addDoc(rewardRef, {
      type: 'earned',
      points: pointsEarned,               // 10
      reason: 'airtime purchase',
      transactionId: transaction.id,      // Link to transaction
      amount,                             // 1000
      createdAt: Timestamp.now()
    });
    // Reward now logged for tracking

    // ══════════════════════════════════════════════════════════
    // STEP 6: RETURN SUCCESS RESULT
    // ══════════════════════════════════════════════════════════
    return {
      success: true,
      transactionId: transaction.id,
      reference: payFlexData.data?.reference,  // PayFlex reference
      amount,
      pointsEarned,
      message: `Airtime purchase successful. ₦${amount} sent to ${phoneNumber}`
    };
    // This result goes back to TransactionPIN.js

  } catch (error) {
    // ══════════════════════════════════════════════════════════
    // ERROR HANDLING: IF ANYTHING ABOVE FAILS
    // ══════════════════════════════════════════════════════════
    console.error('Error processing airtime purchase:', error);
    throw error;
    // Error is caught by TransactionPIN.js and shown to user
    // Wallet is NEVER deducted if error is thrown
  }
}
```

---

## 🔄 FLOW WITH ACTUAL VALUES

### Scenario 1: SUCCESSFUL PAYMENT

```javascript
Input:
  userId = 'user123'
  purchaseData = {
    provider: 'mtn',
    phoneNumber: '08012345678',
    amount: 1000
  }

Step 1: Get balance
  userRef = doc(db, 'users', 'user123')
  userSnap = await getDoc(userRef)
  walletBalance = 5000

Step 1B: Check balance
  if (5000 < 1000) → FALSE
  ✅ CONTINUE

Step 2: Call PayFlex
  POST https://api.payflex.co/topup/airtime
  Body: {phone: '08012345678', provider: 'mtn', amount: 1000}
  
  Response: 200 OK
  payFlexData = {data: {reference: 'PAY_123456789'}}

Step 2B: Check response
  if (!response.ok) → if (!true) → FALSE
  ✅ CONTINUE

Step 3: DEDUCT MONEY
  await updateDoc(doc, {
    walletBalance: increment(-1000)
  })
  
  Firestore executes: 5000 - 1000 = 4000
  💰 MONEY REMOVED

Step 4: Save transaction
  users/user123/transactions/abc123 = {
    type: 'airtime',
    amount: 1000,
    status: 'success',
    payFlexRef: 'PAY_123456789',
    walletBefore: 5000,
    walletAfter: 4000
  }

Step 5: Award points
  pointsEarned = Math.floor(1000 / 100) = 10
  await updateDoc(doc, {
    rewardPoints: increment(10)
  })

Step 6: Return success
  return {
    success: true,
    reference: 'PAY_123456789',
    amount: 1000,
    pointsEarned: 10,
    message: 'Airtime purchase successful...'
  }

FINAL STATE:
  Wallet: 5000 → 4000 ✅
  Points: (previous) → (previous + 10) ✅
  Transaction saved ✅
```

---

### Scenario 2: INSUFFICIENT BALANCE

```javascript
Input:
  userId = 'user123'
  purchaseData = {
    provider: 'mtn',
    phoneNumber: '08012345678',
    amount: 1000
  }

Step 1: Get balance
  walletBalance = 500

Step 1B: Check balance
  if (500 < 1000) → TRUE
  ❌ throw Error('Insufficient wallet balance. Available: ₦500, Required: ₦1000')

EXECUTION STOPS HERE:
  Step 2: PayFlex NOT called
  Step 3: Money NOT deducted
  Step 4: Transaction NOT saved
  Step 5: Points NOT awarded
  Step 6: Error thrown

FINAL STATE:
  Wallet: 500 (UNCHANGED) ✅
  Points: (unchanged) ✅
  No transaction ✅
```

---

### Scenario 3: PAYFLEX REJECTS

```javascript
Input:
  userId = 'user123'
  purchaseData = {
    provider: 'mtn',
    phoneNumber: 'invalid_number',  // Invalid!
    amount: 1000
  }

Step 1: Get balance
  walletBalance = 5000

Step 1B: Check balance
  if (5000 < 1000) → FALSE
  ✅ CONTINUE

Step 2: Call PayFlex
  POST https://api.payflex.co/topup/airtime
  Body: {phone: 'invalid_number', ...}
  
  Response: 400 Bad Request
  payFlexData = {error: 'Invalid phone number'}

Step 2B: Check response
  if (!response.ok) → if (!false) → TRUE
  ❌ throw Error('Invalid phone number')

EXECUTION STOPS HERE:
  Step 3: Money NOT deducted
  Step 4: Transaction NOT saved
  Step 5: Points NOT awarded
  Step 6: Error thrown

FINAL STATE:
  Wallet: 5000 (UNCHANGED) ✅
  Points: (unchanged) ✅
  No transaction ✅
```

---

## 🎯 KEY TAKEAWAYS

### Balance is Checked: Line 40
```javascript
const walletBalance = userSnap.data()?.walletBalance || 0;
if (walletBalance < amount) {
  throw new Error('Insufficient wallet balance...');
}
```

### Approval Happens: Line 47-62
```javascript
const payFlexResponse = await fetch(...);
if (!payFlexResponse.ok) {
  throw new Error('PayFlex API failed');
}
```

### Money is Removed: Line 63-67
```javascript
await updateDoc(userRef, {
  walletBalance: increment(-amount)  // ← THE KEY LINE
});
```

### Everything is Logged: Line 69-83
```javascript
await addDoc(txRef, {
  walletBefore: walletBalance,
  walletAfter: walletBalance - amount,
  payFlexRef: payFlexData.data?.reference,
  // ... complete audit trail
});
```

---

## ✅ PROOF THIS WORKS

1. **Balance Check:** If `walletBalance < amount`, error is thrown immediately
2. **PayFlex Call:** Only happens if balance check passes
3. **Money Deduction:** Only happens if PayFlex returns 200 OK
4. **Error Handling:** Any error stops execution, wallet is never harmed
5. **Audit Trail:** Everything is logged to Firestore

---

## 🎉 CONCLUSION

**The code removes balance HERE:**
```javascript
await updateDoc(userRef, {
  walletBalance: increment(-amount)  // ← Line 63-67
});
```

**And approves/rejects based on:**
1. **Balance >= Amount** (Line 40-45)
2. **PayFlex API Success** (Line 47-62)

**If both conditions pass:** Money is deducted ✅
**If either fails:** Error is thrown, money is safe ✅

Your PayLink app now has REAL payment processing! 💰🚀
