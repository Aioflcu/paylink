const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0
  },
  virtualAccount: {
    accountNumber: String,
    bankName: String,
    accountName: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure an index on userId for fast lookups and unique wallet per user
walletSchema.index({ userId: 1 }, { unique: true, background: true });

module.exports = mongoose.model('Wallet', walletSchema);
