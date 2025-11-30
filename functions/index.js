const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

admin.initializeApp();

// PayFlex API base URL (placeholder)
const PAYFLEX_BASE_URL = 'https://api.payflex.com/v1'; // Replace with actual
const PAYFLEX_API_KEY = functions.config().payflex.key; // Set in Firebase config

// Paystack base URL
const PAYSTACK_BASE_URL = 'https://api.paystack.co';
const PAYSTACK_SECRET_KEY = functions.config().paystack.secret;

// Utility function to call PayFlex API
async function callPayFlex(endpoint, data) {
  try {
    const response = await axios.post(`${PAYFLEX_BASE_URL}${endpoint}`, data, {
      headers: {
        'Authorization': `Bearer ${PAYFLEX_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('PayFlex API error:', error);
    throw new functions.https.HttpsError('internal', 'Payment service error');
  }
}

// Cloud Function for Airtime Purchase
exports.purchaseAirtime = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { provider, phone, amount } = data;
  const userId = context.auth.uid;

  try {
    // Call PayFlex API
    const result = await callPayFlex('/airtime/purchase', {
      provider,
      phone,
      amount,
      userId
    });

    // Save transaction to Firestore
    await admin.firestore().collection('transactions').add({
      userId,
      type: 'debit',
      category: 'airtime',
      amount,
      provider,
      reference: result.reference,
      status: result.status,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update wallet balance
    const walletRef = admin.firestore().collection('wallets').doc(userId);
    await walletRef.update({
      balance: admin.firestore.FieldValue.increment(-amount)
    });

    return result;
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Airtime purchase failed');
  }
});

// Similar functions for other utilities
exports.purchaseData = functions.https.onCall(async (data, context) => {
  // Similar implementation for data purchase
  const { provider, phone, plan } = data;
  // Call PayFlex /data/purchase
  // Save transaction
  // Update wallet
});

exports.purchaseElectricity = functions.https.onCall(async (data, context) => {
  const { disco, meterNumber, meterType, amount } = data;
  // Call PayFlex /electricity/purchase
  // Return token
});

// Webhook for Paystack deposit callback
exports.paystackWebhook = functions.https.onRequest(async (req, res) => {
  const secret = PAYSTACK_SECRET_KEY;
  const hash = require('crypto').createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(400).send('Invalid signature');
  }

  const event = req.body;
  if (event.event === 'charge.success') {
    const { reference, amount, customer } = event.data;
    const userId = customer.email; // Assuming email is userId

    // Update wallet
    const walletRef = admin.firestore().collection('wallets').doc(userId);
    await walletRef.update({
      balance: admin.firestore.FieldValue.increment(amount / 100) // Convert kobo to naira
    });

    // Save transaction
    await admin.firestore().collection('transactions').add({
      userId,
      type: 'credit',
      category: 'deposit',
      amount: amount / 100,
      reference,
      status: 'success',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    // Send notification
    await admin.firestore().collection('notifications').add({
      userId,
      type: 'deposit',
      message: `Deposit of ₦${amount / 100} successful`,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  res.status(200).send('OK');
});

// PayFlex callback webhook
exports.payflexCallback = functions.https.onRequest(async (req, res) => {
  const { reference, status, userId } = req.body;

  // Update transaction status
  const transactionQuery = admin.firestore().collection('transactions')
    .where('reference', '==', reference)
    .where('userId', '==', userId);

  const snapshot = await transactionQuery.get();
  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    await doc.ref.update({ status });
  }

  res.status(200).send('OK');
});

// Function to get user wallet balance
exports.getWalletBalance = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = context.auth.uid;
  const walletDoc = await admin.firestore().collection('wallets').doc(userId).get();
  
  if (walletDoc.exists) {
    return { balance: walletDoc.data().balance };
  } else {
    // Initialize wallet
    await admin.firestore().collection('wallets').doc(userId).set({
      balance: 0,
      userId
    });
    return { balance: 0 };
  }
});

// Function to get transaction history
exports.getTransactionHistory = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = context.auth.uid;
  const { filter, limit = 50 } = data;

  let query = admin.firestore().collection('transactions')
    .where('userId', '==', userId)
    .orderBy('timestamp', 'desc')
    .limit(limit);

  if (filter) {
    query = query.where('type', '==', filter);
  }

  const snapshot = await query.get();
  const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  return { transactions };
});
