# PAYLINK Deployment Guide

This guide will help you make PAYLINK functional for real users by setting up the backend services, configuring API keys, and deploying the application.

## Prerequisites

- Node.js installed
- Firebase CLI installed (`npm install -g firebase-tools`)
- Firebase account
- PayFlex API access
- Paystack account

## Step 1: Set Up Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project called "paylink"
3. Enable Authentication:
   - Go to Authentication > Sign-in method
   - Enable Email/Password, Google, and Phone
4. Enable Firestore:
   - Go to Firestore Database > Create database
   - Start in test mode (you can change rules later)
5. Enable Cloud Functions:
   - Go to Functions > Get started
6. Get your Firebase config:
   - Go to Project settings > General > Your apps
   - Click "Add app" > Web app
   - Copy the config object

## Step 2: Configure API Keys

### PayFlex API
1. Contact PayFlex to get API access
2. Get your API key and base URL
3. Note the callback webhook URL format

### Paystack
1. Sign up at [Paystack](https://paystack.com/)
2. Get your secret key from dashboard
3. Set up webhook URL for deposit callbacks

## Step 3: Configure Environment Variables

1. Copy `.env.example` to `.env`
2. Fill in the values:

```env
# Firebase Config (from Step 1)
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id

# PayFlex API
PAYFLEX_API_KEY=your_payflex_key

# Paystack
PAYSTACK_SECRET_KEY=your_paystack_secret
```

## Step 4: Deploy Cloud Functions

1. Install dependencies in functions folder:
   ```bash
   cd functions
   npm install
   ```

2. Set Firebase config for functions:
   ```bash
   firebase functions:config:set peyflex.key="f3cd2f9ebdd96ab5d991ad6971c99f1582dbf6f1"
   firebase functions:config:set monnify.secret="XK20SAQCDZPG06PFBYYSR8WZQHTXNF3A"
   ```

3. Deploy functions:
   ```bash
   firebase deploy --only functions
   ```

4. Note the function URLs for webhooks

## Step 5: Configure Webhooks

### Paystack Webhook
1. In Paystack dashboard, add webhook URL:
   ```
   https://us-central1-your-project-id.cloudfunctions.net/paystackWebhook
   ```
2. Select events: `charge.success`

### PayFlex Webhook
1. Provide this URL to PayFlex:
   ```
   https://us-central1-your-project-id.cloudfunctions.net/payflexCallback
   ```

## Step 6: Update Firestore Rules

Deploy the security rules:
```bash
firebase deploy --only firestore:rules
```

## Step 7: Build and Deploy Frontend

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the app:
   ```bash
   npm run build
   ```

3. Deploy to Firebase Hosting:
   ```bash
   firebase deploy --only hosting
   ```

## Step 8: Set Up Virtual Bank Account

For wallet funding, you'll need to integrate with a payment processor that provides virtual accounts. Paystack supports this.

1. In Paystack, enable "Dedicated Virtual Accounts"
2. Update the functions to create virtual accounts for users
3. Users can fund their wallets by transferring to their virtual account

## Step 9: Add Provider Logos

1. Create the `public/logos/` directory
2. Add logo images for all providers (MTN, GLO, Airtel, etc.)
3. Update the utility pages to use these logos

## Step 10: Test the Live Application

1. Access your deployed app URL
2. Test user registration and login
3. Test wallet funding (if virtual accounts are set up)
4. Test utility purchases (use test mode if available)
5. Verify transaction history and receipts

## Step 11: Go Live

1. Update Firestore rules to production mode
2. Enable production API keys
3. Monitor functions logs in Firebase Console
4. Set up error monitoring and alerts

## Additional Setup for Full Functionality

### Admin Dashboard
- Create a separate admin interface for managing users and transactions
- Deploy as a separate Firebase project or sub-app

### Push Notifications
- Set up Firebase Cloud Messaging
- Configure notification permissions in the app

### Offline Support
- Implement service workers for caching
- Add offline transaction queuing

### Security Enhancements
- Set up proper CORS policies
- Implement rate limiting
- Add input validation and sanitization

## Troubleshooting

- **Functions not deploying**: Check Firebase project permissions
- **API calls failing**: Verify API keys and endpoints
- **Webhooks not working**: Check function logs and URL formats
- **Build failing**: Ensure all dependencies are installed

## Support

For issues with:
- Firebase: Check Firebase documentation
- PayFlex: Contact their support
- Paystack: Use their developer docs

The app is now ready for users once all APIs are connected and deployed!
