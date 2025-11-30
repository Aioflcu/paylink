# Phase 4B - Critical Features Roadmap
## 5 Essential Features (21 Implementation Tasks)

---

## 1️⃣ SMART RECEIPT GENERATOR
**Priority**: CRITICAL (used by all utilities)
**Effort**: 400-500 lines
**Time**: 3-4 hours

### Tasks:
- [ ] Install jsPDF and qrcode.react libraries
- [ ] Create `src/services/receiptService.js` (receipt generation logic)
- [ ] Implement receipt template with:
  - Service provider logo/icon
  - Transaction reference number
  - Timestamp (formatted date/time)
  - User name
  - Amount breakdown with currency
  - QR code (verifiable transaction)
  - Payment method
- [ ] Add PDF export functionality
- [ ] Add WhatsApp share integration
- [ ] Add Email share integration
- [ ] Implement cloud backup (Firebase Storage)
- [ ] Create receipt history page: `src/pages/Receipts.js`
- [ ] Update Success.js to show receipt options
- [ ] Add receipt styling (print-friendly, mobile-friendly)
- [ ] Test with all utility types (Airtime, Data, Electricity, Cable, Internet, Tax, Education)

---

## 2️⃣ NOTIFICATIONS SYSTEM
**Priority**: CRITICAL (alerts for all transactions)
**Effort**: 350-450 lines
**Time**: 3-4 hours

### Tasks:
- [ ] Set up Firebase Cloud Messaging (FCM)
- [ ] Create `src/services/notificationService.js`
- [ ] Implement notification triggers for:
  - Successful deposit
  - Failed deposit
  - Successful purchase
  - Failed purchase
  - Security alerts (suspicious login, failed PIN)
  - Wallet balance alerts
- [ ] Create notification types enum
- [ ] Create `src/pages/NotificationCenter.js` (view all notifications)
- [ ] Implement notification history in Firestore
- [ ] Add mark-as-read functionality
- [ ] Add delete notification functionality
- [ ] Add notification badge on navbar (unread count)
- [ ] Implement in-app notification toast alerts
- [ ] Add notification settings (enable/disable per type)
- [ ] Test notification delivery and persistence

---

## 3️⃣ BENEFICIARY MANAGEMENT SYSTEM
**Priority**: CRITICAL (quick purchases)
**Effort**: 400-500 lines
**Time**: 3-4 hours

### Tasks:
- [ ] Create beneficiary data schema in Firestore
- [ ] Create `src/services/beneficiaryService.js` (CRUD operations)
- [ ] Create `src/pages/Beneficiaries.js` (management page)
- [ ] Implement features:
  - Add new beneficiary (nickname, type, details)
  - Save meter numbers with DISCO name
  - Save cable smartcards with provider name
  - Save phone numbers with contact name
  - Save internet accounts with provider name
  - Save tax IDs with tax type
- [ ] Implement beneficiary list with:
  - Search functionality
  - Filter by type (meter, smartcard, phone, etc.)
  - Edit beneficiary details
  - Delete beneficiary
  - Quick purchase button (pre-fill form)
- [ ] Add beneficiary auto-fill to all utility pages
- [ ] Implement beneficiary quick-action buttons
- [ ] Add validation for duplicate beneficiaries
- [ ] Test beneficiary persistence across app

---

## 4️⃣ PROFILE / SETTINGS ENHANCEMENT
**Priority**: CRITICAL (user control)
**Effort**: 450-550 lines
**Time**: 4-5 hours

### Tasks:
- [ ] Enhance existing Profile.js with:
  - Edit username functionality
  - Edit phone number with OTP verification
  - Change password (with old password verification)
  - Change 6-digit security password
  - Change 4-digit PIN with current PIN verification
  - Edit personal details (first name, last name, date of birth, address)
- [ ] Implement settings page section:
  - Light/Dark mode toggle (time-based + manual override)
  - Two-factor authentication toggle
  - Login notifications setting
  - Auto-logout timer setting
  - Biometric authentication toggle
- [ ] Add security section:
  - Login history view
  - Active sessions (with logout other sessions option)
  - Change security questions
  - Device management
- [ ] Implement "About Us" section:
  - App version
  - Developer info
  - Terms of Service link
  - Privacy Policy link
  - Contact Support button
- [ ] Add all form validations
- [ ] Implement OTP verification before sensitive updates
- [ ] Add success/error messages
- [ ] Test all profile updates

---

## 5️⃣ TWO WALLET TYPES SYSTEM
**Priority**: CRITICAL (financial flexibility)
**Effort**: 300-400 lines
**Time**: 3-4 hours

### Tasks:
- [ ] Update Firebase wallet schema:
  - Main Wallet (for payments)
  - Savings Wallet (locked, earns interest)
  - Interest earned tracking
  - Transfer history
- [ ] Create `src/services/walletService.js`:
  - Get wallet balances
  - Transfer between wallets
  - Calculate interest
  - Validate sufficient balance
- [ ] Update Dashboard.js:
  - Show both wallet balances
  - Display interest earned
  - Add quick transfer buttons
- [ ] Create `src/pages/WalletTransfer.js`:
  - Transfer from Main to Savings
  - Transfer from Savings to Main (with conditions)
  - Transfer history
  - Current interest rate display
- [ ] Update all payment flows:
  - Check Main Wallet balance
  - Prevent payment from Savings Wallet
  - Update Main Wallet on transaction
- [ ] Add validation:
  - Minimum transfer amount
  - Maximum transfer limit
  - Prevent negative balance
- [ ] Implement interest calculation (monthly)
- [ ] Add transfer history page
- [ ] Test all wallet operations

---

## IMPLEMENTATION SEQUENCE

**Order to build (builds on each other):**

1. **Smart Receipt Generator** (foundation - all utilities use it)
2. **Notifications System** (cross-cutting - alerts for all features)
3. **Two Wallet Types System** (infrastructure - payment flows depend on it)
4. **Beneficiary Management** (UX enhancement - uses wallet & notifications)
5. **Profile/Settings Enhancement** (user control - depends on wallet changes)

---

## ESTIMATED TIMELINE

| Feature | Hours | Start | End |
|---------|-------|-------|-----|
| Smart Receipt | 3-4 | Day 1 | Day 1 |
| Notifications | 3-4 | Day 1-2 | Day 2 |
| Two Wallets | 3-4 | Day 2 | Day 2-3 |
| Beneficiaries | 3-4 | Day 3 | Day 3-4 |
| Profile/Settings | 4-5 | Day 4 | Day 4-5 |
| **TOTAL** | **16-21 hours** | | **5 days** |

---

## DEPENDENCY TREE

```
Smart Receipt Generator
  ├─ Used by: All utilities (Airtime, Data, Electricity, Cable, Internet, Tax, Education)
  └─ Depends on: jsPDF, QR code library

Notifications System
  ├─ Notifies: All transactions, Security events
  └─ Depends on: Firebase Cloud Messaging, receiptService

Two Wallet Types System
  ├─ Used by: All payment flows
  ├─ Used by: Beneficiary quick purchases
  └─ Depends on: Dashboard, all utilities

Beneficiary Management
  ├─ Uses: Two Wallet System, Notifications
  └─ Used by: All utilities (auto-fill)

Profile/Settings Enhancement
  ├─ Uses: Wallet System, Notifications
  ├─ Uses: Two Wallet Transfer page
  └─ Used by: User preferences, security
```

---

## KEY INTEGRATION POINTS

### After Smart Receipt Generator:
- Update Success.js (all utilities) to show receipt options
- Add receipt history to Profile/Dashboard

### After Notifications System:
- Add notification badge to navbar
- Add notification preferences to Settings

### After Two Wallet System:
- Update Wallet.js to show both balances
- Update all payment flows to use Main Wallet
- Add interest display to Dashboard

### After Beneficiary Management:
- Add beneficiary auto-fill to all utility pages
- Add quick-purchase buttons to all utilities

### After Profile/Settings:
- Add dark mode CSS to all pages
- Implement biometric auth integration
- Add device management page

---

## FILES TO CREATE

```
New Files:
├── src/services/receiptService.js (receipt generation)
├── src/services/notificationService.js (notifications)
├── src/services/beneficiaryService.js (beneficiary CRUD)
├── src/pages/Receipts.js (receipt history)
├── src/pages/NotificationCenter.js (notification center)
├── src/pages/Beneficiaries.js (beneficiary management)
├── src/pages/WalletTransfer.js (transfer between wallets)
├── src/utils/receiptTemplate.js (receipt HTML template)
└── src/utils/interestCalculator.js (wallet interest)

Modified Files:
├── src/pages/Dashboard.js (add both wallets, add receipts link)
├── src/pages/Wallet.js (show both wallet types)
├── src/pages/Profile.js (enhancement with all fields)
├── src/pages/Success.js (add receipt options)
├── src/components/Navbar.js (add notification badge)
├── src/App.js (add new routes)
├── src/services/api.js (update payment calls)
├── src/firebase.js (FCM setup)
└── All utility pages (auto-fill beneficiaries)
```

---

## QUALITY CHECKLIST

- [ ] All new services have error handling
- [ ] All forms have validation
- [ ] All API calls check authentication
- [ ] All Firestore operations logged
- [ ] All pages are responsive (mobile/tablet/desktop)
- [ ] All features have loading states
- [ ] All features have error states
- [ ] All features have success feedback
- [ ] All data persists correctly in Firebase
- [ ] All features tested with real data

---

## NEXT STEP

Ready to start? I recommend this order:

1. **Start with Smart Receipt Generator** (most critical, foundation for others)
2. Then Notifications System
3. Then Two Wallet Types
4. Then Beneficiary Management
5. Finally Profile/Settings Enhancement

Which one should I build first?

