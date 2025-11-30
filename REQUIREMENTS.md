✅ **PAYLINK — FULL DEVELOPER REQUIREMENTS DOCUMENT

(Professional Specification)**
Version 1.0
Prepared by: Olufemi David (Owner & System Architect)


---

1️⃣ PROJECT OVERVIEW

PAYLINK is a multi-utility digital payment application that allows users to purchase a wide range of services:

Airtime

Data

Electricity

Cable TV

Internet

Education

Betting

Giftcards

Insurance

Taxes

Savings

Wallet funding & withdrawal

Full transaction history

In-app 4-digit PIN security

OTP-based authentication

Firebase authentication

PayFlex API for all utility purchases

Paystack/Monnify for deposits


All UI must be hover-based, smooth animations, and modern transitions.
Frontend is vanilla React + CSS (no Tailwind unless needed).


---

2️⃣ TECH STACK

Frontend:

React.js

Vanilla CSS (Hover-focused UI)


Backend:

Firebase Authentication

Firebase Firestore

(Optional) Firebase Cloud Functions

PayFlex API (all utilities)

Paystack or Monnify API (funding)


Database:

Firebase Firestore



---

3️⃣ FIREBASE CONFIG (PLACEHOLDERS FOR DEVELOPER)

apiKey:           {PAYLINK_API_KEY}
authDomain:       {PAYLINK_AUTH_DOMAIN}
projectId:        {PAYLINK_PROJECT_ID}
storageBucket:    {PAYLINK_STORAGE}
messagingSenderId:{PAYLINK_SENDER_ID}
appId:            {PAYLINK_APP_ID}
measurementId:    {PAYLINK_MEASUREMENT}

Developer will retrieve actual values from environment variables.


---

4️⃣ PAYFLEX API (ALL UTILITIES)

Developer should implement wrappers for:

Airtime purchase

Data purchase

Electricity token generation

Betting top-up

Cable TV subscription

Internet subscription

Education e-PINs

Tax payments

Insurance payments

Giftcard purchases

Wallet-to-wallet transfers


Callback webhook must be implemented
All responses should include:

Status

Reference

Amount

Timestamp

Provider

UserID



---

5️⃣ AUTHENTICATION MODULE

LOGIN METHODS

✔ Email login (with OTP option)
✔ Username + 6-digit password login
✔ Google login
✔ Save login session so user doesn’t repeatedly log in

REGISTRATION

✔ Google/Firebase registration
✔ Full details registration:

Full Name

Username

Email

Phone

Country
✔ Email OTP verification is mandatory


SECURITY

✔ User sets 4-digit transaction PIN
✔ Required before every purchase


---

6️⃣ DASHBOARD (HOME PAGE)

Top Section

Avatar (opens profile/settings)

Transactions History button (top-right corner)


Middle Section

Wallet balance

Eye icon to hide/show balance

Quick action buttons

Utility category icons (hover animations)


Bottom Section

Hamburger Menu (quick access menu)

Landing pages links (Profile, Savings, Settings, etc.)



---

7️⃣ AVATAR PAGE (PROFILE SETTINGS)

User can edit:

Username

Phone number

Login password

6-digit login password

4-digit transaction PIN

Full personal details

Light/Dark mode toggle


Security:

OTP verification required before updating any sensitive info


About Us Section

Complete static content about the app.


---

8️⃣ WALLET SYSTEM

✨ Wallet Features

Auto-generated virtual bank account

Paystack/Monnify deposit

Deposit notifications

Withdrawal option

Debit/Credit logs

Wallet balance saved in Firebase


✨ Callback

When deposit is credited:

Notify user

Update Firestore

Add transaction record



---

9️⃣ UTILITIES PURCHASE FLOW

ALL utilities follow THIS exact pattern:

Step 1 — Select Provider

Providers displayed with logos (NOT text)

E.g., MTN, GLO, DSTV, EKEDC, etc.


Step 2 — Select Amount

Predefined boxes (₦100, ₦200, ₦500, etc.)

Custom input allowed


Step 3 — Confirm Purchase Screen

Shows summary

Shows provider logo

Shows wallet balance

Shows final price


Step 4 — Transaction PIN Page

User enters 4-digit PIN

Must match stored PIN


Step 5 — Success Page

Transaction details

Download receipt (PDF)

Share/Print options



---

🔟 ELECTRICITY PAGE REQUIREMENTS

Display all 36 states electricity DISCOs

Show logos

Allow meter number input

Allow meter type selection (Prepaid/Postpaid)

Amount field

Confirm page

PIN page

Success



---

1️⃣1️⃣ TAX PAYMENT PAGE

FIRS

LIRS

Company Tax

Personal Tax

Custom fields

PayFlex processing

PIN verification

Success + receipt



---

1️⃣2️⃣ TRANSACTION HISTORY

Features:

✔ Filter by

Debit

Credit

All


✔ Date range selector
✔ Total amount spent for current month
✔ Search by reference
✔ Detailed transaction view
✔ Download receipt
✔ Share receipt
✔ Filter by category (Airtime, Data, Electric etc.)


---

1️⃣3️⃣ SAVINGS FEATURE

User can create savings plans:

Daily interest

Weekly interest

Custom-day interest

Withdrawal limit: 3 times per savings plan

Delete plan

Lock plan

Connect to wallet balance



---

1️⃣4️⃣ NOTIFICATIONS SYSTEM

Push notification system for:

Deposit

Withdrawal

Purchase

Failed purchase

Successful purchase

Security alerts



---

1️⃣5️⃣ FRONTEND DESIGN REQUIREMENTS (VERY IMPORTANT)

✔ Vanilla CSS only
✔ Hover animations everywhere
✔ Soft shadows
✔ Smooth modals
✔ Rounded edges
✔ Modern UI
✔ Responsive mobile-first design
✔ Utility icons must be illustrations
✔ Colors include Paylink theme colors we have previously discussed


---

1️⃣6️⃣ COMPONENTS THE DEVELOPER MUST CREATE

Login

Register

OTP Verification

Dashboard

Electricity page

Airtime page

Data page

Betting page

Cable TV

Internet

Education

Insurance

Giftcard

Tax

Wallet page

Transaction PIN page

Success page

Transaction receipts

Profile

Savings

Settings

Hamburger menu

Notification system

API handlers

Firebase services



---

1️⃣7️⃣ DEVELOPER NOTES

Ensure all purchases call the PayFlex API

Ensure callback endpoint updates Firestore

Wallet must be secure

PIN must be encrypted

Save user session

Use environment variables for ALL KEYS

Optimize UI

Everything must be reusable components

Build scalable folder structure

Error boundary

Loading states

Input validation everywhere

Secure all API keys

Use HTTPS only

All images stored in /public/logos/






---

⭐ PROFESSIONAL UPGRADES FOR PAYLINK (MUST-ADD FEATURES)




---

1️⃣ AI Fraud Detection System

Automatically detect suspicious activities:

Unusual location login

Multiple failed PIN attempts

Large sudden purchases

Device change alerts

Suspicious withdrawal attempts


If triggered → Auto temporary lock + OTP verification.


---

2️⃣ Smart Receipt Generator

Receipts should include:

Service logo

QR code (verifiable on Paylink website)

Unique transaction reference

Timestamp

User full name

Amount breakdown


Supports:

PDF

Share (WhatsApp, email)

Cloud backup



---

3️⃣ Reward Points System (LOYALTY ENGINE)

Users earn points for each purchase:

Airtime: +1 point per ₦100

Electricity: +2 points per ₦500

Data: +1 point per ₦200


Points can be redeemed for:

Discount on next purchase

Free airtime

Free data

Cashback



---

4️⃣ In-App Ticketing & Customer Support

A fully integrated support system:

Raise ticket

Upload screenshots

Track progress

Admin can reply in real-time

Auto-email notifications



---

5️⃣ Two Different Wallet Types

Like OPay:

(A) Main Wallet

Used for direct utility payments.

(B) Savings Wallet

Locked wallet → only for savings, earns interest.
Users can move money between wallets.


---

6️⃣ Beneficiary Management System

Users can save frequently used:

Meter numbers

Cable TV smartcards

Phone numbers

Internet account numbers

Tax IDs


With:

Nickname

Auto-fill

Quick purchase button



---

7️⃣ User Login Insights

Show user last login details:

Device

Location

IP address (approximate)

Login date

If suspicious → send alert



---

8️⃣ Virtual Card Integration (Optional)

Add an optional feature where users:

Create virtual debit cards

Fund virtual card from wallet

Use card to buy online

Freeze/unfreeze card

Set limits


(If you ever want to compete with Barter/Chipper.)


---

9️⃣ Face ID / Fingerprint Login

Integrate biometrics:

For login

For wallet access

For confirming payment



---

🔟 Daily/Weekly/Monthly Spend Analytics

Charts showing:

Total airtime spent

Total electricity bought

Category pie charts

Weekly spend trend

Top 3 categories



---

1️⃣1️⃣ Push Notification Centre

Inside the app, user can view:

Deposit alerts

Payment confirmations

Wallet changes

New features

Promotions

Failed attempts



---

1️⃣2️⃣ Offline Mode (Mini Cache System)

System stores:

Last dashboard balance

Last 10 transactions

Saved beneficiaries

User profile


If internet is down → app still opens.


---

1️⃣3️⃣ Referral Program

Users share referral link and earn:

Bonus points

Cashback

Free airtime


Referral dashboard includes:

Number of referrals

Total earnings

Status



---

1️⃣4️⃣ Admin Dashboard (Developers Side)

A separate backend dashboard should manage:

Users

Wallet balances

Transactions

Tickets

API monitoring

Failed transactions

Callback logs

Settlement reports



---

1️⃣5️⃣ Developer API Access (Future Expansion)

Allow other developers to integrate Paylink API:

Airtime/data purchase

Electricity

Wallet transfer


Add:

API keys

Usage limit

Developer dashboard



---

1️⃣6️⃣ Automatic Night Mode

Time-based theme switch:

7PM → Dark mode

7AM → Light mode


Users can override manually.


---

1️⃣7️⃣ Bulk Purchase System (For Businesses)

Let users buy:

Bulk airtime

Bulk data

Bulk electricity


Upload CSV or manual entries.


---

1️⃣8️⃣ Split Bills Feature

Allow users to share:

Electricity payment

Data bundle

Cable TV subscription


Group members get a notification to pay their share.


---

1️⃣9️⃣ Transaction Retry System

If PayFlex API fails:

Retry automatically 3 times

If still fails, refund instantly

Notify user



---

2️⃣0️⃣ Auto Top-Up Feature

Users can enable rules:

When balance < ₦500, auto-buy ₦1000 airtime

When data < 200MB, auto-renew

Monthly electricity reminder
