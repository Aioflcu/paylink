const Joi = require('joi');

// Generic validation middleware factory
exports.validate = (schema) => (req, res, next) => {
  const data = req.method === 'GET' ? req.query : req.body;
  const { error, value } = schema.validate(data, { abortEarly: false, stripUnknown: true });
  if (error) {
    return res.status(400).json({ error: 'Validation failed', details: error.details.map(d => d.message) });
  }
  // Replace body/query with validated value
  if (req.method === 'GET') req.query = value; else req.body = value;
  next();
};
