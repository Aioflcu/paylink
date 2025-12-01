# 🔧 CODE PATTERNS - Copy & Paste Ready

## Pattern 1: Internet.js Integration (Copy from Airtime.js)

### File: `src/pages/Internet.js`

```javascript
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import payflex from '../services/payflex';
import './Internet.css';

export default function Internet() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    phoneNumber: '',
    amount: '',
    plan: ''
  });

  // Fetch real providers from PayFlex API
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        setLoading(true);
        const data = await payflex.getProviders('internet');
        setProviders(data || HARDCODED_INTERNET_PROVIDERS);
      } catch (error) {
        console.error('Error fetching providers:', error);
        setProviders(HARDCODED_INTERNET_PROVIDERS);
      } finally {
        setLoading(false);
      }
    };
    fetchProviders();
  }, []);

  const handleSelectProvider = (provider) => {
    setSelectedProvider(provider);
    setStep(2);
  };

  const handlePhoneChange = (e) => {
    setFormData({ ...formData, phoneNumber: e.target.value });
  };

  const handleAmountChange = (e) => {
    setFormData({ ...formData, amount: e.target.value });
  };

  const validateInputs = () => {
    if (!formData.phoneNumber) return 'Phone number required';
    if (!formData.amount) return 'Amount required';
    if (formData.amount < 500) return 'Minimum amount is ₦500';
    return '';
  };

  const handleProceed = () => {
    const validationError = validateInputs();
    if (validationError) {
      setError(validationError);
      return;
    }
    
    // Pass to TransactionPIN page
    navigate('/transaction-pin', {
      state: {
        type: 'internet',
        provider: selectedProvider.id,
        phoneNumber: formData.phoneNumber,
        amount: parseInt(formData.amount),
        description: `${selectedProvider.name} - ₦${formData.amount}`
      }
    });
  };

  // Render your UI
  return (
    <div className="internet-container">
      {/* Step 1: Select Provider */}
      {step === 1 && (
        <div className="step">
          <h2>Select Internet Provider</h2>
          {loading ? (
            <p>Loading providers...</p>
          ) : (
            <div className="providers-grid">
              {providers.map((provider) => (
                <div 
                  key={provider.id}
                  className="provider-card"
                  onClick={() => handleSelectProvider(provider)}
                >
                  <span className="provider-icon">{provider.emoji}</span>
                  <h3>{provider.name}</h3>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Enter Details */}
      {step === 2 && selectedProvider && (
        <div className="step">
          <h2>{selectedProvider.name} Internet</h2>
          
          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="tel"
              value={formData.phoneNumber}
              onChange={handlePhoneChange}
              placeholder="08012345678"
            />
          </div>

          <div className="form-group">
            <label>Amount (₦)</label>
            <input
              type="number"
              value={formData.amount}
              onChange={handleAmountChange}
              placeholder="Enter amount"
              min="500"
            />
          </div>

          {error && <p className="error">{error}</p>}

          <button onClick={handleProceed} className="proceed-btn">
            Proceed to Verify
          </button>
        </div>
      )}
    </div>
  );
}

// Hardcoded fallback providers
const HARDCODED_INTERNET_PROVIDERS = [
  { id: 'mtn', name: 'MTN', emoji: '📱' },
  { id: 'airtel', name: 'Airtel', emoji: '📡' },
  { id: 'glo', name: 'GLO', emoji: '🌐' },
  { id: 'etisalat', name: 'Etisalat', emoji: '📶' }
];
```

---

## Pattern 2: Add to TransactionProcessor.js

### File: `src/services/transactionProcessor.js`

Add this method after `processCableSubscription()`:

```javascript
/**
 * Process Internet Payment
 * Calls actual PayFlex API for internet data purchase
 */
static async processInternetPayment(userId, purchaseData) {
  try {
    const { provider, phoneNumber, amount } = purchaseData;

    // Step 1: Validate user wallet balance
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    const walletBalance = userSnap.data()?.walletBalance || 0;

    if (walletBalance < amount) {
      throw new Error(`Insufficient wallet balance. Available: ₦${walletBalance}, Required: ₦${amount}`);
    }

    // Step 2: Call PayFlex API to buy internet
    const payFlexResponse = await fetch(`${this.PAYFLEX_API}/internet/purchase`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.PAYFLEX_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: phoneNumber,
        provider: provider,
        amount: amount
      })
    });

    if (!payFlexResponse.ok) {
      const errorData = await payFlexResponse.json();
      throw new Error(errorData.message || 'PayFlex API failed');
    }

    const payFlexData = await payFlexResponse.json();

    // Step 3: Deduct from wallet
    await updateDoc(userRef, {
      walletBalance: increment(-amount)
    });

    // Step 4: Save transaction to Firestore
    const txRef = collection(db, 'users', userId, 'transactions');
    const transaction = await addDoc(txRef, {
      type: 'internet',
      provider,
      phoneNumber,
      amount,
      status: 'success',
      payFlexRef: payFlexData.data?.reference || 'N/A',
      description: `Internet purchase - ${provider.toUpperCase()} - ₦${amount}`,
      walletBefore: walletBalance,
      walletAfter: walletBalance - amount,
      createdAt: Timestamp.now()
    });

    // Step 5: Award reward points
    const pointsEarned = Math.floor(amount / 500); // 1 point per ₦500
    await updateDoc(userRef, {
      rewardPoints: increment(pointsEarned)
    });

    // Step 6: Log reward transaction
    const rewardRef = collection(db, 'users', userId, 'rewardTransactions');
    await addDoc(rewardRef, {
      type: 'earned',
      points: pointsEarned,
      reason: 'internet purchase',
      transactionId: transaction.id,
      amount,
      createdAt: Timestamp.now()
    });

    return {
      success: true,
      transactionId: transaction.id,
      reference: payFlexData.data?.reference,
      amount,
      pointsEarned,
      message: `Internet purchase successful. ₦${amount} sent to ${phoneNumber}`
    };

  } catch (error) {
    console.error('Error processing internet purchase:', error);
    throw error;
  }
}
```

---

## Pattern 3: Education.js Integration (Copy from Data.js)

### File: `src/pages/Education.js`

```javascript
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import payflex from '../services/payflex';
import './Education.css';

export default function Education() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedInstitution, setSelectedInstitution] = useState(null);
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [plansLoading, setPlansLoading] = useState(false);
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    studentName: '',
    registrationNumber: '',
    amount: ''
  });

  // Fetch real institutions from PayFlex API
  useEffect(() => {
    const fetchInstitutions = async () => {
      try {
        setLoading(true);
        const data = await payflex.getInstitutions('education');
        setInstitutions(data || HARDCODED_INSTITUTIONS);
      } catch (error) {
        console.error('Error fetching institutions:', error);
        setInstitutions(HARDCODED_INSTITUTIONS);
      } finally {
        setLoading(false);
      }
    };
    fetchInstitutions();
  }, []);

  const handleSelectInstitution = (institution) => {
    setSelectedInstitution(institution);
    setStep(2);
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const validateInputs = () => {
    if (!formData.studentName) return 'Student name required';
    if (!formData.registrationNumber) return 'Registration number required';
    if (!formData.amount) return 'Amount required';
    if (formData.amount < 1000) return 'Minimum amount is ₦1,000';
    return '';
  };

  const handleProceed = () => {
    const validationError = validateInputs();
    if (validationError) {
      setError(validationError);
      return;
    }
    
    // Pass to TransactionPIN page
    navigate('/transaction-pin', {
      state: {
        type: 'education',
        institution: selectedInstitution.id,
        studentName: formData.studentName,
        registrationNumber: formData.registrationNumber,
        amount: parseInt(formData.amount),
        description: `${selectedInstitution.name} - ₦${formData.amount}`
      }
    });
  };

  return (
    <div className="education-container">
      {/* Step 1: Select Institution */}
      {step === 1 && (
        <div className="step">
          <h2>Select Institution</h2>
          {loading ? (
            <p>Loading institutions...</p>
          ) : (
            <div className="institutions-grid">
              {institutions.map((institution) => (
                <div 
                  key={institution.id}
                  className="institution-card"
                  onClick={() => handleSelectInstitution(institution)}
                >
                  <span className="institution-icon">🎓</span>
                  <h3>{institution.name}</h3>
                  <p>{institution.type}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Enter Details */}
      {step === 2 && selectedInstitution && (
        <div className="step">
          <h2>{selectedInstitution.name}</h2>
          
          <div className="form-group">
            <label>Student Name</label>
            <input
              type="text"
              value={formData.studentName}
              onChange={(e) => handleInputChange('studentName', e.target.value)}
              placeholder="Enter full name"
            />
          </div>

          <div className="form-group">
            <label>Registration Number</label>
            <input
              type="text"
              value={formData.registrationNumber}
              onChange={(e) => handleInputChange('registrationNumber', e.target.value)}
              placeholder="Enter registration number"
            />
          </div>

          <div className="form-group">
            <label>Amount (₦)</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              placeholder="Enter amount"
              min="1000"
            />
          </div>

          {error && <p className="error">{error}</p>}

          <button onClick={handleProceed} className="proceed-btn">
            Proceed to Verify
          </button>
        </div>
      )}
    </div>
  );
}

const HARDCODED_INSTITUTIONS = [
  { id: 'unilag', name: 'University of Lagos', type: 'University', emoji: '🏫' },
  { id: 'unn', name: 'University of Nigeria', type: 'University', emoji: '🏫' },
  { id: 'bua', name: 'Bayero University Kano', type: 'University', emoji: '🏫' },
  { id: 'jamb', name: 'JAMB Registration', type: 'Exam', emoji: '📝' }
];
```

---

## Pattern 4: Add to TransactionProcessor.js

Add this method after `processInternetPayment()`:

```javascript
/**
 * Process Education Payment
 * Calls actual PayFlex API for education payments
 */
static async processEducationPayment(userId, purchaseData) {
  try {
    const { institution, studentName, registrationNumber, amount } = purchaseData;

    // Step 1: Validate user wallet balance
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    const walletBalance = userSnap.data()?.walletBalance || 0;

    if (walletBalance < amount) {
      throw new Error(`Insufficient wallet balance. Available: ₦${walletBalance}, Required: ₦${amount}`);
    }

    // Step 2: Call PayFlex API for education payment
    const payFlexResponse = await fetch(`${this.PAYFLEX_API}/education/payment`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.PAYFLEX_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        institution,
        studentName,
        registrationNumber,
        amount
      })
    });

    if (!payFlexResponse.ok) {
      const errorData = await payFlexResponse.json();
      throw new Error(errorData.message || 'PayFlex API failed');
    }

    const payFlexData = await payFlexResponse.json();

    // Step 3: Deduct from wallet
    await updateDoc(userRef, {
      walletBalance: increment(-amount)
    });

    // Step 4: Save transaction to Firestore
    const txRef = collection(db, 'users', userId, 'transactions');
    const transaction = await addDoc(txRef, {
      type: 'education',
      institution,
      studentName,
      registrationNumber,
      amount,
      status: 'success',
      payFlexRef: payFlexData.data?.reference || 'N/A',
      description: `Education payment - ${institution} - ₦${amount}`,
      walletBefore: walletBalance,
      walletAfter: walletBalance - amount,
      createdAt: Timestamp.now()
    });

    // Step 5: Award reward points
    const pointsEarned = Math.floor(amount / 1000); // 1 point per ₦1,000
    await updateDoc(userRef, {
      rewardPoints: increment(pointsEarned)
    });

    // Step 6: Log reward transaction
    const rewardRef = collection(db, 'users', userId, 'rewardTransactions');
    await addDoc(rewardRef, {
      type: 'earned',
      points: pointsEarned,
      reason: 'education payment',
      transactionId: transaction.id,
      amount,
      createdAt: Timestamp.now()
    });

    return {
      success: true,
      transactionId: transaction.id,
      reference: payFlexData.data?.reference,
      amount,
      pointsEarned,
      message: `Education payment successful. ₦${amount} processed for ${studentName}`
    };

  } catch (error) {
    console.error('Error processing education payment:', error);
    throw error;
  }
}
```

---

## Pattern 5: Update TransactionPIN.js to Handle New Types

In `src/pages/TransactionPIN.js`, find the switch statement and add:

```javascript
case 'internet':
  result = await TransactionProcessor.processInternetPayment(user.uid, transactionData);
  break;

case 'education':
  result = await TransactionProcessor.processEducationPayment(user.uid, transactionData);
  break;
```

---

## 📋 Quick Copy-Paste Checklist

- [ ] Copy Internet pattern → `src/pages/Internet.js`
- [ ] Copy Internet method → `src/services/transactionProcessor.js`
- [ ] Copy Education pattern → `src/pages/Education.js`
- [ ] Copy Education method → `src/services/transactionProcessor.js`
- [ ] Update TransactionPIN.js with 2 new cases
- [ ] Run: `npm start`
- [ ] Check for compile errors
- [ ] Test internet payment
- [ ] Test education payment

---

**That's it! You now have a complete payment system for 6 utility types! 🚀**

