# 📋 PAYLINK - REMAINING REQUIREMENTS TODO

**Status**: Most Phase 4A utilities DONE | Tax Page DONE | Remaining: Other utilities, Critical features, and upgrades

---

## ✅ COMPLETED

- [x] **Electricity Page** - 4-step flow with 36 DISCOs, meter validation, amount selection, PIN, success page
- [x] **Tax Payment Page** - FIRS/LIRS/Company Tax with custom fields, PayFlex, PIN, receipt (Enhanced version)
- [x] **Airtime, Data, Betting, Giftcards** - Implied completed in dashboard

---

## 🚀 PHASE 4A: REMAINING UTILITIES (HIGH PRIORITY)

### [ ] Cable TV Page (200-250 lines code + 250 CSS)
**Requirements from REQUIREMENTS.md Section 9 (Utilities Pattern):**
- Step 1: Provider selection (DSTV, GOtv, Startimes, etc.) with logos
- Step 2: Smartcard number input validation
- Step 3: Amount selection (predefined boxes + custom)
- Step 4: Confirm screen (summary, provider logo, wallet balance)
- Step 5: Transaction PIN verification
- Step 6: Success page with receipt (PDF, share, print)

**Tasks:**
- [ ] Create `src/pages/CableTV.js`
- [ ] Create `src/pages/CableTV.css`
- [ ] Define cable providers data (DSTV, GOtv, Startimes, etc.)
- [ ] Implement 6-step form wizard (provider → smartcard → amount → confirm → PIN → success)
- [ ] Add smartcard validation logic
- [ ] Integrate PayFlex API for cable TV
- [ ] Add PDF receipt generation
- [ ] Make responsive (mobile-first)
- [ ] Add error handling

---

### [ ] Internet Page (200-250 lines code + 250 CSS)
**Requirements from REQUIREMENTS.md Section 9 (Utilities Pattern):**
- Step 1: Provider selection (Smile, Spectranet, Swift) with logos
- Step 2: Plan selection dropdown
- Step 3: Amount selection
- Step 4: Confirm screen
- Step 5: Transaction PIN
- Step 6: Success page with receipt

**Tasks:**
- [ ] Create `src/pages/Internet.js`
- [ ] Create `src/pages/Internet.css`
- [ ] Define internet providers with plans
- [ ] Implement plan selection logic
- [ ] Implement 6-step wizard
- [ ] Integrate PayFlex API
- [ ] Add receipt generation
- [ ] Responsive design
- [ ] Error handling

---

### [ ] Education Page (200-250 lines code + 250 CSS)
**Requirements from REQUIREMENTS.md Section 9 (Utilities Pattern):**
- Step 1: School selection (dropdown)
- Step 2: Subject/Course selection
- Step 3: Amount selection
- Step 4: Confirm screen
- Step 5: Transaction PIN
- Step 6: Success page with receipt (e-PIN download)

**Tasks:**
- [ ] Create `src/pages/Education.js`
- [ ] Create `src/pages/Education.css`
- [ ] Define schools database
- [ ] Implement school & course selection
- [ ] Create 6-step wizard
- [ ] Integrate PayFlex API for e-PINs
- [ ] Add e-PIN download capability
- [ ] Receipt generation
- [ ] Responsive design
- [ ] Error handling

---

## 🛡️ PHASE 4B: CRITICAL FEATURES (HIGH PRIORITY)

### [ ] Smart Receipt Generator
**Requirements from REQUIREMENTS.md:**
- Include service logo
- QR code (verifiable on Paylink website)
- Unique transaction reference
- Timestamp
- User full name
- Amount breakdown
- Support: PDF, Share (WhatsApp, email), Cloud backup

**Tasks:**
- [ ] Create `src/services/receiptService.js`
- [ ] Implement PDF generation library (jsPDF or similar)
- [ ] Create receipt template component
- [ ] Generate QR codes (qrcode.react or similar)
- [ ] Add WhatsApp share functionality
- [ ] Add email share functionality
- [ ] Store receipts in Firebase
- [ ] Create receipt download feature
- [ ] Test on multiple browsers

---

### [ ] Profile/Settings Page Enhancement
**Current Status**: Avatar page exists
**Additional Requirements from REQUIREMENTS.md:**
- [ ] Edit username functionality
- [ ] Edit phone number
- [ ] Change login password
- [ ] Change 6-digit login password
- [ ] Change 4-digit transaction PIN
- [ ] Edit full personal details
- [ ] Light/Dark mode toggle
- [ ] OTP verification before sensitive updates
- [ ] About Us section (static content)

**Tasks:**
- [ ] Create/update `src/pages/Profile.js`
- [ ] Add all editable fields
- [ ] Implement OTP verification before updates
- [ ] Add theme toggle functionality
- [ ] Create About Us section
- [ ] Add success/error notifications
- [ ] Secure sensitive updates with PIN
- [ ] Responsive design

---

### [ ] Notifications System
**Requirements from REQUIREMENTS.md Section 14:**
Push notifications for:
- Deposit
- Withdrawal
- Purchase
- Failed purchase
- Successful purchase
- Security alerts

**Tasks:**
- [ ] Create `src/services/notificationService.js`
- [ ] Create notification UI component
- [ ] Implement Firebase Cloud Messaging (FCM)
- [ ] Create notification center in app
- [ ] Display deposit alerts
- [ ] Display payment confirmations
- [ ] Display wallet changes
- [ ] Display new features alerts
- [ ] Display promotions
- [ ] Display failed attempts alerts
- [ ] Store notification history in Firebase
- [ ] Mark notifications as read
- [ ] Delete old notifications

---

### [ ] Beneficiary Management System
**Requirements from REQUIREMENTS.md:**
Users can save frequently used:
- Meter numbers
- Cable TV smartcards
- Phone numbers
- Internet account numbers
- Tax IDs

Each with: Nickname, Auto-fill, Quick purchase button

**Tasks:**
- [ ] Create `src/pages/Beneficiaries.js`
- [ ] Create `src/components/BeneficiaryCard.js`
- [ ] Add beneficiary to Firebase schema
- [ ] Implement add beneficiary form
- [ ] Implement edit beneficiary
- [ ] Implement delete beneficiary
- [ ] Add auto-fill functionality in utilities pages
- [ ] Create quick purchase button for beneficiaries
- [ ] Display beneficiary list with nicknames
- [ ] Search beneficiaries
- [ ] Responsive design

---

### [ ] User Login Insights
**Requirements from REQUIREMENTS.md:**
Show user:
- Device
- Location
- IP address (approximate)
- Login date
- If suspicious → send alert

**Tasks:**
- [ ] Create `src/components/LoginInsights.js`
- [ ] Implement device detection (ua-parser-js)
- [ ] Implement IP geolocation
- [ ] Store login history in Firebase
- [ ] Display in profile/security section
- [ ] Implement suspicious login detection
- [ ] Send alerts for new device logins
- [ ] Add session management
- [ ] Log out other sessions feature

---

## 💎 PHASE 4C: LOYALTY & ANALYTICS FEATURES

### [ ] Reward Points System
**Requirements from REQUIREMENTS.md:**
Users earn points:
- Airtime: +1 point per ₦100
- Electricity: +2 points per ₦500
- Data: +1 point per ₦200

Redeem for:
- Discount on next purchase
- Free airtime
- Free data
- Cashback

**Tasks:**
- [ ] Create `src/services/rewardsService.js`
- [ ] Add points calculation logic
- [ ] Create rewards UI component
- [ ] Implement points display in dashboard
- [ ] Create rewards redemption page
- [ ] Add points history
- [ ] Implement discount application
- [ ] Store rewards in Firebase
- [ ] Add points expiry logic (if applicable)

---

### [ ] Spending Analytics Dashboard
**Requirements from REQUIREMENTS.md Section 10:**
Charts showing:
- Total airtime spent
- Total electricity bought
- Category pie charts
- Weekly spend trend
- Top 3 categories

**Tasks:**
- [ ] Create `src/pages/Analytics.js`
- [ ] Install charting library (Chart.js or Recharts)
- [ ] Create pie chart component
- [ ] Create line chart for trends
- [ ] Calculate spending by category
- [ ] Fetch data from Firebase
- [ ] Display weekly/monthly/yearly views
- [ ] Add date range selector
- [ ] Export analytics data
- [ ] Responsive design

---

### [ ] Referral Program
**Requirements from REQUIREMENTS.md:**
Users share referral link and earn:
- Bonus points
- Cashback
- Free airtime

Dashboard includes:
- Number of referrals
- Total earnings
- Status

**Tasks:**
- [ ] Create `src/pages/Referrals.js`
- [ ] Generate unique referral links
- [ ] Implement referral tracking
- [ ] Create referral dashboard
- [ ] Display referral stats
- [ ] Add copy link button
- [ ] Share referral link functionality
- [ ] Track referred user purchases
- [ ] Distribute rewards
- [ ] Add bonus tier system (optional)

---

## 🔐 PHASE 4D: SECURITY & ADVANCED FEATURES

### [ ] AI Fraud Detection System
**Requirements from REQUIREMENTS.md:**
Detect:
- Unusual location login
- Multiple failed PIN attempts
- Large sudden purchases
- Device change alerts
- Suspicious withdrawal attempts

Action: Auto temporary lock + OTP verification

**Tasks:**
- [ ] Create `src/services/fraudDetectionService.js`
- [ ] Implement location tracking
- [ ] Track failed PIN attempts
- [ ] Implement purchase amount threshold
- [ ] Detect new device logins
- [ ] Implement temporary account lock
- [ ] Send OTP for verification
- [ ] Create fraud alert notifications
- [ ] Log suspicious activities
- [ ] Manual review option for admins

---

### [ ] Auto Top-Up Service
**Requirements from REQUIREMENTS.md:**
Users enable rules:
- When balance < ₦500, auto-buy ₦1000 airtime
- When data < 200MB, auto-renew
- Monthly electricity reminder

**Tasks:**
- [ ] Create `src/pages/AutoTopup.js`
- [ ] Implement rule creation UI
- [ ] Create rule validation logic
- [ ] Set up scheduled jobs (Firebase Cloud Functions)
- [ ] Implement balance monitoring
- [ ] Execute auto purchases
- [ ] Send notifications before auto-topup
- [ ] Allow enable/disable rules
- [ ] Show auto-topup history
- [ ] Responsive design

---

### [ ] Transaction Retry System
**Requirements from REQUIREMENTS.md:**
If PayFlex API fails:
- Retry automatically 3 times
- If still fails, refund instantly
- Notify user

**Tasks:**
- [ ] Create `src/services/retryService.js`
- [ ] Implement retry logic with exponential backoff
- [ ] Set max retry count (3)
- [ ] Implement automatic refund on final failure
- [ ] Create retry status UI
- [ ] Notify user of retries
- [ ] Log failed transactions
- [ ] Store retry history in Firebase
- [ ] Manual retry option for users

---

### [ ] Offline Mode (Mini Cache System)
**Requirements from REQUIREMENTS.md:**
Store:
- Last dashboard balance
- Last 10 transactions
- Saved beneficiaries
- User profile

If internet down → app still opens

**Tasks:**
- [ ] Implement service worker
- [ ] Create offline storage service
- [ ] Cache dashboard data
- [ ] Cache last 10 transactions
- [ ] Cache beneficiary list
- [ ] Cache user profile
- [ ] Sync data when online
- [ ] Show offline indicator
- [ ] Limit offline functionality
- [ ] Test offline mode

---

## 👤 PHASE 4E: BIOMETRIC & UX FEATURES

### [ ] Face ID / Fingerprint Authentication
**Requirements from REQUIREMENTS.md:**
Integrate biometrics for:
- Login
- Wallet access
- Confirming payment

**Tasks:**
- [ ] Install biometric library (e.g., react-native-biometrics for mobile)
- [ ] Implement fingerprint detection
- [ ] Implement face ID detection
- [ ] Create biometric login flow
- [ ] Create biometric payment confirmation
- [ ] Add fallback to PIN
- [ ] Store biometric data securely
- [ ] Test on multiple devices
- [ ] Add enable/disable toggle

---

### [ ] Dark Mode Theme
**Requirements from REQUIREMENTS.md Section 16:**
Time-based switch:
- 7PM → Dark mode
- 7AM → Light mode
- Users can override manually

**Tasks:**
- [ ] Create theme context/provider
- [ ] Implement automatic time-based switching
- [ ] Create manual toggle button
- [ ] Update all pages with dark mode CSS
- [ ] Store user preference in Firebase
- [ ] Test contrast ratios
- [ ] Add smooth transitions
- [ ] Update color system
- [ ] Test on all pages

---

## 🏢 PHASE 4F: BUSINESS & ADVANCED FEATURES

### [ ] Bulk Purchase System
**Requirements from REQUIREMENTS.md Section 17:**
Let users buy:
- Bulk airtime
- Bulk data
- Bulk electricity

Upload CSV or manual entries

**Tasks:**
- [ ] Create `src/pages/BulkPurchase.js`
- [ ] Implement CSV upload functionality
- [ ] Parse CSV data
- [ ] Create manual entry form
- [ ] Validate bulk data
- [ ] Implement bulk purchase flow
- [ ] Show bulk pricing
- [ ] Process multiple transactions
- [ ] Generate bulk receipt
- [ ] Track bulk orders

---

### [ ] Split Bills Feature
**Requirements from REQUIREMENTS.md Section 18:**
Allow users to share:
- Electricity payment
- Data bundle
- Cable TV subscription

Group members get notification to pay share

**Tasks:**
- [ ] Create `src/pages/SplitBills.js`
- [ ] Create `src/components/SplitBillForm.js`
- [ ] Implement split calculation
- [ ] Add member invitation system
- [ ] Create payment link for members
- [ ] Send notifications to split members
- [ ] Track split payments
- [ ] Store split data in Firebase
- [ ] Display split bill history
- [ ] Implement payment confirmation

---

### [ ] Support Ticketing System
**Requirements from REQUIREMENTS.md Section 4:**
- Raise ticket
- Upload screenshots
- Track progress
- Admin can reply in real-time
- Auto-email notifications

**Tasks:**
- [ ] Create `src/pages/Support.js`
- [ ] Create ticket creation form
- [ ] Implement file upload (screenshots)
- [ ] Create ticket detail view
- [ ] Implement real-time messaging (Firebase Firestore)
- [ ] Add ticket status tracking
- [ ] Create admin dashboard for support
- [ ] Implement email notifications
- [ ] Add ticket search/filter
- [ ] Display ticket history

---

## 💳 PHASE 4G: VIRTUAL CARDS (OPTIONAL)

### [ ] Virtual Card Integration
**Requirements from REQUIREMENTS.md Section 8:**
Users can:
- Create virtual debit cards
- Fund from wallet
- Use for online purchases
- Freeze/unfreeze
- Set limits

**Tasks:**
- [ ] Create `src/pages/VirtualCards.js`
- [ ] Create card creation UI
- [ ] Implement card funding from wallet
- [ ] Display card details securely
- [ ] Add freeze/unfreeze functionality
- [ ] Implement spending limits
- [ ] Add CVV/expiry display (with security)
- [ ] Create card deletion
- [ ] Track virtual card transactions
- [ ] Responsive design

---

## 🔧 PHASE 5: ADMIN & DEVELOPER (OPTIONAL)

### [ ] Admin Dashboard
**Requirements from REQUIREMENTS.md Section 14:**
Backend dashboard to manage:
- Users
- Wallet balances
- Transactions
- Tickets
- API monitoring
- Failed transactions
- Callback logs
- Settlement reports

**Tasks:**
- [ ] Create admin folder structure
- [ ] Implement authentication/authorization
- [ ] Create user management page
- [ ] Create transaction monitoring
- [ ] Create ticket management interface
- [ ] Implement analytics dashboard
- [ ] Add failed transaction logs
- [ ] Create settlement reports
- [ ] Implement API monitoring
- [ ] Add admin notifications

---

### [ ] Developer API Access
**Requirements from REQUIREMENTS.md Section 15:**
Allow other developers to integrate:
- Airtime/data purchase
- Electricity payment
- Wallet transfer

Provide:
- API keys
- Usage limit
- Developer dashboard

**Tasks:**
- [ ] Create developer portal
- [ ] Implement API key generation
- [ ] Create API documentation
- [ ] Set up rate limiting
- [ ] Create developer dashboard
- [ ] Implement usage tracking
- [ ] Add billing for API
- [ ] Create webhook system
- [ ] Test API endpoints
- [ ] Create sample integrations

---

## 📊 WALLET SYSTEM ENHANCEMENTS

### [ ] Two Different Wallet Types
**Requirements from REQUIREMENTS.md Section 5:**
(A) Main Wallet - for direct utility payments
(B) Savings Wallet - locked, earns interest

Users can move money between wallets

**Current Status**: Single wallet exists

**Tasks:**
- [ ] Modify wallet structure in Firebase
- [ ] Create savings wallet UI
- [ ] Implement wallet switching
- [ ] Add money transfer between wallets
- [ ] Implement interest calculation (savings)
- [ ] Display both wallet balances
- [ ] Add withdrawal limits for savings
- [ ] Update all payment flows
- [ ] Test wallet transfers

---

## 📱 DASHBOARD ENHANCEMENTS

### [ ] Complete Hamburger Menu
**Current Status**: Basic menu exists

**Requirements from REQUIREMENTS.md Section 6:**
- Profile link
- Savings link
- Settings link
- Transaction History
- Logout
- Other landing page links

**Tasks:**
- [ ] Review current menu
- [ ] Add missing links
- [ ] Implement smooth animations
- [ ] Add icons for menu items
- [ ] Implement mobile responsiveness
- [ ] Add scroll behavior
- [ ] Test on multiple devices

---

## 🔄 IMPROVEMENTS & OPTIMIZATIONS

### [ ] Input Validation Across All Pages
- [ ] Email validation
- [ ] Phone number validation
- [ ] Amount validation
- [ ] Meter number validation (10-11 digits)
- [ ] Smartcard validation
- [ ] Tax ID validation
- [ ] Custom field validation

### [ ] PDF Receipt Generation Library Integration
- [ ] Install jsPDF or html2pdf
- [ ] Create receipt template
- [ ] Test PDF generation
- [ ] Add download functionality
- [ ] Test printing
- [ ] Test email attachment

### [ ] Error Boundary Implementation
- [ ] Create error boundary component
- [ ] Wrap main pages
- [ ] Test error handling
- [ ] Add fallback UI

### [ ] Loading States
- [ ] Add loading spinner component
- [ ] Implement on all API calls
- [ ] Test loading states
- [ ] Optimize loading time

---

## 📋 SUMMARY BY PRIORITY

### 🔴 CRITICAL (Do First)
1. Cable TV Page
2. Internet Page
3. Education Page
4. Smart Receipt Generator
5. Notifications System

### 🟠 HIGH PRIORITY
6. Profile/Settings Enhancement
7. Beneficiary Management
8. AI Fraud Detection
9. Wallet Two-Type System
10. Transaction Retry System

### 🟡 MEDIUM PRIORITY
11. Spending Analytics
12. Reward Points System
13. Offline Mode
14. Auto Top-Up Service
15. User Login Insights

### 🟢 NICE-TO-HAVE
16. Bulk Purchase
17. Split Bills
18. Referral Program
19. Support Ticketing
20. Virtual Cards
21. Biometric Auth
22. Dark Mode
23. Admin Dashboard
24. Developer API

---

## 🎯 ESTIMATED EFFORT

| Phase | Features | Estimated Lines | Priority |
|-------|----------|-----------------|----------|
| 4A Remaining | 3 pages | 1200-1500 | CRITICAL |
| 4B Critical | 5 features | 2000-2500 | HIGH |
| 4C Loyalty | 3 features | 1500-2000 | MEDIUM |
| 4D Security | 4 features | 2000-2500 | HIGH |
| 4E UX | 2 features | 800-1200 | MEDIUM |
| 4F Business | 3 features | 1500-2000 | MEDIUM |
| 4G Virtual | 1 feature | 600-800 | LOW |
| Phase 5 | 2 features | 3000-5000 | OPTIONAL |
| **TOTAL** | **23 items** | **~15,000-18,000** | **Mixed** |

---

## 🚀 NEXT STEPS

1. **Pick CRITICAL items first**: Cable TV, Internet, Education pages
2. **Then tackle HIGH PRIORITY**: Smart receipts, Notifications, Beneficiaries
3. **Then MEDIUM features**: Analytics, Rewards, Security
4. **Finally** nice-to-have features

---

**Last Updated**: November 19, 2025  
**Status**: Tax & Electricity DONE | 21 features remaining  
**Total Remaining Work**: ~15,000-18,000 lines of code
