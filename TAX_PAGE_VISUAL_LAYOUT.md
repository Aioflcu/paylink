# Tax Page - Visual Layout & Usage Guide

## 📐 Component Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                      TAX PAYMENT PAGE                       │
│                  Secure and easy tax payments               │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Step Indicator:  [1 active] [2] [3] [4] [5]              │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                     ERROR BANNER (if error)                │
│              Error message        ✕ (dismiss)              │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                       TAX FORM CONTAINER                    │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                                                     │  │
│  │         [Step Content Based on Current Step]       │  │
│  │                                                     │  │
│  │  ┌────────────────────────────────────────────┐   │  │
│  │  │         FORM ACTIONS                       │   │  │
│  │  │  [Back Button]  [Next/Pay Button]          │   │  │
│  │  └────────────────────────────────────────────┘   │  │
│  │                                                     │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 Step-by-Step Layouts

### STEP 1: Tax Type Selection
```
┌─────────────────────────────────────────┐
│  Select Tax Type                        │
│  Choose the type of tax you want to pay │
│                                         │
│  ┌──────────┐  ┌──────────┐            │
│  │ 👤       │  │ 🏢       │            │
│  │ Personal │  │ Corporate│            │
│  │ Tax      │  │ Tax      │            │
│  └──────────┘  └──────────┘            │
│                                         │
│  ┌──────────┐  ┌──────────┐            │
│  │ 🏠       │  │ 📈       │            │
│  │ Property │  │ Capital  │            │
│  │ Tax      │  │ Gains Tax│            │
│  └──────────┘  └──────────┘            │
└─────────────────────────────────────────┘
```

### STEP 2: Tax Authority Selection
```
┌──────────────────────────────────────────┐
│  Select Tax Authority                    │
│  Choose the authority to pay your tax to │
│                                          │
│  Selected: [👤 Personal Tax]             │
│                                          │
│  ┌──────────┐  ┌──────────┐             │
│  │ 🏛️       │  │ 🏢       │             │
│  │ FIRS     │  │ State    │             │
│  │          │  │ Board    │             │
│  └──────────┘  └──────────┘             │
└──────────────────────────────────────────┘
```

### STEP 3: Amount Selection
```
┌──────────────────────────────────────────┐
│  Enter Amount                            │
│  Select or enter the tax amount to pay   │
│                                          │
│  [₦1,000] [₦5,000] [₦10,000]            │
│  [₦25,000] [₦50,000] [₦100,000]         │
│                                          │
│  Or enter custom amount                  │
│  [________________] Enter amount in ₦   │
│                                          │
│  Amount to pay: ₦25,000                  │
│  Plus applicable transaction fees        │
└──────────────────────────────────────────┘
```

### STEP 4: Tax Information
```
┌──────────────────────────────────────────┐
│  Tax Information                         │
│  Provide your tax identification details │
│                                          │
│  Tax ID * [e.g., 123-4567-8910____]    │
│  Your personal or company tax id number  │
│                                          │
│  Business Name * [___________________]  │
│                                          │
│  Tax Type: Personal Tax                  │
│  Authority: FIRS                         │
└──────────────────────────────────────────┘
```

### STEP 5: Contact & Summary
```
┌──────────────────────────────────────────┐
│  Contact Information                     │
│  Confirm your details                    │
│                                          │
│  Email * [your@email.com_____________]  │
│  Phone * [08012345678__________________] │
│  Address * [_________________________]  │
│                                          │
│  ┌───────────────────────────────────┐  │
│  │ SUMMARY CARD                      │  │
│  │                                   │  │
│  │ Tax Type:  Personal Tax           │  │
│  │ Authority: FIRS                   │  │
│  │ Tax ID:    12345678               │  │
│  │ Amount:    ₦25,000                │  │
│  │                                   │  │
│  └───────────────────────────────────┘  │
│                                          │
│  ⚠️ Please Review: Ensure all details   │
│  are correct before proceeding.          │
└──────────────────────────────────────────┘
```

## 💻 Code Usage Examples

### Basic Import & Usage
```javascript
import Tax from './pages/Tax';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/tax" element={<Tax />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### With Protected Route
```javascript
import Tax from './pages/Tax';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route 
        path="/tax" 
        element={<ProtectedRoute><Tax /></ProtectedRoute>} 
      />
    </Routes>
  );
}
```

### Custom Configuration
To customize tax types, edit `TAX_TYPES` in Tax.js:

```javascript
const TAX_TYPES = {
  CUSTOM: {
    id: 'custom',
    name: 'Custom Tax',
    icon: '🎯',
    description: 'Your description here',
  },
  // ... other types
};
```

Add corresponding authorities:
```javascript
const TAX_AUTHORITIES = {
  custom: {
    AUTHORITY1: {
      id: 'auth1',
      name: 'Custom Authority',
      icon: '🏛️',
      description: 'Authority description',
    },
  },
};
```

## 🎨 Styling Customization

### Change Primary Color
Edit `/src/pages/Tax.css`:
```css
/* Change from purple to blue */
.btn.primary {
  background: linear-gradient(135deg, #0066ff 0%, #0052cc 100%);
  color: white;
}
```

### Change Spacing
```css
.tax-page {
  padding: 40px; /* was 20px */
}

.tax-form {
  padding: 50px; /* was 30px */
}
```

### Change Breakpoints
```css
/* Add new breakpoint for large screens */
@media (min-width: 1400px) {
  .tax-type-grid {
    grid-template-columns: repeat(5, 1fr);
  }
}
```

## 🔧 Integration with Other Services

### Paystack Service Integration
```javascript
// Service call in handleSubmit()
const response = await paystackService.initializePayment({
  email: user.email,
  amount: finalAmount * 100, // Convert to kobo
  reference: `TAX-${Date.now()}`,
  metadata: {
    type: 'tax_payment',
    taxType: selectedTaxType,
    authority: selectedAuthority,
    // ... other metadata
  },
});
```

### Auth Context Integration
```javascript
// Automatically uses user data
const { user } = useContext(AuthContext);

// Populates email and phone fields
const [email, setEmail] = useState(user?.email || '');
const [phone, setPhone] = useState(user?.phone || '');
```

### Error Boundary Integration
```javascript
// Handles component errors gracefully
<ErrorBoundary>
  <div className="tax-page">
    {/* Component content */}
  </div>
</ErrorBoundary>
```

## 📱 Responsive Preview

### Mobile (480px)
```
┌────────────────────┐
│   TAX PAYMENT      │
│                    │
│ [Step 1/5]         │
│                    │
│ ┌──────────────┐   │
│ │ 👤 Personal  │   │
│ │    Tax       │   │
│ └──────────────┘   │
│                    │
│ ┌──────────────┐   │
│ │ 🏢 Corporate │   │
│ │    Tax       │   │
│ └──────────────┘   │
│                    │
│ [    Next     ]    │
└────────────────────┘
```

### Tablet (768px)
```
┌──────────────────────────────┐
│      TAX PAYMENT             │
│                              │
│ [1 ✓] [2] [3] [4] [5]       │
│                              │
│ ┌──────────┐ ┌──────────┐   │
│ │ 👤       │ │ 🏢       │   │
│ │ Personal │ │Corporate │   │
│ │ Tax      │ │ Tax      │   │
│ └──────────┘ └──────────┘   │
│                              │
│ [Back]        [Next]         │
└──────────────────────────────┘
```

### Desktop (1200px+)
```
┌────────────────────────────────────────────┐
│           TAX PAYMENT SERVICE              │
│      Secure and easy tax payments           │
│                                            │
│  [1 ✓] [2] [3] [4] [5]                   │
│                                            │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│ │ 👤       │ │ 🏢       │ │ 🏠       │  │
│ │Personal  │ │Corporate │ │ Property │  │
│ │Tax       │ │Tax       │ │ Tax      │  │
│ └──────────┘ └──────────┘ └──────────┘  │
│                                            │
│ ┌──────────┐                              │
│ │ 📈       │                              │
│ │ Capital  │                              │
│ │ Gains Tax│                              │
│ └──────────┘                              │
│                                            │
│          [Back]    [Next]                 │
└────────────────────────────────────────────┘
```

## 🔍 State Flow Diagram

```
┌─────────────────┐
│  Initial State  │
│ currentStep: 1  │
└────────┬────────┘
         │
         ▼
    ┌────────────┐
    │ Step 1:    │
    │ Tax Type   │
    │ Selection  │
    └────┬───────┘
         │ (select tax type)
         ▼
    ┌────────────┐
    │ Step 2:    │
    │ Authority  │
    │ Selection  │
    └────┬───────┘
         │ (select authority)
         ▼
    ┌────────────┐
    │ Step 3:    │
    │ Amount     │
    │ Selection  │
    └────┬───────┘
         │ (select amount)
         ▼
    ┌────────────┐
    │ Step 4:    │
    │ Tax Info   │
    │ Collection │
    └────┬───────┘
         │ (fill tax details)
         ▼
    ┌────────────┐
    │ Step 5:    │
    │ Contact &  │
    │ Summary    │
    └────┬───────┘
         │ (confirm details)
         ▼
    ┌────────────┐
    │ Submit to  │
    │ Paystack   │
    └────┬───────┘
         │
         ▼
    ┌────────────┐
    │ Redirect   │
    │ to Payment │
    │ Gateway    │
    └────────────┘
```

## 📊 Form Field Mapping

| Step | Field | Type | Validation | Required |
|------|-------|------|-----------|----------|
| 1 | Tax Type | Selection | Must exist | Yes |
| 2 | Authority | Selection | Must match tax type | Yes |
| 3 | Amount | Number | Min ₦100 | Yes |
| 4 | Tax ID | Text | Min 3 chars | Yes |
| 4 | Business Name | Text | Non-empty | Conditional |
| 5 | Email | Email | Valid format | Yes |
| 5 | Phone | Tel | Valid format | Yes |
| 5 | Address | Text | Non-empty | Yes |

## 🎯 User Journey Map

```
┌─────────────────────────────────────────────────────────┐
│                    USER JOURNEY                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ User Enters → Selects → Chooses → Sets → Fills Form → │
│ Tax Page    Tax Type  Authority  Amount Details        │
│                                                         │
│ ↓ (All Valid)                                          │
│                                                         │
│ Reviews → Confirms → Redirected → Completes → Returns │
│ Summary  Details    to Paystack   Payment   (Success)  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 🐛 Debugging Tips

### Check Step Progress
```javascript
console.log('Current Step:', currentStep);
console.log('Tax Type:', selectedTaxType);
console.log('Authority:', selectedAuthority);
```

### Verify Form Data
```javascript
console.log({
  selectedTaxType,
  selectedAuthority,
  amount: getAmount(),
  taxID,
  email,
  phone,
  address,
});
```

### Validate State
```javascript
console.log('Step Valid:', isCurrentStepValid());
console.log('Can Proceed:', isCurrentStepValid() && !loading);
```

### Check Payment Ready
```javascript
const amount = getAmount();
console.log('Amount:', amount);
console.log('Payment Ready:', amount >= 100 && email && phone);
```

## 🎓 Learning Path

1. **Understand the component structure** (read Tax.js)
2. **Learn the styling** (review Tax.css)
3. **Study the state flow** (trace state changes)
4. **Review validation logic** (check validation functions)
5. **Test the payment flow** (simulate user journey)
6. **Customize for needs** (modify config objects)
7. **Integrate with backend** (connect payment webhook)

---

**Version**: 1.0
**Last Updated**: 2024
**Ready for**: Development & Deployment
