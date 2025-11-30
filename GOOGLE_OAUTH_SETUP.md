# Google OAuth Setup Guide for PayLink

## Current Status
✅ **Email/Password authentication is working correctly**
❌ **Google OAuth requires additional configuration in Firebase Console**

## Why Google OAuth Failed
Google OAuth requires:
1. OAuth consent screen configuration in Google Cloud Console
2. OAuth 2.0 credentials (Web Client ID)
3. Authorized domains/redirect URIs setup
4. Firebase Authentication method enabled

## Step-by-Step Setup Instructions

### Step 1: Enable Google Sign-In in Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **paylink-f183e**
3. Navigate to **Authentication** → **Sign-in method**
4. Click on **Google**
5. Toggle **Enable** to turn it ON
6. Ensure "Web SDK" is configured
7. Click **Save**

### Step 2: Configure Google Cloud OAuth Consent Screen
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: **paylink-f183e**
3. Navigate to **APIs & Services** → **OAuth consent screen**
4. Complete the OAuth Consent Screen:
   - **User Type**: External (for development)
   - **App name**: PayLink
   - **User support email**: Your email
   - **Required scopes**: 
     - `https://www.googleapis.com/auth/userinfo.email`
     - `https://www.googleapis.com/auth/userinfo.profile`
   - **Developer contact**: Your email
5. Click **Create or Update**

### Step 3: Create OAuth 2.0 Web Client Credentials
1. In Google Cloud Console, go to **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **OAuth 2.0 Client ID**
3. Select **Application type**: Web application
4. Add **Authorized JavaScript origins**:
   ```
   http://localhost:5003
   http://localhost:3000
   http://127.0.0.1:5003
   http://127.0.0.1:3000
   ```
5. Add **Authorized redirect URIs**:
   ```
   http://localhost:5003/
   http://localhost:3000/
   http://127.0.0.1:5003/
   http://127.0.0.1:3000/
   ```
6. Click **Create**
7. You'll get a **Client ID** - copy this (you may not need it as Firebase handles it)

### Step 4: Enable Google API
1. In Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for **Google+ API**
3. Click on it and select **Enable**

### Step 5: Verify Firebase Configuration
The app already has the correct Firebase configuration in `.env`:
```
REACT_APP_FIREBASE_API_KEY=AIzaSyAQxT0GkF4UgBscTU7ZGZ6e2iIIYYEOsCg
REACT_APP_FIREBASE_AUTH_DOMAIN=paylink-f183e.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=paylink-f183e
REACT_APP_FIREBASE_STORAGE_BUCKET=paylink-f183e.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=772395274506
REACT_APP_FIREBASE_APP_ID=1:772395274506:web:5d3e8e82e5c10b4de38456
REACT_APP_FIREBASE_MEASUREMENT_ID=G-Z87V7NMHGP
```

## Testing Google OAuth
After completing the steps above:
1. Refresh the PayLink app (http://localhost:5003)
2. Click **Login with Google** button
3. You should see Google's login popup
4. Complete the Google login flow
5. You should be redirected to the dashboard

## Troubleshooting

### Error: "popup_closed_by_user"
- User closed the Google login popup before completing login
- Try again and complete the Google sign-in flow

### Error: "Firebase has not been called with initialize"
- App isn't properly initialized - refresh the page

### Error: "auth/unauthorized-domain"
- The domain isn't authorized in Firebase
- Make sure `localhost:5003` is in Firebase's authorized domains list

### Error: "invalid_client"
- OAuth credentials aren't properly configured
- Verify OAuth consent screen is set to "External"
- Check Google Cloud API is enabled
- Verify authorized origins/redirect URIs

## For Production Deployment
When deploying to production, you'll need to:
1. Add your production domain to Google Cloud OAuth credentials
2. Change OAuth consent screen to "Internal" (if within your organization)
3. Update Firebase authorized domains
4. Example for Vercel: `yourapp.vercel.app`

## Current Architecture
The authentication code is already properly implemented:
- **Login.js**: Handles Google popup and error messages
- **AuthContext.js**: Implements `loginWithGoogle()` using Firebase `signInWithPopup()`
- **Error Handling**: Gracefully handles popup cancellation

## Reference
- [Firebase Authentication Documentation](https://firebase.google.com/docs/auth)
- [Google OAuth 2.0 Setup](https://firebase.google.com/docs/auth/web/google-signin)
- [Firebase Console Guide](https://firebase.google.com/docs/projects/learn-more)

---

**Note**: Email/Password authentication is fully functional and tested. You can continue using the app with email/password login while setting up Google OAuth.
