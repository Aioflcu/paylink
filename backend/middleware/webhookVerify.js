const crypto = require('crypto');

// Provider-specific webhook verification. Configurable via env vars.
module.exports = (provider) => (req, res, next) => {
  try {
    const rawBody = req.body && Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));

    if (provider === 'monnify') {
      const signature = req.header('X-Monnify-Signature') || req.header('x-monnify-signature');
      const secret = process.env.MONNIFY_WEBHOOK_SECRET || process.env.MONNIFY_SECRET_KEY || '';
      if (!signature || !secret) return res.status(401).json({ message: 'Webhook signature missing or not configured' });

      const computed = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
      if (computed !== signature) return res.status(401).json({ message: 'Invalid webhook signature' });
      return next();
    }

    if (provider === 'peyflex' || provider === 'payflex' || provider === 'payflex') {
      const signature = req.header('X-Payflex-Signature') || req.header('x-payflex-signature') || req.header('X-Payflex-Signature');
      const secret = process.env.PEYFLEX_WEBHOOK_SECRET || process.env.PEYFLEX_API_KEY || '';
      if (!signature || !secret) return res.status(401).json({ message: 'Webhook signature missing or not configured' });

      const computed = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
      if (computed !== signature) return res.status(401).json({ message: 'Invalid webhook signature' });
      return next();
    }

    // Default: no verification
    return next();
  } catch (err) {
    console.error('Webhook verification error', err);
    return res.status(500).json({ message: 'Webhook verification failed' });
  }
};
