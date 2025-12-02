const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Load environment variables
dotenv.config();

// Import models (wrap in try-catch to handle missing model files gracefully)
let User, Wallet, Transaction, Savings;

try {
  User = require('./models/User');
} catch (e) {
  console.warn('Failed to import User model:', e.message);
  User = null;
}

try {
  Wallet = require('./models/Wallet');
} catch (e) {
  console.warn('Failed to import Wallet model:', e.message);
  Wallet = null;
}

try {
  Transaction = require('./models/Transaction');
} catch (e) {
  console.warn('Failed to import Transaction model:', e.message);
  Transaction = null;
}

try {
  Savings = require('./models/Savings');
} catch (e) {
  console.warn('Failed to import Savings model:', e.message);
  Savings = null;
}

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','Idempotency-Key','X-Timestamp','X-Nonce','X-Monnify-Signature','X-Payflex-Signature'],
  credentials: true
}));

// Security headers (helmet)
try {
  const securityHeaders = require('./backend/middleware/securityHeaders');
  app.use(securityHeaders());
} catch (e) {
  console.warn('Failed to attach security headers middleware', e.message || e);
}

// Initialize Sentry early if configured so requestHandler can be attached
let Sentry = null;
try {
  const initSentry = require('./backend/utils/sentry');
  Sentry = initSentry();
  if (Sentry) {
    app.use(Sentry.Handlers.requestHandler());
    console.log('Sentry initialized and request handler attached');
    // expose Sentry globally for middleware that may capture exceptions
    try { global.Sentry = Sentry; } catch (e) { /* noop */ }
  }
} catch (e) {
  console.warn('Sentry init error:', e.message || e);
}

// Use raw for webhooks on specific routes; default to JSON body parser otherwise
app.use((req, res, next) => {
  // Defer to route-level raw parser when needed
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Attach request id middleware so downstream logs and handlers can reference req.id
try {
  const requestId = require('./backend/middleware/requestId');
  app.use(requestId);
} catch (e) {
  console.warn('RequestId middleware attach failed', e.message || e);
}

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// PEYFLEX API configuration
const PEYFLEX_CONFIG = {
  baseURL: process.env.PEYFLEX_BASE_URL,
  headers: {
    'Authorization': `Bearer ${process.env.PEYFLEX_API_KEY}`,
    'Content-Type': 'application/json'
  }
};

// Monnify API configuration
const MONNIFY_CONFIG = {
  baseURL: process.env.MONNIFY_BASE_URL,
  auth: {
    username: process.env.MONNIFY_API_KEY,
    password: process.env.MONNIFY_SECRET_KEY
  }
};

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Access denied' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email
const sendOTP = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'PAYLINK OTP Verification',
    text: `Your OTP is: ${otp}. It expires in 10 minutes.`
  };

  await transporter.sendMail(mailOptions);
};

// AUTHENTICATION ROUTES

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, username, email, phone, country, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate OTP
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create user
    const user = new User({
      fullName,
      username,
      email,
      phone,
      country,
      password: hashedPassword,
      pin: '', // Will be set later
      otp,
      otpExpires
    });

    await user.save();

    // Send OTP
    await sendOTP(email, otp);

    // Create wallet
    const wallet = new Wallet({ userId: user._id });
    await wallet.save();

    res.status(201).json({ message: 'User registered. Please verify OTP.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify OTP
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    const token = generateToken(user._id);

    res.json({ token, user: { id: user._id, fullName: user.fullName, email: user.email } });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier can be email or username

    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }]
    });

    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      return res.status(401).json({ message: 'Please verify your email first' });
    }

    const token = generateToken(user._id);

    res.json({ token, user: { id: user._id, fullName: user.fullName, email: user.email } });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Set PIN
app.post('/api/auth/set-pin', verifyToken, async (req, res) => {
  try {
    const { pin } = req.body;
    const hashedPin = await bcrypt.hash(pin, 10);

    await User.findByIdAndUpdate(req.userId, { pin: hashedPin });
    res.json({ message: 'PIN set successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// WALLET ROUTES

// Get wallet balance
app.get('/api/wallet/balance', verifyToken, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ userId: req.userId });
    if (!wallet) return res.status(404).json({ message: 'Wallet not found' });

    res.json({ balance: wallet.balance });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Deposit (Monnify integration)
app.post('/api/wallet/deposit', verifyToken, async (req, res) => {
  try {
    const { amount } = req.body;
    // Ensure Monnify is configured before attempting to initialize payments
    if (!MONNIFY_CONFIG.baseURL || !MONNIFY_CONFIG.auth || !process.env.MONNIFY_CONTRACT_CODE) {
      return res.status(501).json({ message: 'Monnify is not configured. Please set MONNIFY_BASE_URL, MONNIFY_API_KEY, MONNIFY_SECRET_KEY and MONNIFY_CONTRACT_CODE in environment.' });
    }
    const user = await User.findById(req.userId);

    // Initialize Monnify payment
    const monnifyResponse = await axios.post(`${MONNIFY_CONFIG.baseURL}/api/v1/merchant/transactions/init-transaction`, {
      amount,
      customerName: user.fullName,
      customerEmail: user.email,
      contractCode: process.env.MONNIFY_CONTRACT_CODE,
      redirectUrl: 'https://yourapp.com/payment-success',
      paymentDescription: 'PAYLINK Wallet Deposit'
    }, {
      auth: MONNIFY_CONFIG.auth
    });

    res.json({
      checkoutUrl: monnifyResponse.data.responseBody.checkoutUrl,
      transactionReference: monnifyResponse.data.responseBody.transactionReference
    });
  } catch (error) {
    res.status(500).json({ message: 'Payment initialization failed' });
  }
});

// UTILITY PURCHASE ROUTES

// Purchase Airtime
app.post('/api/utilities/airtime', verifyToken, async (req, res) => {
  try {
    const { provider, phone, amount } = req.body;
    const user = await User.findById(req.userId);
    const wallet = await Wallet.findOne({ userId: req.userId });

    if (wallet.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Call PEYFLEX API
    const peyflexResponse = await axios.post(`${PEYFLEX_CONFIG.baseURL}/airtime/purchase`, {
      provider,
      phone,
      amount,
      userId: req.userId
    }, { headers: PEYFLEX_CONFIG.headers });

    // Deduct from wallet
    wallet.balance -= amount;
    await wallet.save();

    // Create transaction
    const transaction = new Transaction({
      userId: req.userId,
      type: 'debit',
      category: 'airtime',
      amount,
      provider,
      reference: peyflexResponse.data.reference,
      status: peyflexResponse.data.status,
      metadata: { phone }
    });
    await transaction.save();

    res.json({
      success: true,
      reference: peyflexResponse.data.reference,
      transaction: transaction
    });
  } catch (error) {
    res.status(500).json({ message: 'Airtime purchase failed' });
  }
});

// Similar routes for other utilities (data, electricity, etc.)
// I'll implement a few key ones

// Purchase Data
app.post('/api/utilities/data', verifyToken, async (req, res) => {
  try {
    const { provider, phone, planId } = req.body;
    const user = await User.findById(req.userId);
    const wallet = await Wallet.findOne({ userId: req.userId });

    // Get plan details from PEYFLEX
    const planResponse = await axios.get(`${PEYFLEX_CONFIG.baseURL}/data/plans/${planId}`, {
      headers: PEYFLEX_CONFIG.headers
    });
    const amount = planResponse.data.price;

    if (wallet.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Purchase data
    const peyflexResponse = await axios.post(`${PEYFLEX_CONFIG.baseURL}/data/purchase`, {
      provider,
      phone,
      planId,
      userId: req.userId
    }, { headers: PEYFLEX_CONFIG.headers });

    // Update wallet and create transaction
    wallet.balance -= amount;
    await wallet.save();

    const transaction = new Transaction({
      userId: req.userId,
      type: 'debit',
      category: 'data',
      amount,
      provider,
      reference: peyflexResponse.data.reference,
      status: peyflexResponse.data.status,
      metadata: { phone }
    });
    await transaction.save();

    res.json({
      success: true,
      reference: peyflexResponse.data.reference,
      transaction: transaction
    });
  } catch (error) {
    res.status(500).json({ message: 'Data purchase failed' });
  }
});

// Purchase Electricity
app.post('/api/utilities/electricity', verifyToken, async (req, res) => {
  try {
    const { disco, meterNumber, meterType, amount } = req.body;
    const wallet = await Wallet.findOne({ userId: req.userId });

    if (wallet.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    const peyflexResponse = await axios.post(`${PEYFLEX_CONFIG.baseURL}/electricity/purchase`, {
      disco,
      meterNumber,
      meterType,
      amount,
      userId: req.userId
    }, { headers: PEYFLEX_CONFIG.headers });

    wallet.balance -= amount;
    await wallet.save();

    const transaction = new Transaction({
      userId: req.userId,
      type: 'debit',
      category: 'electricity',
      amount,
      provider: disco,
      reference: peyflexResponse.data.reference,
      status: peyflexResponse.data.status,
      metadata: { meterNumber, meterType }
    });
    await transaction.save();

    res.json({
      success: true,
      reference: peyflexResponse.data.reference,
      token: peyflexResponse.data.token,
      transaction: transaction
    });
  } catch (error) {
    res.status(500).json({ message: 'Electricity purchase failed' });
  }
});

// TRANSACTION HISTORY
app.get('/api/transactions', verifyToken, async (req, res) => {
  try {
    const { type, category, limit = 50 } = req.query;

    let filter = { userId: req.userId };
    if (type) filter.type = type;
    if (category) filter.category = category;

    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({ transactions });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// SAVINGS
app.post('/api/savings', verifyToken, async (req, res) => {
  try {
    const { name, targetAmount, interestRate, interestType } = req.body;

    const savings = new Savings({
      userId: req.userId,
      name,
      targetAmount,
      interestRate,
      interestType
    });

    await savings.save();
    res.status(201).json({ savings });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/savings', verifyToken, async (req, res) => {
  try {
    const savings = await Savings.find({ userId: req.userId });
    res.json({ savings });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// WEBHOOKS

// Monnify webhook for deposit confirmation
const webhookVerify = require('./backend/middleware/webhookVerify');
const webhookReplay = require('./backend/middleware/webhookReplay');

app.post('/api/webhooks/monnify', express.raw({ type: 'application/json' }), webhookVerify('monnify'), webhookReplay, async (req, res) => {
  try {
    if (!process.env.MONNIFY_WEBHOOK_SECRET && !process.env.MONNIFY_SECRET_KEY) {
      console.warn('Received Monnify webhook but MONNIFY_WEBHOOK_SECRET/MONNIFY_SECRET_KEY not configured');
      return res.status(501).json({ message: 'Monnify webhook not configured on this server. Set MONNIFY_WEBHOOK_SECRET or MONNIFY_SECRET_KEY.' });
    }
    // raw body already available for verification middleware; parse it
    const payload = JSON.parse(req.body.toString());
    const event = payload.eventData;

    if (event.eventType === 'SUCCESSFUL_TRANSACTION') {
      const { amountPaid, customer, transactionReference } = event;

      // Find user by email
      const user = await User.findOne({ email: customer.email });
      if (!user) return res.status(404).json({ message: 'User not found' });

      // Update wallet
      const wallet = await Wallet.findOne({ userId: user._id });
      wallet.balance += amountPaid;
      await wallet.save();

      // Create transaction
      const transaction = new Transaction({
        userId: user._id,
        type: 'credit',
        category: 'deposit',
        amount: amountPaid,
        reference: transactionReference,
        status: 'success'
      });
      await transaction.save();
    }

    res.status(200).json({ message: 'Webhook processed' });
  } catch (error) {
    console.error('Monnify webhook error', error);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
});

// PEYFLEX callback webhook
app.post('/api/webhooks/peyflex', express.raw({ type: 'application/json' }), webhookVerify('peyflex'), webhookReplay, async (req, res) => {
  try {
    const payload = JSON.parse(req.body.toString());
    const { reference, status, userId } = payload;

    // Update transaction status
    await Transaction.findOneAndUpdate(
      { reference },
      { status }
    );

    res.status(200).json({ message: 'Callback processed' });
  } catch (error) {
    console.error('Peyflex webhook error', error);
    res.status(500).json({ message: 'Callback processing failed' });
  }
});

// PAYFLEX PROXY ROUTES (Frontend calls these instead of PayFlex directly to avoid CORS issues)

// Get providers for a utility type
app.get('/api/payflex/providers/:utilityType', async (req, res) => {
  try {
    const { utilityType } = req.params;
    console.log(`[Backend] Fetching ${utilityType} providers from Peyflex...`);
    
    const response = await axios.get(`${PEYFLEX_CONFIG.baseURL}/providers/${utilityType}`, {
      headers: PEYFLEX_CONFIG.headers
    });
    
    console.log(`[Backend] Peyflex providers response:`, response.data);
    res.json(response.data);
  } catch (error) {
    console.error('[Backend] Peyflex providers error:', error.message);
    console.error('[Backend] Error details:', error.response?.data || error);
    res.status(500).json({ error: 'Failed to fetch providers', message: error.message });
  }
});

// Get data plans for a provider
app.get('/api/payflex/plans/data/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    console.log(`[Backend] Fetching data plans for ${provider} from Peyflex...`);
    
    const response = await axios.get(`${PEYFLEX_CONFIG.baseURL}/plans/data/${provider}`, {
      headers: PEYFLEX_CONFIG.headers
    });
    
    console.log(`[Backend] Peyflex data plans response:`, response.data);
    res.json(response.data);
  } catch (error) {
    console.error('[Backend] Peyflex data plans error:', error.message);
    console.error('[Backend] Error details:', error.response?.data || error);
    res.status(500).json({ error: 'Failed to fetch data plans', message: error.message });
  }
});

// ============================================
// Mount new backend route modules
// ============================================

// Initialize Firebase Admin SDK if not already initialized
try {
  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    const serviceAccount = require('./serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
} catch (e) {
  console.warn('Firebase Admin SDK initialization skipped - using existing instance or credentials unavailable');
}


// Mount new modular routes
const paymentRoutes = require('./backend/routes/payments');
const securityRoutes = require('./backend/routes/security');
const walletRoutes = require('./backend/routes/wallet');
const payflexProxyRoutes = require('./backend/routes/payflex');
const healthRoutes = require('./backend/routes/health');
const docsRoutes = require('./backend/routes/docs');

app.use('/api/payments', paymentRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/payflex-proxy', payflexProxyRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/docs', docsRoutes);

// Attach Sentry error handler after routes if configured
if (Sentry && Sentry.Handlers) {
  app.use(Sentry.Handlers.errorHandler());
}

// Attach centralized error handler (captures to Sentry if configured)
try {
  const errorHandler = require('./backend/middleware/errorHandler');
  app.use(errorHandler);
} catch (e) {
  console.warn('Error handler attach failed', e.message || e);
}

console.log('[Backend] New modular routes mounted:');
console.log('  ✓ /api/payments - Payment processing (airtime, data, electricity, cable, internet, education, insurance, giftcard, tax)');
console.log('  ✓ /api/security - Security management (2FA, PIN, password, devices, login history)');
console.log('  ✓ /api/wallet - Wallet operations (balance, deposit, withdraw, transactions)');
console.log('  ✓ /api/payflex-proxy - PayFlex API proxy (providers, plans)');

// Sentry integration (optional)
try {
  const initSentry = require('./backend/utils/sentry');
  initSentry();
} catch (e) {
  console.warn('Sentry not configured:', e.message);
}

// Mount metrics route if available
try {
  const metricsRoutes = require('./backend/routes/metrics');
  app.use('/api/metrics', metricsRoutes);
} catch (e) {
  // ignore if prom-client not installed
}

// Export app for testing and server start orchestration
module.exports = app;

// If run directly, start the server
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  
  // Start server immediately without waiting for Redis
  // Redis is optional and will log errors if unavailable, but won't block startup
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    
    // Attempt to connect Redis in the background if configured
    if (process.env.REDIS_URL || process.env.REDIS_HOST) {
      (async () => {
        try {
          const { connectRedis } = require('./backend/utils/redisClient');
          if (connectRedis) {
            await connectRedis();
          }
        } catch (e) {
          console.warn('Redis connection failed (optional):', e.message || e);
        }
      })();
    }
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`Received ${signal} - closing server`);
    try {
      server.close(() => console.log('HTTP server closed'));
      // close mongoose
      try {
        await mongoose.disconnect();
        console.log('MongoDB disconnected');
      } catch (err) {
        console.warn('Error disconnecting MongoDB:', err.message || err);
      }

      // close redis if available
      try {
        const { disconnectRedis } = require('./backend/utils/redisClient');
        if (disconnectRedis) await disconnectRedis();
      } catch (err) {
        console.warn('Error disconnecting Redis:', err.message || err);
      }

      // allow process to exit
      setTimeout(() => process.exit(0), 500);
    } catch (err) {
      console.error('Error during shutdown:', err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
