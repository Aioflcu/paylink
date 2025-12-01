# Payment Integration Testing Guide

## Quick Start - Test All Payment Pages

All 8 payment pages are now integrated with the backend. Here's how to test them:

### Environment Setup
1. Ensure backend server is running: `npm run dev` (from `/backend` folder on port 5000)
2. Ensure frontend is running: `npm start` (on port 3000)
3. Login to your account on frontend
4. Ensure you have a wallet balance (or test with mock balance)

---

## Testing Each Payment Page

### 1. **Airtime Purchase**
**Page:** `Dashboard → Buy Airtime`
**Test Flow:**
1. Select provider (MTN, Airtel, Glo, 9Mobile)
2. Enter phone number (11 digits)
3. Enter amount (₦100+)
4. Click "Proceed"
5. Expected: 
   - If PIN not set: Goes directly to success page
   - If PIN is set: Redirects to PIN page first

**Expected Result:** Transaction confirmed on success page

---

### 2. **Data Purchase**
**Page:** `Dashboard → Buy Data`
**Test Flow:**
1. Select provider (MTN, Airtel, Glo, 9Mobile)
2. Select data plan (500MB, 1GB, 2GB, etc.)
3. Enter phone number
4. Click "Proceed"
5. Expected: Processes payment and shows success

**Expected Result:** Data plan confirmation on success page

---

### 3. **Electricity Payment**
**Page:** `Dashboard → Pay Bills → Electricity`
**Test Flow:**
1. Select DISCO (Eko, Ibadan, Ikeja, Abuja, etc.)
2. Enter meter number
3. Select meter type (Prepaid/Postpaid)
4. Enter amount
5. Click "Proceed"
6. Expected: Processes payment

**Expected Result:** Electricity payment confirmed on success page

---

### 4. **Cable TV Payment**
**Page:** `Dashboard → Pay Bills → Cable TV`
**Test Flow:**
1. Select provider (DSTV, GOtv, Startimes)
2. Select plan (Padi, Yanga, Premium, etc.)
3. Enter SmartCard number
4. Enter phone number
5. Click "Proceed"
6. Expected: Processes cable subscription

**Expected Result:** Cable TV subscription confirmed

---

### 5. **Internet Payment**
**Page:** `Dashboard → Pay Bills → Internet`
**Test Flow:**
1. Select provider (Smile, Spectranet, Swift)
2. Select data plan (10GB, 20GB, 50GB, etc.)
3. Enter account number
4. Enter phone number
5. Click "Proceed"
6. Expected: Processes internet payment

**Expected Result:** Internet subscription confirmed

---

### 6. **Insurance Payment**
**Page:** `Dashboard → Insurance`
**Test Flow:**
1. Select insurance type (Health, Life, Auto, Home)
2. Select plan (Basic, Premium, Family, etc.)
3. Click "Confirm"
4. Expected: Processes insurance purchase

**Expected Result:** Insurance policy confirmed

---

### 7. **Gift Card Purchase**
**Page:** `Dashboard → Gift Cards`
**Test Flow:**
1. Select provider (Amazon, Google Play, iTunes, Steam, Netflix, Spotify, PlayStation, Xbox)
2. Select amount (₦1,000 to ₦50,000)
3. Enter recipient email
4. Enter recipient name
5. (Optional) Add message
6. Click "Purchase"
7. Expected: Processes gift card purchase

**Expected Result:** Gift card purchase confirmed

---

### 8. **Tax Payment**
**Page:** `Dashboard → Pay Bills → Tax`
**Test Flow:**
1. Select tax type (Personal, Corporate, Property, Capital Gains)
2. Select authority (FIRS, State, etc.)
3. Enter tax ID/number
4. Enter amount
5. Click "Submit"
6. Expected: Processes tax payment

**Expected Result:** Tax payment confirmed

---

## PIN Flow Testing

**If you have set a Transaction PIN:**

1. Go to any payment page
2. Complete all required fields
3. Click "Proceed" or submit
4. You should be redirected to `/pin` page
5. Enter your 4-digit PIN
6. Click "Verify"
7. Payment should be processed
8. Success page should display

**If PIN is not set:**
- Payments go directly to success page without PIN prompt

---

## Live Provider/Plan Data Testing

**Check if LIVE data is loading:**

1. **Airtime page:**
   - Providers should load from PayFlex API
   - Should show: MTN, Airtel, Glo, 9Mobile
   - If API fails, shows fallback providers

2. **Data page:**
   - Plans should load from PayFlex API for selected provider
   - Should show current pricing from PayFlex
   - If API fails, shows standard rates (fallback)

3. **Cable TV:**
   - Plans should display with pricing

4. **Internet:**
   - Plans should display with speed and validity info

**Verification:**
- Open browser DevTools → Network tab
- Look for API calls to `/api/payflex/*` endpoints
- Should see responses with provider/plan data

---

## Error Handling Testing

### Test Error Scenarios:

**1. Invalid Phone Number:**
- Airtime/Data pages
- Enter phone with < 11 digits
- Click "Proceed"
- Expected: Error message "Please enter valid Nigerian phone number"

**2. Insufficient Balance:**
- Try payment amount > wallet balance
- Expected: Error from backend (403 or 400 with message)

**3. Network Error:**
- Turn off internet before clicking "Proceed"
- Expected: Error message displayed

**4. Invalid Input:**
- Leave required fields empty
- Click "Proceed"
- Expected: Validation error

---

## Success Page Validation

After successful payment, verify success page shows:
- ✓ Transaction ID (unique)
- ✓ Transaction type (Airtime, Data, etc.)
- ✓ Amount paid
- ✓ Fee charged
- ✓ Reward points earned
- ✓ Payment details (provider, plan, etc.)
- ✓ "Share Receipt" button (optional)
- ✓ "Return to Dashboard" button

---

## Backend Response Validation

**Expected success response:**
```json
{
  "success": true,
  "transactionId": "TXN_1234567890",
  "status": "completed",
  "amount": 5000,
  "fee": 50,
  "rewardPoints": 10,
  "message": "Payment processed successfully"
}
```

**Expected PIN-required response:**
```json
{
  "success": false,
  "status": 403,
  "error": "Transaction PIN is required",
  "requiresPin": true
}
```

---

## Debugging Tips

1. **Check Console:**
   - Open DevTools → Console
   - Look for API response logs
   - Check for any JavaScript errors

2. **Check Network:**
   - Open DevTools → Network tab
   - Monitor API calls to backend
   - Check response status codes (200, 400, 403, 500)

3. **Check Backend Logs:**
   - Check backend server terminal for request logs
   - Look for errors or warnings

4. **Firebase Token:**
   - All API calls automatically inject Firebase token
   - Token is retrieved via `getToken()` in backendAPI.js

5. **Device ID:**
   - All API calls include device ID
   - Device ID is generated via `getDeviceId()` on first use
   - Stored in localStorage

---

## Troubleshooting Common Issues

### Issue: "Payment failed" but no error message
**Solution:**
- Check backend server is running on port 5000
- Check API endpoints are mounted correctly
- Check browser console for error details
- Check backend logs for request/response

### Issue: "Cannot find module 'backendAPI'"
**Solution:**
- Ensure `/src/services/backendAPI.js` file exists
- Check import path is correct: `import { paymentAPI, payflexAPI } from '../services/backendAPI'`

### Issue: PIN page shows but payment doesn't complete
**Solution:**
- Ensure PIN is set in security settings
- Check backend PIN validation logic
- Verify PIN hash is being sent correctly
- Check backend logs for PIN validation errors

### Issue: Live providers/plans not showing
**Solution:**
- Check PayFlex API is accessible
- Check API response in Network tab
- Fallback data should display if API fails
- Check backend PayFlex proxy endpoints

### Issue: Success page shows no transaction ID
**Solution:**
- Check backend returns `transactionId` in response
- Check frontend captures response data correctly
- Check state is passed to success page

---

## Automated Testing Script (Optional)

To test all pages in sequence:

```bash
# Start backend (in one terminal)
cd backend
npm run dev

# Start frontend (in another terminal)
cd paylink
npm start

# In browser, navigate through:
# 1. Login
# 2. Airtime → Test payment
# 3. Data → Test payment
# 4. Electricity → Test payment
# 5. Cable → Test payment
# 6. Internet → Test payment
# 7. Insurance → Test payment
# 8. Gift Card → Test payment
# 9. Tax → Test payment
```

---

## Regression Testing

After each update, test:
- [ ] All 8 payment pages load correctly
- [ ] All forms validate input
- [ ] All API calls work
- [ ] PIN flow works (if PIN is set)
- [ ] Success page displays correctly
- [ ] Error messages display
- [ ] Navigation between pages works

---

## Performance Metrics to Check

- **Page load time:** Should be < 2 seconds
- **API response time:** Should be < 1 second
- **Payment processing:** Should complete in < 5 seconds
- **Provider/plan loading:** Should complete in < 2 seconds

---

## Next Steps

1. ✅ All payment pages integrated
2. ⏳ Test all payment flows (manual or automated)
3. ⏳ Fix any issues found during testing
4. ⏳ Integrate security pages (TransactionPIN, 2FA, etc.)
5. ⏳ Integrate wallet pages (Balance, Deposits, Withdrawals)
6. ⏳ Full system testing and UAT
7. ⏳ Deploy to production
