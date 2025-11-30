# PAYLINK Complete Deployment Guide

This guide provides step-by-step instructions to deploy PAYLINK as a fully functional mobile app on the Play Store.

## Architecture Overview

- **Frontend**: React.js with Capacitor for mobile
- **Backend**: Node.js/Express with MongoDB
- **APIs**: PEYFLEX for utilities, Monnify for payments
- **Mobile**: Android app built with Capacitor

## Prerequisites

1. **Node.js** (v16+)
2. **MongoDB** (local or cloud)
3. **Android Studio** (for Android builds)
4. **Google Play Console** account
5. **PEYFLEX API** access
6. **Monnify** account
7. **Email service** (Gmail or similar for OTP)

## Step 1: Backend Setup

### 1.1 Install Dependencies
```bash
npm install
```

### 1.2 Set Up MongoDB
- Install MongoDB locally or use MongoDB Atlas
- Update `MONGODB_URI` in `.env`

### 1.3 Configure APIs
Update `.env` with your API keys:
```env
PEYFLEX_API_KEY=your_peyflex_key
MONNIFY_API_KEY=your_monnify_key
MONNIFY_SECRET_KEY=your_monnify_secret
MONNIFY_CONTRACT_CODE=your_contract_code
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

### 1.4 Start Backend Server
```bash
node server.js
```
Server will run on port 5000.

## Step 2: Frontend Setup

### 2.1 Install Dependencies
```bash
npm install
```

### 2.2 Update API Base URL
In `src/services/api.js` (create this file), set the backend URL:
```javascript
const API_BASE_URL = 'https://your-backend-domain.com/api'; // or http://localhost:5000/api for development
```

### 2.3 Build for Production
```bash
npm run build
```

## Step 3: Mobile App Setup

### 3.1 Install Capacitor
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
```

### 3.2 Initialize Capacitor
```bash
npx cap init "PAYLINK" "com.paylink.app"
```

### 3.3 Add Android Platform
```bash
npx cap add android
```

### 3.4 Configure Capacitor
Update `capacitor.config.json`:
```json
{
  "appId": "com.paylink.app",
  "appName": "PAYLINK",
  "webDir": "build",
  "bundledWebRuntime": false
}
```

### 3.5 Build and Sync
```bash
npm run build
npx cap sync android
```

## Step 4: Android Studio Setup

### 4.1 Open in Android Studio
```bash
npx cap open android
```

### 4.2 Configure Build
1. Update `android/app/build.gradle`:
   ```gradle
   android {
       defaultConfig {
           applicationId "com.paylink.app"
           minSdkVersion 21
           targetSdkVersion 33
           versionCode 1
           versionName "1.0"
       }
   }
   ```

2. Update app icons and splash screens in `android/app/src/main/res/`

### 4.3 Build APK
1. Build > Build Bundle(s)/APK(s) > Build APK(s)
2. Find the APK in `android/app/build/outputs/apk/debug/`

## Step 5: Play Store Deployment

### 5.1 Create Play Store Listing
1. Go to Google Play Console
2. Create new app
3. Fill in store listing details

### 5.2 Upload APK
1. Release > Production > Create new release
2. Upload the APK
3. Add release notes

### 5.3 Set Up App Details
- Screenshots (take from emulator)
- Feature graphic
- Privacy policy URL
- Terms of service

### 5.4 Configure Permissions
Ensure these permissions are declared:
- Internet access
- Network state

## Step 6: Backend Deployment

### 6.1 Choose Hosting Platform
- **Heroku** (free tier available)
- **Railway**
- **DigitalOcean**
- **AWS/Vercel**

### 6.2 Deploy Backend
For Heroku:
```bash
heroku create paylink-backend
git push heroku main
```

### 6.3 Set Environment Variables
In your hosting platform, set all environment variables from `.env`

## Step 7: Update Frontend API URLs

### 7.1 Update API Base URL
Change `API_BASE_URL` in frontend to point to deployed backend:
```javascript
const API_BASE_URL = 'https://paylink-backend.herokuapp.com/api';
```

### 7.2 Rebuild and Redeploy
```bash
npm run build
npx cap sync android
npx cap open android
# Rebuild APK and upload to Play Store
```

## Step 8: Configure Webhooks

### 8.1 Monnify Webhook
Set webhook URL in Monnify dashboard:
```
https://your-backend-domain.com/api/webhooks/monnify
```

### 8.2 PEYFLEX Callback
Provide this URL to PEYFLEX:
```
https://your-backend-domain.com/api/webhooks/peyflex
```

## Step 9: Testing

### 9.1 Test on Emulator
- Install APK on Android emulator
- Test all features

### 9.2 Test Live APIs
- Use test credentials for PEYFLEX and Monnify
- Verify transactions work end-to-end

### 9.3 Test User Flows
- Registration and login
- Wallet funding
- Utility purchases
- Transaction history

## Step 10: Go Live

### 10.1 Update to Production APIs
- Replace test API keys with production ones
- Update webhook URLs if needed

### 10.2 Submit to Play Store
- Upload production APK
- Submit for review

### 10.3 Monitor and Support
- Set up error monitoring (Sentry)
- Monitor server logs
- Handle user support

## File Structure Summary

```
paylink/
├── server.js                 # Backend server
├── models/                   # MongoDB models
│   ├── User.js
│   ├── Wallet.js
│   ├── Transaction.js
│   └── Savings.js
├── src/                      # React frontend
├── android/                  # Android app
├── capacitor.config.json     # Capacitor config
├── .env                      # Environment variables
└── package.json
```

## Troubleshooting

### Common Issues

1. **APK Build Fails**
   - Ensure Android SDK is installed
   - Check for missing dependencies

2. **API Calls Fail**
   - Verify backend URL is accessible
   - Check CORS settings

3. **Webhooks Not Working**
   - Ensure HTTPS URLs for production
   - Verify webhook secrets

4. **MongoDB Connection Issues**
   - Check connection string
   - Verify network access

## Security Checklist

- [ ] HTTPS enabled
- [ ] API keys secured
- [ ] Input validation implemented
- [ ] JWT tokens properly signed
- [ ] Passwords hashed
- [ ] Rate limiting on APIs
- [ ] CORS properly configured

## Performance Optimization

- [ ] Enable gzip compression
- [ ] Implement caching
- [ ] Optimize images
- [ ] Minify assets
- [ ] Use CDN for static files

The app is now ready for production deployment to the Play Store!
