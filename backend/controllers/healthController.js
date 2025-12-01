exports.liveness = async (req, res) => {
  return res.status(200).json({ status: 'ok', timestamp: Date.now() });
};

exports.readiness = async (req, res) => {
  // Simple readiness: check DB connection if mongoose present
  try {
    const mongoose = require('mongoose');
    const ready = mongoose.connection.readyState === 1; // 1 = connected
    if (ready) return res.status(200).json({ ready: true });
    return res.status(503).json({ ready: false });
  } catch (err) {
    return res.status(500).json({ ready: false, error: err.message });
  }
};
